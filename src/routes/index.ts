import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes.js";
import exploracionesRoutes from "../modules/exploraciones/exploraciones.routes.js";
import miningExplorationRoutes from "../modules/miningExploration/miningExploration.routes.js";
import surfaceExplorationRoutes from "../modules/surfaceExploration/surfaceExploration.routes.js";
import miningExcelRoutes from "../modules/miningExcel/miningExcel.routes.js";
import interiorSampleRoutes from "../modules/interiorSample/interiorSample.routes.js";
import surfaceSampleRoutes from "../modules/surfaceSample/surfaceSample.routes.js";
import sampleCodeRoutes from "../modules/sampleCodes/sampleCode.routes.js";
import dispatchBatchRoutes from "../modules/dispatchBatch/dispatchBatch.routes.js";
import drillingRoutes from "../modules/drilling/drilling.routes.js";
import mediaRoutes from "../modules/media/media.routes.js";
import rolesRoutes from "../modules/roles/roles.routes.js";
import auditRoutes from "../modules/audit/audit.routes.js";
import analyticsRoutes from "../modules/analytics/analytics.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/roles", rolesRoutes);
router.use("/audit", auditRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/exploraciones", exploracionesRoutes);
router.use("/mining-exploration", miningExplorationRoutes);
router.use("/surface-exploration", surfaceExplorationRoutes);
router.use("/imports/mining-excel", miningExcelRoutes);
router.use("/interior", interiorSampleRoutes);
router.use("/surface-sample", surfaceSampleRoutes);
router.use("/sample-codes", sampleCodeRoutes);
router.use("/dispatch-batches", dispatchBatchRoutes);
router.use("/drilling", drillingRoutes);
router.use("/media", mediaRoutes);
// Alias sin prefijo de mining-exploration: debe ir al final porque sus middlewares
// (auth + permisos) se ejecutarían para cualquier ruta montada después.
router.use("/", miningExplorationRoutes);

export default router;
