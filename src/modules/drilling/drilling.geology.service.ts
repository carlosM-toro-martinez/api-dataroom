import fsp from "node:fs/promises";
import path from "node:path";
import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { logger } from "../../config/logger.js";
import { HttpError } from "../../errors/http.error.js";
import { mediaRoot } from "../media/media.paths.js";

// Fotos en el volumen persistente de media: MEDIA_ROOT/sondajes/<holeId>/<photoId>.jpg (+ _thumb.jpg).
const PHOTO_ROOT = path.join(mediaRoot, "sondajes");
const MIME_EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

type UploadedFile = { buffer: Buffer; mimetype: string; size: number };

async function assertHole(holeId: string) {
  const hole = await prisma.drillingHole.findUnique({ where: { id: holeId }, select: { id: true, code: true } });
  if (!hole) throw new HttpError("Pozo: no encontrado.", 404);
  return hole;
}

// Código de foto: <pozo>-F0001. Correlativo por pozo, lo asigna el servidor (así dos dispositivos sin
// conexión nunca repiten número) y no se reutiliza aunque se borre la foto.
export const photoCode = (holeCode: string, sequence: number) => `${holeCode}-F${String(sequence).padStart(4, "0")}`;

async function nextPhotoSequence(holeId: string) {
  // upsert + increment es una sola sentencia atómica (INSERT … ON CONFLICT DO UPDATE).
  const counter = await prisma.drillingPhotoCounter.upsert({
    where: { holeId },
    create: { holeId, last: 1 },
    update: { last: { increment: 1 } },
    select: { last: true },
  });
  return counter.last;
}

// Un reporte por día: se guarda a las 00:00 UTC de esa fecha.
function dayIso(value: unknown) {
  if (typeof value !== "string") return undefined;
  const date = new Date(value);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())).toISOString();
}

function friendly(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") throw new HttpError("Ya existe un reporte geológico para ese pozo y fecha.", 409);
    if (error.code === "P2025") throw new HttpError("Reporte geológico: no encontrado.", 404);
    if (error.code === "P2003") throw new HttpError("El registro hace referencia a un dato inexistente.", 409);
  }
  throw error;
}

// ─── Reporte geológico diario ────────────────────────────────────────────────
export const geologyReports = {
  async listByHole(holeId: string) {
    await assertHole(holeId);
    return prisma.drillingGeologyReport.findMany({ where: { holeId }, orderBy: { date: "desc" } });
  },

  async createForHole(holeId: string, data: Record<string, unknown>, userId?: number) {
    await assertHole(holeId);
    // Idempotente: el dispositivo manda su propio id; un reintento no duplica.
    if (typeof data.id === "string") {
      const existing = await prisma.drillingGeologyReport.findUnique({ where: { id: data.id } });
      if (existing) {
        if (existing.holeId !== holeId) throw new HttpError("El reporte ya existe en otro pozo.", 409);
        return existing;
      }
    }
    return prisma.drillingGeologyReport
      .create({
        data: {
          ...(data as Prisma.DrillingGeologyReportUncheckedCreateInput),
          holeId,
          date: dayIso(data.date) as string,
          createdById: userId ?? null,
          updatedById: userId ?? null,
        },
      })
      .catch(friendly);
  },

  async update(id: string, data: Record<string, unknown>, userId?: number) {
    const current = await prisma.drillingGeologyReport.findUnique({ where: { id } });
    if (!current) throw new HttpError("Reporte geológico: no encontrado.", 404);
    const fromDepth = Number(data.fromDepth ?? current.fromDepth);
    const toDepth = Number(data.toDepth ?? current.toDepth);
    if (toDepth < fromDepth) throw new HttpError("La profundidad actual no puede ser menor que la anterior.", 400);
    return prisma.drillingGeologyReport
      .update({
        where: { id },
        data: {
          ...(data as Prisma.DrillingGeologyReportUncheckedUpdateInput),
          ...(data.date ? { date: dayIso(data.date) as string } : {}),
          updatedById: userId ?? null,
        },
      })
      .catch(friendly);
  },

  async remove(id: string) {
    return prisma.drillingGeologyReport.delete({ where: { id } }).catch(friendly);
  },
};

// ─── Logueo geológico (quick log) ────────────────────────────────────────────
type LogRow = Record<string, unknown> & { minerals?: unknown[] | null; structures?: unknown[] | null };

export const geologyLog = {
  async get(holeId: string) {
    await assertHole(holeId);
    return prisma.drillingLogInterval.findMany({ where: { holeId }, orderBy: [{ fromDepth: "asc" }, { toDepth: "asc" }] });
  },

  async replace(holeId: string, rows: LogRow[], userId?: number) {
    await assertHole(holeId);
    const data = rows.map((row) => ({
      ...(row as unknown as Prisma.DrillingLogIntervalCreateManyInput),
      holeId,
      minerals: row.minerals?.length ? (row.minerals as Prisma.InputJsonValue) : Prisma.DbNull,
      structures: row.structures?.length ? (row.structures as Prisma.InputJsonValue) : Prisma.DbNull,
      createdById: userId ?? null,
      updatedById: userId ?? null,
    }));
    await prisma.$transaction(async (tx) => {
      await tx.drillingLogInterval.deleteMany({ where: { holeId } });
      await tx.drillingLogInterval.createMany({ data });
    });
    return geologyLog.get(holeId);
  },
};

// ─── Fotografías ─────────────────────────────────────────────────────────────
// En disco el archivo se llama como su código: sondajes/<id del pozo>/26DLP079-F0001.jpg
function photoPaths(holeId: string, code: string, mimeType: string) {
  const dir = path.join(PHOTO_ROOT, holeId);
  const ext = MIME_EXT[mimeType] ?? "jpg";
  return { dir, fileName: `${code}.${ext}`, thumbName: `${code}_thumb.jpg` };
}

async function unlinkQuiet(file: string) {
  await fsp.unlink(file).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT") logger.warn({ err: error, file }, "No se pudo borrar la foto");
  });
}

export const photos = {
  async listByHole(holeId: string) {
    await assertHole(holeId);
    return prisma.drillingPhoto.findMany({ where: { holeId }, orderBy: [{ createdAt: "asc" }] });
  },

  // Revisa en disco que cada foto registrada tenga su archivo y su miniatura (para detectar archivos perdidos del volumen).
  async integrity(holeId?: string) {
    const rows = await prisma.drillingPhoto.findMany({
      ...(holeId ? { where: { holeId } } : {}),
      orderBy: [{ holeId: "asc" }, { sequence: "asc" }],
      select: { id: true, code: true, holeId: true, fileName: true, thumbName: true, createdAt: true, hole: { select: { code: true } } },
    });
    const exists = (file: string) => fsp.access(file).then(() => true, () => false);
    const missing: Array<{ id: string; code: string; hole: string; createdAt: Date; missing: Array<"file" | "thumb"> }> = [];
    for (const row of rows) {
      const dir = path.join(PHOTO_ROOT, row.holeId);
      const lost: Array<"file" | "thumb"> = [];
      if (!(await exists(path.join(dir, row.fileName)))) lost.push("file");
      if (!(await exists(path.join(dir, row.thumbName)))) lost.push("thumb");
      if (lost.length) missing.push({ id: row.id, code: row.code, hole: row.hole.code, createdAt: row.createdAt, missing: lost });
    }
    const folderExists = await exists(PHOTO_ROOT);
    return { total: rows.length, missingCount: missing.length, mediaFolderExists: folderExists, missing: missing.slice(0, 500) };
  },

  async create(
    holeId: string,
    meta: Record<string, unknown> & { id: string; reportId?: string; contentHash?: string },
    files: { file?: UploadedFile | undefined; thumb?: UploadedFile | undefined },
    userId?: number,
  ) {
    const hole = await assertHole(holeId);
    const existing = await prisma.drillingPhoto.findUnique({ where: { id: meta.id } });
    if (existing) {
      if (existing.holeId !== holeId) throw new HttpError("La foto ya existe en otro pozo.", 409);
      return existing;
    }
    // La misma imagen (mismo contenido) ya está en el pozo: se devuelve la existente, sin gastar código.
    if (meta.contentHash) {
      const same = await prisma.drillingPhoto.findUnique({ where: { holeId_contentHash: { holeId, contentHash: meta.contentHash } } });
      if (same) return same;
    }
    const { file, thumb } = files;
    if (!file || !thumb) throw new HttpError("Falta la imagen o su miniatura.", 400);
    if (!MIME_EXT[file.mimetype] || thumb.mimetype !== "image/jpeg") {
      throw new HttpError("Formato de imagen no permitido (usa JPG, PNG o WEBP).", 400);
    }
    if (meta.reportId) {
      const report = await prisma.drillingGeologyReport.findUnique({ where: { id: meta.reportId }, select: { holeId: true } });
      if (!report || report.holeId !== holeId) throw new HttpError("El reporte de la foto no pertenece a este pozo.", 400);
    }

    const sequence = await nextPhotoSequence(holeId);
    const code = photoCode(hole.code, sequence);
    const { dir, fileName, thumbName } = photoPaths(holeId, code, file.mimetype);
    await fsp.mkdir(dir, { recursive: true });
    await fsp.writeFile(path.join(dir, fileName), file.buffer);
    await fsp.writeFile(path.join(dir, thumbName), thumb.buffer);
    try {
      return await prisma.drillingPhoto.create({
        data: {
          ...(meta as Prisma.DrillingPhotoUncheckedCreateInput),
          holeId,
          code,
          sequence,
          fileName,
          thumbName,
          mimeType: file.mimetype,
          sizeBytes: file.size,
          createdById: userId ?? null,
          updatedById: userId ?? null,
        },
      });
    } catch (error) {
      await unlinkQuiet(path.join(dir, fileName));
      await unlinkQuiet(path.join(dir, thumbName));
      // Otra subida simultánea de la misma imagen ganó la carrera: se devuelve esa.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002" && meta.contentHash) {
        const same = await prisma.drillingPhoto.findUnique({ where: { holeId_contentHash: { holeId, contentHash: meta.contentHash } } });
        if (same) return same;
      }
      friendly(error);
    }
  },

  async update(id: string, data: Record<string, unknown>, userId?: number) {
    return prisma.drillingPhoto
      .update({ where: { id }, data: { ...(data as Prisma.DrillingPhotoUncheckedUpdateInput), updatedById: userId ?? null } })
      .catch(friendly);
  },

  async remove(id: string) {
    const photo = await prisma.drillingPhoto.findUnique({ where: { id } });
    if (!photo) throw new HttpError("Foto: no encontrada.", 404);
    await prisma.drillingPhoto.delete({ where: { id } });
    const dir = path.join(PHOTO_ROOT, photo.holeId);
    await unlinkQuiet(path.join(dir, photo.fileName));
    await unlinkQuiet(path.join(dir, photo.thumbName));
    return { id };
  },

  async file(id: string, variant: "thumb" | "full") {
    const photo = await prisma.drillingPhoto.findUnique({ where: { id } });
    if (!photo) throw new HttpError("Foto: no encontrada.", 404);
    const name = variant === "thumb" ? photo.thumbName : photo.fileName;
    return {
      path: path.join(PHOTO_ROOT, photo.holeId, name),
      mimeType: variant === "thumb" ? "image/jpeg" : photo.mimeType,
    };
  },
};
