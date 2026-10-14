import type { NextFunction, Response } from "express";
import type { AuthRequest } from "./auth.middleware.js";
import { hasAnyPermission } from "../modules/roles/roles.service.js";
import type { PermissionAction, PermissionModule } from "../modules/roles/permissions.catalog.js";

type ModuleSpec =
  | PermissionModule
  | PermissionModule[]
  | ((req: AuthRequest, action: PermissionAction) => PermissionModule[]);

export function actionFromMethod(method: string): PermissionAction {
  switch (method.toUpperCase()) {
    case "GET":
    case "HEAD":
    case "OPTIONS":
      return "read";
    case "POST":
      return "create";
    case "DELETE":
      return "delete";
    default:
      return "update";
  }
}

// Pasa si el rol tiene la acción en AL MENOS uno de los módulos indicados.
export function requirePermission(spec: ModuleSpec, action?: PermissionAction) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ success: false, error: "Token requerido" });
    const resolvedAction = action ?? actionFromMethod(req.method);
    const modules = typeof spec === "function" ? spec(req, resolvedAction) : Array.isArray(spec) ? spec : [spec];
    try {
      if (await hasAnyPermission(req.user.role, modules, resolvedAction)) return next();
      return res.status(403).json({ success: false, error: "No tienes permiso para esta acción" });
    } catch (error) {
      next(error);
    }
  };
}

// Muestras de Exploración/Producción: el módulo sale de `category` (body o query).
// Sin categoría basta con permiso en cualquiera de los dos; la lectura también la habilita el Data Room.
export function sampleModules(req: AuthRequest, action: PermissionAction): PermissionModule[] {
  const category = (req.body as { category?: unknown } | undefined)?.category ?? req.query?.["category"];
  const modules: PermissionModule[] =
    category === "PRODUCTION" ? ["produccion"] : category === "EXPLORATION" ? ["exploracion"] : ["exploracion", "produccion"];
  return action === "read" ? [...modules, "dataRoom"] : modules;
}

// Estructura de proyectos/zonas/perforaciones que comparten el Data Room y el registro de muestras.
export const HIERARCHY_MODULES: PermissionModule[] = ["dataRoom", "exploracion", "produccion"];
