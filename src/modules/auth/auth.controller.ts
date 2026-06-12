import type { Response } from "express";
import { authService } from "./auth.service.js";
import type { AuthRequest } from "../../middleware/auth.middleware.js";

export const authController = {
  async register(req: AuthRequest, res: Response) {
    try {
      const user = await authService.register(req.body);
      res.status(201).json({ success: true, data: user });
    } catch (error) {
      const status = (error as any).statusCode || 400;
      res.status(status).json({ success: false, message: (error as Error).message });
    }
  },

  async login(req: AuthRequest, res: Response) {
    try {
      const result = await authService.login(req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      const status = (error as any).statusCode || 401;
      res.status(status).json({ success: false, message: (error as Error).message });
    }
  },

  async forgotPassword(req: AuthRequest, res: Response) {
    try {
      const result = await authService.forgotPassword(req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      const status = (error as any).statusCode || 400;
      res.status(status).json({ success: false, message: (error as Error).message });
    }
  },

  async resetPassword(req: AuthRequest, res: Response) {
    try {
      const token = req.query["token"] as string;
      const result = await authService.resetPassword(token, req.body.password);
      res.json({ success: true, data: result });
    } catch (error) {
      const status = (error as any).statusCode || 400;
      res.status(status).json({ success: false, message: (error as Error).message });
    }
  },

  async changePassword(req: AuthRequest, res: Response) {
    try {
      const result = await authService.changePassword(req.user!.id, req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      const status = (error as any).statusCode || 400;
      res.status(status).json({ success: false, message: (error as Error).message });
    }
  },

  async listarUsuarios(_req: AuthRequest, res: Response) {
    try {
      const users = await authService.getAllUsers();
      res.json({ success: true, data: users });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  },

  async actualizarUsuario(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params["id"]);
      if (!id) return res.status(400).json({ success: false, message: "ID requerido" });
      const user = await authService.updateUser(id, req.body);
      res.json({ success: true, data: user });
    } catch (error) {
      const status = (error as any).statusCode || 400;
      res.status(status).json({ success: false, message: (error as Error).message });
    }
  },

  async refresh(req: AuthRequest, res: Response) {
    try {
      const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;
      if (!refreshToken) {
        return res.status(400).json({ success: false, message: "Refresh token requerido" });
      }
      const result = await authService.refresh(refreshToken);
      res.json({ success: true, data: result });
    } catch (error) {
      const status = (error as any).statusCode || 401;
      res.status(status).json({ success: false, message: (error as Error).message });
    }
  },

  async logout(req: AuthRequest, res: Response) {
    try {
      const result = await authService.logout(req.user!.id);
      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({ success: false, message: (error as Error).message });
    }
  },
};
