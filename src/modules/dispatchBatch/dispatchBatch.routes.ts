import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { dispatchBatchController } from "./dispatchBatch.controller.js";
import { createDispatchBatchSchema } from "./dispatchBatch.schema.js";

const router = Router();
router.use(authenticate);
router.use(requirePermission("despachos"));

router.post("/", validate(createDispatchBatchSchema), dispatchBatchController.createDispatchBatch);

export default router;
