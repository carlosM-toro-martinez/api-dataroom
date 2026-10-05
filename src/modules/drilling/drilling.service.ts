import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { logger } from "../../config/logger.js";
import { HttpError } from "../../errors/http.error.js";
import type { CreateDispatchDTO, CreateResultDTO } from "./drilling.schema.js";

type Query = { page?: number; limit?: number; search?: string; [key: string]: unknown };

const pg = (q: Query) => {
  const p = Number(q.page ?? 1);
  const l = Number(q.limit ?? 50);
  return { p, l, skip: (p - 1) * l };
};

const toDate = (value?: string | null) => (value ? new Date(value) : value === null ? null : undefined);
const DATE_FIELDS = ["startDate", "endDate", "startedAt", "finishedAt", "date", "measuredAt", "loggedAt", "sampledAt", "sentAt", "reviewedAt"];

function withDates<T extends Record<string, unknown>>(data: T) {
  const out: Record<string, unknown> = { ...data };
  for (const field of DATE_FIELDS) {
    if (field in out) out[field] = toDate(out[field] as string | null | undefined);
  }
  return out;
}

// Traduce errores de Prisma a mensajes entendibles (duplicados / registros relacionados).
function mapPrismaError(error: unknown, entityLabel: string): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") throw new HttpError(`${entityLabel}: ya existe un registro con esos datos.`, 409);
    if (error.code === "P2003") throw new HttpError(`${entityLabel}: tiene registros relacionados o hace referencia a un dato inexistente.`, 409);
    if (error.code === "P2025") throw new HttpError(`${entityLabel}: no encontrado.`, 404);
  }
  throw error;
}

// ─── CRUD genérico para recursos simples ─────────────────────────────────────
type CrudConfig = {
  delegate: () => any;
  label: string;
  searchFields?: string[];
  orderBy?: Record<string, "asc" | "desc"> | Array<Record<string, "asc" | "desc">>;
  include?: Record<string, unknown>;
  filters?: string[];
};

function crud(config: CrudConfig) {
  const { delegate, label, searchFields = [], orderBy = { createdAt: "desc" }, include, filters = [] } = config;
  return {
    async list(query: Query) {
      const { p, l, skip } = pg(query);
      const where: Record<string, unknown> = {};
      for (const filter of filters) if (query[filter] !== undefined) where[filter] = query[filter];
      if (query.search && searchFields.length > 0) {
        where.OR = searchFields.map((field) => ({ [field]: { contains: query.search, mode: "insensitive" } }));
      }
      const [data, total] = await Promise.all([
        delegate().findMany({ where, skip, take: l, orderBy, include }),
        delegate().count({ where }),
      ]);
      return { data, meta: { page: p, limit: l, total, totalPages: Math.ceil(total / l) } };
    },
    async get(id: string) {
      const row = await delegate().findUnique({ where: { id }, include });
      if (!row) throw new HttpError(`${label}: no encontrado.`, 404);
      return row;
    },
    async create(data: Record<string, unknown>, userId?: number) {
      try {
        return await delegate().create({ data: { ...withDates(data), createdById: userId, updatedById: userId }, include });
      } catch (error) {
        mapPrismaError(error, label);
      }
    },
    async update(id: string, data: Record<string, unknown>, userId?: number) {
      try {
        return await delegate().update({ where: { id }, data: { ...withDates(data), updatedById: userId }, include });
      } catch (error) {
        mapPrismaError(error, label);
      }
    },
    async remove(id: string) {
      try {
        return await delegate().delete({ where: { id } });
      } catch (error) {
        mapPrismaError(error, label);
      }
    },
  };
}

// Registros que cuelgan de un pozo y se miden por profundidad (desde/hasta).
function holeRecords(config: CrudConfig & { orderField: string; computeMeters?: boolean }) {
  const base = crud({ ...config, orderBy: { [config.orderField]: "asc" } });

  async function assertHoleExists(holeId: string) {
    const hole = await prisma.drillingHole.findUnique({ where: { id: holeId }, select: { id: true } });
    if (!hole) throw new HttpError("Pozo: no encontrado.", 404);
  }

  function withMeters(data: Record<string, unknown>) {
    if (!config.computeMeters) return data;
    // Los metros perforados se calculan aquí; no se confía en el cliente.
    return { ...data, metersDrilled: Number(data.toDepth) - Number(data.fromDepth) };
  }

  return {
    async listByHole(holeId: string) {
      await assertHoleExists(holeId);
      return config.delegate().findMany({ where: { holeId }, orderBy: { [config.orderField]: "asc" }, include: config.include });
    },
    async createForHole(holeId: string, data: Record<string, unknown>, userId?: number) {
      await assertHoleExists(holeId);
      return base.create(withMeters({ ...data, holeId }), userId);
    },
    async update(id: string, data: Record<string, unknown>, userId?: number) {
      const current = await base.get(id);
      const merged = { ...data };
      if ("fromDepth" in data || "toDepth" in data) {
        const fromDepth = Number(data.fromDepth ?? current.fromDepth);
        const toDepth = Number(data.toDepth ?? current.toDepth);
        if (!(toDepth > fromDepth)) throw new HttpError("La profundidad final debe ser mayor que la inicial.", 400);
        if (config.computeMeters) merged.metersDrilled = toDepth - fromDepth;
      }
      return base.update(id, merged, userId);
    },
    remove: base.remove,
  };
}

export const contractors = crud({
  delegate: () => prisma.drillingContractor,
  label: "Contratista",
  searchFields: ["name"],
  orderBy: { name: "asc" },
});

export const rigs = crud({
  delegate: () => prisma.drillingRig,
  label: "Máquina perforadora",
  searchFields: ["code", "model"],
  orderBy: { code: "asc" },
  include: { contractor: { select: { id: true, name: true } } },
});

export const laboratories = crud({
  delegate: () => prisma.drillingLaboratory,
  label: "Laboratorio",
  searchFields: ["name", "abbreviation"],
  orderBy: { name: "asc" },
});

export const campaigns = crud({
  delegate: () => prisma.drillingCampaign,
  label: "Campaña",
  searchFields: ["name", "code", "area"],
  filters: ["category", "status", "area"],
  include: { _count: { select: { holes: true } } },
});

const HOLE_LIST_INCLUDE = {
  campaign: { select: { id: true, name: true, code: true, category: true } },
  rig: { select: { id: true, code: true } },
  contractor: { select: { id: true, name: true } },
  _count: { select: { shiftReports: true, samples: true, coreBoxes: true } },
};

const holesBase = crud({
  delegate: () => prisma.drillingHole,
  label: "Pozo",
  searchFields: ["code", "sector", "target"],
  filters: ["campaignId", "status"],
  include: HOLE_LIST_INCLUDE,
});

// Al pasar a "en perforación" / "terminado" se registra la fecha si aún no tiene.
async function withStatusDates(id: string, data: Record<string, unknown>) {
  if (data.status !== "DRILLING" && data.status !== "COMPLETED") return data;
  const current = await prisma.drillingHole.findUnique({ where: { id }, select: { startedAt: true, finishedAt: true } });
  if (!current) return data;
  const next = { ...data };
  const now = new Date().toISOString();
  if (!current.startedAt && next.startedAt === undefined) next.startedAt = now;
  if (data.status === "COMPLETED" && !current.finishedAt && next.finishedAt === undefined) next.finishedAt = now;
  return next;
}

// Avance de cada pozo según sus partes diarios: metros perforados y profundidad alcanzada.
async function withProgress<T extends { id: string }>(rows: T[]) {
  if (rows.length === 0) return rows;
  const totals = await prisma.drillingShiftReport.groupBy({
    by: ["holeId"],
    where: { holeId: { in: rows.map((row) => row.id) } },
    _sum: { metersDrilled: true },
    _max: { toDepth: true },
  });
  const byHole = new Map(totals.map((row) => [row.holeId, row]));
  return rows.map((row) => ({
    ...row,
    drilledMeters: byHole.get(row.id)?._sum.metersDrilled ?? 0,
    currentDepth: byHole.get(row.id)?._max.toDepth ?? 0,
  }));
}

export const holes = {
  ...holesBase,
  async update(id: string, data: Record<string, unknown>, userId?: number) {
    return holesBase.update(id, await withStatusDates(id, data), userId);
  },
  async importMany(campaignId: string, rows: Array<Record<string, unknown>>, userId?: number) {
    const campaign = await prisma.drillingCampaign.findUnique({ where: { id: campaignId }, select: { id: true } });
    if (!campaign) throw new HttpError("Programa: no encontrado.", 404);
    const codes = rows.map((row) => String(row.code).trim());
    const repeated = codes.filter((code, index) => codes.indexOf(code) !== index);
    if (repeated.length > 0) throw new HttpError(`Pozos repetidos en el archivo: ${[...new Set(repeated)].join(", ")}`, 400);
    const existing = await prisma.drillingHole.findMany({ where: { code: { in: codes } }, select: { code: true } });
    if (existing.length > 0) {
      throw new HttpError(`Estos pozos ya existen: ${existing.map((hole) => hole.code).join(", ")}`, 409);
    }
    const result = await prisma.drillingHole.createMany({
      data: rows.map((row) => ({
        ...(withDates(row) as object),
        code: String(row.code).trim(),
        campaignId,
        createdById: userId ?? null,
        updatedById: userId ?? null,
      })) as any,
    });
    logger.info({ campaignId, count: result.count, userId }, "DrillingHoles imported");
    return { created: result.count };
  },
  async list(query: Query) {
    // La categoría (Exploración / Producción) vive en la campaña.
    const { category, ...rest } = query;
    if (!category) {
      const result = await holesBase.list(rest);
      return { ...result, data: await withProgress(result.data) };
    }
    const { p, l, skip } = pg(rest);
    const where: Record<string, unknown> = { campaign: { category } };
    if (rest.campaignId) where.campaignId = rest.campaignId;
    if (rest.status) where.status = rest.status;
    if (rest.search) where.OR = ["code", "sector", "target"].map((f) => ({ [f]: { contains: rest.search, mode: "insensitive" } }));
    const [data, total] = await Promise.all([
      prisma.drillingHole.findMany({ where, skip, take: l, orderBy: { createdAt: "desc" }, include: HOLE_LIST_INCLUDE }),
      prisma.drillingHole.count({ where }),
    ]);
    return { data: await withProgress(data), meta: { page: p, limit: l, total, totalPages: Math.ceil(total / l) } };
  },
  async remove(id: string) {
    // Los registros del pozo se borran en cascada; solo se permite borrar un pozo vacío.
    const counts = await prisma.drillingHole.findUnique({
      where: { id },
      select: { _count: { select: { shiftReports: true, surveys: true, runs: true, coreBoxes: true, logIntervals: true, samples: true } } },
    });
    if (!counts) throw new HttpError("Pozo: no encontrado.", 404);
    const total = Object.values(counts._count).reduce((sum, value) => sum + value, 0);
    if (total > 0) throw new HttpError("Pozo: tiene registros asociados (partes, muestras, logueo...). Elimínalos antes.", 409);
    return holesBase.remove(id);
  },
  async summary(id: string) {
    const hole = await holesBase.get(id);
    const meters = await prisma.drillingShiftReport.aggregate({ where: { holeId: id }, _sum: { metersDrilled: true }, _max: { toDepth: true } });
    return { ...hole, drilledMeters: meters._sum.metersDrilled ?? 0, currentDepth: meters._max.toDepth ?? 0 };
  },
};

const shiftReportsBase = holeRecords({
  delegate: () => prisma.drillingShiftReport,
  label: "Parte de perforación",
  orderField: "date",
  computeMeters: true,
  include: { rig: { select: { id: true, code: true } } },
});

// El parte es de un día: se guarda a las 00:00 UTC de esa fecha (así "un parte por turno y día" es exacto).
const REPORT_JSON_FIELDS = ["activities", "consumables", "additives", "timeDetail", "incidents"];

function normalizeReportDate(data: Record<string, unknown>) {
  const next: Record<string, unknown> = { ...data };
  // Prisma no acepta null en columnas JSON: se usa DbNull para vaciarlas.
  for (const field of REPORT_JSON_FIELDS) if (next[field] === null) next[field] = Prisma.DbNull;
  if (typeof next.date !== "string") return next;
  const date = new Date(next.date);
  const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  return { ...next, date: day.toISOString() };
}

function friendlyShiftError(error: unknown): never {
  if (error instanceof HttpError && error.statusCode === 409 && error.message.includes("ya existe un registro")) {
    throw new HttpError("Ya existe un parte para ese pozo, fecha y turno.", 409);
  }
  throw error;
}

export const shiftReports = {
  ...shiftReportsBase,
  async createForHole(holeId: string, data: Record<string, unknown>, userId?: number) {
    // Creación idempotente: el dispositivo envía su propio id; si un reintento llega dos veces, no se duplica.
    if (typeof data.id === "string") {
      const existing = await prisma.drillingShiftReport.findUnique({ where: { id: data.id }, include: { rig: { select: { id: true, code: true } } } });
      if (existing) {
        if (existing.holeId !== holeId) throw new HttpError("El parte ya existe en otro pozo.", 409);
        return existing;
      }
    }
    const created = await shiftReportsBase.createForHole(holeId, normalizeReportDate(data), userId).catch(friendlyShiftError);
    // El primer parte de un pozo proyectado lo pasa a "en proceso".
    const hole = await prisma.drillingHole.findUnique({ where: { id: holeId }, select: { status: true, startedAt: true } });
    if (hole?.status === "PLANNED") {
      await prisma.drillingHole.update({
        where: { id: holeId },
        data: { status: "DRILLING", startedAt: hole.startedAt ?? new Date(String(normalizeReportDate(data).date)), updatedById: userId ?? null },
      });
    }
    return created;
  },
  async update(id: string, data: Record<string, unknown>, userId?: number) {
    return shiftReportsBase.update(id, normalizeReportDate(data), userId).catch(friendlyShiftError);
  },
};
export const surveys = holeRecords({ delegate: () => prisma.drillingSurvey, label: "Medición de desviación", orderField: "depth" });
export const runs = holeRecords({ delegate: () => prisma.drillingRun, label: "Corrida", orderField: "fromDepth" });
export const coreBoxes = holeRecords({ delegate: () => prisma.drillingCoreBox, label: "Caja de testigo", orderField: "boxNumber" });
export const logIntervals = holeRecords({ delegate: () => prisma.drillingLogInterval, label: "Logueo", orderField: "fromDepth" });

const samplesBase = holeRecords({ delegate: () => prisma.drillingSample, label: "Muestra de sondaje", orderField: "fromDepth" });
export const samples = {
  ...samplesBase,
  list: crud({
    delegate: () => prisma.drillingSample,
    label: "Muestra de sondaje",
    searchFields: ["code"],
    filters: ["holeId", "status"],
    include: { hole: { select: { id: true, code: true } } },
  }).list,
};

// ─── Lotes (nota de remisión) ────────────────────────────────────────────────
const DISPATCH_INCLUDE = {
  laboratory: { select: { id: true, name: true, abbreviation: true } },
  items: {
    include: {
      sample: {
        select: {
          id: true, code: true, fromDepth: true, toDepth: true, status: true, priority: true,
          hole: { select: { id: true, code: true } },
        },
      },
      requestedElements: { include: { element: { select: { id: true, name: true, symbol: true, defaultUnit: true } } } },
    },
    orderBy: { createdAt: "asc" as const },
  },
};

async function markSampleCompleted(tx: any, sampleId: string) {
  await tx.drillingSample.update({ where: { id: sampleId }, data: { status: "COMPLETED" } });
  const items = await tx.drillingDispatchItem.findMany({ where: { sampleId, status: "PENDING" }, select: { dispatchId: true } });
  if (items.length === 0) return;
  await tx.drillingDispatchItem.updateMany({ where: { sampleId, status: "PENDING" }, data: { status: "COMPLETED" } });
  for (const dispatchId of new Set<string>(items.map((item: { dispatchId: string }) => item.dispatchId))) {
    const pending = await tx.drillingDispatchItem.count({ where: { dispatchId, status: "PENDING" } });
    if (pending === 0) await tx.drillingSampleDispatch.update({ where: { id: dispatchId }, data: { status: "COMPLETED" } });
  }
}

export const dispatches = {
  async list(query: Query) {
    const { p, l, skip } = pg(query);
    const where: Record<string, unknown> = {};
    if (query.laboratoryId) where.laboratoryId = query.laboratoryId;
    if (query.status) where.status = query.status;
    if (query.folio !== undefined) where.folio = query.folio;
    const [data, total] = await Promise.all([
      prisma.drillingSampleDispatch.findMany({ where, skip, take: l, orderBy: { sentAt: "desc" }, include: DISPATCH_INCLUDE }),
      prisma.drillingSampleDispatch.count({ where }),
    ]);
    return { data, meta: { page: p, limit: l, total, totalPages: Math.ceil(total / l) } };
  },

  async get(id: string) {
    const dispatch = await prisma.drillingSampleDispatch.findUnique({ where: { id }, include: DISPATCH_INCLUDE });
    if (!dispatch) throw new HttpError("Lote: no encontrado.", 404);
    return dispatch;
  },

  async create(data: CreateDispatchDTO, userId?: number) {
    const lab = await prisma.drillingLaboratory.findUnique({ where: { id: data.laboratoryId } });
    if (!lab) throw new HttpError("No se encontro el laboratorio seleccionado para el lote.", 404);
    const sampleIds = data.items.map((item) => item.sampleId);
    if (new Set(sampleIds).size !== sampleIds.length) throw new HttpError("Una muestra esta repetida en el lote.", 400);
    const found = await prisma.drillingSample.count({ where: { id: { in: sampleIds } } });
    if (found !== sampleIds.length) throw new HttpError("Una o mas muestras del lote ya no existen.", 404);
    const elementIds = [...new Set(data.items.flatMap((item) => item.elementIds))];
    const elements = await prisma.element.count({ where: { id: { in: elementIds } } });
    if (elements !== elementIds.length) throw new HttpError("Uno o mas elementos solicitados no existen.", 404);

    return prisma.$transaction(
      async (tx) => {
        const dispatch = await tx.drillingSampleDispatch.create({
          data: {
            laboratoryId: data.laboratoryId,
            projectName: data.projectName ?? null,
            sentAt: new Date(data.sentAt),
            notes: data.notes ?? null,
            createdById: userId ?? null,
            updatedById: userId ?? null,
          },
        });
        for (const item of data.items) {
          await tx.drillingDispatchItem.create({
            data: {
              dispatchId: dispatch.id,
              sampleId: item.sampleId,
              notes: item.notes ?? null,
              createdById: userId ?? null,
              updatedById: userId ?? null,
              requestedElements: { create: item.elementIds.map((elementId) => ({ elementId })) },
            },
          });
          await tx.drillingSample.update({ where: { id: item.sampleId }, data: { status: "DISPATCHED", updatedById: userId ?? null } });
        }
        logger.info({ dispatchId: dispatch.id, folio: dispatch.folio, sampleCount: data.items.length, userId }, "DrillingDispatch created");
        return tx.drillingSampleDispatch.findUnique({ where: { id: dispatch.id }, include: DISPATCH_INCLUDE });
      },
      { timeout: 30_000 }
    );
  },

  async remove(id: string) {
    const dispatch = await this.get(id);
    if (dispatch.status === "COMPLETED") throw new HttpError("No se puede eliminar un lote completado.", 409);
    return prisma.$transaction(async (tx) => {
      for (const item of dispatch.items) {
        const sample = await tx.drillingSample.findUnique({ where: { id: item.sampleId }, select: { status: true } });
        if (sample?.status === "COMPLETED") continue;
        const other = await tx.drillingDispatchItem.findFirst({ where: { sampleId: item.sampleId, dispatchId: { not: id } } });
        await tx.drillingSample.update({ where: { id: item.sampleId }, data: { status: other ? "DISPATCHED" : "REGISTERED" } });
      }
      return tx.drillingSampleDispatch.delete({ where: { id } });
    });
  },
};

// ─── Resultados ──────────────────────────────────────────────────────────────
export const results = {
  async listBySample(sampleId: string) {
    return prisma.drillingSampleResult.findMany({
      where: { sampleId },
      orderBy: { createdAt: "asc" },
      include: {
        element: { select: { id: true, name: true, symbol: true, defaultUnit: true } },
        laboratory: { select: { id: true, name: true } },
      },
    });
  },

  async create(sampleId: string, data: CreateResultDTO, userId?: number) {
    const sample = await prisma.drillingSample.findUnique({ where: { id: sampleId }, select: { id: true } });
    if (!sample) throw new HttpError("Muestra de sondaje: no encontrada.", 404);
    try {
      return await prisma.$transaction(async (tx) => {
        const result = await tx.drillingSampleResult.create({
          data: {
            sampleId,
            elementId: data.elementId,
            laboratoryId: data.laboratoryId ?? null,
            value: data.value ?? null,
            unit: data.unit ?? null,
            qualifier: data.qualifier ?? null,
            comments: data.comments ?? null,
            createdById: userId ?? null,
            updatedById: userId ?? null,
          },
        });
        await markSampleCompleted(tx, sampleId);
        return result;
      });
    } catch (error) {
      mapPrismaError(error, "Resultado");
    }
  },

  async remove(id: string) {
    try {
      return await prisma.drillingSampleResult.delete({ where: { id } });
    } catch (error) {
      mapPrismaError(error, "Resultado");
    }
  },
};

// ─── Resumen del módulo ──────────────────────────────────────────────────────
export async function getDrillingSummary() {
  const [campaignCount, holesByStatus, meters, sampleCount] = await Promise.all([
    prisma.drillingCampaign.count(),
    prisma.drillingHole.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.drillingShiftReport.aggregate({ _sum: { metersDrilled: true } }),
    prisma.drillingSample.count(),
  ]);
  return {
    campaigns: campaignCount,
    holes: Object.fromEntries(holesByStatus.map((row) => [row.status, row._count._all])),
    drilledMeters: meters._sum.metersDrilled ?? 0,
    samples: sampleCount,
  };
}
