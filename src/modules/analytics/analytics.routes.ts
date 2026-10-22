import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import { authenticate, type AuthRequest } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";
import { hasAnyPermission } from "../roles/roles.service.js";
import { analyticsService, type AnalyticsFilters } from "./analytics.service.js";

const date = z.string().refine((value) => !Number.isNaN(new Date(value).getTime()), "Fecha no válida");
const filters = z.object({
  category: z.enum(["EXPLORATION", "PRODUCTION"]).optional(),
  source: z.enum(["INTERIOR", "SURFACE"]).optional(),
  from: date.optional(),
  to: date.optional(),
});
const element = z.object({ element: z.string().trim().min(1).max(20).optional(), unit: z.string().trim().max(20).optional() });

const clean = <T extends Record<string, unknown>>(value: T) =>
  Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T;

const handle =
  (fn: (req: Request) => Promise<unknown>) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({ success: true, data: await fn(req) });
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ success: false, error: "Filtros no válidos", details: error.flatten() });
      next(error);
    }
  };

// Quien tiene "Análisis de muestras" ve todo; quien solo tiene "Análisis de mis muestras" ve únicamente lo que él mismo registró.
const scopeOf = async (req: AuthRequest) => ((await hasAnyPermission(req.user!.role, ["analisisMuestras"], "read")) ? "all" : "own");
const withScope = (handler: (req: Request, filters: AnalyticsFilters) => Promise<unknown>) =>
  handle(async (req) => {
    const base = clean(filters.parse(req.query)) as AnalyticsFilters;
    const scoped = (await scopeOf(req as AuthRequest)) === "own" ? { ...base, ownerId: (req as AuthRequest).user!.id } : base;
    return handler(req, scoped);
  });

// Solo lectura: lo ve quien tenga el módulo "Análisis de muestras" (por defecto Administrador, Geólogo administrador y Superintendencia).
const router = Router();
router.use(authenticate, requirePermission(["analisisMuestras", "misAnalisisMuestras"], "read"));

router.get("/scope", handle(async (req) => ({ scope: await scopeOf(req as AuthRequest) })));

router.get("/overview", withScope((_req, f) => analyticsService.overview(f)));
router.get("/grades", withScope((req, f) => {
  const { groupBy } = z.object({ groupBy: z.enum(["area", "level", "labor", "objective"]).default("level") }).parse(req.query);
  return analyticsService.grades(f, { ...clean(element.parse(req.query)), groupBy });
}));
router.get("/coverage", withScope((_req, f) => analyticsService.coverage(f)));
router.get("/laboratories", withScope((_req, f) => analyticsService.laboratories(f)));
router.get("/quality", withScope((req, f) => analyticsService.quality(f, clean(element.parse(req.query)))));
router.get("/estimation", withScope((req, f) => {
  const { levelId, method } = z.object({ levelId: z.string().trim().min(1).max(60).optional(), method: z.enum(["idw", "kriging"]).optional() }).parse(req.query);
  return analyticsService.estimation(f, { ...clean(element.parse(req.query)), levelId, method });
}));

export default router;
