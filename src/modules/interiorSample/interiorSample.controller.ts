import type { Response } from "express";
import type { AuthRequest } from "../../middleware/auth.middleware.js";
import { HttpError } from "../../errors/http.error.js";
import { interiorSampleService } from "./interiorSample.service.js";

const uid = (req: AuthRequest) => req.user?.id;
const vq = (req: AuthRequest) => (req as any).validatedQuery;
const vp = (req: AuthRequest) => (req as any).validatedParams;

const ok = (res: Response, data: unknown, status = 200) =>
  res.status(status).json({ success: true, data });

const fail = (res: Response, error: unknown) => {
  const status = error instanceof HttpError ? error.statusCode : 500;
  res.status(status).json({ success: false, error: (error as Error).message });
};

export const interiorSampleController = {

  // ─── InteriorArea ─────────────────────────────────────────────────────────
  async getInteriorAreas(req: AuthRequest, res: Response) {
    try { ok(res, await interiorSampleService.getInteriorAreas(vq(req))); }
    catch (e) { fail(res, e); }
  },
  async getInteriorAreaById(req: AuthRequest, res: Response) {
    try { ok(res, await interiorSampleService.getInteriorAreaById(vp(req).id)); }
    catch (e) { fail(res, e); }
  },
  async createInteriorArea(req: AuthRequest, res: Response) {
    try { ok(res, await interiorSampleService.createInteriorArea(req.body, uid(req)), 201); }
    catch (e) { fail(res, e); }
  },
  async updateInteriorArea(req: AuthRequest, res: Response) {
    try { ok(res, await interiorSampleService.updateInteriorArea(vp(req).id, req.body, uid(req))); }
    catch (e) { fail(res, e); }
  },
  async deleteInteriorArea(req: AuthRequest, res: Response) {
    try { ok(res, await interiorSampleService.deleteInteriorArea(vp(req).id)); }
    catch (e) { fail(res, e); }
  },

  // ─── InteriorLevel ────────────────────────────────────────────────────────
  async getInteriorLevels(req: AuthRequest, res: Response) {
    try { ok(res, await interiorSampleService.getInteriorLevels(vq(req))); }
    catch (e) { fail(res, e); }
  },
  async getInteriorLevelById(req: AuthRequest, res: Response) {
    try { ok(res, await interiorSampleService.getInteriorLevelById(vp(req).id)); }
    catch (e) { fail(res, e); }
  },
  async createInteriorLevel(req: AuthRequest, res: Response) {
    try { ok(res, await interiorSampleService.createInteriorLevel(req.body, uid(req)), 201); }
    catch (e) { fail(res, e); }
  },
  async updateInteriorLevel(req: AuthRequest, res: Response) {
    try { ok(res, await interiorSampleService.updateInteriorLevel(vp(req).id, req.body, uid(req))); }
    catch (e) { fail(res, e); }
  },
  async deleteInteriorLevel(req: AuthRequest, res: Response) {
    try { ok(res, await interiorSampleService.deleteInteriorLevel(vp(req).id)); }
    catch (e) { fail(res, e); }
  },

  // ─── InteriorLabor ────────────────────────────────────────────────────────
  async getInteriorLabors(req: AuthRequest, res: Response) {
    try { ok(res, await interiorSampleService.getInteriorLabors(vq(req))); }
    catch (e) { fail(res, e); }
  },
  async getInteriorLaborById(req: AuthRequest, res: Response) {
    try { ok(res, await interiorSampleService.getInteriorLaborById(vp(req).id)); }
    catch (e) { fail(res, e); }
  },
  async createInteriorLabor(req: AuthRequest, res: Response) {
    try { ok(res, await interiorSampleService.createInteriorLabor(req.body, uid(req)), 201); }
    catch (e) { fail(res, e); }
  },
  async updateInteriorLabor(req: AuthRequest, res: Response) {
    try { ok(res, await interiorSampleService.updateInteriorLabor(vp(req).id, req.body, uid(req))); }
    catch (e) { fail(res, e); }
  },
  async deleteInteriorLabor(req: AuthRequest, res: Response) {
    try { ok(res, await interiorSampleService.deleteInteriorLabor(vp(req).id)); }
    catch (e) { fail(res, e); }
  },

  // ─── InteriorObjective ────────────────────────────────────────────────────
  async getInteriorObjectives(req: AuthRequest, res: Response) {
    try { ok(res, await interiorSampleService.getInteriorObjectives(vq(req))); }
    catch (e) { fail(res, e); }
  },
  async getInteriorObjectiveById(req: AuthRequest, res: Response) {
    try { ok(res, await interiorSampleService.getInteriorObjectiveById(vp(req).id)); }
    catch (e) { fail(res, e); }
  },
  async createInteriorObjective(req: AuthRequest, res: Response) {
    try { ok(res, await interiorSampleService.createInteriorObjective(req.body, uid(req)), 201); }
    catch (e) { fail(res, e); }
  },
  async updateInteriorObjective(req: AuthRequest, res: Response) {
    try { ok(res, await interiorSampleService.updateInteriorObjective(vp(req).id, req.body, uid(req))); }
    catch (e) { fail(res, e); }
  },
  async deleteInteriorObjective(req: AuthRequest, res: Response) {
    try { ok(res, await interiorSampleService.deleteInteriorObjective(vp(req).id)); }
    catch (e) { fail(res, e); }
  },

  // ─── InteriorLaboratory ───────────────────────────────────────────────────
  async getInteriorLaboratories(req: AuthRequest, res: Response) {
    try { ok(res, await interiorSampleService.getInteriorLaboratories(vq(req))); }
    catch (e) { fail(res, e); }
  },
  async getInteriorLaboratoryById(req: AuthRequest, res: Response) {
    try { ok(res, await interiorSampleService.getInteriorLaboratoryById(vp(req).id)); }
    catch (e) { fail(res, e); }
  },
  async createInteriorLaboratory(req: AuthRequest, res: Response) {
    try { ok(res, await interiorSampleService.createInteriorLaboratory(req.body, uid(req)), 201); }
    catch (e) { fail(res, e); }
  },
  async updateInteriorLaboratory(req: AuthRequest, res: Response) {
    try { ok(res, await interiorSampleService.updateInteriorLaboratory(vp(req).id, req.body, uid(req))); }
    catch (e) { fail(res, e); }
  },
  async deleteInteriorLaboratory(req: AuthRequest, res: Response) {
    try { ok(res, await interiorSampleService.deleteInteriorLaboratory(vp(req).id)); }
    catch (e) { fail(res, e); }
  },

  // ─── InteriorSample ───────────────────────────────────────────────────────
  async getInteriorSamples(req: AuthRequest, res: Response) {
    try { ok(res, await interiorSampleService.getInteriorSamples(vq(req))); }
    catch (e) { fail(res, e); }
  },
  async getInteriorExplorationSamples(req: AuthRequest, res: Response) {
    try { ok(res, await interiorSampleService.getInteriorExplorationSamples(vq(req))); }
    catch (e) { fail(res, e); }
  },
  async getInteriorProductionSamples(req: AuthRequest, res: Response) {
    try { ok(res, await interiorSampleService.getInteriorProductionSamples(vq(req))); }
    catch (e) { fail(res, e); }
  },
  async getInteriorSampleById(req: AuthRequest, res: Response) {
    try { ok(res, await interiorSampleService.getInteriorSampleById(vp(req).id)); }
    catch (e) { fail(res, e); }
  },
  async createInteriorSample(req: AuthRequest, res: Response) {
    try { ok(res, await interiorSampleService.createInteriorSample(req.body, uid(req)), 201); }
    catch (e) { fail(res, e); }
  },
  async updateInteriorSample(req: AuthRequest, res: Response) {
    try { ok(res, await interiorSampleService.updateInteriorSample(vp(req).id, req.body, uid(req))); }
    catch (e) { fail(res, e); }
  },
  async deleteInteriorSample(req: AuthRequest, res: Response) {
    try { ok(res, await interiorSampleService.deleteInteriorSample(vp(req).id)); }
    catch (e) { fail(res, e); }
  },
  async assignInteriorSampleVoucher(req: AuthRequest, res: Response) {
    try { ok(res, await interiorSampleService.assignInteriorSampleVoucher(vp(req).id, uid(req))); }
    catch (e) { fail(res, e); }
  },

  // ─── InteriorSample with results (transaction) ────────────────────────────
  async createInteriorSampleWithResults(req: AuthRequest, res: Response) {
    try { ok(res, await interiorSampleService.createInteriorSampleWithResults(req.body, uid(req)), 201); }
    catch (e) { fail(res, e); }
  },
  async updateInteriorSampleWithResults(req: AuthRequest, res: Response) {
    try { ok(res, await interiorSampleService.updateInteriorSampleWithResults(vp(req).id, req.body, uid(req))); }
    catch (e) { fail(res, e); }
  },

  // ─── InteriorLabAssignment ────────────────────────────────────────────────
  async getInteriorLabAssignments(req: AuthRequest, res: Response) {
    try { ok(res, await interiorSampleService.getInteriorLabAssignments(vq(req))); }
    catch (e) { fail(res, e); }
  },
  async getInteriorLabAssignmentById(req: AuthRequest, res: Response) {
    try { ok(res, await interiorSampleService.getInteriorLabAssignmentById(vp(req).id)); }
    catch (e) { fail(res, e); }
  },
  async createInteriorLabAssignment(req: AuthRequest, res: Response) {
    try { ok(res, await interiorSampleService.createInteriorLabAssignment(req.body, uid(req)), 201); }
    catch (e) { fail(res, e); }
  },
  async updateInteriorLabAssignment(req: AuthRequest, res: Response) {
    try { ok(res, await interiorSampleService.updateInteriorLabAssignment(vp(req).id, req.body, uid(req))); }
    catch (e) { fail(res, e); }
  },
  async deleteInteriorLabAssignment(req: AuthRequest, res: Response) {
    try { ok(res, await interiorSampleService.deleteInteriorLabAssignment(vp(req).id)); }
    catch (e) { fail(res, e); }
  },

  // ─── InteriorSampleResult ─────────────────────────────────────────────────
  async getInteriorSampleResults(req: AuthRequest, res: Response) {
    try { ok(res, await interiorSampleService.getInteriorSampleResults(vq(req))); }
    catch (e) { fail(res, e); }
  },
  async getInteriorSampleResultById(req: AuthRequest, res: Response) {
    try { ok(res, await interiorSampleService.getInteriorSampleResultById(vp(req).id)); }
    catch (e) { fail(res, e); }
  },
  async createInteriorSampleResult(req: AuthRequest, res: Response) {
    try { ok(res, await interiorSampleService.createInteriorSampleResult(req.body, uid(req)), 201); }
    catch (e) { fail(res, e); }
  },
  async updateInteriorSampleResult(req: AuthRequest, res: Response) {
    try { ok(res, await interiorSampleService.updateInteriorSampleResult(vp(req).id, req.body, uid(req))); }
    catch (e) { fail(res, e); }
  },
  async deleteInteriorSampleResult(req: AuthRequest, res: Response) {
    try { ok(res, await interiorSampleService.deleteInteriorSampleResult(vp(req).id)); }
    catch (e) { fail(res, e); }
  },
};
