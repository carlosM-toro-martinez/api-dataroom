import { Router, type NextFunction, type Response } from "express";
import { authenticate, type AuthRequest } from "../../middleware/auth.middleware.js";
import { auditEvent } from "../../config/audit.js";
import { accessService } from "./access.service.js";

// Quién tiene acceso al sistema es información del Administrador.
function adminOnly(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== "ADMIN") {
    void auditEvent({ action: "ACCESS_DENIED", entity: "accesos", detail: { motivo: "solo administrador" } });
    return res.status(403).json({ success: false, error: "Solo el administrador puede ver los accesos del sistema" });
  }
  next();
}

const router = Router();
router.use(authenticate, adminOnly);

router.get("/overview", async (_req, res, next) => {
  try {
    res.json({ success: true, data: await accessService.overview() });
  } catch (error) {
    next(error);
  }
});

export default router;
