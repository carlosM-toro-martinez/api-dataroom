import type { z } from "zod";
import {
  createInteriorAreaSchema,
  createInteriorLabAssignmentSchema,
  createInteriorLaborSchema,
  createInteriorLaboratorySchema,
  createInteriorLevelSchema,
  createInteriorObjectiveSchema,
  createInteriorSampleResultSchema,
  createInteriorSampleSchema,
  createInteriorSampleWithResultsSchema,
  interiorAreaQuerySchema,
  interiorLabAssignmentQuerySchema,
  interiorLaborQuerySchema,
  interiorLaboratoryQuerySchema,
  interiorLevelQuerySchema,
  interiorObjectiveQuerySchema,
  interiorSampleQuerySchema,
  interiorSampleResultQuerySchema,
  updateInteriorAreaSchema,
  updateInteriorLabAssignmentSchema,
  updateInteriorLaborSchema,
  updateInteriorLaboratorySchema,
  updateInteriorLevelSchema,
  updateInteriorObjectiveSchema,
  updateInteriorSampleResultSchema,
  updateInteriorSampleSchema,
  updateInteriorSampleWithResultsSchema,
} from "./interiorSample.schema.js";

export type InteriorAreaQuery = z.infer<typeof interiorAreaQuerySchema>;
export type CreateInteriorAreaDTO = z.infer<typeof createInteriorAreaSchema>;
export type UpdateInteriorAreaDTO = z.infer<typeof updateInteriorAreaSchema>;

export type InteriorLevelQuery = z.infer<typeof interiorLevelQuerySchema>;
export type CreateInteriorLevelDTO = z.infer<typeof createInteriorLevelSchema>;
export type UpdateInteriorLevelDTO = z.infer<typeof updateInteriorLevelSchema>;

export type InteriorLaborQuery = z.infer<typeof interiorLaborQuerySchema>;
export type CreateInteriorLaborDTO = z.infer<typeof createInteriorLaborSchema>;
export type UpdateInteriorLaborDTO = z.infer<typeof updateInteriorLaborSchema>;

export type InteriorObjectiveQuery = z.infer<typeof interiorObjectiveQuerySchema>;
export type CreateInteriorObjectiveDTO = z.infer<typeof createInteriorObjectiveSchema>;
export type UpdateInteriorObjectiveDTO = z.infer<typeof updateInteriorObjectiveSchema>;

export type InteriorLaboratoryQuery = z.infer<typeof interiorLaboratoryQuerySchema>;
export type CreateInteriorLaboratoryDTO = z.infer<typeof createInteriorLaboratorySchema>;
export type UpdateInteriorLaboratoryDTO = z.infer<typeof updateInteriorLaboratorySchema>;

export type InteriorSampleQuery = z.infer<typeof interiorSampleQuerySchema>;
export type CreateInteriorSampleDTO = z.infer<typeof createInteriorSampleSchema>;
export type UpdateInteriorSampleDTO = z.infer<typeof updateInteriorSampleSchema>;

export type InteriorLabAssignmentQuery = z.infer<typeof interiorLabAssignmentQuerySchema>;
export type CreateInteriorLabAssignmentDTO = z.infer<typeof createInteriorLabAssignmentSchema>;
export type UpdateInteriorLabAssignmentDTO = z.infer<typeof updateInteriorLabAssignmentSchema>;

export type InteriorSampleResultQuery = z.infer<typeof interiorSampleResultQuerySchema>;
export type CreateInteriorSampleResultDTO = z.infer<typeof createInteriorSampleResultSchema>;
export type UpdateInteriorSampleResultDTO = z.infer<typeof updateInteriorSampleResultSchema>;

export type CreateInteriorSampleWithResultsDTO = z.infer<typeof createInteriorSampleWithResultsSchema>;
export type UpdateInteriorSampleWithResultsDTO = z.infer<typeof updateInteriorSampleWithResultsSchema>;
