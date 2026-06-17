import { prisma } from "../../config/prisma.js";
import { logger } from "../../config/logger.js";
import { HttpError } from "../../errors/http.error.js";
import type {
  CreateInteriorAreaDTO,
  CreateInteriorLabAssignmentDTO,
  CreateInteriorLaborDTO,
  CreateInteriorLaboratoryDTO,
  CreateInteriorLevelDTO,
  CreateInteriorObjectiveDTO,
  CreateInteriorSampleDTO,
  CreateInteriorSampleResultDTO,
  CreateInteriorSampleWithResultsDTO,
  InteriorAreaQuery,
  InteriorLabAssignmentQuery,
  InteriorLaborQuery,
  InteriorLaboratoryQuery,
  InteriorLevelQuery,
  InteriorObjectiveQuery,
  InteriorSampleQuery,
  InteriorSampleResultQuery,
  UpdateInteriorAreaDTO,
  UpdateInteriorLabAssignmentDTO,
  UpdateInteriorLaborDTO,
  UpdateInteriorLaboratoryDTO,
  UpdateInteriorLevelDTO,
  UpdateInteriorObjectiveDTO,
  UpdateInteriorSampleDTO,
  UpdateInteriorSampleResultDTO,
  UpdateInteriorSampleWithResultsDTO,
} from "./interiorSample.types.js";

const pg = (q: any) => {
  const p = Number(q.page ?? 1);
  const l = Number(q.limit ?? 20);
  return { p, l, skip: (p - 1) * l };
};

const toDate = (s?: string | null) => (s ? new Date(s) : null);

// Resultados anidados dentro de cada asignación de laboratorio
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
    orderBy: { slot: "asc" as const },
  },
} as const;

export const interiorSampleService = {

  // ─── InteriorArea ─────────────────────────────────────────────────────────
  async getInteriorAreas(query: InteriorAreaQuery) {
    const { p, l, skip } = pg(query);
    const where: any = {};
    if (query.search)
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" as const } },
        { abbreviation: { contains: query.search, mode: "insensitive" as const } },
      ];
    const [data, total] = await Promise.all([
      prisma.interiorArea.findMany({
        where,
        skip,
        take: l,
        orderBy: { name: "asc" },
        include: { levels: { select: { id: true, name: true, abbreviation: true } } },
      }),
      prisma.interiorArea.count({ where }),
    ]);
    return { data, meta: { page: p, limit: l, total, totalPages: Math.ceil(total / l) } };
  },

  async getInteriorAreaById(id: string) {
    const area = await prisma.interiorArea.findUnique({
      where: { id },
      include: {
        levels: {
          include: { labors: { select: { id: true, name: true, abbreviation: true } } },
        },
      },
    });
    if (!area) throw new HttpError("Interior area not found", 404);
    return area;
  },

  async createInteriorArea(data: CreateInteriorAreaDTO, userId?: number) {
    const existing = await prisma.interiorArea.findUnique({ where: { abbreviation: data.abbreviation } });
    if (existing) throw new HttpError(`Area abbreviation '${data.abbreviation}' already exists`, 409);
    const area = await prisma.interiorArea.create({
      data: { ...data, createdById: userId, updatedById: userId } as any,
    });
    logger.info({ areaId: area.id, userId }, "InteriorArea created");
    return area;
  },

  async updateInteriorArea(id: string, data: UpdateInteriorAreaDTO, userId?: number) {
    await this.getInteriorAreaById(id);
    if (data.abbreviation) {
      const existing = await prisma.interiorArea.findUnique({ where: { abbreviation: data.abbreviation } });
      if (existing && existing.id !== id)
        throw new HttpError(`Area abbreviation '${data.abbreviation}' already exists`, 409);
    }
    const updated = await prisma.interiorArea.update({
      where: { id },
      data: { ...data, updatedById: userId } as any,
    });
    logger.info({ areaId: id, userId }, "InteriorArea updated");
    return updated;
  },

  async deleteInteriorArea(id: string) {
    await this.getInteriorAreaById(id);
    return prisma.interiorArea.delete({ where: { id } });
  },

  // ─── InteriorLevel ────────────────────────────────────────────────────────
  async getInteriorLevels(query: InteriorLevelQuery) {
    const { p, l, skip } = pg(query);
    const where: any = {};
    if (query.interiorAreaId) where.interiorAreaId = query.interiorAreaId;
    if (query.search)
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" as const } },
        { abbreviation: { contains: query.search, mode: "insensitive" as const } },
      ];
    const [data, total] = await Promise.all([
      prisma.interiorLevel.findMany({
        where,
        skip,
        take: l,
        orderBy: { name: "asc" },
        include: { area: { select: { id: true, name: true, abbreviation: true } } },
      }),
      prisma.interiorLevel.count({ where }),
    ]);
    return { data, meta: { page: p, limit: l, total, totalPages: Math.ceil(total / l) } };
  },

  async getInteriorLevelById(id: string) {
    const level = await prisma.interiorLevel.findUnique({
      where: { id },
      include: {
        area: { select: { id: true, name: true, abbreviation: true } },
        labors: { select: { id: true, name: true, abbreviation: true } },
      },
    });
    if (!level) throw new HttpError("Interior level not found", 404);
    return level;
  },

  async createInteriorLevel(data: CreateInteriorLevelDTO, userId?: number) {
    const area = await prisma.interiorArea.findUnique({ where: { id: data.interiorAreaId } });
    if (!area) throw new HttpError("Interior area not found", 404);
    const existing = await prisma.interiorLevel.findUnique({
      where: { interiorAreaId_abbreviation: { interiorAreaId: data.interiorAreaId, abbreviation: data.abbreviation } },
    });
    if (existing) throw new HttpError(`Level abbreviation '${data.abbreviation}' already exists in this area`, 409);
    const level = await prisma.interiorLevel.create({
      data: { ...data, createdById: userId, updatedById: userId } as any,
    });
    logger.info({ levelId: level.id, userId }, "InteriorLevel created");
    return level;
  },

  async updateInteriorLevel(id: string, data: UpdateInteriorLevelDTO, userId?: number) {
    const current = await this.getInteriorLevelById(id);
    if (data.interiorAreaId) {
      const area = await prisma.interiorArea.findUnique({ where: { id: data.interiorAreaId } });
      if (!area) throw new HttpError("Interior area not found", 404);
    }
    if (data.abbreviation) {
      const areaId = data.interiorAreaId ?? current.interiorAreaId;
      const clash = await prisma.interiorLevel.findUnique({
        where: { interiorAreaId_abbreviation: { interiorAreaId: areaId, abbreviation: data.abbreviation } },
      });
      if (clash && clash.id !== id)
        throw new HttpError(`Level abbreviation '${data.abbreviation}' already exists in this area`, 409);
    }
    const updated = await prisma.interiorLevel.update({
      where: { id },
      data: { ...data, updatedById: userId } as any,
    });
    logger.info({ levelId: id, userId }, "InteriorLevel updated");
    return updated;
  },

  async deleteInteriorLevel(id: string) {
    await this.getInteriorLevelById(id);
    return prisma.interiorLevel.delete({ where: { id } });
  },

  // ─── InteriorLabor ────────────────────────────────────────────────────────
  async getInteriorLabors(query: InteriorLaborQuery) {
    const { p, l, skip } = pg(query);
    const where: any = {};
    if (query.interiorLevelId) where.interiorLevelId = query.interiorLevelId;
    if (query.search)
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" as const } },
        { abbreviation: { contains: query.search, mode: "insensitive" as const } },
      ];
    const [data, total] = await Promise.all([
      prisma.interiorLabor.findMany({
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
      prisma.interiorLabor.count({ where }),
    ]);
    return { data, meta: { page: p, limit: l, total, totalPages: Math.ceil(total / l) } };
  },

  async getInteriorLaborById(id: string) {
    const labor = await prisma.interiorLabor.findUnique({
      where: { id },
      include: {
        level: { include: { area: { select: { id: true, name: true, abbreviation: true } } } },
      },
    });
    if (!labor) throw new HttpError("Interior labor not found", 404);
    return labor;
  },

  async createInteriorLabor(data: CreateInteriorLaborDTO, userId?: number) {
    const level = await prisma.interiorLevel.findUnique({ where: { id: data.interiorLevelId } });
    if (!level) throw new HttpError("Interior level not found", 404);
    const existing = await prisma.interiorLabor.findUnique({
      where: { interiorLevelId_abbreviation: { interiorLevelId: data.interiorLevelId, abbreviation: data.abbreviation } },
    });
    if (existing) throw new HttpError(`Labor abbreviation '${data.abbreviation}' already exists in this level`, 409);
    const labor = await prisma.interiorLabor.create({
      data: { ...data, createdById: userId, updatedById: userId } as any,
    });
    logger.info({ laborId: labor.id, userId }, "InteriorLabor created");
    return labor;
  },

  async updateInteriorLabor(id: string, data: UpdateInteriorLaborDTO, userId?: number) {
    const current = await this.getInteriorLaborById(id);
    if (data.interiorLevelId) {
      const level = await prisma.interiorLevel.findUnique({ where: { id: data.interiorLevelId } });
      if (!level) throw new HttpError("Interior level not found", 404);
    }
    if (data.abbreviation) {
      const levelId = data.interiorLevelId ?? current.interiorLevelId;
      const clash = await prisma.interiorLabor.findUnique({
        where: { interiorLevelId_abbreviation: { interiorLevelId: levelId, abbreviation: data.abbreviation } },
      });
      if (clash && clash.id !== id)
        throw new HttpError(`Labor abbreviation '${data.abbreviation}' already exists in this level`, 409);
    }
    const updated = await prisma.interiorLabor.update({
      where: { id },
      data: { ...data, updatedById: userId } as any,
    });
    logger.info({ laborId: id, userId }, "InteriorLabor updated");
    return updated;
  },

  async deleteInteriorLabor(id: string) {
    await this.getInteriorLaborById(id);
    return prisma.interiorLabor.delete({ where: { id } });
  },

  // ─── InteriorObjective ────────────────────────────────────────────────────
  async getInteriorObjectives(query: InteriorObjectiveQuery) {
    const { p, l, skip } = pg(query);
    const where: any = {};
    if (query.search) where.name = { contains: query.search, mode: "insensitive" as const };
    const [data, total] = await Promise.all([
      prisma.interiorObjective.findMany({ where, skip, take: l, orderBy: { name: "asc" } }),
      prisma.interiorObjective.count({ where }),
    ]);
    return { data, meta: { page: p, limit: l, total, totalPages: Math.ceil(total / l) } };
  },

  async getInteriorObjectiveById(id: string) {
    const obj = await prisma.interiorObjective.findUnique({ where: { id } });
    if (!obj) throw new HttpError("Interior objective not found", 404);
    return obj;
  },

  async createInteriorObjective(data: CreateInteriorObjectiveDTO, userId?: number) {
    const existing = await prisma.interiorObjective.findUnique({ where: { name: data.name } });
    if (existing) throw new HttpError(`Objective '${data.name}' already exists`, 409);
    const obj = await prisma.interiorObjective.create({
      data: { ...data, createdById: userId, updatedById: userId } as any,
    });
    logger.info({ objectiveId: obj.id, userId }, "InteriorObjective created");
    return obj;
  },

  async updateInteriorObjective(id: string, data: UpdateInteriorObjectiveDTO, userId?: number) {
    await this.getInteriorObjectiveById(id);
    if (data.name) {
      const existing = await prisma.interiorObjective.findUnique({ where: { name: data.name } });
      if (existing && existing.id !== id)
        throw new HttpError(`Objective '${data.name}' already exists`, 409);
    }
    const updated = await prisma.interiorObjective.update({
      where: { id },
      data: { ...data, updatedById: userId } as any,
    });
    logger.info({ objectiveId: id, userId }, "InteriorObjective updated");
    return updated;
  },

  async deleteInteriorObjective(id: string) {
    await this.getInteriorObjectiveById(id);
    return prisma.interiorObjective.delete({ where: { id } });
  },

  // ─── InteriorLaboratory ───────────────────────────────────────────────────
  async getInteriorLaboratories(query: InteriorLaboratoryQuery) {
    const { p, l, skip } = pg(query);
    const where: any = {};
    if (query.search) where.name = { contains: query.search, mode: "insensitive" as const };
    const [data, total] = await Promise.all([
      prisma.interiorLaboratory.findMany({ where, skip, take: l, orderBy: { name: "asc" } }),
      prisma.interiorLaboratory.count({ where }),
    ]);
    return { data, meta: { page: p, limit: l, total, totalPages: Math.ceil(total / l) } };
  },

  async getInteriorLaboratoryById(id: string) {
    const lab = await prisma.interiorLaboratory.findUnique({ where: { id } });
    if (!lab) throw new HttpError("Interior laboratory not found", 404);
    return lab;
  },

  async createInteriorLaboratory(data: CreateInteriorLaboratoryDTO, userId?: number) {
    const existing = await prisma.interiorLaboratory.findUnique({ where: { name: data.name } });
    if (existing) throw new HttpError(`Laboratory '${data.name}' already exists`, 409);
    const lab = await prisma.interiorLaboratory.create({
      data: { ...data, createdById: userId, updatedById: userId } as any,
    });
    logger.info({ labId: lab.id, userId }, "InteriorLaboratory created");
    return lab;
  },

  async updateInteriorLaboratory(id: string, data: UpdateInteriorLaboratoryDTO, userId?: number) {
    await this.getInteriorLaboratoryById(id);
    if (data.name) {
      const existing = await prisma.interiorLaboratory.findUnique({ where: { name: data.name } });
      if (existing && existing.id !== id)
        throw new HttpError(`Laboratory '${data.name}' already exists`, 409);
    }
    const updated = await prisma.interiorLaboratory.update({
      where: { id },
      data: { ...data, updatedById: userId } as any,
    });
    logger.info({ labId: id, userId }, "InteriorLaboratory updated");
    return updated;
  },

  async deleteInteriorLaboratory(id: string) {
    await this.getInteriorLaboratoryById(id);
    return prisma.interiorLaboratory.delete({ where: { id } });
  },

  // ─── InteriorSample (básico) ──────────────────────────────────────────────
  async getInteriorSamples(query: InteriorSampleQuery) {
    const { p, l, skip } = pg(query);
    const where: any = {};
    if (query.interiorLaborId) where.interiorLaborId = query.interiorLaborId;
    if (query.interiorObjectiveId) where.interiorObjectiveId = query.interiorObjectiveId;
    if (query.createdById) where.createdById = query.createdById;
    if (query.search) where.code = { contains: query.search, mode: "insensitive" as const };
    const [data, total] = await Promise.all([
      prisma.interiorSample.findMany({
        where,
        skip,
        take: l,
        orderBy: { code: "asc" },
        include: FULL_SAMPLE_INCLUDE,
      }),
      prisma.interiorSample.count({ where }),
    ]);
    return { data, meta: { page: p, limit: l, total, totalPages: Math.ceil(total / l) } };
  },

  async getInteriorSampleById(id: string) {
    const sample = await prisma.interiorSample.findUnique({
      where: { id },
      include: FULL_SAMPLE_INCLUDE,
    });
    if (!sample) throw new HttpError("Interior sample not found", 404);
    return sample;
  },

  async createInteriorSample(data: CreateInteriorSampleDTO, userId?: number) {
    const labor = await prisma.interiorLabor.findUnique({
      where: { id: data.interiorLaborId },
      include: { level: { include: { area: true } } },
    });
    if (!labor) throw new HttpError("Interior labor not found", 404);
    const objective = await prisma.interiorObjective.findUnique({ where: { id: data.interiorObjectiveId } });
    if (!objective) throw new HttpError("Interior objective not found", 404);

    return prisma.$transaction(async (tx) => {
      const count = await tx.interiorSample.count({ where: { interiorLaborId: data.interiorLaborId } });
      const codeStart = parseInt(process.env.INTERIOR_SAMPLE_CODE_START ?? "1");
      const sequentialNumber = count + codeStart;
      const code = `${labor.level.area.abbreviation}/${labor.level.abbreviation}/${labor.abbreviation}/${String(sequentialNumber).padStart(4, "0")}`;
      const sample = await tx.interiorSample.create({
        data: {
          ...data,
          code,
          sequentialNumber,
          sampledAt: toDate(data.sampledAt),
          createdById: userId,
          updatedById: userId,
        } as any,
      });
      logger.info({ sampleId: sample.id, code, userId }, "InteriorSample created");
      return tx.interiorSample.findUnique({ where: { id: sample.id }, include: FULL_SAMPLE_INCLUDE });
    });
  },

  async updateInteriorSample(id: string, data: UpdateInteriorSampleDTO, userId?: number) {
    await this.getInteriorSampleById(id);
    if (data.interiorObjectiveId) {
      const obj = await prisma.interiorObjective.findUnique({ where: { id: data.interiorObjectiveId } });
      if (!obj) throw new HttpError("Interior objective not found", 404);
    }
    const updated = await prisma.interiorSample.update({
      where: { id },
      data: {
        ...data,
        sampledAt: data.sampledAt !== undefined ? toDate(data.sampledAt) : undefined,
        updatedById: userId,
      } as any,
      include: FULL_SAMPLE_INCLUDE,
    });
    logger.info({ sampleId: id, userId }, "InteriorSample updated");
    return updated;
  },

  async deleteInteriorSample(id: string) {
    await this.getInteriorSampleById(id);
    return prisma.$transaction(async (tx) => {
      await tx.interiorSampleResult.deleteMany({ where: { interiorSampleId: id } });
      await tx.interiorLabAssignment.deleteMany({ where: { interiorSampleId: id } });
      return tx.interiorSample.delete({ where: { id } });
    });
  },

  // ─── InteriorSample con resultados (transacción) ──────────────────────────
  async createInteriorSampleWithResults(data: CreateInteriorSampleWithResultsDTO, userId?: number) {
    const labor = await prisma.interiorLabor.findUnique({
      where: { id: data.interiorLaborId },
      include: { level: { include: { area: true } } },
    });
    if (!labor) throw new HttpError("Interior labor not found", 404);
    const objective = await prisma.interiorObjective.findUnique({ where: { id: data.interiorObjectiveId } });
    if (!objective) throw new HttpError("Interior objective not found", 404);

    const existingLabIds = data.labAssignments.flatMap((la) => (la.interiorLaboratoryId ? [la.interiorLaboratoryId] : []));
    if (existingLabIds.length > 0) {
      const labs = await prisma.interiorLaboratory.findMany({ where: { id: { in: existingLabIds } } });
      if (labs.length !== new Set(existingLabIds).size)
        throw new HttpError("One or more interior laboratories not found", 404);
    }

    const elementIds = [...new Set(data.labAssignments.flatMap((la) => la.results.map((r) => r.elementId)))];
    if (elementIds.length > 0) {
      const elements = await prisma.element.findMany({ where: { id: { in: elementIds } } });
      if (elements.length !== elementIds.length)
        throw new HttpError("One or more elements not found", 404);
    }

    const { labAssignments: labAssignmentsData, ...sampleFields } = data;

    return prisma.$transaction(async (tx) => {
      const count = await tx.interiorSample.count({ where: { interiorLaborId: data.interiorLaborId } });
      const codeStart = parseInt(process.env.INTERIOR_SAMPLE_CODE_START ?? "1");
      const sequentialNumber = count + codeStart;
      const code = `${labor.level.area.abbreviation}/${labor.level.abbreviation}/${labor.abbreviation}/${String(sequentialNumber).padStart(4, "0")}`;

      const sample = await tx.interiorSample.create({
        data: {
          ...sampleFields,
          code,
          sequentialNumber,
          sampledAt: toDate(sampleFields.sampledAt),
          createdById: userId,
          updatedById: userId,
        } as any,
      });

      for (const laData of labAssignmentsData) {
        let laboratoryId = laData.interiorLaboratoryId;
        if (!laboratoryId && laData.laboratory) {
          const lab = await tx.interiorLaboratory.upsert({
            where: { name: laData.laboratory.name },
            create: { ...laData.laboratory, createdById: userId, updatedById: userId } as any,
            update: {},
          });
          laboratoryId = lab.id;
        }
        const assignment = await tx.interiorLabAssignment.create({
          data: {
            interiorSampleId: sample.id,
            interiorLaboratoryId: laboratoryId!,
            slot: laData.slot,
            createdById: userId,
            updatedById: userId,
          } as any,
        });

        for (const rData of laData.results) {
          await tx.interiorSampleResult.create({
            data: {
              interiorSampleId: sample.id,
              interiorLabAssignmentId: assignment.id,
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
        "InteriorSample with results created",
      );

      return tx.interiorSample.findUnique({ where: { id: sample.id }, include: FULL_SAMPLE_INCLUDE });
    });
  },

  async updateInteriorSampleWithResults(id: string, data: UpdateInteriorSampleWithResultsDTO, userId?: number) {
    await this.getInteriorSampleById(id);
    if (data.interiorObjectiveId) {
      const obj = await prisma.interiorObjective.findUnique({ where: { id: data.interiorObjectiveId } });
      if (!obj) throw new HttpError("Interior objective not found", 404);
    }
    if (data.labAssignments) {
      const existingLabIds = data.labAssignments.flatMap((la) => (la.interiorLaboratoryId ? [la.interiorLaboratoryId] : []));
      if (existingLabIds.length > 0) {
        const labs = await prisma.interiorLaboratory.findMany({ where: { id: { in: existingLabIds } } });
        if (labs.length !== new Set(existingLabIds).size)
          throw new HttpError("One or more interior laboratories not found", 404);
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
      await tx.interiorSample.update({
        where: { id },
        data: {
          ...sampleFields,
          sampledAt: sampleFields.sampledAt !== undefined ? toDate(sampleFields.sampledAt) : undefined,
          updatedById: userId,
        } as any,
      });

      if (labAssignmentsData !== undefined) {
        // Borrar resultados y asignaciones previas
        await tx.interiorSampleResult.deleteMany({ where: { interiorSampleId: id } });
        await tx.interiorLabAssignment.deleteMany({ where: { interiorSampleId: id } });

        for (const laData of labAssignmentsData) {
          let laboratoryId = laData.interiorLaboratoryId;
          if (!laboratoryId && laData.laboratory) {
            const lab = await tx.interiorLaboratory.upsert({
              where: { name: laData.laboratory.name },
              create: { ...laData.laboratory, createdById: userId, updatedById: userId } as any,
              update: {},
            });
            laboratoryId = lab.id;
          }
          const assignment = await tx.interiorLabAssignment.create({
            data: {
              interiorSampleId: id,
              interiorLaboratoryId: laboratoryId!,
              slot: laData.slot,
              createdById: userId,
              updatedById: userId,
            } as any,
          });

          for (const rData of laData.results) {
            await tx.interiorSampleResult.create({
              data: {
                interiorSampleId: id,
                interiorLabAssignmentId: assignment.id,
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

      logger.info({ sampleId: id, userId }, "InteriorSample with results updated");
      return tx.interiorSample.findUnique({ where: { id }, include: FULL_SAMPLE_INCLUDE });
    });
  },

  // ─── InteriorLabAssignment ────────────────────────────────────────────────
  async getInteriorLabAssignments(query: InteriorLabAssignmentQuery) {
    const { p, l, skip } = pg(query);
    const where: any = {};
    if (query.interiorSampleId) where.interiorSampleId = query.interiorSampleId;
    if (query.interiorLaboratoryId) where.interiorLaboratoryId = query.interiorLaboratoryId;
    if (query.slot) where.slot = query.slot;
    const [data, total] = await Promise.all([
      prisma.interiorLabAssignment.findMany({
        where,
        skip,
        take: l,
        orderBy: { slot: "asc" },
        include: {
          sample: { select: { id: true, code: true } },
          laboratory: { select: { id: true, name: true, abbreviation: true } },
          results: {
            include: { element: { select: { id: true, name: true, symbol: true, defaultUnit: true } } },
          },
        },
      }),
      prisma.interiorLabAssignment.count({ where }),
    ]);
    return { data, meta: { page: p, limit: l, total, totalPages: Math.ceil(total / l) } };
  },

  async getInteriorLabAssignmentById(id: string) {
    const la = await prisma.interiorLabAssignment.findUnique({
      where: { id },
      include: {
        sample: { select: { id: true, code: true } },
        laboratory: true,
        results: {
          include: { element: { select: { id: true, name: true, symbol: true, defaultUnit: true } } },
        },
      },
    });
    if (!la) throw new HttpError("Interior lab assignment not found", 404);
    return la;
  },

  async createInteriorLabAssignment(data: CreateInteriorLabAssignmentDTO, userId?: number) {
    const [sample, lab] = await Promise.all([
      prisma.interiorSample.findUnique({ where: { id: data.interiorSampleId } }),
      prisma.interiorLaboratory.findUnique({ where: { id: data.interiorLaboratoryId } }),
    ]);
    if (!sample) throw new HttpError("Interior sample not found", 404);
    if (!lab) throw new HttpError("Interior laboratory not found", 404);
    const clash = await prisma.interiorLabAssignment.findUnique({
      where: { interiorSampleId_slot: { interiorSampleId: data.interiorSampleId, slot: data.slot } },
    });
    if (clash) throw new HttpError(`Slot ${data.slot} already used for this sample`, 409);
    const la = await prisma.interiorLabAssignment.create({
      data: { ...data, createdById: userId, updatedById: userId } as any,
    });
    logger.info({ laId: la.id, userId }, "InteriorLabAssignment created");
    return la;
  },

  async updateInteriorLabAssignment(id: string, data: UpdateInteriorLabAssignmentDTO, userId?: number) {
    const current = await this.getInteriorLabAssignmentById(id);
    if (data.interiorLaboratoryId) {
      const lab = await prisma.interiorLaboratory.findUnique({ where: { id: data.interiorLaboratoryId } });
      if (!lab) throw new HttpError("Interior laboratory not found", 404);
    }
    if (data.slot) {
      const clash = await prisma.interiorLabAssignment.findUnique({
        where: { interiorSampleId_slot: { interiorSampleId: current.interiorSampleId, slot: data.slot } },
      });
      if (clash && clash.id !== id)
        throw new HttpError(`Slot ${data.slot} already used for this sample`, 409);
    }
    const updated = await prisma.interiorLabAssignment.update({
      where: { id },
      data: { ...data, updatedById: userId } as any,
    });
    logger.info({ laId: id, userId }, "InteriorLabAssignment updated");
    return updated;
  },

  async deleteInteriorLabAssignment(id: string) {
    await this.getInteriorLabAssignmentById(id);
    return prisma.$transaction(async (tx) => {
      await tx.interiorSampleResult.deleteMany({ where: { interiorLabAssignmentId: id } });
      return tx.interiorLabAssignment.delete({ where: { id } });
    });
  },

  // ─── InteriorSampleResult ─────────────────────────────────────────────────
  async getInteriorSampleResults(query: InteriorSampleResultQuery) {
    const { p, l, skip } = pg(query);
    const where: any = {};
    if (query.interiorSampleId) where.interiorSampleId = query.interiorSampleId;
    if (query.interiorLabAssignmentId) where.interiorLabAssignmentId = query.interiorLabAssignmentId;
    if (query.elementId) where.elementId = query.elementId;
    const [data, total] = await Promise.all([
      prisma.interiorSampleResult.findMany({
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
      prisma.interiorSampleResult.count({ where }),
    ]);
    return { data, meta: { page: p, limit: l, total, totalPages: Math.ceil(total / l) } };
  },

  async getInteriorSampleResultById(id: string) {
    const result = await prisma.interiorSampleResult.findUnique({
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
    if (!result) throw new HttpError("Interior sample result not found", 404);
    return result;
  },

  async createInteriorSampleResult(data: CreateInteriorSampleResultDTO, userId?: number) {
    const assignment = await prisma.interiorLabAssignment.findUnique({ where: { id: data.interiorLabAssignmentId } });
    if (!assignment) throw new HttpError("Interior lab assignment not found", 404);
    const element = await prisma.element.findUnique({ where: { id: data.elementId } });
    if (!element) throw new HttpError("Element not found", 404);
    const clash = await prisma.interiorSampleResult.findUnique({
      where: { interiorLabAssignmentId_elementId: { interiorLabAssignmentId: data.interiorLabAssignmentId, elementId: data.elementId } },
    });
    if (clash) throw new HttpError("Result for this element already exists in this lab assignment", 409);
    const result = await prisma.interiorSampleResult.create({
      data: {
        ...data,
        interiorSampleId: assignment.interiorSampleId,
        createdById: userId,
        updatedById: userId,
      } as any,
    });
    logger.info({ resultId: result.id, userId }, "InteriorSampleResult created");
    return result;
  },

  async updateInteriorSampleResult(id: string, data: UpdateInteriorSampleResultDTO, userId?: number) {
    const current = await this.getInteriorSampleResultById(id);
    if (data.elementId && data.elementId !== current.elementId) {
      const el = await prisma.element.findUnique({ where: { id: data.elementId } });
      if (!el) throw new HttpError("Element not found", 404);
      const clash = await prisma.interiorSampleResult.findUnique({
        where: { interiorLabAssignmentId_elementId: { interiorLabAssignmentId: current.interiorLabAssignmentId, elementId: data.elementId } },
      });
      if (clash && clash.id !== id)
        throw new HttpError("Result for this element already exists in this lab assignment", 409);
    }
    const updated = await prisma.interiorSampleResult.update({
      where: { id },
      data: { ...data, updatedById: userId } as any,
    });
    logger.info({ resultId: id, userId }, "InteriorSampleResult updated");
    return updated;
  },

  async deleteInteriorSampleResult(id: string) {
    await this.getInteriorSampleResultById(id);
    return prisma.interiorSampleResult.delete({ where: { id } });
  },
};
