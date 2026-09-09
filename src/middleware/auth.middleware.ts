import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { getJwtSecret } from "../config/auth.js";
import { prisma } from "../config/prisma.js";

export interface AuthRequest extends Request {
  user?: { id: number; role: string };
}

function hashDeviceId(deviceId: string) {
  return crypto.createHash("sha256").update(deviceId).digest("hex");
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ success: false, error: "Token requerido" });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as { id: number; role: string };
    if (decoded.role === "VISITANTE") {
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          activo: true,
          visitorAccessExpiresAt: true,
          visitorDeviceIdHash: true,
        },
      });
      const deviceId = req.header("x-device-id");
      if (!user?.activo || !user.visitorAccessExpiresAt || user.visitorAccessExpiresAt <= new Date()) {
        return res.status(403).json({ success: false, error: "Acceso visitante expirado o inactivo" });
      }
      if (!deviceId || !user.visitorDeviceIdHash || user.visitorDeviceIdHash !== hashDeviceId(deviceId)) {
        return res.status(403).json({ success: false, error: "Acceso visitante no autorizado para este dispositivo" });
      }
    }
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ success: false, error: "Token inválido" });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: "Acceso denegado" });
    }
    next();
  };
};
