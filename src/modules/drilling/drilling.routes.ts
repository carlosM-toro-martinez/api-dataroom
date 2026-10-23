import { Router } from "express";
import multer from "multer";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { ctx, handle } from "./drilling.controller.js";
import * as schema from "./drilling.schema.js";
import * as service from "./drilling.service.js";
import { geologyLog, geologyReports, photos } from "./drilling.geology.service.js";

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

// Sondajes tiene dos permisos: Perforación (programas, pozos, partes, personal) y Geología
// (reporte geológico, logueo, fotos). Ambos pueden consultar programas y pozos.
const perf = requirePermission("sondajes");
const geo = requirePermission("geologiaSondajes");
const anyDrilling = requirePermission(["sondajes", "geologiaSondajes"]);

const id = vp(schema.idSchema);
const holeId = vp(schema.holeIdSchema);

router.get("/summary", anyDrilling, handle(() => service.getDrillingSummary()));

// ─── Personal de perforación ─────────────────────────────────────────────────
router.get("/personnel", perf, vq(schema.listQuerySchema), handle((req) => service.personnel.list(ctx.query(req))));
router.post("/personnel", perf, validate(schema.createPersonnelSchema), handle((req) => service.personnel.create(req.body, ctx.uid(req)), 201));
router.patch("/personnel/:id", perf, id, validate(schema.updatePersonnelSchema), handle((req) => service.personnel.update(ctx.params(req).id, req.body, ctx.uid(req))));
router.delete("/personnel/:id", perf, id, handle((req) => service.personnel.remove(ctx.params(req).id)));

// ─── Catálogos ───────────────────────────────────────────────────────────────
const catalogs = [
  ["contractors", service.contractors, schema.createContractorSchema, schema.updateContractorSchema],
  ["rigs", service.rigs, schema.createRigSchema, schema.updateRigSchema],
  ["laboratories", service.laboratories, schema.createLaboratorySchema, schema.updateLaboratorySchema],
] as const;

for (const [path, svc, createSchema, updateSchema] of catalogs) {
  router.get(`/${path}`, perf, vq(schema.listQuerySchema), handle((req) => svc.list(ctx.query(req))));
  router.get(`/${path}/:id`, perf, id, handle((req) => svc.get(ctx.params(req).id)));
  router.post(`/${path}`, perf, validate(createSchema), handle((req) => svc.create(req.body, ctx.uid(req)), 201));
  router.patch(`/${path}/:id`, perf, id, validate(updateSchema), handle((req) => svc.update(ctx.params(req).id, req.body, ctx.uid(req))));
  router.delete(`/${path}/:id`, perf, id, handle((req) => svc.remove(ctx.params(req).id)));
}

// ─── Campañas ────────────────────────────────────────────────────────────────
router.get("/campaigns", anyDrilling, vq(schema.campaignQuerySchema), handle((req) => service.campaigns.list(ctx.query(req))));
router.get("/campaigns/:id", anyDrilling, id, handle((req) => service.campaigns.get(ctx.params(req).id)));
router.post("/campaigns", perf, validate(schema.createCampaignSchema), handle((req) => service.campaigns.create(req.body, ctx.uid(req)), 201));
router.patch("/campaigns/:id", perf, id, validate(schema.updateCampaignSchema), handle((req) => service.campaigns.update(ctx.params(req).id, req.body, ctx.uid(req))));
router.delete("/campaigns/:id", perf, id, handle((req) => service.campaigns.remove(ctx.params(req).id)));

// ─── Pozos ───────────────────────────────────────────────────────────────────
router.get("/holes", anyDrilling, vq(schema.holeQuerySchema), handle((req) => service.holes.list(ctx.query(req))));
router.get("/holes/:id", anyDrilling, id, handle((req) => service.holes.summary(ctx.params(req).id)));
router.post("/holes/import", perf, validate(schema.importHolesSchema), handle((req) => service.holes.importMany(req.body.campaignId, req.body.holes, ctx.uid(req)), 201));
router.post("/holes", perf, validate(schema.createHoleSchema), handle((req) => service.holes.create(req.body, ctx.uid(req)), 201));
router.patch("/holes/:id", perf, id, validate(schema.updateHoleSchema), handle((req) => service.holes.update(ctx.params(req).id, req.body, ctx.uid(req))));
router.delete("/holes/:id", perf, id, handle((req) => service.holes.remove(ctx.params(req).id)));

// ─── Registros del pozo: /holes/:holeId/<recurso> y /<recurso>/:id ───────────
const holeResources = [
  ["shift-reports", service.shiftReports, schema.createShiftReportSchema, schema.updateShiftReportSchema],
  ["surveys", service.surveys, schema.createSurveySchema, schema.updateSurveySchema],
  ["runs", service.runs, schema.createRunSchema, schema.updateRunSchema],
  ["core-boxes", service.coreBoxes, schema.createCoreBoxSchema, schema.updateCoreBoxSchema],
  ["samples", service.samples, schema.createSampleSchema, schema.updateSampleSchema],
] as const;

for (const [path, svc, createSchema, updateSchema] of holeResources) {
  router.get(`/holes/:holeId/${path}`, perf, holeId, handle((req) => svc.listByHole(ctx.params(req).holeId)));
  router.post(`/holes/:holeId/${path}`, perf, holeId, validate(createSchema), handle((req) => svc.createForHole(ctx.params(req).holeId, req.body, ctx.uid(req)), 201));
  router.patch(`/${path}/:id`, perf, id, validate(updateSchema), handle((req) => svc.update(ctx.params(req).id, req.body, ctx.uid(req))));
  router.delete(`/${path}/:id`, perf, id, handle((req) => svc.remove(ctx.params(req).id)));
}

// Listado general de muestras (para armar lotes).
router.get("/samples", perf, vq(schema.sampleQuerySchema), handle((req) => service.samples.list(ctx.query(req))));

// ─── Resultados ──────────────────────────────────────────────────────────────
router.get("/samples/:id/results", perf, id, handle((req) => service.results.listBySample(ctx.params(req).id)));
router.post("/samples/:id/results", perf, id, validate(schema.createResultSchema), handle((req) => service.results.create(ctx.params(req).id, req.body, ctx.uid(req)), 201));
router.delete("/results/:id", perf, id, handle((req) => service.results.remove(ctx.params(req).id)));

// ─── Lotes (nota de remisión, folio compartido) ──────────────────────────────
router.get("/dispatches", perf, vq(schema.dispatchQuerySchema), handle((req) => service.dispatches.list(ctx.query(req))));
router.get("/dispatches/:id", perf, id, handle((req) => service.dispatches.get(ctx.params(req).id)));
router.post("/dispatches", perf, validate(schema.createDispatchSchema), handle((req) => service.dispatches.create(req.body, ctx.uid(req)), 201));
router.delete("/dispatches/:id", perf, id, handle((req) => service.dispatches.remove(ctx.params(req).id)));

// ─── Geología: reporte diario, logueo y fotografías ──────────────────────────
const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024, files: 2 },
  fileFilter: (_req, file, callback) => {
    if (/^image\/(jpeg|png|webp)$/.test(file.mimetype)) callback(null, true);
    else callback(Object.assign(new Error("Solo se aceptan imágenes JPG, PNG o WEBP."), { statusCode: 400 }));
  },
}).fields([
  { name: "file", maxCount: 1 },
  { name: "thumb", maxCount: 1 },
]);

router.get("/holes/:holeId/geology-reports", geo, holeId, handle((req) => geologyReports.listByHole(ctx.params(req).holeId)));
router.post("/holes/:holeId/geology-reports", geo, holeId, validate(schema.createGeologyReportSchema), handle((req) => geologyReports.createForHole(ctx.params(req).holeId, req.body, ctx.uid(req)), 201));
router.patch("/geology-reports/:id", geo, id, validate(schema.updateGeologyReportSchema), handle((req) => geologyReports.update(ctx.params(req).id, req.body, ctx.uid(req))));
router.delete("/geology-reports/:id", geo, id, handle((req) => geologyReports.remove(ctx.params(req).id)));

router.get("/holes/:holeId/geology-log", geo, holeId, handle((req) => geologyLog.get(ctx.params(req).holeId)));
router.put("/holes/:holeId/geology-log", geo, holeId, validate(schema.replaceGeologyLogSchema), handle((req) => geologyLog.replace(ctx.params(req).holeId, req.body.rows, ctx.uid(req))));

router.get("/photos-integrity", geo, handle((req) => photos.integrity(typeof req.query["holeId"] === "string" ? req.query["holeId"] : undefined)));
router.get("/holes/:holeId/photos", geo, holeId, handle((req) => photos.listByHole(ctx.params(req).holeId)));
router.post(
  "/holes/:holeId/photos",
  geo,
  holeId,
  photoUpload,
  validate(schema.createPhotoSchema),
  handle((req) => {
    const files = (req as unknown as { files?: Record<string, Express.Multer.File[]> }).files ?? {};
    return photos.create(ctx.params(req).holeId, req.body, { file: files.file?.[0], thumb: files.thumb?.[0] }, ctx.uid(req));
  }, 201),
);
router.put(
  "/photos/:id/file",
  geo,
  id,
  photoUpload,
  handle((req) => {
    const files = (req as unknown as { files?: Record<string, Express.Multer.File[]> }).files ?? {};
    return photos.restoreFile(ctx.params(req).id, { file: files.file?.[0], thumb: files.thumb?.[0] });
  }),
);
router.patch("/photos/:id", geo, id, validate(schema.updatePhotoSchema), handle((req) => photos.update(ctx.params(req).id, req.body, ctx.uid(req))));
router.delete("/photos/:id", geo, id, handle((req) => photos.remove(ctx.params(req).id)));
router.get("/photos/:id/file", geo, id, vq(schema.photoFileQuerySchema), async (req: any, res: any) => {
  try {
    const file = await photos.file(ctx.params(req).id, ctx.query(req).variant);
    res.setHeader("Cache-Control", "private, max-age=31536000, immutable");
    res.type(file.mimeType);
    res.sendFile(file.path, (error?: Error) => {
      if (error && !res.headersSent) res.status(404).json({ success: false, error: "Archivo de la foto no encontrado." });
    });
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode ?? 500;
    res.status(status).json({ success: false, error: (error as Error).message });
  }
});

export default router;
