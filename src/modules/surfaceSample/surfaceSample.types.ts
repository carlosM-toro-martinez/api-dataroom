import type { z } from "zod";
import {
  createSurfaceAreaSchema,
  createSurfaceLaboratorySchema,
  createSurfaceObjectiveSchema,
  createSurfaceSampleResultSchema,
  createSurfaceSampleSchema,
  createSurfaceSampleWithResultsSchema,
  surfaceAreaQuerySchema,
  surfaceLaboratoryQuerySchema,
  surfaceObjectiveQuerySchema,
  surfaceSampleQuerySchema,
  surfaceSampleResultQuerySchema,
  updateSurfaceAreaSchema,
  updateSurfaceLaboratorySchema,
  updateSurfaceObjectiveSchema,
  updateSurfaceSampleResultSchema,
  updateSurfaceSampleSchema,
  updateSurfaceSampleWithResultsSchema,
} from "./surfaceSample.schema.js";

export type SurfaceAreaQuery = z.infer<typeof surfaceAreaQuerySchema>;
export type CreateSurfaceAreaDTO = z.infer<typeof createSurfaceAreaSchema>;
export type UpdateSurfaceAreaDTO = z.infer<typeof updateSurfaceAreaSchema>;

export type SurfaceObjectiveQuery = z.infer<typeof surfaceObjectiveQuerySchema>;
export type CreateSurfaceObjectiveDTO = z.infer<typeof createSurfaceObjectiveSchema>;
export type UpdateSurfaceObjectiveDTO = z.infer<typeof updateSurfaceObjectiveSchema>;

export type SurfaceLaboratoryQuery = z.infer<typeof surfaceLaboratoryQuerySchema>;
export type CreateSurfaceLaboratoryDTO = z.infer<typeof createSurfaceLaboratorySchema>;
export type UpdateSurfaceLaboratoryDTO = z.infer<typeof updateSurfaceLaboratorySchema>;

export type SurfaceSampleQuery = z.infer<typeof surfaceSampleQuerySchema>;
export type CreateSurfaceSampleDTO = z.infer<typeof createSurfaceSampleSchema>;
export type UpdateSurfaceSampleDTO = z.infer<typeof updateSurfaceSampleSchema>;

export type SurfaceSampleResultQuery = z.infer<typeof surfaceSampleResultQuerySchema>;
export type CreateSurfaceSampleResultDTO = z.infer<typeof createSurfaceSampleResultSchema>;
export type UpdateSurfaceSampleResultDTO = z.infer<typeof updateSurfaceSampleResultSchema>;

export type CreateSurfaceSampleWithResultsDTO = z.infer<typeof createSurfaceSampleWithResultsSchema>;
export type UpdateSurfaceSampleWithResultsDTO = z.infer<typeof updateSurfaceSampleWithResultsSchema>;
