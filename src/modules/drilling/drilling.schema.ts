import { z } from "zod";

// ─── Sondajes: validaciones ──────────────────────────────────────────────────

const SAMPLE_CATEGORIES = ["EXPLORATION", "PRODUCTION"] as const;
const SAMPLE_PRIORITIES = ["URGENT", "HIGH", "NORMAL", "LOW"] as const;
const SAMPLE_STATUSES = ["REGISTERED", "DISPATCHED", "COMPLETED"] as const;
const CAMPAIGN_STATUSES = ["PLANNED", "ACTIVE", "CLOSED"] as const;
const HOLE_STATUSES = ["PLANNED", "DRILLING", "PAUSED", "COMPLETED", "ABANDONED"] as const;
const HOLE_TYPES = ["DDH", "RC", "AC", "OTHER"] as const;
const LOCATION_TYPES = ["SURFACE", "UNDERGROUND"] as const;
const SHIFTS = ["DAY", "NIGHT"] as const;
const DRILLING_SAMPLE_TYPES = ["CORE_WHOLE", "CORE_HALF", "CORE_QUARTER", "CHIPS", "DUPLICATE", "STANDARD", "BLANK"] as const;

const text = z.string().trim().min(1);
const optionalText = z.string().trim().optional();
const datetime = z.string().datetime();
const depth = z.number().min(0);
const percent = z.number().min(0).max(100);

const pagination = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
});

export const idSchema = z.object({ id: z.string().uuid() });
export const holeIdSchema = z.object({ holeId: z.string().uuid() });

type DepthValue = { fromDepth?: number; toDepth?: number };

const depthRange = <T extends z.ZodRawShape>(shape: T) =>
  z
    .object({ fromDepth: depth, toDepth: depth, ...shape })
    .strict()
    .refine((value) => (value as DepthValue).toDepth! > (value as DepthValue).fromDepth!, {
      message: "La profundidad final debe ser mayor que la inicial.",
      path: ["toDepth"],
    });

// Para PATCH: si llegan ambas profundidades se valida el rango; si llega una sola se valida en el servicio.
const partialDepthRange = <T extends z.ZodRawShape>(shape: T) =>
  z
    .object({ fromDepth: depth.optional(), toDepth: depth.optional(), ...shape })
    .strict()
    .refine((value) => {
      const { fromDepth, toDepth } = value as DepthValue;
      return fromDepth === undefined || toDepth === undefined || toDepth > fromDepth;
    }, {
      message: "La profundidad final debe ser mayor que la inicial.",
      path: ["toDepth"],
    });

// ─── Catálogos ───────────────────────────────────────────────────────────────
export const listQuerySchema = pagination.extend({ search: optionalText });

export const createContractorSchema = z.object({
  name: text,
  description: optionalText,
  active: z.boolean().optional(),
}).strict();
export const updateContractorSchema = createContractorSchema.partial().strict();

export const createRigSchema = z.object({
  code: text,
  model: optionalText,
  contractorId: z.string().uuid().optional(),
  active: z.boolean().optional(),
  description: optionalText,
}).strict();
export const updateRigSchema = createRigSchema.partial().strict();

export const createLaboratorySchema = z.object({
  name: text,
  abbreviation: optionalText,
  description: optionalText,
}).strict();
export const updateLaboratorySchema = createLaboratorySchema.partial().strict();

// ─── Campañas ────────────────────────────────────────────────────────────────
export const campaignQuerySchema = pagination.extend({
  category: z.enum(SAMPLE_CATEGORIES).optional(),
  status: z.enum(CAMPAIGN_STATUSES).optional(),
  search: optionalText,
});

export const createCampaignSchema = z.object({
  name: text,
  code: text,
  category: z.enum(SAMPLE_CATEGORIES).optional(),
  status: z.enum(CAMPAIGN_STATUSES).optional(),
  objective: optionalText,
  plannedMeters: z.number().min(0).optional(),
  startDate: datetime.optional(),
  endDate: datetime.optional(),
  description: optionalText,
}).strict();
export const updateCampaignSchema = createCampaignSchema.partial().strict();

// ─── Pozos ───────────────────────────────────────────────────────────────────
export const holeQuerySchema = pagination.extend({
  campaignId: z.string().uuid().optional(),
  status: z.enum(HOLE_STATUSES).optional(),
  category: z.enum(SAMPLE_CATEGORIES).optional(),
  search: optionalText,
});

const holeFields = {
  code: text,
  type: z.enum(HOLE_TYPES).optional(),
  status: z.enum(HOLE_STATUSES).optional(),
  locationType: z.enum(LOCATION_TYPES).optional(),
  sector: optionalText,
  target: optionalText,
  rigId: z.string().uuid().optional(),
  contractorId: z.string().uuid().optional(),
  plannedEast: z.number().optional(),
  plannedNorth: z.number().optional(),
  plannedElevation: z.number().optional(),
  plannedAzimuth: z.number().min(0).max(360).optional(),
  plannedDip: z.number().min(-90).max(90).optional(),
  plannedDepth: depth.optional(),
  east: z.number().optional(),
  north: z.number().optional(),
  elevation: z.number().optional(),
  azimuth: z.number().min(0).max(360).optional(),
  dip: z.number().min(-90).max(90).optional(),
  finalDepth: depth.optional(),
  startedAt: datetime.optional(),
  finishedAt: datetime.optional(),
  notes: optionalText,
};
export const createHoleSchema = z.object({ campaignId: z.string().uuid(), ...holeFields }).strict();
export const updateHoleSchema = z.object(holeFields).partial().strict();

// ─── Registros del pozo ──────────────────────────────────────────────────────
const shiftFields = {
  rigId: z.string().uuid().optional(),
  date: datetime,
  shift: z.enum(SHIFTS).optional(),
  drillingHours: z.number().min(0).max(24).optional(),
  standbyHours: z.number().min(0).max(24).optional(),
  diameter: optionalText,
  operator: optionalText,
  observations: optionalText,
};
export const createShiftReportSchema = depthRange(shiftFields);
export const updateShiftReportSchema = partialDepthRange({ ...shiftFields, date: datetime.optional() });

const surveyFields = {
  depth,
  azimuth: z.number().min(0).max(360),
  dip: z.number().min(-90).max(90),
  instrument: optionalText,
  measuredAt: datetime.optional(),
  comments: optionalText,
};
export const createSurveySchema = z.object(surveyFields).strict();
export const updateSurveySchema = z.object(surveyFields).partial().strict();

const runFields = {
  recoveredLength: z.number().min(0).optional(),
  recoveryPercent: percent.optional(),
  rqdPercent: percent.optional(),
  comments: optionalText,
};
export const createRunSchema = depthRange(runFields);
export const updateRunSchema = partialDepthRange(runFields);

const coreBoxFields = {
  boxNumber: z.number().int().positive(),
  storageLocation: optionalText,
  photoPath: optionalText,
  comments: optionalText,
};
export const createCoreBoxSchema = depthRange(coreBoxFields);
export const updateCoreBoxSchema = partialDepthRange({ ...coreBoxFields, boxNumber: coreBoxFields.boxNumber.optional() });

const logFields = {
  lithology: optionalText,
  alteration: optionalText,
  mineralization: optionalText,
  structure: optionalText,
  description: optionalText,
  loggedBy: optionalText,
  loggedAt: datetime.optional(),
};
export const createLogIntervalSchema = depthRange(logFields);
export const updateLogIntervalSchema = partialDepthRange(logFields);

const sampleFields = {
  code: text,
  type: z.enum(DRILLING_SAMPLE_TYPES).optional(),
  priority: z.enum(SAMPLE_PRIORITIES).optional(),
  weightKg: z.number().min(0).optional(),
  sampledAt: datetime.optional(),
  notes: optionalText,
};
export const createSampleSchema = depthRange(sampleFields);
export const updateSampleSchema = partialDepthRange({ ...sampleFields, code: text.optional() });

export const sampleQuerySchema = pagination.extend({
  holeId: z.string().uuid().optional(),
  status: z.enum(SAMPLE_STATUSES).optional(),
  search: optionalText,
});

// ─── Lotes y resultados ──────────────────────────────────────────────────────
export const dispatchQuerySchema = pagination.extend({
  laboratoryId: z.string().uuid().optional(),
  status: z.enum(["PENDING", "COMPLETED"]).optional(),
  folio: z.coerce.number().int().positive().optional(),
});

export const createDispatchSchema = z.object({
  laboratoryId: z.string().uuid(),
  projectName: optionalText,
  sentAt: datetime,
  notes: optionalText,
  items: z.array(z.object({
    sampleId: z.string().uuid(),
    elementIds: z.array(z.string().uuid()).min(1, "At least one element required"),
    notes: optionalText,
  }).strict()).min(1, "At least one sample required"),
}).strict();

export const createResultSchema = z.object({
  laboratoryId: z.string().uuid().optional(),
  elementId: z.string().uuid(),
  value: z.number().optional(),
  unit: optionalText,
  qualifier: optionalText,
  comments: optionalText,
}).strict();

export type CreateDispatchDTO = z.infer<typeof createDispatchSchema>;
export type CreateResultDTO = z.infer<typeof createResultSchema>;
