import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";
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

const parseFilters = (req: Request) => clean(filters.parse(req.query)) as AnalyticsFilters;

// Solo lectura: lo ve quien tenga el módulo "Análisis de muestras" (por defecto Administrador, Geólogo administrador y Superintendencia).
const router = Router();
router.use(authenticate, requirePermission("analisisMuestras", "read"));

router.get("/overview", handle((req) => analyticsService.overview(parseFilters(req))));
router.get("/grades", handle((req) => {
  const { groupBy } = z.object({ groupBy: z.enum(["area", "level", "labor", "objective"]).default("level") }).parse(req.query);
  return analyticsService.grades(parseFilters(req), { ...clean(element.parse(req.query)), groupBy });
}));
router.get("/coverage", handle((req) => analyticsService.coverage(parseFilters(req))));
router.get("/laboratories", handle((req) => analyticsService.laboratories(parseFilters(req))));
router.get("/quality", handle((req) => analyticsService.quality(parseFilters(req), clean(element.parse(req.query)))));
router.get("/estimation", handle((req) => {
  const { levelId } = z.object({ levelId: z.string().trim().min(1).max(60).optional() }).parse(req.query);
  return analyticsService.estimation(parseFilters(req), { ...clean(element.parse(req.query)), levelId });
}));

export default router;
