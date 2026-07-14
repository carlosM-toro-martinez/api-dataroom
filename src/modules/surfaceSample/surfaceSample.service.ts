import { prisma } from "../../config/prisma.js";
import { logger } from "../../config/logger.js";
import { HttpError } from "../../errors/http.error.js";
import type {
  CreateSurfaceAreaDTO,
  CreateSurfaceLabAssignmentDTO,
  CreateSurfaceLaboratoryDTO,
  CreateSurfaceObjectiveDTO,
  CreateSurfaceSampleDTO,
  CreateSurfaceSampleResultDTO,
  CreateSurfaceSampleWithResultsDTO,
  SurfaceAreaQuery,
  SurfaceLabAssignmentQuery,
  SurfaceLaboratoryQuery,
  SurfaceObjectiveQuery,
  SurfaceSampleQuery,
  SurfaceSampleResultQuery,
  UpdateSurfaceAreaDTO,
  UpdateSurfaceLabAssignmentDTO,
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

const withVoucherCode = <T extends { voucherNumber: number | null; category: string }>(s: T) => ({
  ...s,
  voucherCode: s.voucherNumber !== null
    ? `${String(s.voucherNumber).padStart(5, "0")} ${s.category === "EXPLORATION" ? "E" : "P"}/S`
    : null,
});

const mapSample = (s: any) => (s ? withVoucherCode(s) : s);
const mapSamples = (arr: any[]) => arr.map(mapSample);

const FULL_SAMPLE_INCLUDE = {
  area: { select: { id: true, name: true, abbreviation: true } },
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
    if (query.surfaceAreaId) where.surfaceAreaId = query.surfaceAreaId;
    if (query.surfaceObjectiveId) where.surfaceObjectiveId = query.surfaceObjectiveId;
    if (query.createdById) where.createdById = query.createdById;
    if (query.priority) where.priority = query.priority;
    if (query.category) where.category = query.category;
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
    return { data: mapSamples(rows), meta: { page: p, limit: l, total, totalPages: Math.ceil(total / l) } };
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
    return mapSample(sample);
  },

  async createSurfaceSample(data: CreateSurfaceSampleDTO, userId?: number) {
    const area = await prisma.surfaceArea.findUnique({ where: { id: data.surfaceAreaId } });
    if (!area) throw new HttpError("Surface area not found", 404);
    const objective = await prisma.surfaceObjective.findUnique({ where: { id: data.surfaceObjectiveId } });
    if (!objective) throw new HttpError("Surface objective not found", 404);

    return prisma.$transaction(async (tx) => {
      const count = await tx.surfaceSample.count({ where: { surfaceAreaId: data.surfaceAreaId } });
      const codeStart = parseInt(process.env.SURFACE_SAMPLE_CODE_START ?? "1");
      const sequentialNumber = count + codeStart;
      const code = `${area.abbreviation}/${String(sequentialNumber).padStart(4, "0")}`;
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
      return mapSample(await tx.surfaceSample.findUnique({ where: { id: sample.id }, include: FULL_SAMPLE_INCLUDE }));
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
    return mapSample(updated);
  },

  async deleteSurfaceSample(id: string) {
    await this.getSurfaceSampleById(id);
    return prisma.$transaction(async (tx) => {
      await tx.surfaceSampleResult.deleteMany({ where: { surfaceSampleId: id } });
      await tx.surfaceLabAssignment.deleteMany({ where: { surfaceSampleId: id } });
      return tx.surfaceSample.delete({ where: { id } });
    });
  },

  async assignSurfaceSampleVoucher(id: string, userId?: number) {
    return prisma.$transaction(async (tx) => {
      const sample = await tx.surfaceSample.findUnique({ where: { id } });
      if (!sample) throw new HttpError("Surface sample not found", 404);
      if (sample.voucherNumber !== null) {
        const code = withVoucherCode(sample).voucherCode;
        throw new HttpError(`Sample already has voucher ${code}`, 409);
      }
      // Secuencia independiente por categoría
      const agg = await tx.surfaceSample.aggregate({
        where: { category: sample.category },
        _max: { voucherNumber: true },
      });
      const nextNumber = (agg._max.voucherNumber ?? 0) + 1;
      logger.info({ sampleId: id, voucherNumber: nextNumber, category: sample.category, userId }, "SurfaceSample voucher assigned");
      return mapSample(await tx.surfaceSample.update({
        where: { id },
        data: { voucherNumber: nextNumber, updatedById: userId } as any,
        include: FULL_SAMPLE_INCLUDE,
      }));
    });
  },

  // ─── SurfaceSample con resultados (transacción) ───────────────────────────
  async createSurfaceSampleWithResults(data: CreateSurfaceSampleWithResultsDTO, userId?: number) {
    const area = await prisma.surfaceArea.findUnique({ where: { id: data.surfaceAreaId } });
    if (!area) throw new HttpError("Surface area not found", 404);
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
      const count = await tx.surfaceSample.count({ where: { surfaceAreaId: data.surfaceAreaId } });
      const codeStart = parseInt(process.env.SURFACE_SAMPLE_CODE_START ?? "1");
      const sequentialNumber = count + codeStart;
      const code = `${area.abbreviation}/${String(sequentialNumber).padStart(4, "0")}`;

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

      return mapSample(await tx.surfaceSample.findUnique({ where: { id: sample.id }, include: FULL_SAMPLE_INCLUDE }));
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
      return mapSample(await tx.surfaceSample.findUnique({ where: { id }, include: FULL_SAMPLE_INCLUDE }));
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
    const result = await prisma.surfaceSampleResult.create({
      data: {
        ...data,
        surfaceSampleId: assignment.surfaceSampleId,
        createdById: userId,
        updatedById: userId,
      } as any,
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
};
