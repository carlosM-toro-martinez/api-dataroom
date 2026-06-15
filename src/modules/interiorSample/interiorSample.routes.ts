import { Router } from "express";
import { interiorSampleController } from "./interiorSample.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
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
  idSchema,
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

const vq = (schema: any) => (req: any, res: any, next: any) => {
  const result = schema.safeParse(req.query);
  if (!result.success)
    return res.status(400).json({ success: false, error: "Query validation error", details: result.error.flatten() });
  req.validatedQuery = result.data;
  next();
};

const vp = (schema: any) => (req: any, res: any, next: any) => {
  const result = schema.safeParse(req.params);
  if (!result.success)
    return res.status(400).json({ success: false, error: "Params validation error", details: result.error.flatten() });
  req.validatedParams = result.data;
  next();
};

const router = Router();
router.use(authenticate);

// ─── InteriorArea ─────────────────────────────────────────────────────────────
router.get("/areas", vq(interiorAreaQuerySchema), interiorSampleController.getInteriorAreas);
router.get("/areas/:id", vp(idSchema), interiorSampleController.getInteriorAreaById);
router.post("/areas", validate(createInteriorAreaSchema), interiorSampleController.createInteriorArea);
router.patch("/areas/:id", vp(idSchema), validate(updateInteriorAreaSchema), interiorSampleController.updateInteriorArea);
router.delete("/areas/:id", vp(idSchema), interiorSampleController.deleteInteriorArea);

// ─── InteriorLevel ────────────────────────────────────────────────────────────
router.get("/levels", vq(interiorLevelQuerySchema), interiorSampleController.getInteriorLevels);
router.get("/levels/:id", vp(idSchema), interiorSampleController.getInteriorLevelById);
router.post("/levels", validate(createInteriorLevelSchema), interiorSampleController.createInteriorLevel);
router.patch("/levels/:id", vp(idSchema), validate(updateInteriorLevelSchema), interiorSampleController.updateInteriorLevel);
router.delete("/levels/:id", vp(idSchema), interiorSampleController.deleteInteriorLevel);

// ─── InteriorLabor ────────────────────────────────────────────────────────────
router.get("/labors", vq(interiorLaborQuerySchema), interiorSampleController.getInteriorLabors);
router.get("/labors/:id", vp(idSchema), interiorSampleController.getInteriorLaborById);
router.post("/labors", validate(createInteriorLaborSchema), interiorSampleController.createInteriorLabor);
router.patch("/labors/:id", vp(idSchema), validate(updateInteriorLaborSchema), interiorSampleController.updateInteriorLabor);
router.delete("/labors/:id", vp(idSchema), interiorSampleController.deleteInteriorLabor);

// ─── InteriorObjective ────────────────────────────────────────────────────────
router.get("/objectives", vq(interiorObjectiveQuerySchema), interiorSampleController.getInteriorObjectives);
router.get("/objectives/:id", vp(idSchema), interiorSampleController.getInteriorObjectiveById);
router.post("/objectives", validate(createInteriorObjectiveSchema), interiorSampleController.createInteriorObjective);
router.patch("/objectives/:id", vp(idSchema), validate(updateInteriorObjectiveSchema), interiorSampleController.updateInteriorObjective);
router.delete("/objectives/:id", vp(idSchema), interiorSampleController.deleteInteriorObjective);

// ─── InteriorLaboratory ───────────────────────────────────────────────────────
router.get("/laboratories", vq(interiorLaboratoryQuerySchema), interiorSampleController.getInteriorLaboratories);
router.get("/laboratories/:id", vp(idSchema), interiorSampleController.getInteriorLaboratoryById);
router.post("/laboratories", validate(createInteriorLaboratorySchema), interiorSampleController.createInteriorLaboratory);
router.patch("/laboratories/:id", vp(idSchema), validate(updateInteriorLaboratorySchema), interiorSampleController.updateInteriorLaboratory);
router.delete("/laboratories/:id", vp(idSchema), interiorSampleController.deleteInteriorLaboratory);

// ─── InteriorSample (transactional) ──────────────────────────────────────────
router.get("/samples/with-results", vq(interiorSampleQuerySchema), interiorSampleController.getInteriorSamples);
router.post("/samples/with-results", validate(createInteriorSampleWithResultsSchema), interiorSampleController.createInteriorSampleWithResults);
router.patch("/samples/:id/with-results", vp(idSchema), validate(updateInteriorSampleWithResultsSchema), interiorSampleController.updateInteriorSampleWithResults);

// ─── InteriorSample (basic) ───────────────────────────────────────────────────
router.get("/samples", vq(interiorSampleQuerySchema), interiorSampleController.getInteriorSamples);
router.get("/samples/:id", vp(idSchema), interiorSampleController.getInteriorSampleById);
router.post("/samples", validate(createInteriorSampleSchema), interiorSampleController.createInteriorSample);
router.patch("/samples/:id", vp(idSchema), validate(updateInteriorSampleSchema), interiorSampleController.updateInteriorSample);
router.delete("/samples/:id", vp(idSchema), interiorSampleController.deleteInteriorSample);

// ─── InteriorLabAssignment ────────────────────────────────────────────────────
router.get("/lab-assignments", vq(interiorLabAssignmentQuerySchema), interiorSampleController.getInteriorLabAssignments);
router.get("/lab-assignments/:id", vp(idSchema), interiorSampleController.getInteriorLabAssignmentById);
router.post("/lab-assignments", validate(createInteriorLabAssignmentSchema), interiorSampleController.createInteriorLabAssignment);
router.patch("/lab-assignments/:id", vp(idSchema), validate(updateInteriorLabAssignmentSchema), interiorSampleController.updateInteriorLabAssignment);
router.delete("/lab-assignments/:id", vp(idSchema), interiorSampleController.deleteInteriorLabAssignment);

// ─── InteriorSampleResult ─────────────────────────────────────────────────────
router.get("/results", vq(interiorSampleResultQuerySchema), interiorSampleController.getInteriorSampleResults);
router.get("/results/:id", vp(idSchema), interiorSampleController.getInteriorSampleResultById);
router.post("/results", validate(createInteriorSampleResultSchema), interiorSampleController.createInteriorSampleResult);
router.patch("/results/:id", vp(idSchema), validate(updateInteriorSampleResultSchema), interiorSampleController.updateInteriorSampleResult);
router.delete("/results/:id", vp(idSchema), interiorSampleController.deleteInteriorSampleResult);

export default router;
