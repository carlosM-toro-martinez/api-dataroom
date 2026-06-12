import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes.js";
import exploracionesRoutes from "../modules/exploraciones/exploraciones.routes.js";
import miningExplorationRoutes from "../modules/miningExploration/miningExploration.routes.js";
import surfaceExplorationRoutes from "../modules/surfaceExploration/surfaceExploration.routes.js";
import miningExcelRoutes from "../modules/miningExcel/miningExcel.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/exploraciones", exploracionesRoutes);
router.use("/mining-exploration", miningExplorationRoutes);
router.use("/", miningExplorationRoutes);
router.use("/surface-exploration", surfaceExplorationRoutes);
router.use("/imports/mining-excel", miningExcelRoutes);

export default router;
