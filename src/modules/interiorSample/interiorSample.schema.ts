import { z } from "zod";

const pagination = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
});

const LAB_SLOTS = ["L1", "L2", "L3"] as const;
const SAMPLE_PRIORITIES = ["URGENT", "HIGH", "NORMAL", "LOW"] as const;

// ─── InteriorArea ─────────────────────────────────────────────────────────────
export const interiorAreaQuerySchema = pagination.extend({
  search: z.string().optional(),
});

export const createInteriorAreaSchema = z.object({
  name: z.string().min(1),
  abbreviation: z.string().min(1),
  description: z.string().optional(),
}).strict();

export const updateInteriorAreaSchema = z.object({
  name: z.string().min(1).optional(),
  abbreviation: z.string().min(1).optional(),
  description: z.string().optional(),
}).strict();

// ─── InteriorLevel ────────────────────────────────────────────────────────────
export const interiorLevelQuerySchema = pagination.extend({
  interiorAreaId: z.string().uuid().optional(),
  search: z.string().optional(),
});

export const createInteriorLevelSchema = z.object({
  interiorAreaId: z.string().uuid(),
  name: z.string().min(1),
  abbreviation: z.string().min(1),
  codeStart: z.number().int().positive().optional(),
  elevation: z.number().optional(),
  description: z.string().optional(),
}).strict();

export const updateInteriorLevelSchema = z.object({
  interiorAreaId: z.string().uuid().optional(),
  name: z.string().min(1).optional(),
  abbreviation: z.string().min(1).optional(),
  codeStart: z.number().int().positive().optional(),
  elevation: z.number().optional(),
  description: z.string().optional(),
}).strict();

// ─── InteriorLabor ────────────────────────────────────────────────────────────
export const interiorLaborQuerySchema = pagination.extend({
  interiorLevelId: z.string().uuid().optional(),
  search: z.string().optional(),
});

export const createInteriorLaborSchema = z.object({
  interiorLevelId: z.string().uuid(),
  name: z.string().min(1),
  abbreviation: z.string().min(1),
  description: z.string().optional(),
}).strict();

export const updateInteriorLaborSchema = z.object({
  interiorLevelId: z.string().uuid().optional(),
  name: z.string().min(1).optional(),
  abbreviation: z.string().min(1).optional(),
  description: z.string().optional(),
}).strict();

// ─── InteriorObjective ────────────────────────────────────────────────────────
export const interiorObjectiveQuerySchema = pagination.extend({
  search: z.string().optional(),
});

export const createInteriorObjectiveSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
}).strict();

export const updateInteriorObjectiveSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
}).strict();

// ─── InteriorLaboratory ───────────────────────────────────────────────────────
export const interiorLaboratoryQuerySchema = pagination.extend({
  search: z.string().optional(),
});

export const createInteriorLaboratorySchema = z.object({
  name: z.string().min(1),
  abbreviation: z.string().optional(),
  description: z.string().optional(),
}).strict();

export const updateInteriorLaboratorySchema = z.object({
  name: z.string().min(1).optional(),
  abbreviation: z.string().optional(),
  description: z.string().optional(),
}).strict();

// ─── InteriorSample ──────────────────────────────────────────────────────────
export const interiorSampleQuerySchema = pagination.extend({
  interiorLaborId: z.string().uuid().optional(),
  interiorObjectiveId: z.string().uuid().optional(),
  createdById: z.coerce.number().int().positive().optional(),
  priority: z.enum(SAMPLE_PRIORITIES).optional(),
  search: z.string().optional(),
});

export const createInteriorSampleSchema = z.object({
  interiorLaborId: z.string().uuid(),
  interiorObjectiveId: z.string().uuid(),
  name: z.string().min(1).optional(),
  priority: z.enum(SAMPLE_PRIORITIES).optional(),
  voucherNumber: z.number().int().positive().optional(),
  east: z.number().optional(),
  north: z.number().optional(),
  elevation: z.number().optional(),
  sampledAt: z.string().datetime().optional(),
}).strict();

export const updateInteriorSampleSchema = z.object({
  interiorObjectiveId: z.string().uuid().optional(),
  name: z.string().min(1).optional(),
  priority: z.enum(SAMPLE_PRIORITIES).optional(),
  voucherNumber: z.number().int().positive().optional(),
  east: z.number().optional(),
  north: z.number().optional(),
  elevation: z.number().optional(),
  sampledAt: z.string().datetime().optional(),
}).strict();

// ─── InteriorLabAssignment ────────────────────────────────────────────────────
export const interiorLabAssignmentQuerySchema = pagination.extend({
  interiorSampleId: z.string().uuid().optional(),
  interiorLaboratoryId: z.string().uuid().optional(),
  slot: z.enum(LAB_SLOTS).optional(),
});

export const createInteriorLabAssignmentSchema = z.object({
  interiorSampleId: z.string().uuid(),
  interiorLaboratoryId: z.string().uuid(),
  slot: z.enum(LAB_SLOTS),
}).strict();

export const updateInteriorLabAssignmentSchema = z.object({
  interiorLaboratoryId: z.string().uuid().optional(),
  slot: z.enum(LAB_SLOTS).optional(),
}).strict();

// ─── InteriorSampleResult ─────────────────────────────────────────────────────
export const interiorSampleResultQuerySchema = pagination.extend({
  interiorSampleId: z.string().uuid().optional(),
  interiorLabAssignmentId: z.string().uuid().optional(),
  elementId: z.string().uuid().optional(),
});

export const createInteriorSampleResultSchema = z.object({
  interiorLabAssignmentId: z.string().uuid(),
  elementId: z.string().uuid(),
  value: z.number().optional(),
  unit: z.string().optional(),
  qualifier: z.string().optional(),
  comments: z.string().optional(),
}).strict();

export const updateInteriorSampleResultSchema = z.object({
  elementId: z.string().uuid().optional(),
  value: z.number().optional(),
  unit: z.string().optional(),
  qualifier: z.string().optional(),
  comments: z.string().optional(),
}).strict();

// ─── InteriorSample con todo (transacción) ───────────────────────────────────
const resultEntrySchema = z.object({
  elementId: z.string().uuid(),
  value: z.number().optional(),
  unit: z.string().optional(),
  qualifier: z.string().optional(),
  comments: z.string().optional(),
}).strict();

const labAssignmentEntrySchema = z.object({
  slot: z.enum(LAB_SLOTS),
  interiorLaboratoryId: z.string().uuid().optional(),
  laboratory: z.object({
    name: z.string().min(1),
    abbreviation: z.string().optional(),
    description: z.string().optional(),
  }).strict().optional(),
  results: z.array(resultEntrySchema).default([]),
}).strict().refine(
  (d) => d.interiorLaboratoryId || d.laboratory,
  { message: "Each lab assignment must have either interiorLaboratoryId or a laboratory object" }
);

export const createInteriorSampleWithResultsSchema = z.object({
  interiorLaborId: z.string().uuid(),
  interiorObjectiveId: z.string().uuid(),
  name: z.string().min(1).optional(),
  priority: z.enum(SAMPLE_PRIORITIES).optional(),
  voucherNumber: z.number().int().positive().optional(),
  east: z.number().optional(),
  north: z.number().optional(),
  elevation: z.number().optional(),
  sampledAt: z.string().datetime().optional(),
  labAssignments: z.array(labAssignmentEntrySchema).default([]),
}).strict();

export const updateInteriorSampleWithResultsSchema = z.object({
  interiorObjectiveId: z.string().uuid().optional(),
  name: z.string().min(1).optional(),
  priority: z.enum(SAMPLE_PRIORITIES).optional(),
  voucherNumber: z.number().int().positive().optional(),
  east: z.number().optional(),
  north: z.number().optional(),
  elevation: z.number().optional(),
  sampledAt: z.string().datetime().optional(),
  labAssignments: z.array(labAssignmentEntrySchema).optional(),
}).strict();

export const idSchema = z.object({ id: z.string().uuid() });
