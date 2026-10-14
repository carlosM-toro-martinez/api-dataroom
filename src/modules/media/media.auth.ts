import type { NextFunction, Response } from "express";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { getJwtSecret } from "../../config/auth.js";
import { logger } from "../../config/logger.js";
import { prisma } from "../../config/prisma.js";
import type { AuthRequest } from "../../middleware/auth.middleware.js";

function hashDeviceId(deviceId: string) {
  return crypto.createHash("sha256").update(deviceId).digest("hex");
}

function queryStringValue(value: unknown) {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return undefined;
}

function normalizeQueryToken(token: string) {
  return token.trim().replace(/\\_/g, "_");
}

export async function authenticateMedia(req: AuthRequest, res: Response, next: NextFunction) {
  const headerToken = req.headers.authorization?.split(" ")[1];
  const queryToken = queryStringValue(req.query.access_token) || queryStringValue(req.query.accessToken);
  const escapedQueryToken = queryStringValue(req.query["access\\_token"]);
  const token = headerToken || queryToken || escapedQueryToken;

  if (!token) {
    logger.warn({ path: req.originalUrl.split("?")[0] }, "Media request without access token");
    return res.status(401).json({ success: false, error: "Token requerido" });
  }

  try {
    const decoded = jwt.verify(normalizeQueryToken(token), getJwtSecret()) as { id: number; role: string };
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
        queryStringValue(req.query.device_id) ||
        queryStringValue(req.query.deviceId) ||
        queryStringValue(req.query["device\\_id"]);

      if (!user?.activo || !user.visitorAccessExpiresAt || user.visitorAccessExpiresAt <= new Date()) {
        return res.status(403).json({ success: false, error: "Acceso visitante expirado o inactivo" });
      }
      if (!deviceId || !user.visitorDeviceIdHash || user.visitorDeviceIdHash !== hashDeviceId(deviceId)) {
        return res.status(403).json({ success: false, error: "Acceso visitante no autorizado para este dispositivo" });
      }
    }

    req.user = decoded;
    next();
  } catch (error) {
    const path = req.originalUrl.split("?")[0];
    if (error instanceof Error && error.name === "TokenExpiredError") {
      logger.warn({ path }, "Expired media access token");
      return res.status(401).json({ success: false, error: "Token expirado" });
    }
    if (error instanceof Error && error.name === "JsonWebTokenError") {
      logger.warn({ path, reason: error.message }, "Invalid media access token");
      return res.status(401).json({ success: false, error: "Token inválido" });
    }
    logger.warn({ err: error, path }, "Media authentication failed");
    return res.status(401).json({ success: false, error: "Token inválido" });
  }
}
