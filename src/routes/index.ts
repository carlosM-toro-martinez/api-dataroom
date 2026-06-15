import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes.js";
import exploracionesRoutes from "../modules/exploraciones/exploraciones.routes.js";
import miningExplorationRoutes from "../modules/miningExploration/miningExploration.routes.js";
import surfaceExplorationRoutes from "../modules/surfaceExploration/surfaceExploration.routes.js";
import miningExcelRoutes from "../modules/miningExcel/miningExcel.routes.js";
import interiorSampleRoutes from "../modules/interiorSample/interiorSample.routes.js";
import surfaceSampleRoutes from "../modules/surfaceSample/surfaceSample.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/exploraciones", exploracionesRoutes);
router.use("/mining-exploration", miningExplorationRoutes);
router.use("/", miningExplorationRoutes);
router.use("/surface-exploration", surfaceExplorationRoutes);
router.use("/imports/mining-excel", miningExcelRoutes);
router.use("/interior", interiorSampleRoutes);
router.use("/surface-sample", surfaceSampleRoutes);

export default router;
