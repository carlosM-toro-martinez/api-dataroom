import type { Response } from "express";
import type { AuthRequest } from "../../middleware/auth.middleware.js";
import { HttpError } from "../../errors/http.error.js";
import { dispatchBatchService } from "./dispatchBatch.service.js";

const ok = (res: Response, data: unknown, status = 200) =>
  res.status(status).json({ success: true, data });

const fail = (res: Response, error: unknown) => {
  const status = error instanceof HttpError ? error.statusCode : 500;
  res.status(status).json({ success: false, error: (error as Error).message });
};

export const dispatchBatchController = {
  async createDispatchBatch(req: AuthRequest, res: Response) {
    try {
      ok(res, await dispatchBatchService.createDispatchBatch(req.body, req.user?.id), 201);
    } catch (error) {
      fail(res, error);
    }
  },
};
