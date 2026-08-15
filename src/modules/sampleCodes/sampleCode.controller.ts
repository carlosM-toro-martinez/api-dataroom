import type { Response } from "express";
import type { AuthRequest } from "../../middleware/auth.middleware.js";
import { HttpError } from "../../errors/http.error.js";
import { sampleCodeService } from "./sampleCode.service.js";

const ok = (res: Response, data: unknown, status = 200) =>
  res.status(status).json({ success: true, data });

const fail = (res: Response, error: unknown) => {
  const status = error instanceof HttpError ? error.statusCode : 500;
  res.status(status).json({ success: false, error: (error as Error).message });
};

export const sampleCodeController = {
  async getDuplicates(_req: AuthRequest, res: Response) {
    try {
      ok(res, await sampleCodeService.getDuplicateSampleCodes());
    } catch (error) {
      fail(res, error);
    }
  },

  async repair(req: AuthRequest, res: Response) {
    try {
      ok(res, await sampleCodeService.repairSampleCodes(req.user?.id));
    } catch (error) {
      fail(res, error);
    }
  },

  async revert(req: AuthRequest, res: Response) {
    try {
      const changes = Array.isArray(req.body?.changes) ? req.body.changes : [];
      if (changes.length === 0) {
        throw new HttpError("No hay correcciones para revertir.", 400);
      }
      ok(res, await sampleCodeService.revertSampleCodeRepair(changes, req.user?.id));
    } catch (error) {
      fail(res, error);
    }
  }
};
