import { z } from "zod";

const pagination = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
});

const SAMPLE_PRIORITIES = ["URGENT", "HIGH", "NORMAL", "LOW"] as const;
const SAMPLE_CATEGORIES = ["EXPLORATION", "PRODUCTION"] as const;
const SAMPLE_STATUSES = ["REGISTERED", "DISPATCHED", "COMPLETED"] as const;
const DISPATCH_STATUSES = ["PENDING", "COMPLETED"] as const;

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

// ─── SurfaceLevel ─────────────────────────────────────────────────────────────
export const surfaceLevelQuerySchema = pagination.extend({
  surfaceAreaId: z.string().uuid().optional(),
  search: z.string().optional(),
});

export const createSurfaceLevelSchema = z.object({
  surfaceAreaId: z.string().uuid(),
  name: z.string().min(1),
  abbreviation: z.string().min(1),
  codeStart: z.number().int().positive().optional(),
  elevation: z.number().optional(),
  description: z.string().optional(),
}).strict();

export const updateSurfaceLevelSchema = z.object({
  surfaceAreaId: z.string().uuid().optional(),
  name: z.string().min(1).optional(),
  abbreviation: z.string().min(1).optional(),
  codeStart: z.number().int().positive().optional(),
  elevation: z.number().optional(),
  description: z.string().optional(),
}).strict();

// ─── SurfaceLabor ─────────────────────────────────────────────────────────────
export const surfaceLaborQuerySchema = pagination.extend({
  surfaceLevelId: z.string().uuid().optional(),
  search: z.string().optional(),
});

export const createSurfaceLaborSchema = z.object({
  surfaceLevelId: z.string().uuid(),
  name: z.string().min(1),
  abbreviation: z.string().min(1),
  description: z.string().optional(),
}).strict();

export const updateSurfaceLaborSchema = z.object({
  surfaceLevelId: z.string().uuid().optional(),
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

// ─── SurfaceLabAssignment ────────────────────────────────────────────────────
export const surfaceLabAssignmentQuerySchema = pagination.extend({
  surfaceSampleId: z.string().uuid().optional(),
  surfaceLaboratoryId: z.string().uuid().optional(),
});

export const createSurfaceLabAssignmentSchema = z.object({
  surfaceSampleId: z.string().uuid(),
  surfaceLaboratoryId: z.string().uuid(),
}).strict();

export const updateSurfaceLabAssignmentSchema = z.object({
  surfaceLaboratoryId: z.string().uuid().optional(),
}).strict();

// ─── SurfaceSample ────────────────────────────────────────────────────────────
export const surfaceSampleQuerySchema = pagination.extend({
  surfaceLaborId: z.string().uuid().optional(),
  surfaceObjectiveId: z.string().uuid().optional(),
  createdById: z.coerce.number().int().positive().optional(),
  priority: z.enum(SAMPLE_PRIORITIES).optional(),
  category: z.enum(SAMPLE_CATEGORIES).optional(),
  status: z.enum(SAMPLE_STATUSES).optional(),
  search: z.string().optional(),
});

export const createSurfaceSampleSchema = z.object({
  surfaceLaborId: z.string().uuid(),
  surfaceObjectiveId: z.string().uuid(),
  name: z.string().min(1).optional(),
  priority: z.enum(SAMPLE_PRIORITIES).optional(),
  category: z.enum(SAMPLE_CATEGORIES).optional(),
  east: z.number().optional(),
  north: z.number().optional(),
  elevation: z.number().optional(),
  sampledAt: z.string().datetime().optional(),
}).strict();

export const updateSurfaceSampleSchema = z.object({
  surfaceObjectiveId: z.string().uuid().optional(),
  name: z.string().min(1).optional(),
  priority: z.enum(SAMPLE_PRIORITIES).optional(),
  category: z.enum(SAMPLE_CATEGORIES).optional(),
  status: z.enum(SAMPLE_STATUSES).optional(),
  east: z.number().optional(),
  north: z.number().optional(),
  elevation: z.number().optional(),
  sampledAt: z.string().datetime().optional(),
}).strict();

// ─── SurfaceSampleResult ──────────────────────────────────────────────────────
export const surfaceSampleResultQuerySchema = pagination.extend({
  surfaceSampleId: z.string().uuid().optional(),
  surfaceLabAssignmentId: z.string().uuid().optional(),
  elementId: z.string().uuid().optional(),
});

export const createSurfaceSampleResultSchema = z.object({
  surfaceLabAssignmentId: z.string().uuid(),
  elementId: z.string().uuid(),
  value: z.number().optional(),
  unit: z.string().optional(),
  qualifier: z.string().optional(),
  comments: z.string().optional(),
}).strict();

export const updateSurfaceSampleResultSchema = z.object({
  elementId: z.string().uuid().optional(),
  value: z.number().optional(),
  unit: z.string().optional(),
  qualifier: z.string().optional(),
  comments: z.string().optional(),
}).strict();

// ─── SurfaceSample con todo (transacción) ────────────────────────────────────
const resultEntrySchema = z.object({
  elementId: z.string().uuid(),
  value: z.number().optional(),
  unit: z.string().optional(),
  qualifier: z.string().optional(),
  comments: z.string().optional(),
}).strict();

const labAssignmentEntrySchema = z.object({
  surfaceLaboratoryId: z.string().uuid().optional(),
  laboratory: z.object({
    name: z.string().min(1),
    abbreviation: z.string().optional(),
    description: z.string().optional(),
  }).strict().optional(),
  results: z.array(resultEntrySchema).default([]),
}).strict().refine(
  (d) => d.surfaceLaboratoryId || d.laboratory,
  { message: "Each lab assignment must have either surfaceLaboratoryId or a laboratory object" }
);

export const createSurfaceSampleWithResultsSchema = z.object({
  surfaceLaborId: z.string().uuid(),
  surfaceObjectiveId: z.string().uuid(),
  name: z.string().min(1).optional(),
  priority: z.enum(SAMPLE_PRIORITIES).optional(),
  category: z.enum(SAMPLE_CATEGORIES).optional(),
  east: z.number().optional(),
  north: z.number().optional(),
  elevation: z.number().optional(),
  sampledAt: z.string().datetime().optional(),
  labAssignments: z.array(labAssignmentEntrySchema).default([]),
}).strict();

export const updateSurfaceSampleWithResultsSchema = z.object({
  surfaceObjectiveId: z.string().uuid().optional(),
  name: z.string().min(1).optional(),
  priority: z.enum(SAMPLE_PRIORITIES).optional(),
  category: z.enum(SAMPLE_CATEGORIES).optional(),
  status: z.enum(SAMPLE_STATUSES).optional(),
  east: z.number().optional(),
  north: z.number().optional(),
  elevation: z.number().optional(),
  sampledAt: z.string().datetime().optional(),
  labAssignments: z.array(labAssignmentEntrySchema).optional(),
}).strict();

// ─── SurfaceDispatch (Nota de Remisión) ──────────────────────────────────────
export const surfaceDispatchQuerySchema = pagination.extend({
  surfaceLaboratoryId: z.string().uuid().optional(),
  status: z.enum(DISPATCH_STATUSES).optional(),
});

const dispatchItemSchema = z.object({
  surfaceSampleId: z.string().uuid(),
  elementIds: z.array(z.string().uuid()).min(1, "At least one element required"),
  notes: z.string().optional(),
}).strict();

export const createSurfaceDispatchSchema = z.object({
  surfaceLaboratoryId: z.string().uuid(),
  projectName: z.string().optional(),
  sentAt: z.string().datetime(),
  notes: z.string().optional(),
  items: z.array(dispatchItemSchema).min(1, "At least one sample required"),
}).strict();

export const updateSurfaceDispatchSchema = z.object({
  projectName: z.string().optional(),
  sentAt: z.string().datetime().optional(),
  notes: z.string().optional(),
  status: z.enum(DISPATCH_STATUSES).optional(),
}).strict();

export const idSchema = z.object({ id: z.string().uuid() });
