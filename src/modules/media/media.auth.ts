import type { NextFunction, Response } from "express";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { prisma } from "../../config/prisma.js";
import type { AuthRequest } from "../../middleware/auth.middleware.js";

const JWT_SECRET = process.env.JWT_SECRET || "default_secret";

function hashDeviceId(deviceId: string) {
  return crypto.createHash("sha256").update(deviceId).digest("hex");
}

export async function authenticateMedia(req: AuthRequest, res: Response, next: NextFunction) {
  const headerToken = req.headers.authorization?.split(" ")[1];
  const queryToken = typeof req.query.access_token === "string" ? req.query.access_token : undefined;
  const token = headerToken || queryToken;

  if (!token) {
    return res.status(401).json({ success: false, error: "Token requerido" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; role: string };
    if (decoded.role === "VISITANTE") {
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          activo: true,
          visitorAccessExpiresAt: true,
          visitorDeviceIdHash: true
        }
      });
      const deviceId =
        req.header("x-device-id") ||
        (typeof req.query.device_id === "string" ? req.query.device_id : undefined);

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
    return res.status(401).json({ success: false, error: "Token inválido" });
  }
}
