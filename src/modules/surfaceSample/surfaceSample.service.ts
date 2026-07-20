import { prisma } from "../../config/prisma.js";
import { logger } from "../../config/logger.js";
import { HttpError } from "../../errors/http.error.js";
import type {
  CreateSurfaceAreaDTO,
  CreateSurfaceDispatchDTO,
  CreateSurfaceLabAssignmentDTO,
  CreateSurfaceLaborDTO,
  CreateSurfaceLaboratoryDTO,
  CreateSurfaceLevelDTO,
  CreateSurfaceObjectiveDTO,
  CreateSurfaceSampleDTO,
  CreateSurfaceSampleResultDTO,
  CreateSurfaceSampleWithResultsDTO,
  SurfaceAreaQuery,
  SurfaceDispatchQuery,
  SurfaceLabAssignmentQuery,
  SurfaceLaborQuery,
  SurfaceLaboratoryQuery,
  SurfaceLevelQuery,
  SurfaceObjectiveQuery,
  SurfaceSampleQuery,
  SurfaceSampleResultQuery,
  UpdateSurfaceAreaDTO,
  UpdateSurfaceDispatchDTO,
  UpdateSurfaceLabAssignmentDTO,
  UpdateSurfaceLaborDTO,
  UpdateSurfaceLaboratoryDTO,
  UpdateSurfaceLevelDTO,
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
  labor: {
    include: {
      level: { include: { area: { select: { id: true, name: true, abbreviation: true } } } },
    },
  },
  objective: { select: { id: true, name: true } },
  createdBy: { select: { id: true, nombre: true } },
  labAssignments: {
    include: {
      laboratory: { select: { id: true, name: true, abbreviation: true } },
      results: {
        include: { element: { select: { id: true, name: true, symbol: true, defaultUnit: true } } },
        orderBy: { createdAt: "asc" as const },
      },
    },
    orderBy: { createdAt: "asc" as const },
  },
} as const;

const DISPATCH_INCLUDE = {
  laboratory: { select: { id: true, name: true, abbreviation: true } },
  createdBy: { select: { id: true, nombre: true } },
  items: {
    include: {
      sample: { select: { id: true, code: true, name: true, status: true, category: true } },
      requestedElements: {
        include: { element: { select: { id: true, name: true, symbol: true, defaultUnit: true } } },
      },
    },
    orderBy: { createdAt: "asc" as const },
  },
} as const;

async function handleSurfaceSampleDelivered(sampleId: string, tx: any) {
  await tx.surfaceSample.update({
    where: { id: sampleId },
    data: { status: "COMPLETED" },
  });

  const items = await tx.surfaceDispatchItem.findMany({
    where: { surfaceSampleId: sampleId, status: "PENDING" },
    select: { id: true, dispatchId: true },
  });

  if (items.length === 0) return;

  await tx.surfaceDispatchItem.updateMany({
    where: { surfaceSampleId: sampleId, status: "PENDING" },
    data: { status: "COMPLETED" },
  });

  const dispatchIds = [...new Set(items.map((i: any) => i.dispatchId))];
  for (const dispatchId of dispatchIds) {
    const pendingCount = await tx.surfaceDispatchItem.count({
      where: { dispatchId, status: "PENDING" },
    });
    if (pendingCount === 0) {
      await tx.surfaceSampleDispatch.update({
        where: { id: dispatchId },
        data: { status: "COMPLETED" },
      });
    }
  }
}

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
        include: { levels: { select: { id: true, name: true, abbreviation: true } } },
      }),
      prisma.surfaceArea.count({ where }),
    ]);
    return { data, meta: { page: p, limit: l, total, totalPages: Math.ceil(total / l) } };
  },

  async getSurfaceAreaById(id: string) {
    const area = await prisma.surfaceArea.findUnique({
      where: { id },
      include: {
        levels: {
          include: { labors: { select: { id: true, name: true, abbreviation: true } } },
        },
      },
    });
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

  // ─── SurfaceLevel ─────────────────────────────────────────────────────────
  async getSurfaceLevels(query: SurfaceLevelQuery) {
    const { p, l, skip } = pg(query);
    const where: any = {};
    if (query.surfaceAreaId) where.surfaceAreaId = query.surfaceAreaId;
    if (query.search)
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" as const } },
        { abbreviation: { contains: query.search, mode: "insensitive" as const } },
      ];
    const [data, total] = await Promise.all([
      prisma.surfaceLevel.findMany({
        where,
        skip,
        take: l,
        orderBy: { name: "asc" },
        include: { area: { select: { id: true, name: true, abbreviation: true } } },
      }),
      prisma.surfaceLevel.count({ where }),
    ]);
    return { data, meta: { page: p, limit: l, total, totalPages: Math.ceil(total / l) } };
  },

  async getSurfaceLevelById(id: string) {
    const level = await prisma.surfaceLevel.findUnique({
      where: { id },
      include: {
        area: { select: { id: true, name: true, abbreviation: true } },
        labors: { select: { id: true, name: true, abbreviation: true } },
      },
    });
    if (!level) throw new HttpError("Surface level not found", 404);
    return level;
  },

  async createSurfaceLevel(data: CreateSurfaceLevelDTO, userId?: number) {
    const area = await prisma.surfaceArea.findUnique({ where: { id: data.surfaceAreaId } });
    if (!area) throw new HttpError("Surface area not found", 404);
    const existing = await prisma.surfaceLevel.findUnique({
      where: { surfaceAreaId_abbreviation: { surfaceAreaId: data.surfaceAreaId, abbreviation: data.abbreviation } },
    });
    if (existing) throw new HttpError(`Level abbreviation '${data.abbreviation}' already exists in this area`, 409);
    const level = await prisma.surfaceLevel.create({
      data: { ...data, createdById: userId, updatedById: userId } as any,
    });
    logger.info({ levelId: level.id, userId }, "SurfaceLevel created");
    return level;
  },

  async updateSurfaceLevel(id: string, data: UpdateSurfaceLevelDTO, userId?: number) {
    const current = await this.getSurfaceLevelById(id);
    if (data.surfaceAreaId) {
      const area = await prisma.surfaceArea.findUnique({ where: { id: data.surfaceAreaId } });
      if (!area) throw new HttpError("Surface area not found", 404);
    }
    if (data.abbreviation) {
      const areaId = data.surfaceAreaId ?? current.surfaceAreaId;
      const clash = await prisma.surfaceLevel.findUnique({
        where: { surfaceAreaId_abbreviation: { surfaceAreaId: areaId, abbreviation: data.abbreviation } },
      });
      if (clash && clash.id !== id)
        throw new HttpError(`Level abbreviation '${data.abbreviation}' already exists in this area`, 409);
    }
    const updated = await prisma.surfaceLevel.update({
      where: { id },
      data: { ...data, updatedById: userId } as any,
    });
    logger.info({ levelId: id, userId }, "SurfaceLevel updated");
    return updated;
  },

  async deleteSurfaceLevel(id: string) {
    await this.getSurfaceLevelById(id);
    return prisma.surfaceLevel.delete({ where: { id } });
  },

  // ─── SurfaceLabor ─────────────────────────────────────────────────────────
  async getSurfaceLabors(query: SurfaceLaborQuery) {
    const { p, l, skip } = pg(query);
    const where: any = {};
    if (query.surfaceLevelId) where.surfaceLevelId = query.surfaceLevelId;
    if (query.search)
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" as const } },
        { abbreviation: { contains: query.search, mode: "insensitive" as const } },
      ];
    const [data, total] = await Promise.all([
      prisma.surfaceLabor.findMany({
        where,
        skip,
        take: l,
        orderBy: { name: "asc" },
        include: {
          level: {
            include: { area: { select: { id: true, name: true, abbreviation: true } } },
          },
        },
      }),
      prisma.surfaceLabor.count({ where }),
    ]);
    return { data, meta: { page: p, limit: l, total, totalPages: Math.ceil(total / l) } };
  },

  async getSurfaceLaborById(id: string) {
    const labor = await prisma.surfaceLabor.findUnique({
      where: { id },
      include: {
        level: { include: { area: { select: { id: true, name: true, abbreviation: true } } } },
      },
    });
    if (!labor) throw new HttpError("Surface labor not found", 404);
    return labor;
  },

  async createSurfaceLabor(data: CreateSurfaceLaborDTO, userId?: number) {
    const level = await prisma.surfaceLevel.findUnique({ where: { id: data.surfaceLevelId } });
    if (!level) throw new HttpError("Surface level not found", 404);
    const existing = await prisma.surfaceLabor.findUnique({
      where: { surfaceLevelId_abbreviation: { surfaceLevelId: data.surfaceLevelId, abbreviation: data.abbreviation } },
    });
    if (existing) throw new HttpError(`Labor abbreviation '${data.abbreviation}' already exists in this level`, 409);
    const labor = await prisma.surfaceLabor.create({
      data: { ...data, createdById: userId, updatedById: userId } as any,
    });
    logger.info({ laborId: labor.id, userId }, "SurfaceLabor created");
    return labor;
  },

  async updateSurfaceLabor(id: string, data: UpdateSurfaceLaborDTO, userId?: number) {
    const current = await this.getSurfaceLaborById(id);
    if (data.surfaceLevelId) {
      const level = await prisma.surfaceLevel.findUnique({ where: { id: data.surfaceLevelId } });
      if (!level) throw new HttpError("Surface level not found", 404);
    }
    if (data.abbreviation) {
      const levelId = data.surfaceLevelId ?? current.surfaceLevelId;
      const clash = await prisma.surfaceLabor.findUnique({
        where: { surfaceLevelId_abbreviation: { surfaceLevelId: levelId, abbreviation: data.abbreviation } },
      });
      if (clash && clash.id !== id)
        throw new HttpError(`Labor abbreviation '${data.abbreviation}' already exists in this level`, 409);
    }
    const updated = await prisma.surfaceLabor.update({
      where: { id },
      data: { ...data, updatedById: userId } as any,
    });
    logger.info({ laborId: id, userId }, "SurfaceLabor updated");
    return updated;
  },

  async deleteSurfaceLabor(id: string) {
    await this.getSurfaceLaborById(id);
    return prisma.surfaceLabor.delete({ where: { id } });
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

  // ─── SurfaceLabAssignment ─────────────────────────────────────────────────
  async getSurfaceLabAssignments(query: SurfaceLabAssignmentQuery) {
    const { p, l, skip } = pg(query);
    const where: any = {};
    if (query.surfaceSampleId) where.surfaceSampleId = query.surfaceSampleId;
    if (query.surfaceLaboratoryId) where.surfaceLaboratoryId = query.surfaceLaboratoryId;
    const [data, total] = await Promise.all([
      prisma.surfaceLabAssignment.findMany({
        where,
        skip,
        take: l,
        orderBy: { createdAt: "asc" },
        include: {
          sample: { select: { id: true, code: true } },
          laboratory: { select: { id: true, name: true, abbreviation: true } },
          results: {
            include: { element: { select: { id: true, name: true, symbol: true, defaultUnit: true } } },
          },
        },
      }),
      prisma.surfaceLabAssignment.count({ where }),
    ]);
    return { data, meta: { page: p, limit: l, total, totalPages: Math.ceil(total / l) } };
  },

  async getSurfaceLabAssignmentById(id: string) {
    const la = await prisma.surfaceLabAssignment.findUnique({
      where: { id },
      include: {
        sample: { select: { id: true, code: true } },
        laboratory: true,
        results: {
          include: { element: { select: { id: true, name: true, symbol: true, defaultUnit: true } } },
        },
      },
    });
    if (!la) throw new HttpError("Surface lab assignment not found", 404);
    return la;
  },

  async createSurfaceLabAssignment(data: CreateSurfaceLabAssignmentDTO, userId?: number) {
    const [sample, lab] = await Promise.all([
      prisma.surfaceSample.findUnique({ where: { id: data.surfaceSampleId } }),
      prisma.surfaceLaboratory.findUnique({ where: { id: data.surfaceLaboratoryId } }),
    ]);
    if (!sample) throw new HttpError("Surface sample not found", 404);
    if (!lab) throw new HttpError("Surface laboratory not found", 404);
    const clash = await prisma.surfaceLabAssignment.findUnique({
      where: { surfaceSampleId_surfaceLaboratoryId: { surfaceSampleId: data.surfaceSampleId, surfaceLaboratoryId: data.surfaceLaboratoryId } },
    });
    if (clash) throw new HttpError("This laboratory is already assigned to this sample", 409);
    const la = await prisma.surfaceLabAssignment.create({
      data: { ...data, createdById: userId, updatedById: userId } as any,
    });
    logger.info({ laId: la.id, userId }, "SurfaceLabAssignment created");
    return la;
  },

  async updateSurfaceLabAssignment(id: string, data: UpdateSurfaceLabAssignmentDTO, userId?: number) {
    const current = await this.getSurfaceLabAssignmentById(id);
    if (data.surfaceLaboratoryId) {
      const lab = await prisma.surfaceLaboratory.findUnique({ where: { id: data.surfaceLaboratoryId } });
      if (!lab) throw new HttpError("Surface laboratory not found", 404);
      const clash = await prisma.surfaceLabAssignment.findUnique({
        where: { surfaceSampleId_surfaceLaboratoryId: { surfaceSampleId: current.surfaceSampleId, surfaceLaboratoryId: data.surfaceLaboratoryId } },
      });
      if (clash && clash.id !== id)
        throw new HttpError("This laboratory is already assigned to this sample", 409);
    }
    const updated = await prisma.surfaceLabAssignment.update({
      where: { id },
      data: { ...data, updatedById: userId } as any,
    });
    logger.info({ laId: id, userId }, "SurfaceLabAssignment updated");
    return updated;
  },

  async deleteSurfaceLabAssignment(id: string) {
    await this.getSurfaceLabAssignmentById(id);
    return prisma.$transaction(async (tx) => {
      await tx.surfaceSampleResult.deleteMany({ where: { surfaceLabAssignmentId: id } });
      return tx.surfaceLabAssignment.delete({ where: { id } });
    });
  },

  // ─── SurfaceSample (básico) ───────────────────────────────────────────────
  async getSurfaceSamples(query: SurfaceSampleQuery) {
    const { p, l, skip } = pg(query);
    const where: any = {};
    if (query.surfaceLaborId) where.surfaceLaborId = query.surfaceLaborId;
    if (query.surfaceObjectiveId) where.surfaceObjectiveId = query.surfaceObjectiveId;
    if (query.createdById) where.createdById = query.createdById;
    if (query.priority) where.priority = query.priority;
    if (query.category) where.category = query.category;
    if (query.status) where.status = query.status;
    if (query.search) where.code = { contains: query.search, mode: "insensitive" as const };
    const [rows, total] = await Promise.all([
      prisma.surfaceSample.findMany({
        where,
        skip,
        take: l,
        orderBy: { code: "asc" },
        include: FULL_SAMPLE_INCLUDE,
      }),
      prisma.surfaceSample.count({ where }),
    ]);
    return { data: rows, meta: { page: p, limit: l, total, totalPages: Math.ceil(total / l) } };
  },

  async getSurfaceExplorationSamples(query: SurfaceSampleQuery) {
    return this.getSurfaceSamples({ ...query, category: "EXPLORATION" as const });
  },

  async getSurfaceProductionSamples(query: SurfaceSampleQuery) {
    return this.getSurfaceSamples({ ...query, category: "PRODUCTION" as const });
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
    const labor = await prisma.surfaceLabor.findUnique({
      where: { id: data.surfaceLaborId },
      include: { level: { include: { area: true } } },
    });
    if (!labor) throw new HttpError("Surface labor not found", 404);
    const objective = await prisma.surfaceObjective.findUnique({ where: { id: data.surfaceObjectiveId } });
    if (!objective) throw new HttpError("Surface objective not found", 404);

    return prisma.$transaction(async (tx) => {
      const category = data.category ?? "EXPLORATION";
      const prefix = category === "PRODUCTION" ? "M" : "EX";
      const count = await tx.surfaceSample.count({ where: { category } });
      const sequentialNumber = count + 1;
      const code = `${prefix}-${String(sequentialNumber).padStart(4, "0")}`;
      const sample = await tx.surfaceSample.create({
        data: {
          ...data,
          surfaceLevelId: labor.level.id,
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
      await tx.surfaceLabAssignment.deleteMany({ where: { surfaceSampleId: id } });
      return tx.surfaceSample.delete({ where: { id } });
    });
  },

  // ─── SurfaceSample con resultados (transacción) ───────────────────────────
  async createSurfaceSampleWithResults(data: CreateSurfaceSampleWithResultsDTO, userId?: number) {
    const labor = await prisma.surfaceLabor.findUnique({
      where: { id: data.surfaceLaborId },
      include: { level: { include: { area: true } } },
    });
    if (!labor) throw new HttpError("Surface labor not found", 404);
    const objective = await prisma.surfaceObjective.findUnique({ where: { id: data.surfaceObjectiveId } });
    if (!objective) throw new HttpError("Surface objective not found", 404);

    const existingLabIds = data.labAssignments.flatMap((la) => (la.surfaceLaboratoryId ? [la.surfaceLaboratoryId] : []));
    if (existingLabIds.length > 0) {
      const labs = await prisma.surfaceLaboratory.findMany({ where: { id: { in: existingLabIds } } });
      if (labs.length !== new Set(existingLabIds).size)
        throw new HttpError("One or more surface laboratories not found", 404);
    }

    const elementIds = [...new Set(data.labAssignments.flatMap((la) => la.results.map((r) => r.elementId)))];
    if (elementIds.length > 0) {
      const elements = await prisma.element.findMany({ where: { id: { in: elementIds } } });
      if (elements.length !== elementIds.length)
        throw new HttpError("One or more elements not found", 404);
    }

    const { labAssignments: labAssignmentsData, ...sampleFields } = data;

    return prisma.$transaction(async (tx) => {
      const category = sampleFields.category ?? "EXPLORATION";
      const prefix = category === "PRODUCTION" ? "M" : "EX";
      const count = await tx.surfaceSample.count({ where: { category } });
      const sequentialNumber = count + 1;
      const code = `${prefix}-${String(sequentialNumber).padStart(4, "0")}`;

      const sample = await tx.surfaceSample.create({
        data: {
          ...sampleFields,
          surfaceLevelId: labor.level.id,
          code,
          sequentialNumber,
          sampledAt: toDate(sampleFields.sampledAt),
          createdById: userId,
          updatedById: userId,
        } as any,
      });

      for (const laData of labAssignmentsData) {
        let laboratoryId = laData.surfaceLaboratoryId;
        if (!laboratoryId && laData.laboratory) {
          const lab = await tx.surfaceLaboratory.upsert({
            where: { name: laData.laboratory.name },
            create: { ...laData.laboratory, createdById: userId, updatedById: userId } as any,
            update: {},
          });
          laboratoryId = lab.id;
        }
        const assignment = await tx.surfaceLabAssignment.create({
          data: {
            surfaceSampleId: sample.id,
            surfaceLaboratoryId: laboratoryId!,
            createdById: userId,
            updatedById: userId,
          } as any,
        });

        for (const rData of laData.results) {
          await tx.surfaceSampleResult.create({
            data: {
              surfaceSampleId: sample.id,
              surfaceLabAssignmentId: assignment.id,
              elementId: rData.elementId,
              value: rData.value,
              unit: rData.unit,
              qualifier: rData.qualifier,
              comments: rData.comments,
              createdById: userId,
              updatedById: userId,
            } as any,
          });
        }
      }

      logger.info(
        { sampleId: sample.id, code, labCount: labAssignmentsData.length, userId },
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
    if (data.labAssignments) {
      const existingLabIds = data.labAssignments.flatMap((la) => (la.surfaceLaboratoryId ? [la.surfaceLaboratoryId] : []));
      if (existingLabIds.length > 0) {
        const labs = await prisma.surfaceLaboratory.findMany({ where: { id: { in: existingLabIds } } });
        if (labs.length !== new Set(existingLabIds).size)
          throw new HttpError("One or more surface laboratories not found", 404);
      }
      const elementIds = [...new Set(data.labAssignments.flatMap((la) => la.results.map((r) => r.elementId)))];
      if (elementIds.length > 0) {
        const elements = await prisma.element.findMany({ where: { id: { in: elementIds } } });
        if (elements.length !== elementIds.length)
          throw new HttpError("One or more elements not found", 404);
      }
    }

    const { labAssignments: labAssignmentsData, ...sampleFields } = data;

    return prisma.$transaction(async (tx) => {
      await tx.surfaceSample.update({
        where: { id },
        data: {
          ...sampleFields,
          sampledAt: sampleFields.sampledAt !== undefined ? toDate(sampleFields.sampledAt) : undefined,
          updatedById: userId,
        } as any,
      });

      if (labAssignmentsData !== undefined) {
        await tx.surfaceSampleResult.deleteMany({ where: { surfaceSampleId: id } });
        await tx.surfaceLabAssignment.deleteMany({ where: { surfaceSampleId: id } });

        for (const laData of labAssignmentsData) {
          let laboratoryId = laData.surfaceLaboratoryId;
          if (!laboratoryId && laData.laboratory) {
            const lab = await tx.surfaceLaboratory.upsert({
              where: { name: laData.laboratory.name },
              create: { ...laData.laboratory, createdById: userId, updatedById: userId } as any,
              update: {},
            });
            laboratoryId = lab.id;
          }
          const assignment = await tx.surfaceLabAssignment.create({
            data: {
              surfaceSampleId: id,
              surfaceLaboratoryId: laboratoryId!,
              createdById: userId,
              updatedById: userId,
            } as any,
          });

          for (const rData of laData.results) {
            await tx.surfaceSampleResult.create({
              data: {
                surfaceSampleId: id,
                surfaceLabAssignmentId: assignment.id,
                elementId: rData.elementId,
                value: rData.value,
                unit: rData.unit,
                qualifier: rData.qualifier,
                comments: rData.comments,
                createdById: userId,
                updatedById: userId,
              } as any,
            });
          }
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
    if (query.surfaceLabAssignmentId) where.surfaceLabAssignmentId = query.surfaceLabAssignmentId;
    if (query.elementId) where.elementId = query.elementId;
    const [data, total] = await Promise.all([
      prisma.surfaceSampleResult.findMany({
        where,
        skip,
        take: l,
        orderBy: { createdAt: "asc" },
        include: {
          element: { select: { id: true, name: true, symbol: true, defaultUnit: true } },
          assignment: {
            include: { laboratory: { select: { id: true, name: true, abbreviation: true } } },
          },
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
        assignment: {
          include: {
            laboratory: { select: { id: true, name: true, abbreviation: true } },
            sample: { select: { id: true, code: true } },
          },
        },
      },
    });
    if (!result) throw new HttpError("Surface sample result not found", 404);
    return result;
  },

  async createSurfaceSampleResult(data: CreateSurfaceSampleResultDTO, userId?: number) {
    const assignment = await prisma.surfaceLabAssignment.findUnique({ where: { id: data.surfaceLabAssignmentId } });
    if (!assignment) throw new HttpError("Surface lab assignment not found", 404);
    const element = await prisma.element.findUnique({ where: { id: data.elementId } });
    if (!element) throw new HttpError("Element not found", 404);
    const clash = await prisma.surfaceSampleResult.findUnique({
      where: { surfaceLabAssignmentId_elementId: { surfaceLabAssignmentId: data.surfaceLabAssignmentId, elementId: data.elementId } },
    });
    if (clash) throw new HttpError("Result for this element already exists in this lab assignment", 409);

    return prisma.$transaction(async (tx) => {
      const result = await tx.surfaceSampleResult.create({
        data: {
          ...data,
          surfaceSampleId: assignment.surfaceSampleId,
          createdById: userId,
          updatedById: userId,
        } as any,
      });
      await handleSurfaceSampleDelivered(assignment.surfaceSampleId, tx);
      logger.info({ resultId: result.id, sampleId: assignment.surfaceSampleId, userId }, "SurfaceSampleResult created");
      return result;
    });
  },

  async updateSurfaceSampleResult(id: string, data: UpdateSurfaceSampleResultDTO, userId?: number) {
    const current = await this.getSurfaceSampleResultById(id);
    if (data.elementId && data.elementId !== current.elementId) {
      const el = await prisma.element.findUnique({ where: { id: data.elementId } });
      if (!el) throw new HttpError("Element not found", 404);
      const clash = await prisma.surfaceSampleResult.findUnique({
        where: { surfaceLabAssignmentId_elementId: { surfaceLabAssignmentId: current.surfaceLabAssignmentId, elementId: data.elementId } },
      });
      if (clash && clash.id !== id)
        throw new HttpError("Result for this element already exists in this lab assignment", 409);
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

  // ─── SurfaceDispatch (Nota de Remisión) ───────────────────────────────────
  async getSurfaceDispatches(query: SurfaceDispatchQuery) {
    const { p, l, skip } = pg(query);
    const where: any = {};
    if (query.surfaceLaboratoryId) where.surfaceLaboratoryId = query.surfaceLaboratoryId;
    if (query.status) where.status = query.status;
    const [data, total] = await Promise.all([
      prisma.surfaceSampleDispatch.findMany({
        where,
        skip,
        take: l,
        orderBy: { sentAt: "desc" },
        include: DISPATCH_INCLUDE,
      }),
      prisma.surfaceSampleDispatch.count({ where }),
    ]);
    return { data, meta: { page: p, limit: l, total, totalPages: Math.ceil(total / l) } };
  },

  async getSurfaceDispatchById(id: string) {
    const dispatch = await prisma.surfaceSampleDispatch.findUnique({
      where: { id },
      include: DISPATCH_INCLUDE,
    });
    if (!dispatch) throw new HttpError("Surface dispatch not found", 404);
    return dispatch;
  },

  async createSurfaceDispatch(data: CreateSurfaceDispatchDTO, userId?: number) {
    const lab = await prisma.surfaceLaboratory.findUnique({ where: { id: data.surfaceLaboratoryId } });
    if (!lab) throw new HttpError("Surface laboratory not found", 404);

    const sampleIds = data.items.map((i) => i.surfaceSampleId);
    const samples = await prisma.surfaceSample.findMany({ where: { id: { in: sampleIds } } });
    if (samples.length !== sampleIds.length)
      throw new HttpError("One or more samples not found", 404);

    const allElementIds = [...new Set(data.items.flatMap((i) => i.elementIds))];
    const elements = await prisma.element.findMany({ where: { id: { in: allElementIds } } });
    if (elements.length !== allElementIds.length)
      throw new HttpError("One or more elements not found", 404);

    return prisma.$transaction(async (tx) => {
      const dispatch = await tx.surfaceSampleDispatch.create({
        data: {
          surfaceLaboratoryId: data.surfaceLaboratoryId,
          projectName: data.projectName,
          sentAt: new Date(data.sentAt),
          notes: data.notes,
          createdById: userId,
          updatedById: userId,
        } as any,
      });

      for (const itemData of data.items) {
        const item = await tx.surfaceDispatchItem.create({
          data: {
            dispatchId: dispatch.id,
            surfaceSampleId: itemData.surfaceSampleId,
            notes: itemData.notes,
            createdById: userId,
            updatedById: userId,
          } as any,
        });

        for (const elementId of itemData.elementIds) {
          await tx.surfaceDispatchElement.create({
            data: { dispatchItemId: item.id, elementId } as any,
          });
        }

        await tx.surfaceSample.update({
          where: { id: itemData.surfaceSampleId },
          data: { status: "DISPATCHED", updatedById: userId } as any,
        });
      }

      logger.info({ dispatchId: dispatch.id, sampleCount: data.items.length, userId }, "SurfaceDispatch created");

      return tx.surfaceSampleDispatch.findUnique({ where: { id: dispatch.id }, include: DISPATCH_INCLUDE });
    });
  },

  async updateSurfaceDispatch(id: string, data: UpdateSurfaceDispatchDTO, userId?: number) {
    await this.getSurfaceDispatchById(id);
    return prisma.$transaction(async (tx) => {
      const updated = await tx.surfaceSampleDispatch.update({
        where: { id },
        data: {
          ...data,
          sentAt: data.sentAt ? new Date(data.sentAt) : undefined,
          updatedById: userId,
        } as any,
        include: DISPATCH_INCLUDE,
      });

      if (data.status === "COMPLETED") {
        const sampleIds = updated.items.map((i: any) => i.surfaceSampleId);
        if (sampleIds.length > 0) {
          await tx.surfaceDispatchItem.updateMany({
            where: { dispatchId: id, status: "PENDING" },
            data: { status: "COMPLETED" },
          });
          await tx.surfaceSample.updateMany({
            where: { id: { in: sampleIds } },
            data: { status: "COMPLETED" },
          });
        }
      }

      logger.info({ dispatchId: id, userId }, "SurfaceDispatch updated");
      return tx.surfaceSampleDispatch.findUnique({ where: { id }, include: DISPATCH_INCLUDE });
    });
  },

  async deleteSurfaceDispatch(id: string) {
    const dispatch = await this.getSurfaceDispatchById(id);
    if (dispatch.status === "COMPLETED")
      throw new HttpError("Cannot delete a completed dispatch", 409);

    return prisma.$transaction(async (tx) => {
      const sampleIds = dispatch.items.map((i: any) => i.surfaceSampleId);
      for (const sampleId of sampleIds) {
        const sample = await tx.surfaceSample.findUnique({ where: { id: sampleId }, select: { status: true } });
        if (sample?.status === "COMPLETED") continue;
        const otherDispatch = await tx.surfaceDispatchItem.findFirst({
          where: { surfaceSampleId: sampleId, dispatchId: { not: id } },
        });
        await tx.surfaceSample.update({
          where: { id: sampleId },
          data: { status: otherDispatch ? "DISPATCHED" : "REGISTERED" },
        });
      }
      return tx.surfaceSampleDispatch.delete({ where: { id } });
    });
  },

  // ─── Hierarchy ────────────────────────────────────────────────────────────
  async getSurfaceHierarchy() {
    const CATS = ["exploration", "production"] as const;
    const STAS = ["registered", "dispatched", "completed"] as const;
    const emptyCat = () => ({ registered: 0, dispatched: 0, completed: 0, total: 0 });
    const emptyTotals = () => ({ exploration: emptyCat(), production: emptyCat(), total: 0 });

    const [areas, counts] = await Promise.all([
      prisma.surfaceArea.findMany({
        orderBy: { name: "asc" },
        include: {
          levels: {
            orderBy: { name: "asc" },
            include: { labors: { orderBy: { name: "asc" } } },
          },
        },
      }),
      prisma.surfaceSample.groupBy({
        by: ["surfaceLaborId", "category", "status"],
        _count: { id: true },
      }),
    ]);

    // Map: laborId → { exploration/production → { registered/dispatched/completed → n } }
    const laborMap = new Map<string, Record<string, Record<string, number>>>();
    for (const row of counts) {
      const lid = row.surfaceLaborId;
      if (!laborMap.has(lid)) laborMap.set(lid, {});
      const cat = row.category.toLowerCase();
      const sta = row.status.toLowerCase();
      const entry = laborMap.get(lid)!;
      if (!entry[cat]) entry[cat] = {};
      entry[cat][sta] = row._count.id;
    }

    const getLaborTotals = (laborId: string) => {
      const raw = laborMap.get(laborId) || {};
      const t = emptyTotals();
      for (const cat of CATS) {
        for (const sta of STAS) {
          const n = raw[cat]?.[sta] || 0;
          t[cat][sta] += n;
          t[cat].total += n;
          t.total += n;
        }
      }
      return t;
    };

    const add = (
      a: ReturnType<typeof emptyTotals>,
      b: ReturnType<typeof emptyTotals>,
    ) => {
      for (const cat of CATS) {
        for (const sta of STAS) a[cat][sta] += b[cat][sta];
        a[cat].total += b[cat].total;
      }
      a.total += b.total;
    };

    return areas.map((area) => {
      const areaTotals = emptyTotals();
      const levels = area.levels.map((level) => {
        const levelTotals = emptyTotals();
        const labors = level.labors.map((labor) => {
          const t = getLaborTotals(labor.id);
          add(levelTotals, t);
          return {
            id: labor.id,
            name: labor.name,
            abbreviation: labor.abbreviation,
            description: labor.description,
            samples: t,
          };
        });
        add(areaTotals, levelTotals);
        return {
          id: level.id,
          name: level.name,
          abbreviation: level.abbreviation,
          elevation: level.elevation,
          description: level.description,
          samples: levelTotals,
          labors,
        };
      });
      return {
        id: area.id,
        name: area.name,
        abbreviation: area.abbreviation,
        description: area.description,
        samples: areaTotals,
        levels,
      };
    });
  },
};
