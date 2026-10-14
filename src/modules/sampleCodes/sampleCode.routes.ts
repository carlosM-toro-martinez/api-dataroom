import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";
import { sampleCodeController } from "./sampleCode.controller.js";

const router = Router();

router.use(authenticate);

router.get("/duplicates", requirePermission("elementos"), sampleCodeController.getDuplicates);
router.post("/repair", requirePermission("elementos", "update"), sampleCodeController.repair);
router.post("/revert", requirePermission("elementos", "update"), sampleCodeController.revert);

export default router;
