import { z } from "zod";

const requestedElements = z.array(z.string().uuid()).min(1, "At least one element required");

// Lote mixto: una sola nota de remisión (mismo folio) con muestras de Interior Mina y de Superficie.
export const createDispatchBatchSchema = z.object({
  laboratoryModule: z.enum(["interior", "surface"]),
  laboratoryId: z.string().uuid(),
  projectName: z.string().optional(),
  sentAt: z.string().datetime(),
  notes: z.string().optional(),
  interiorItems: z.array(z.object({
    interiorSampleId: z.string().uuid(),
    elementIds: requestedElements,
    notes: z.string().optional(),
  }).strict()).min(1, "At least one interior sample required"),
  surfaceItems: z.array(z.object({
    surfaceSampleId: z.string().uuid(),
    elementIds: requestedElements,
    notes: z.string().optional(),
  }).strict()).min(1, "At least one surface sample required"),
}).strict();

export type CreateDispatchBatchDTO = z.infer<typeof createDispatchBatchSchema>;
