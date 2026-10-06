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

// ─── Personal de perforación ─────────────────────────────────────────────────
const PERSONNEL_ROLES = ["operator", "firstHelper", "secondHelper", "driver", "supervisor", "drillingChief"] as const;
const PERSONNEL_SHIFTS = ["DAY", "NIGHT", "BOTH"] as const;

export const createPersonnelSchema = z.object({
  name: text,
  role: z.enum(PERSONNEL_ROLES),
  shift: z.enum(PERSONNEL_SHIFTS),
  active: z.boolean().optional(),
}).strict();
export const updatePersonnelSchema = createPersonnelSchema.partial().strict();

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
  area: optionalText,
  category: z.enum(SAMPLE_CATEGORIES).optional(),
  status: z.enum(CAMPAIGN_STATUSES).optional(),
  search: optionalText,
});

export const createCampaignSchema = z.object({
  name: text,
  code: text,
  area: optionalText.nullable(),
  category: z.enum(SAMPLE_CATEGORIES).optional(),
  status: z.enum(CAMPAIGN_STATUSES).optional(),
  objective: optionalText.nullable(),
  plannedMeters: z.number().min(0).nullable().optional(),
  startDate: datetime.nullable().optional(),
  endDate: datetime.nullable().optional(),
  description: optionalText.nullable(),
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
  sector: optionalText.nullable(),
  target: optionalText.nullable(),
  rigId: z.string().uuid().nullable().optional(),
  contractorId: z.string().uuid().nullable().optional(),
  plannedEast: z.number().nullable().optional(),
  plannedNorth: z.number().nullable().optional(),
  plannedElevation: z.number().nullable().optional(),
  plannedAzimuth: z.number().min(0).max(360).nullable().optional(),
  plannedDip: z.number().min(-90).max(90).nullable().optional(),
  plannedDepth: depth.nullable().optional(),
  east: z.number().nullable().optional(),
  north: z.number().nullable().optional(),
  elevation: z.number().nullable().optional(),
  azimuth: z.number().min(0).max(360).nullable().optional(),
  dip: z.number().min(-90).max(90).nullable().optional(),
  finalDepth: depth.nullable().optional(),
  startedAt: datetime.nullable().optional(),
  finishedAt: datetime.nullable().optional(),
  notes: optionalText.nullable(),
};
export const createHoleSchema = z.object({ campaignId: z.string().uuid(), ...holeFields }).strict();

// Importación de un programa completo (p. ej. desde el Excel de programa DDH).
export const importHolesSchema = z.object({
  campaignId: z.string().uuid(),
  holes: z.array(z.object(holeFields).strict()).min(1, "Agrega al menos un pozo").max(500),
}).strict();
export const updateHoleSchema = z.object(holeFields).partial().strict();

// ─── Registros del pozo ──────────────────────────────────────────────────────
// ─── Parte diario (formato "Reporte diario de perforación diamantina") ───────
const shortText = z.string().trim().max(120).nullable().optional();
const longText = z.string().trim().max(4000).nullable().optional();
const quantity = z.number().min(0).max(100000).nullable().optional();
const clock = z.string().regex(/^([01]?\d|2[0-3]):[0-5]\d$/, "Hora HH:MM").or(z.literal("")).nullable().optional();

const activitySchema = z.object({
  from: clock,
  to: clock,
  depthFrom: z.number().min(0).nullable().optional(),
  depthTo: z.number().min(0).nullable().optional(),
  description: z.string().trim().max(500).nullable().optional(),
  lithology: z.string().trim().max(200).nullable().optional(),
}).strict();

const incidentSchema = z.object({
  id: z.string().min(1).max(64),
  category: z.string().trim().min(1).max(60),
  severity: z.enum(["LOW", "MEDIUM", "HIGH"]),
  description: z.string().trim().min(1).max(1000),
  status: z.enum(["OPEN", "RESOLVED"]),
  resolution: z.string().trim().max(1000).nullable().optional(),
  resolvedBy: z.string().trim().max(120).nullable().optional(),
  resolvedAt: datetime.nullable().optional(),
  createdAt: datetime.nullable().optional(),
}).strict();

const quantities = (keys: readonly string[]) =>
  z.object(Object.fromEntries(keys.map((key) => [key, quantity])) as Record<string, typeof quantity>).partial();

const shiftFields = {
  rigId: z.string().uuid().nullable().optional(),
  date: datetime,
  shift: z.enum(SHIFTS).optional(),
  drillingHours: z.number().min(0).max(24).nullable().optional(),
  standbyHours: z.number().min(0).max(24).nullable().optional(),
  diameter: shortText,
  operator: shortText,
  observations: longText,
  reportNumber: shortText,
  coreRecovery: z.number().min(0).nullable().optional(),
  waterReturn: shortText,
  rockType: shortText,
  rigName: shortText,
  coreBoxNumber: shortText,
  drillingMethod: z.enum(["DIAMOND", "REVERSE_AIR"]).nullable().optional(),
  rcDiameter: shortText,
  casing: shortText,
  crownNumber: shortText,
  reamerNumber: shortText,
  shoeNumber: shortText,
  firstHelper: shortText,
  secondHelper: shortText,
  driver: shortText,
  supervisor: shortText,
  drillingChief: shortText,
  activities: z.array(activitySchema).max(60).nullable().optional(),
  consumables: quantities(["diesel", "gasoline", "hydraulicOil", "engineOil", "gearOil"])
    .extend({ other: z.string().trim().max(200).nullable().optional() })
    .nullable()
    .optional(),
  additives: quantities(["bentonite", "polymerPac", "polymerPhpa", "surfactants", "lubricants", "cement"]).nullable().optional(),
  timeDetail: z.object({ casing: z.number().min(0).max(24).nullable().optional(), maintenance: z.number().min(0).max(24).nullable().optional(), transfer: z.number().min(0).max(24).nullable().optional(), unloading: z.number().min(0).max(24).nullable().optional() }).nullable().optional(),
  incidents: z.array(incidentSchema).max(50).nullable().optional(),
  reviewStatus: z.enum(["PENDING", "REVIEWED"]).optional(),
  reviewedBy: shortText,
  reviewedAt: datetime.nullable().optional(),
  reviewNotes: longText,
};
// id opcional generado en el dispositivo (partes registrados sin conexión).
export const createShiftReportSchema = depthRange({ id: z.string().uuid().optional(), ...shiftFields });
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
