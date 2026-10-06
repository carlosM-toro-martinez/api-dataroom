import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { ctx, handle } from "./drilling.controller.js";
import * as schema from "./drilling.schema.js";
import * as service from "./drilling.service.js";

const vq = (s: any) => (req: any, res: any, next: any) => {
  const result = s.safeParse(req.query);
  if (!result.success)
    return res.status(400).json({ success: false, error: "Query validation error", details: result.error.flatten() });
  req.validatedQuery = result.data;
  next();
};

const vp = (s: any) => (req: any, res: any, next: any) => {
  const result = s.safeParse(req.params);
  if (!result.success)
    return res.status(400).json({ success: false, error: "Params validation error", details: result.error.flatten() });
  req.validatedParams = result.data;
  next();
};

const router = Router();
router.use(authenticate);
// Todos los roles internos (incluido SONDAJES); los visitantes del Data Room no.
router.use((req: any, res: any, next: any) => {
  if (!req.user || req.user.role === "VISITANTE") {
    return res.status(403).json({ success: false, error: "Acceso denegado" });
  }
  next();
});

const id = vp(schema.idSchema);
const holeId = vp(schema.holeIdSchema);

router.get("/summary", handle(() => service.getDrillingSummary()));

// ─── Personal de perforación ─────────────────────────────────────────────────
router.get("/personnel", vq(schema.listQuerySchema), handle((req) => service.personnel.list(ctx.query(req))));
router.post("/personnel", validate(schema.createPersonnelSchema), handle((req) => service.personnel.create(req.body, ctx.uid(req)), 201));
router.patch("/personnel/:id", id, validate(schema.updatePersonnelSchema), handle((req) => service.personnel.update(ctx.params(req).id, req.body, ctx.uid(req))));
router.delete("/personnel/:id", id, handle((req) => service.personnel.remove(ctx.params(req).id)));

// ─── Catálogos ───────────────────────────────────────────────────────────────
const catalogs = [
  ["contractors", service.contractors, schema.createContractorSchema, schema.updateContractorSchema],
  ["rigs", service.rigs, schema.createRigSchema, schema.updateRigSchema],
  ["laboratories", service.laboratories, schema.createLaboratorySchema, schema.updateLaboratorySchema],
] as const;

for (const [path, svc, createSchema, updateSchema] of catalogs) {
  router.get(`/${path}`, vq(schema.listQuerySchema), handle((req) => svc.list(ctx.query(req))));
  router.get(`/${path}/:id`, id, handle((req) => svc.get(ctx.params(req).id)));
  router.post(`/${path}`, validate(createSchema), handle((req) => svc.create(req.body, ctx.uid(req)), 201));
  router.patch(`/${path}/:id`, id, validate(updateSchema), handle((req) => svc.update(ctx.params(req).id, req.body, ctx.uid(req))));
  router.delete(`/${path}/:id`, id, handle((req) => svc.remove(ctx.params(req).id)));
}

// ─── Campañas ────────────────────────────────────────────────────────────────
router.get("/campaigns", vq(schema.campaignQuerySchema), handle((req) => service.campaigns.list(ctx.query(req))));
router.get("/campaigns/:id", id, handle((req) => service.campaigns.get(ctx.params(req).id)));
router.post("/campaigns", validate(schema.createCampaignSchema), handle((req) => service.campaigns.create(req.body, ctx.uid(req)), 201));
router.patch("/campaigns/:id", id, validate(schema.updateCampaignSchema), handle((req) => service.campaigns.update(ctx.params(req).id, req.body, ctx.uid(req))));
router.delete("/campaigns/:id", id, handle((req) => service.campaigns.remove(ctx.params(req).id)));

// ─── Pozos ───────────────────────────────────────────────────────────────────
router.get("/holes", vq(schema.holeQuerySchema), handle((req) => service.holes.list(ctx.query(req))));
router.get("/holes/:id", id, handle((req) => service.holes.summary(ctx.params(req).id)));
router.post("/holes/import", validate(schema.importHolesSchema), handle((req) => service.holes.importMany(req.body.campaignId, req.body.holes, ctx.uid(req)), 201));
router.post("/holes", validate(schema.createHoleSchema), handle((req) => service.holes.create(req.body, ctx.uid(req)), 201));
router.patch("/holes/:id", id, validate(schema.updateHoleSchema), handle((req) => service.holes.update(ctx.params(req).id, req.body, ctx.uid(req))));
router.delete("/holes/:id", id, handle((req) => service.holes.remove(ctx.params(req).id)));

// ─── Registros del pozo: /holes/:holeId/<recurso> y /<recurso>/:id ───────────
const holeResources = [
  ["shift-reports", service.shiftReports, schema.createShiftReportSchema, schema.updateShiftReportSchema],
  ["surveys", service.surveys, schema.createSurveySchema, schema.updateSurveySchema],
  ["runs", service.runs, schema.createRunSchema, schema.updateRunSchema],
  ["core-boxes", service.coreBoxes, schema.createCoreBoxSchema, schema.updateCoreBoxSchema],
  ["log-intervals", service.logIntervals, schema.createLogIntervalSchema, schema.updateLogIntervalSchema],
  ["samples", service.samples, schema.createSampleSchema, schema.updateSampleSchema],
] as const;

for (const [path, svc, createSchema, updateSchema] of holeResources) {
  router.get(`/holes/:holeId/${path}`, holeId, handle((req) => svc.listByHole(ctx.params(req).holeId)));
  router.post(`/holes/:holeId/${path}`, holeId, validate(createSchema), handle((req) => svc.createForHole(ctx.params(req).holeId, req.body, ctx.uid(req)), 201));
  router.patch(`/${path}/:id`, id, validate(updateSchema), handle((req) => svc.update(ctx.params(req).id, req.body, ctx.uid(req))));
  router.delete(`/${path}/:id`, id, handle((req) => svc.remove(ctx.params(req).id)));
}

// Listado general de muestras (para armar lotes).
router.get("/samples", vq(schema.sampleQuerySchema), handle((req) => service.samples.list(ctx.query(req))));

// ─── Resultados ──────────────────────────────────────────────────────────────
router.get("/samples/:id/results", id, handle((req) => service.results.listBySample(ctx.params(req).id)));
router.post("/samples/:id/results", id, validate(schema.createResultSchema), handle((req) => service.results.create(ctx.params(req).id, req.body, ctx.uid(req)), 201));
router.delete("/results/:id", id, handle((req) => service.results.remove(ctx.params(req).id)));

// ─── Lotes (nota de remisión, folio compartido) ──────────────────────────────
router.get("/dispatches", vq(schema.dispatchQuerySchema), handle((req) => service.dispatches.list(ctx.query(req))));
router.get("/dispatches/:id", id, handle((req) => service.dispatches.get(ctx.params(req).id)));
router.post("/dispatches", validate(schema.createDispatchSchema), handle((req) => service.dispatches.create(req.body, ctx.uid(req)), 201));
router.delete("/dispatches/:id", id, handle((req) => service.dispatches.remove(ctx.params(req).id)));

export default router;
