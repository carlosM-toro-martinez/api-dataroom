import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { dispatchBatchController } from "./dispatchBatch.controller.js";
import { createDispatchBatchSchema } from "./dispatchBatch.schema.js";

const router = Router();
router.use(authenticate);
router.use((req: any, res: any, next: any) => {
  if (req.user?.role === "VISITANTE" && req.method !== "GET") {
    return res.status(403).json({ success: false, error: "Acceso visitante solo lectura" });
  }
  next();
});

router.post("/", validate(createDispatchBatchSchema), dispatchBatchController.createDispatchBatch);

export default router;
