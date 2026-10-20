import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import { authenticate, type AuthRequest } from "../../middleware/auth.middleware.js";
import { auditEvent } from "../../config/audit.js";
import { auditService } from "./audit.service.js";

// La bitácora solo la ve el Administrador (ni siquiera quien puede crear usuarios).
function adminOnly(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== "ADMIN") {
    void auditEvent({ action: "ACCESS_DENIED", entity: "auditoria", detail: { motivo: "solo administrador" } });
    return res.status(403).json({ success: false, error: "Solo el administrador puede consultar la bitácora de auditoría" });
  }
  next();
}

const date = z.string().refine((value) => !Number.isNaN(new Date(value).getTime()), "Fecha no válida");
const filtersSchema = z.object({
  from: date.optional(),
  to: date.optional(),
  actorId: z.coerce.number().int().optional(),
  action: z.string().trim().min(1).max(60).optional(),
  table: z.string().trim().min(1).max(80).optional(),
  recordId: z.string().trim().min(1).max(200).optional(),
  source: z.enum(["api", "system", "database"]).optional(),
  search: z.string().trim().min(1).max(100).optional(),
});
const listSchema = filtersSchema.extend({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

const handle =
  (fn: (req: Request) => Promise<unknown>) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await fn(req);
      if (data === null) return res.status(404).json({ success: false, error: "No encontrado" });
      res.json({ success: true, data });
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ success: false, error: "Filtros no válidos", details: error.flatten() });
      next(error);
    }
  };

const clean = <T extends Record<string, unknown>>(value: T) =>
  Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T;

const router = Router();
router.use(authenticate, adminOnly);

router.get("/summary", handle(() => auditService.summary()));
router.get("/filters", handle(() => auditService.filters()));
router.get("/verify", handle(() => auditService.verify()));
router.get("/", handle(async (req) => {
  const parsed = listSchema.parse(req.query);
  return auditService.list(clean(parsed) as never);
}));
router.get("/history/:table/:id", handle((req) => auditService.history(String(req.params["table"]), String(req.params["id"]))));
router.get("/:seq", handle((req) => {
  const seq = Number(req.params["seq"]);
  return Number.isInteger(seq) && seq > 0 ? auditService.get(seq) : Promise.resolve(null);
}));

router.get("/export/csv", async (req, res, next) => {
  try {
    const rows = await auditService.exportRows(clean(filtersSchema.parse(req.query)) as never);
    const columns = ["seq", "at", "source", "action", "table_name", "record_id", "record_label", "actor_id", "actor_name", "actor_email", "actor_role", "ip", "route", "request_id", "changed_fields", "old_data", "new_data", "detail", "hash"];
    const cell = (value: unknown) => {
      if (value == null) return "";
      const text = value instanceof Date ? value.toISOString() : typeof value === "object" ? JSON.stringify(value) : String(value);
      // Evita que Excel interprete una celda como fórmula.
      const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
      return `"${safe.replace(/"/g, '""')}"`;
    };
    const csv = [columns.join(","), ...rows.map((row) => columns.map((column) => cell(row[column])).join(","))].join("\r\n");
    await auditEvent({ action: "AUDIT_EXPORT", entity: "auditoria", detail: { filas: rows.length, filtros: req.query } });
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="auditoria_${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send("﻿" + csv);
  } catch (error) {
    next(error);
  }
});

export default router;
