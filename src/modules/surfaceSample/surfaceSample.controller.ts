import type { Response } from "express";
import type { AuthRequest } from "../../middleware/auth.middleware.js";
import { HttpError } from "../../errors/http.error.js";
import { surfaceSampleService } from "./surfaceSample.service.js";

const uid = (req: AuthRequest) => req.user?.id;
const vq = (req: AuthRequest) => (req as any).validatedQuery;
const vp = (req: AuthRequest) => (req as any).validatedParams;

const ok = (res: Response, data: unknown, status = 200) =>
  res.status(status).json({ success: true, data });

const fail = (res: Response, error: unknown) => {
  const status = error instanceof HttpError ? error.statusCode : 500;
  res.status(status).json({ success: false, error: (error as Error).message });
};

export const surfaceSampleController = {

  // ─── SurfaceArea ──────────────────────────────────────────────────────────
  async getSurfaceAreas(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceSampleService.getSurfaceAreas(vq(req))); }
    catch (e) { fail(res, e); }
  },
  async getSurfaceAreaById(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceSampleService.getSurfaceAreaById(vp(req).id)); }
    catch (e) { fail(res, e); }
  },
  async createSurfaceArea(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceSampleService.createSurfaceArea(req.body, uid(req)), 201); }
    catch (e) { fail(res, e); }
  },
  async updateSurfaceArea(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceSampleService.updateSurfaceArea(vp(req).id, req.body, uid(req))); }
    catch (e) { fail(res, e); }
  },
  async deleteSurfaceArea(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceSampleService.deleteSurfaceArea(vp(req).id)); }
    catch (e) { fail(res, e); }
  },

  // ─── SurfaceObjective ─────────────────────────────────────────────────────
  async getSurfaceObjectives(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceSampleService.getSurfaceObjectives(vq(req))); }
    catch (e) { fail(res, e); }
  },
  async getSurfaceObjectiveById(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceSampleService.getSurfaceObjectiveById(vp(req).id)); }
    catch (e) { fail(res, e); }
  },
  async createSurfaceObjective(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceSampleService.createSurfaceObjective(req.body, uid(req)), 201); }
    catch (e) { fail(res, e); }
  },
  async updateSurfaceObjective(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceSampleService.updateSurfaceObjective(vp(req).id, req.body, uid(req))); }
    catch (e) { fail(res, e); }
  },
  async deleteSurfaceObjective(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceSampleService.deleteSurfaceObjective(vp(req).id)); }
    catch (e) { fail(res, e); }
  },

  // ─── SurfaceLaboratory ────────────────────────────────────────────────────
  async getSurfaceLaboratories(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceSampleService.getSurfaceLaboratories(vq(req))); }
    catch (e) { fail(res, e); }
  },
  async getSurfaceLaboratoryById(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceSampleService.getSurfaceLaboratoryById(vp(req).id)); }
    catch (e) { fail(res, e); }
  },
  async createSurfaceLaboratory(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceSampleService.createSurfaceLaboratory(req.body, uid(req)), 201); }
    catch (e) { fail(res, e); }
  },
  async updateSurfaceLaboratory(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceSampleService.updateSurfaceLaboratory(vp(req).id, req.body, uid(req))); }
    catch (e) { fail(res, e); }
  },
  async deleteSurfaceLaboratory(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceSampleService.deleteSurfaceLaboratory(vp(req).id)); }
    catch (e) { fail(res, e); }
  },

  // ─── SurfaceLabAssignment ─────────────────────────────────────────────────
  async getSurfaceLabAssignments(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceSampleService.getSurfaceLabAssignments(vq(req))); }
    catch (e) { fail(res, e); }
  },
  async getSurfaceLabAssignmentById(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceSampleService.getSurfaceLabAssignmentById(vp(req).id)); }
    catch (e) { fail(res, e); }
  },
  async createSurfaceLabAssignment(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceSampleService.createSurfaceLabAssignment(req.body, uid(req)), 201); }
    catch (e) { fail(res, e); }
  },
  async updateSurfaceLabAssignment(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceSampleService.updateSurfaceLabAssignment(vp(req).id, req.body, uid(req))); }
    catch (e) { fail(res, e); }
  },
  async deleteSurfaceLabAssignment(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceSampleService.deleteSurfaceLabAssignment(vp(req).id)); }
    catch (e) { fail(res, e); }
  },

  // ─── SurfaceSample ────────────────────────────────────────────────────────
  async getSurfaceSamples(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceSampleService.getSurfaceSamples(vq(req))); }
    catch (e) { fail(res, e); }
  },
  async getSurfaceSampleById(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceSampleService.getSurfaceSampleById(vp(req).id)); }
    catch (e) { fail(res, e); }
  },
  async createSurfaceSample(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceSampleService.createSurfaceSample(req.body, uid(req)), 201); }
    catch (e) { fail(res, e); }
  },
  async updateSurfaceSample(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceSampleService.updateSurfaceSample(vp(req).id, req.body, uid(req))); }
    catch (e) { fail(res, e); }
  },
  async deleteSurfaceSample(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceSampleService.deleteSurfaceSample(vp(req).id)); }
    catch (e) { fail(res, e); }
  },

  // ─── SurfaceSample con resultados (transacción) ───────────────────────────
  async createSurfaceSampleWithResults(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceSampleService.createSurfaceSampleWithResults(req.body, uid(req)), 201); }
    catch (e) { fail(res, e); }
  },
  async updateSurfaceSampleWithResults(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceSampleService.updateSurfaceSampleWithResults(vp(req).id, req.body, uid(req))); }
    catch (e) { fail(res, e); }
  },

  // ─── SurfaceSampleResult ──────────────────────────────────────────────────
  async getSurfaceSampleResults(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceSampleService.getSurfaceSampleResults(vq(req))); }
    catch (e) { fail(res, e); }
  },
  async getSurfaceSampleResultById(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceSampleService.getSurfaceSampleResultById(vp(req).id)); }
    catch (e) { fail(res, e); }
  },
  async createSurfaceSampleResult(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceSampleService.createSurfaceSampleResult(req.body, uid(req)), 201); }
    catch (e) { fail(res, e); }
  },
  async updateSurfaceSampleResult(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceSampleService.updateSurfaceSampleResult(vp(req).id, req.body, uid(req))); }
    catch (e) { fail(res, e); }
  },
  async deleteSurfaceSampleResult(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceSampleService.deleteSurfaceSampleResult(vp(req).id)); }
    catch (e) { fail(res, e); }
  },
};
