import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.middleware.js";
import { sampleCodeController } from "./sampleCode.controller.js";

const router = Router();

router.use(authenticate);
router.use(authorize("ADMIN"));

router.get("/duplicates", sampleCodeController.getDuplicates);
router.post("/repair", sampleCodeController.repair);
router.post("/revert", sampleCodeController.revert);

export default router;
