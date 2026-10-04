import { prisma } from "../../config/prisma.js";
import { logger } from "../../config/logger.js";
import { HttpError } from "../../errors/http.error.js";
import { assertInteriorDispatchInput, createInteriorDispatchInTx } from "../interiorSample/interiorSample.service.js";
import { assertSurfaceDispatchInput, createSurfaceDispatchInTx } from "../surfaceSample/surfaceSample.service.js";
import type { CreateDispatchBatchDTO } from "./dispatchBatch.schema.js";

type LabRow = { name: string; abbreviation: string | null; description: string | null };

/**
 * Interior y Superficie tienen tablas de laboratorio separadas. El laboratorio elegido pertenece a una;
 * su par en la otra se busca por nombre (único) y se crea si todavía no existe.
 */
async function resolveLaboratories(module: "interior" | "surface", laboratoryId: string, userId?: number) {
  const selected: LabRow | null =
    module === "interior"
      ? await prisma.interiorLaboratory.findUnique({ where: { id: laboratoryId } })
      : await prisma.surfaceLaboratory.findUnique({ where: { id: laboratoryId } });
  if (!selected) throw new HttpError("No se encontro el laboratorio seleccionado para el lote.", 404);

  const counterpartData = {
    name: selected.name,
    abbreviation: selected.abbreviation,
    description: selected.description,
    createdById: userId ?? null,
    updatedById: userId ?? null,
  };

  if (module === "interior") {
    const surface = await prisma.surfaceLaboratory.upsert({
      where: { name: selected.name },
      create: counterpartData,
      update: {},
    });
    return { interiorLaboratoryId: laboratoryId, surfaceLaboratoryId: surface.id };
  }

  const interior = await prisma.interiorLaboratory.upsert({
    where: { name: selected.name },
    create: counterpartData,
    update: {},
  });
  return { interiorLaboratoryId: interior.id, surfaceLaboratoryId: laboratoryId };
}

export const dispatchBatchService = {
  async createDispatchBatch(data: CreateDispatchBatchDTO, userId?: number) {
    const { interiorLaboratoryId, surfaceLaboratoryId } = await resolveLaboratories(
      data.laboratoryModule,
      data.laboratoryId,
      userId
    );
    const common = { projectName: data.projectName, sentAt: data.sentAt, notes: data.notes };
    const interiorData = { ...common, interiorLaboratoryId, items: data.interiorItems };
    const surfaceData = { ...common, surfaceLaboratoryId, items: data.surfaceItems };

    await assertInteriorDispatchInput(interiorData);
    await assertSurfaceDispatchInput(surfaceData);

    return prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ folio: number }>>`SELECT nextval('dispatch_folio_seq')::int AS folio`;
      const folio = rows[0]?.folio;
      if (folio === undefined) throw new HttpError("No se pudo asignar el folio del lote.", 500);
      const interior = await createInteriorDispatchInTx(tx, interiorData, userId, folio);
      const surface = await createSurfaceDispatchInTx(tx, surfaceData, userId, folio);

      logger.info(
        { folio, interiorDispatchId: interior?.id, surfaceDispatchId: surface?.id, userId },
        "Mixed dispatch batch created"
      );
      return { folio, interior, surface };
    });
  },
};
