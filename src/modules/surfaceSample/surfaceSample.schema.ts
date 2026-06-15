import { z } from "zod";

const pagination = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
});

// ─── SurfaceArea ──────────────────────────────────────────────────────────────
export const surfaceAreaQuerySchema = pagination.extend({
  search: z.string().optional(),
});

export const createSurfaceAreaSchema = z.object({
  name: z.string().min(1),
  abbreviation: z.string().min(1),
  description: z.string().optional(),
}).strict();

export const updateSurfaceAreaSchema = z.object({
  name: z.string().min(1).optional(),
  abbreviation: z.string().min(1).optional(),
  description: z.string().optional(),
}).strict();

// ─── SurfaceObjective ─────────────────────────────────────────────────────────
export const surfaceObjectiveQuerySchema = pagination.extend({
  search: z.string().optional(),
});

export const createSurfaceObjectiveSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
}).strict();

export const updateSurfaceObjectiveSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
}).strict();

// ─── SurfaceLaboratory ────────────────────────────────────────────────────────
export const surfaceLaboratoryQuerySchema = pagination.extend({
  search: z.string().optional(),
});

export const createSurfaceLaboratorySchema = z.object({
  name: z.string().min(1),
  abbreviation: z.string().optional(),
  description: z.string().optional(),
}).strict();

export const updateSurfaceLaboratorySchema = z.object({
  name: z.string().min(1).optional(),
  abbreviation: z.string().optional(),
  description: z.string().optional(),
}).strict();

// ─── SurfaceSample ────────────────────────────────────────────────────────────
export const surfaceSampleQuerySchema = pagination.extend({
  surfaceAreaId: z.string().uuid().optional(),
  surfaceObjectiveId: z.string().uuid().optional(),
  search: z.string().optional(),
});

export const createSurfaceSampleSchema = z.object({
  surfaceAreaId: z.string().uuid(),
  surfaceObjectiveId: z.string().uuid(),
  east: z.number().optional(),
  north: z.number().optional(),
  elevation: z.number().optional(),
  sampledAt: z.string().datetime().optional(),
}).strict();

export const updateSurfaceSampleSchema = z.object({
  surfaceObjectiveId: z.string().uuid().optional(),
  east: z.number().optional(),
  north: z.number().optional(),
  elevation: z.number().optional(),
  sampledAt: z.string().datetime().optional(),
}).strict();

// ─── SurfaceSampleResult ──────────────────────────────────────────────────────
export const surfaceSampleResultQuerySchema = pagination.extend({
  surfaceSampleId: z.string().uuid().optional(),
  elementId: z.string().uuid().optional(),
  surfaceLaboratoryId: z.string().uuid().optional(),
});

export const createSurfaceSampleResultSchema = z.object({
  surfaceSampleId: z.string().uuid(),
  elementId: z.string().uuid(),
  surfaceLaboratoryId: z.string().uuid().optional(),
  value: z.number().optional(),
  unit: z.string().optional(),
  qualifier: z.string().optional(),
  comments: z.string().optional(),
}).strict();

export const updateSurfaceSampleResultSchema = z.object({
  elementId: z.string().uuid().optional(),
  surfaceLaboratoryId: z.string().uuid().optional(),
  value: z.number().optional(),
  unit: z.string().optional(),
  qualifier: z.string().optional(),
  comments: z.string().optional(),
}).strict();

// ─── SurfaceSample with everything (bulk transaction) ─────────────────────────
const resultEntrySchema = z.object({
  elementId: z.string().uuid(),
  surfaceLaboratoryId: z.string().uuid().optional(),
  laboratory: z.object({
    name: z.string().min(1),
    abbreviation: z.string().optional(),
    description: z.string().optional(),
  }).strict().optional(),
  value: z.number().optional(),
  unit: z.string().optional(),
  qualifier: z.string().optional(),
  comments: z.string().optional(),
}).strict();

export const createSurfaceSampleWithResultsSchema = z.object({
  surfaceAreaId: z.string().uuid(),
  surfaceObjectiveId: z.string().uuid(),
  east: z.number().optional(),
  north: z.number().optional(),
  elevation: z.number().optional(),
  sampledAt: z.string().datetime().optional(),
  results: z.array(resultEntrySchema).default([]),
}).strict();

export const updateSurfaceSampleWithResultsSchema = z.object({
  surfaceObjectiveId: z.string().uuid().optional(),
  east: z.number().optional(),
  north: z.number().optional(),
  elevation: z.number().optional(),
  sampledAt: z.string().datetime().optional(),
  results: z.array(resultEntrySchema).optional(),
}).strict();

export const idSchema = z.object({ id: z.string().uuid() });
