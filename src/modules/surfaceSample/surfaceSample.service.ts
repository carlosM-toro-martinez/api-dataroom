import { prisma } from "../../config/prisma.js";
import { logger } from "../../config/logger.js";
import { HttpError } from "../../errors/http.error.js";
import type {
  CreateSurfaceAreaDTO,
  CreateSurfaceLaboratoryDTO,
  CreateSurfaceObjectiveDTO,
  CreateSurfaceSampleDTO,
  CreateSurfaceSampleResultDTO,
  CreateSurfaceSampleWithResultsDTO,
  SurfaceAreaQuery,
  SurfaceLaboratoryQuery,
  SurfaceObjectiveQuery,
  SurfaceSampleQuery,
  SurfaceSampleResultQuery,
  UpdateSurfaceAreaDTO,
  UpdateSurfaceLaboratoryDTO,
  UpdateSurfaceObjectiveDTO,
  UpdateSurfaceSampleDTO,
  UpdateSurfaceSampleResultDTO,
  UpdateSurfaceSampleWithResultsDTO,
} from "./surfaceSample.types.js";

const pg = (q: any) => {
  const p = Number(q.page ?? 1);
  const l = Number(q.limit ?? 20);
  return { p, l, skip: (p - 1) * l };
};

const toDate = (s?: string | null) => (s ? new Date(s) : null);

const FULL_SAMPLE_INCLUDE = {
  area: { select: { id: true, name: true, abbreviation: true } },
  objective: { select: { id: true, name: true } },
  results: {
    include: {
      element: { select: { id: true, name: true, symbol: true, defaultUnit: true } },
      laboratory: { select: { id: true, name: true, abbreviation: true } },
    },
    orderBy: { createdAt: "asc" as const },
  },
} as const;

export const surfaceSampleService = {

  // ─── SurfaceArea ──────────────────────────────────────────────────────────
  async getSurfaceAreas(query: SurfaceAreaQuery) {
    const { p, l, skip } = pg(query);
    const where: any = {};
    if (query.search)
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" as const } },
        { abbreviation: { contains: query.search, mode: "insensitive" as const } },
      ];
    const [data, total] = await Promise.all([
      prisma.surfaceArea.findMany({
        where,
        skip,
        take: l,
        orderBy: { name: "asc" },
        include: { _count: { select: { samples: true } } },
      }),
      prisma.surfaceArea.count({ where }),
    ]);
    return { data, meta: { page: p, limit: l, total, totalPages: Math.ceil(total / l) } };
  },

  async getSurfaceAreaById(id: string) {
    const area = await prisma.surfaceArea.findUnique({ where: { id } });
    if (!area) throw new HttpError("Surface area not found", 404);
    return area;
  },

  async createSurfaceArea(data: CreateSurfaceAreaDTO, userId?: number) {
    const existing = await prisma.surfaceArea.findUnique({ where: { abbreviation: data.abbreviation } });
    if (existing) throw new HttpError(`Area abbreviation '${data.abbreviation}' already exists`, 409);
    const area = await prisma.surfaceArea.create({
      data: { ...data, createdById: userId, updatedById: userId } as any,
    });
    logger.info({ areaId: area.id, userId }, "SurfaceArea created");
    return area;
  },

  async updateSurfaceArea(id: string, data: UpdateSurfaceAreaDTO, userId?: number) {
    await this.getSurfaceAreaById(id);
    if (data.abbreviation) {
      const existing = await prisma.surfaceArea.findUnique({ where: { abbreviation: data.abbreviation } });
      if (existing && existing.id !== id)
        throw new HttpError(`Area abbreviation '${data.abbreviation}' already exists`, 409);
    }
    const updated = await prisma.surfaceArea.update({
      where: { id },
      data: { ...data, updatedById: userId } as any,
    });
    logger.info({ areaId: id, userId }, "SurfaceArea updated");
    return updated;
  },

  async deleteSurfaceArea(id: string) {
    await this.getSurfaceAreaById(id);
    return prisma.surfaceArea.delete({ where: { id } });
  },

  // ─── SurfaceObjective ─────────────────────────────────────────────────────
  async getSurfaceObjectives(query: SurfaceObjectiveQuery) {
    const { p, l, skip } = pg(query);
    const where: any = {};
    if (query.search) where.name = { contains: query.search, mode: "insensitive" as const };
    const [data, total] = await Promise.all([
      prisma.surfaceObjective.findMany({ where, skip, take: l, orderBy: { name: "asc" } }),
      prisma.surfaceObjective.count({ where }),
    ]);
    return { data, meta: { page: p, limit: l, total, totalPages: Math.ceil(total / l) } };
  },

  async getSurfaceObjectiveById(id: string) {
    const obj = await prisma.surfaceObjective.findUnique({ where: { id } });
    if (!obj) throw new HttpError("Surface objective not found", 404);
    return obj;
  },

  async createSurfaceObjective(data: CreateSurfaceObjectiveDTO, userId?: number) {
    const existing = await prisma.surfaceObjective.findUnique({ where: { name: data.name } });
    if (existing) throw new HttpError(`Objective '${data.name}' already exists`, 409);
    const obj = await prisma.surfaceObjective.create({
      data: { ...data, createdById: userId, updatedById: userId } as any,
    });
    logger.info({ objectiveId: obj.id, userId }, "SurfaceObjective created");
    return obj;
  },

  async updateSurfaceObjective(id: string, data: UpdateSurfaceObjectiveDTO, userId?: number) {
    await this.getSurfaceObjectiveById(id);
    if (data.name) {
      const existing = await prisma.surfaceObjective.findUnique({ where: { name: data.name } });
      if (existing && existing.id !== id)
        throw new HttpError(`Objective '${data.name}' already exists`, 409);
    }
    const updated = await prisma.surfaceObjective.update({
      where: { id },
      data: { ...data, updatedById: userId } as any,
    });
    logger.info({ objectiveId: id, userId }, "SurfaceObjective updated");
    return updated;
  },

  async deleteSurfaceObjective(id: string) {
    await this.getSurfaceObjectiveById(id);
    return prisma.surfaceObjective.delete({ where: { id } });
  },

  // ─── SurfaceLaboratory ────────────────────────────────────────────────────
  async getSurfaceLaboratories(query: SurfaceLaboratoryQuery) {
    const { p, l, skip } = pg(query);
    const where: any = {};
    if (query.search) where.name = { contains: query.search, mode: "insensitive" as const };
    const [data, total] = await Promise.all([
      prisma.surfaceLaboratory.findMany({ where, skip, take: l, orderBy: { name: "asc" } }),
      prisma.surfaceLaboratory.count({ where }),
    ]);
    return { data, meta: { page: p, limit: l, total, totalPages: Math.ceil(total / l) } };
  },

  async getSurfaceLaboratoryById(id: string) {
    const lab = await prisma.surfaceLaboratory.findUnique({ where: { id } });
    if (!lab) throw new HttpError("Surface laboratory not found", 404);
    return lab;
  },

  async createSurfaceLaboratory(data: CreateSurfaceLaboratoryDTO, userId?: number) {
    const existing = await prisma.surfaceLaboratory.findUnique({ where: { name: data.name } });
    if (existing) throw new HttpError(`Laboratory '${data.name}' already exists`, 409);
    const lab = await prisma.surfaceLaboratory.create({
      data: { ...data, createdById: userId, updatedById: userId } as any,
    });
    logger.info({ labId: lab.id, userId }, "SurfaceLaboratory created");
    return lab;
  },

  async updateSurfaceLaboratory(id: string, data: UpdateSurfaceLaboratoryDTO, userId?: number) {
    await this.getSurfaceLaboratoryById(id);
    if (data.name) {
      const existing = await prisma.surfaceLaboratory.findUnique({ where: { name: data.name } });
      if (existing && existing.id !== id)
        throw new HttpError(`Laboratory '${data.name}' already exists`, 409);
    }
    const updated = await prisma.surfaceLaboratory.update({
      where: { id },
      data: { ...data, updatedById: userId } as any,
    });
    logger.info({ labId: id, userId }, "SurfaceLaboratory updated");
    return updated;
  },

  async deleteSurfaceLaboratory(id: string) {
    await this.getSurfaceLaboratoryById(id);
    return prisma.surfaceLaboratory.delete({ where: { id } });
  },

  // ─── SurfaceSample (basic) ────────────────────────────────────────────────
  async getSurfaceSamples(query: SurfaceSampleQuery) {
    const { p, l, skip } = pg(query);
    const where: any = {};
    if (query.surfaceAreaId) where.surfaceAreaId = query.surfaceAreaId;
    if (query.surfaceObjectiveId) where.surfaceObjectiveId = query.surfaceObjectiveId;
    if (query.search) where.code = { contains: query.search, mode: "insensitive" as const };
    const [data, total] = await Promise.all([
      prisma.surfaceSample.findMany({
        where,
        skip,
        take: l,
        orderBy: { code: "asc" },
        include: FULL_SAMPLE_INCLUDE,
      }),
      prisma.surfaceSample.count({ where }),
    ]);
    return { data, meta: { page: p, limit: l, total, totalPages: Math.ceil(total / l) } };
  },

  async getSurfaceSampleById(id: string) {
    const sample = await prisma.surfaceSample.findUnique({
      where: { id },
      include: FULL_SAMPLE_INCLUDE,
    });
    if (!sample) throw new HttpError("Surface sample not found", 404);
    return sample;
  },

  async createSurfaceSample(data: CreateSurfaceSampleDTO, userId?: number) {
    const area = await prisma.surfaceArea.findUnique({ where: { id: data.surfaceAreaId } });
    if (!area) throw new HttpError("Surface area not found", 404);
    const objective = await prisma.surfaceObjective.findUnique({ where: { id: data.surfaceObjectiveId } });
    if (!objective) throw new HttpError("Surface objective not found", 404);

    return prisma.$transaction(async (tx) => {
      const count = await tx.surfaceSample.count({ where: { surfaceAreaId: data.surfaceAreaId } });
      const sequentialNumber = count + 1;
      const code = `${area.abbreviation}/${String(sequentialNumber).padStart(3, "0")}`;
      const sample = await tx.surfaceSample.create({
        data: {
          ...data,
          code,
          sequentialNumber,
          sampledAt: toDate(data.sampledAt),
          createdById: userId,
          updatedById: userId,
        } as any,
      });
      logger.info({ sampleId: sample.id, code, userId }, "SurfaceSample created");
      return tx.surfaceSample.findUnique({ where: { id: sample.id }, include: FULL_SAMPLE_INCLUDE });
    });
  },

  async updateSurfaceSample(id: string, data: UpdateSurfaceSampleDTO, userId?: number) {
    await this.getSurfaceSampleById(id);
    if (data.surfaceObjectiveId) {
      const obj = await prisma.surfaceObjective.findUnique({ where: { id: data.surfaceObjectiveId } });
      if (!obj) throw new HttpError("Surface objective not found", 404);
    }
    const updated = await prisma.surfaceSample.update({
      where: { id },
      data: {
        ...data,
        sampledAt: data.sampledAt !== undefined ? toDate(data.sampledAt) : undefined,
        updatedById: userId,
      } as any,
      include: FULL_SAMPLE_INCLUDE,
    });
    logger.info({ sampleId: id, userId }, "SurfaceSample updated");
    return updated;
  },

  async deleteSurfaceSample(id: string) {
    await this.getSurfaceSampleById(id);
    return prisma.$transaction(async (tx) => {
      await tx.surfaceSampleResult.deleteMany({ where: { surfaceSampleId: id } });
      return tx.surfaceSample.delete({ where: { id } });
    });
  },

  // ─── SurfaceSample with results (transaction) ─────────────────────────────
  async createSurfaceSampleWithResults(data: CreateSurfaceSampleWithResultsDTO, userId?: number) {
    const area = await prisma.surfaceArea.findUnique({ where: { id: data.surfaceAreaId } });
    if (!area) throw new HttpError("Surface area not found", 404);
    const objective = await prisma.surfaceObjective.findUnique({ where: { id: data.surfaceObjectiveId } });
    if (!objective) throw new HttpError("Surface objective not found", 404);

    if (data.results.length > 0) {
      const elementIds = [...new Set(data.results.map((r) => r.elementId))];
      const elements = await prisma.element.findMany({ where: { id: { in: elementIds } } });
      if (elements.length !== elementIds.length)
        throw new HttpError("One or more elements not found", 404);

      const existingLabIds = data.results.flatMap((r) => (r.surfaceLaboratoryId ? [r.surfaceLaboratoryId] : []));
      if (existingLabIds.length > 0) {
        const labs = await prisma.surfaceLaboratory.findMany({ where: { id: { in: existingLabIds } } });
        if (labs.length !== new Set(existingLabIds).size)
          throw new HttpError("One or more surface laboratories not found", 404);
      }
    }

    const { results: resultsData, ...sampleFields } = data;

    return prisma.$transaction(async (tx) => {
      const count = await tx.surfaceSample.count({ where: { surfaceAreaId: data.surfaceAreaId } });
      const sequentialNumber = count + 1;
      const code = `${area.abbreviation}/${String(sequentialNumber).padStart(3, "0")}`;

      const sample = await tx.surfaceSample.create({
        data: {
          ...sampleFields,
          code,
          sequentialNumber,
          sampledAt: toDate(sampleFields.sampledAt),
          createdById: userId,
          updatedById: userId,
        } as any,
      });

      for (const rData of resultsData) {
        let laboratoryId = rData.surfaceLaboratoryId;
        if (!laboratoryId && rData.laboratory) {
          const lab = await tx.surfaceLaboratory.upsert({
            where: { name: rData.laboratory.name },
            create: { ...rData.laboratory, createdById: userId, updatedById: userId } as any,
            update: {},
          });
          laboratoryId = lab.id;
        }
        const { laboratory: _lab, ...resultFields } = rData;
        await tx.surfaceSampleResult.create({
          data: {
            ...resultFields,
            surfaceSampleId: sample.id,
            surfaceLaboratoryId: laboratoryId ?? null,
            createdById: userId,
            updatedById: userId,
          } as any,
        });
      }

      logger.info(
        { sampleId: sample.id, code, resultCount: resultsData.length, userId },
        "SurfaceSample with results created",
      );

      return tx.surfaceSample.findUnique({ where: { id: sample.id }, include: FULL_SAMPLE_INCLUDE });
    });
  },

  async updateSurfaceSampleWithResults(id: string, data: UpdateSurfaceSampleWithResultsDTO, userId?: number) {
    await this.getSurfaceSampleById(id);
    if (data.surfaceObjectiveId) {
      const obj = await prisma.surfaceObjective.findUnique({ where: { id: data.surfaceObjectiveId } });
      if (!obj) throw new HttpError("Surface objective not found", 404);
    }
    if (data.results && data.results.length > 0) {
      const elementIds = [...new Set(data.results.map((r) => r.elementId))];
      const elements = await prisma.element.findMany({ where: { id: { in: elementIds } } });
      if (elements.length !== elementIds.length)
        throw new HttpError("One or more elements not found", 404);

      const existingLabIds = data.results.flatMap((r) => (r.surfaceLaboratoryId ? [r.surfaceLaboratoryId] : []));
      if (existingLabIds.length > 0) {
        const labs = await prisma.surfaceLaboratory.findMany({ where: { id: { in: existingLabIds } } });
        if (labs.length !== new Set(existingLabIds).size)
          throw new HttpError("One or more surface laboratories not found", 404);
      }
    }

    const { results: resultsData, ...sampleFields } = data;

    return prisma.$transaction(async (tx) => {
      await tx.surfaceSample.update({
        where: { id },
        data: {
          ...sampleFields,
          sampledAt: sampleFields.sampledAt !== undefined ? toDate(sampleFields.sampledAt) : undefined,
          updatedById: userId,
        } as any,
      });

      if (resultsData !== undefined) {
        await tx.surfaceSampleResult.deleteMany({ where: { surfaceSampleId: id } });
        for (const rData of resultsData) {
          let laboratoryId = rData.surfaceLaboratoryId;
          if (!laboratoryId && rData.laboratory) {
            const lab = await tx.surfaceLaboratory.upsert({
              where: { name: rData.laboratory.name },
              create: { ...rData.laboratory, createdById: userId, updatedById: userId } as any,
              update: {},
            });
            laboratoryId = lab.id;
          }
          const { laboratory: _lab, ...resultFields } = rData;
          await tx.surfaceSampleResult.create({
            data: {
              ...resultFields,
              surfaceSampleId: id,
              surfaceLaboratoryId: laboratoryId ?? null,
              createdById: userId,
              updatedById: userId,
            } as any,
          });
        }
      }

      logger.info({ sampleId: id, userId }, "SurfaceSample with results updated");
      return tx.surfaceSample.findUnique({ where: { id }, include: FULL_SAMPLE_INCLUDE });
    });
  },

  // ─── SurfaceSampleResult ──────────────────────────────────────────────────
  async getSurfaceSampleResults(query: SurfaceSampleResultQuery) {
    const { p, l, skip } = pg(query);
    const where: any = {};
    if (query.surfaceSampleId) where.surfaceSampleId = query.surfaceSampleId;
    if (query.elementId) where.elementId = query.elementId;
    if (query.surfaceLaboratoryId) where.surfaceLaboratoryId = query.surfaceLaboratoryId;
    const [data, total] = await Promise.all([
      prisma.surfaceSampleResult.findMany({
        where,
        skip,
        take: l,
        orderBy: { createdAt: "asc" },
        include: {
          element: { select: { id: true, name: true, symbol: true, defaultUnit: true } },
          sample: { select: { id: true, code: true } },
          laboratory: { select: { id: true, name: true, abbreviation: true } },
        },
      }),
      prisma.surfaceSampleResult.count({ where }),
    ]);
    return { data, meta: { page: p, limit: l, total, totalPages: Math.ceil(total / l) } };
  },

  async getSurfaceSampleResultById(id: string) {
    const result = await prisma.surfaceSampleResult.findUnique({
      where: { id },
      include: {
        element: true,
        sample: { select: { id: true, code: true } },
        laboratory: true,
      },
    });
    if (!result) throw new HttpError("Surface sample result not found", 404);
    return result;
  },

  async createSurfaceSampleResult(data: CreateSurfaceSampleResultDTO, userId?: number) {
    const [sample, element] = await Promise.all([
      prisma.surfaceSample.findUnique({ where: { id: data.surfaceSampleId } }),
      prisma.element.findUnique({ where: { id: data.elementId } }),
    ]);
    if (!sample) throw new HttpError("Surface sample not found", 404);
    if (!element) throw new HttpError("Element not found", 404);
    if (data.surfaceLaboratoryId) {
      const lab = await prisma.surfaceLaboratory.findUnique({ where: { id: data.surfaceLaboratoryId } });
      if (!lab) throw new HttpError("Surface laboratory not found", 404);
    }
    const clash = await prisma.surfaceSampleResult.findUnique({
      where: { surfaceSampleId_elementId: { surfaceSampleId: data.surfaceSampleId, elementId: data.elementId } },
    });
    if (clash) throw new HttpError("Result for this element already exists in this sample", 409);
    const result = await prisma.surfaceSampleResult.create({
      data: { ...data, createdById: userId, updatedById: userId } as any,
    });
    logger.info({ resultId: result.id, userId }, "SurfaceSampleResult created");
    return result;
  },

  async updateSurfaceSampleResult(id: string, data: UpdateSurfaceSampleResultDTO, userId?: number) {
    const current = await this.getSurfaceSampleResultById(id);
    if (data.elementId && data.elementId !== current.elementId) {
      const el = await prisma.element.findUnique({ where: { id: data.elementId } });
      if (!el) throw new HttpError("Element not found", 404);
      const clash = await prisma.surfaceSampleResult.findUnique({
        where: { surfaceSampleId_elementId: { surfaceSampleId: current.surfaceSampleId, elementId: data.elementId } },
      });
      if (clash && clash.id !== id)
        throw new HttpError("Result for this element already exists in this sample", 409);
    }
    if (data.surfaceLaboratoryId) {
      const lab = await prisma.surfaceLaboratory.findUnique({ where: { id: data.surfaceLaboratoryId } });
      if (!lab) throw new HttpError("Surface laboratory not found", 404);
    }
    const updated = await prisma.surfaceSampleResult.update({
      where: { id },
      data: { ...data, updatedById: userId } as any,
    });
    logger.info({ resultId: id, userId }, "SurfaceSampleResult updated");
    return updated;
  },

  async deleteSurfaceSampleResult(id: string) {
    await this.getSurfaceSampleResultById(id);
    return prisma.surfaceSampleResult.delete({ where: { id } });
  },
};
