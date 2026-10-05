import type { Response } from "express";
import type { AuthRequest } from "../../middleware/auth.middleware.js";
import { HttpError } from "../../errors/http.error.js";

const ok = (res: Response, data: unknown, status = 200) =>
  res.status(status).json({ success: true, data });

const fail = (res: Response, error: unknown) => {
  const status = error instanceof HttpError ? error.statusCode : 500;
  res.status(status).json({ success: false, error: (error as Error).message });
};

const uid = (req: AuthRequest) => req.user?.id;
const query = (req: AuthRequest) => (req as any).validatedQuery ?? {};
const params = (req: AuthRequest) => (req as any).validatedParams ?? req.params;

type Handler = (req: AuthRequest) => Promise<unknown>;

// Envuelve un handler del servicio con la respuesta estándar { success, data } / { success, error }.
export const handle =
  (fn: Handler, status = 200) =>
  async (req: AuthRequest, res: Response) => {
    try {
      ok(res, await fn(req), status);
    } catch (error) {
      fail(res, error);
    }
  };

export const ctx = { uid, query, params };
