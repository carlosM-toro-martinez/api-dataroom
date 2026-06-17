import { Router } from "express";
import { surfaceSampleController } from "./surfaceSample.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import {
  createSurfaceAreaSchema,
  createSurfaceLabAssignmentSchema,
  createSurfaceLaboratorySchema,
  createSurfaceObjectiveSchema,
  createSurfaceSampleResultSchema,
  createSurfaceSampleSchema,
  createSurfaceSampleWithResultsSchema,
  idSchema,
  surfaceAreaQuerySchema,
  surfaceLabAssignmentQuerySchema,
  surfaceLaboratoryQuerySchema,
  surfaceObjectiveQuerySchema,
  surfaceSampleQuerySchema,
  surfaceSampleResultQuerySchema,
  updateSurfaceAreaSchema,
  updateSurfaceLabAssignmentSchema,
  updateSurfaceLaboratorySchema,
  updateSurfaceObjectiveSchema,
  updateSurfaceSampleResultSchema,
  updateSurfaceSampleSchema,
  updateSurfaceSampleWithResultsSchema,
} from "./surfaceSample.schema.js";

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

// ─── SurfaceArea ──────────────────────────────────────────────────────────────
router.get("/areas", vq(surfaceAreaQuerySchema), surfaceSampleController.getSurfaceAreas);
router.get("/areas/:id", vp(idSchema), surfaceSampleController.getSurfaceAreaById);
router.post("/areas", validate(createSurfaceAreaSchema), surfaceSampleController.createSurfaceArea);
router.patch("/areas/:id", vp(idSchema), validate(updateSurfaceAreaSchema), surfaceSampleController.updateSurfaceArea);
router.delete("/areas/:id", vp(idSchema), surfaceSampleController.deleteSurfaceArea);

// ─── SurfaceObjective ─────────────────────────────────────────────────────────
router.get("/objectives", vq(surfaceObjectiveQuerySchema), surfaceSampleController.getSurfaceObjectives);
router.get("/objectives/:id", vp(idSchema), surfaceSampleController.getSurfaceObjectiveById);
router.post("/objectives", validate(createSurfaceObjectiveSchema), surfaceSampleController.createSurfaceObjective);
router.patch("/objectives/:id", vp(idSchema), validate(updateSurfaceObjectiveSchema), surfaceSampleController.updateSurfaceObjective);
router.delete("/objectives/:id", vp(idSchema), surfaceSampleController.deleteSurfaceObjective);

// ─── SurfaceLaboratory ────────────────────────────────────────────────────────
router.get("/laboratories", vq(surfaceLaboratoryQuerySchema), surfaceSampleController.getSurfaceLaboratories);
router.get("/laboratories/:id", vp(idSchema), surfaceSampleController.getSurfaceLaboratoryById);
router.post("/laboratories", validate(createSurfaceLaboratorySchema), surfaceSampleController.createSurfaceLaboratory);
router.patch("/laboratories/:id", vp(idSchema), validate(updateSurfaceLaboratorySchema), surfaceSampleController.updateSurfaceLaboratory);
router.delete("/laboratories/:id", vp(idSchema), surfaceSampleController.deleteSurfaceLaboratory);

// ─── SurfaceLabAssignment ─────────────────────────────────────────────────────
router.get("/lab-assignments", vq(surfaceLabAssignmentQuerySchema), surfaceSampleController.getSurfaceLabAssignments);
router.get("/lab-assignments/:id", vp(idSchema), surfaceSampleController.getSurfaceLabAssignmentById);
router.post("/lab-assignments", validate(createSurfaceLabAssignmentSchema), surfaceSampleController.createSurfaceLabAssignment);
router.patch("/lab-assignments/:id", vp(idSchema), validate(updateSurfaceLabAssignmentSchema), surfaceSampleController.updateSurfaceLabAssignment);
router.delete("/lab-assignments/:id", vp(idSchema), surfaceSampleController.deleteSurfaceLabAssignment);

// ─── SurfaceSample (transactional) ───────────────────────────────────────────
router.get("/samples/with-results", vq(surfaceSampleQuerySchema), surfaceSampleController.getSurfaceSamples);
router.post("/samples/with-results", validate(createSurfaceSampleWithResultsSchema), surfaceSampleController.createSurfaceSampleWithResults);
router.patch("/samples/:id/with-results", vp(idSchema), validate(updateSurfaceSampleWithResultsSchema), surfaceSampleController.updateSurfaceSampleWithResults);

// ─── SurfaceSample (basic) ────────────────────────────────────────────────────
router.get("/samples", vq(surfaceSampleQuerySchema), surfaceSampleController.getSurfaceSamples);
router.get("/samples/:id", vp(idSchema), surfaceSampleController.getSurfaceSampleById);
router.post("/samples", validate(createSurfaceSampleSchema), surfaceSampleController.createSurfaceSample);
router.patch("/samples/:id", vp(idSchema), validate(updateSurfaceSampleSchema), surfaceSampleController.updateSurfaceSample);
router.delete("/samples/:id", vp(idSchema), surfaceSampleController.deleteSurfaceSample);

// ─── SurfaceSampleResult ──────────────────────────────────────────────────────
router.get("/results", vq(surfaceSampleResultQuerySchema), surfaceSampleController.getSurfaceSampleResults);
router.get("/results/:id", vp(idSchema), surfaceSampleController.getSurfaceSampleResultById);
router.post("/results", validate(createSurfaceSampleResultSchema), surfaceSampleController.createSurfaceSampleResult);
router.patch("/results/:id", vp(idSchema), validate(updateSurfaceSampleResultSchema), surfaceSampleController.updateSurfaceSampleResult);
router.delete("/results/:id", vp(idSchema), surfaceSampleController.deleteSurfaceSampleResult);

export default router;
