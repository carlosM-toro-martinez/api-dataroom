import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import type {
  ApproveDataRoomAccessRequestDTO,
  CancelDataRoomAccessRequestDTO,
  ChangePasswordDTO,
  DataRoomAccessRequestDTO,
  ForgotPasswordDTO,
  LoginDTO,
  RegisterDTO,
  RejectDataRoomAccessRequestDTO,
  UpdateUserDTO,
} from "./auth.types.js";
import { logger } from "../../config/logger.js";
import { HttpError } from "../../errors/http.error.js";
import { getJwtSecret, getRefreshTokenSecret } from "../../config/auth.js";

const ACCESS_TOKEN_EXPIRY = "8h";
const REFRESH_TOKEN_EXPIRY = "7d";
const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;
const VISITOR_PASSWORD_BYTES = 9;

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

function hashDeviceId(deviceId: string) {
  return crypto.createHash("sha256").update(deviceId).digest("hex");
}

function buildTemporaryPassword() {
  return crypto.randomBytes(VISITOR_PASSWORD_BYTES).toString("base64url");
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function userEmailWhere(email: string) {
  return { email: { equals: normalizeEmail(email), mode: "insensitive" as const } };
}

async function sendVisitorAccessEmail(input: {
  email: string;
  name: string;
  password: string;
  expiresAt: Date;
}) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return false;

  const loginUrl = `${process.env.FRONTEND_URL || "http://localhost:5174"}/login`;
  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: input.email,
    subject: "Acceso al Data Room - Minera Marte",
    html: `<p>Hola ${input.name},</p><p>Tu acceso de visitante al Data Room fue aprobado.</p><p><strong>Correo:</strong> ${input.email}<br/><strong>Contraseña temporal:</strong> ${input.password}</p><p>Ingresa en: <a href="${loginUrl}">${loginUrl}</a></p><p>Este acceso vence el ${input.expiresAt.toISOString()} y quedará vinculado al primer dispositivo donde inicies sesión.</p>`,
  });
  return true;
}

export const authService = {
  async register(data: RegisterDTO) {
    const email = normalizeEmail(data.email);
    const existing = await prisma.user.findFirst({ where: userEmailWhere(email), select: { id: true } });
    if (existing) throw new HttpError("Email ya registrado", 409);

    const hashedPassword = await bcrypt.hash(data.password, 10);

    try {
      const user = await prisma.user.create({
        data: {
          nombre: data.nombre,
          email,
          password: hashedPassword,
          role: data.role,
        },
        select: { id: true, nombre: true, email: true, role: true },
      });

      logger.info({ userId: user.id }, "Nuevo usuario registrado");
      return user;
    } catch (unknownError) {
      if (
        unknownError instanceof Prisma.PrismaClientKnownRequestError &&
        unknownError.code === "P2002"
      ) {
        throw new HttpError("Email ya registrado", 409);
      }
      throw new HttpError("Error interno al crear usuario", 500);
    }
  },

  async login(data: LoginDTO) {
    const email = normalizeEmail(data.email);
    const user = await prisma.user.findFirst({ where: userEmailWhere(email) });

    if (!user || !(await bcrypt.compare(data.password, user.password))) {
      logger.warn({ email }, "Intento de login fallido");
      throw new HttpError("Credenciales inválidas", 401);
    }

    if (user.activo === false) {
      throw new HttpError("Usuario inactivo", 403);
    }

    if (user.role === "VISITANTE") {
      if (!user.visitorAccessExpiresAt || user.visitorAccessExpiresAt <= new Date()) {
        throw new HttpError("El acceso visitante expiró", 403);
      }
      if (!data.deviceId) {
        throw new HttpError("Dispositivo requerido para acceso visitante", 400);
      }
      const deviceHash = hashDeviceId(data.deviceId);
      if (user.visitorDeviceIdHash && user.visitorDeviceIdHash !== deviceHash) {
        throw new HttpError("Este acceso visitante ya fue usado en otro dispositivo", 403);
      }
      if (!user.visitorDeviceIdHash) {
        await prisma.user.update({
          where: { id: user.id },
          data: { visitorDeviceIdHash: deviceHash, visitorLastLoginAt: new Date() },
        });
      } else {
        await prisma.user.update({
          where: { id: user.id },
          data: { visitorLastLoginAt: new Date() },
        });
      }
    }

    const accessToken = jwt.sign({ id: user.id, role: user.role }, getJwtSecret(), {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    });

    const refreshToken = jwt.sign({ id: user.id }, getRefreshTokenSecret(), {
      expiresIn: REFRESH_TOKEN_EXPIRY,
    });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        refreshToken,
        refreshTokenExpiry: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
      },
    });

    logger.info({ userId: user.id }, "Usuario logueado");
    return {
      accessToken,
      refreshToken,
      user: { id: user.id, nombre: user.nombre, email: user.email, role: user.role, activo: user.activo },
    };
  },

  async getAllUsers() {
    return prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        nombre: true,
        email: true,
        role: true,
        activo: true,
        createdAt: true,
        visitorAccessExpiresAt: true,
        visitorLastLoginAt: true,
        visitorDeviceIdHash: true,
      },
    });
  },

  async updateUser(id: number, data: UpdateUserDTO) {
    const updateData: Record<string, unknown> = {};
    if (data.nombre !== undefined) updateData["nombre"] = data.nombre.trim();
    if (data.email !== undefined) {
      const email = normalizeEmail(data.email);
      const existing = await prisma.user.findFirst({ where: userEmailWhere(email), select: { id: true } });
      if (existing && existing.id !== id) throw new HttpError("Email ya registrado", 409);
      updateData["email"] = email;
    }
    if (data.role !== undefined) updateData["role"] = data.role;
    if (data.activo !== undefined) updateData["activo"] = data.activo;
    if (data.visitorAccessExpiresAt !== undefined) {
      updateData["visitorAccessExpiresAt"] = data.visitorAccessExpiresAt ? new Date(data.visitorAccessExpiresAt) : null;
    }

    if (Object.keys(updateData).length === 0) {
      throw new HttpError("No hay datos para actualizar", 400);
    }

    return prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        nombre: true,
        email: true,
        role: true,
        activo: true,
        createdAt: true,
        visitorAccessExpiresAt: true,
        visitorLastLoginAt: true,
        visitorDeviceIdHash: true,
      },
    });
  },

  async requestDataRoomAccess(data: DataRoomAccessRequestDTO) {
    const request = await prisma.dataRoomAccessRequest.create({
      data: {
        fullName: data.fullName.trim(),
        email: normalizeEmail(data.email),
        phone: data.phone.trim(),
        company: data.company?.trim() || null,
        reason: data.reason.trim(),
      },
    });

    logger.info({ requestId: request.id, email: request.email }, "Solicitud de acceso Data Room creada");
    return request;
  },

  async getDataRoomAccessRequests() {
    return prisma.dataRoomAccessRequest.findMany({
      orderBy: { requestedAt: "desc" },
      include: {
        reviewedBy: { select: { id: true, nombre: true, email: true } },
      },
    });
  },

  async approveDataRoomAccessRequest(id: string, data: ApproveDataRoomAccessRequestDTO, reviewerId: number) {
    const request = await prisma.dataRoomAccessRequest.findUnique({ where: { id } });
    if (!request) throw new HttpError("Solicitud no encontrada", 404);
    if (request.status !== "PENDING") throw new HttpError("La solicitud ya fue revisada", 409);

    const expiresAt = new Date(data.expiresAt);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
      throw new HttpError("La fecha de expiración debe ser futura", 400);
    }

    const password = buildTemporaryPassword();
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.upsert({
      where: { email: request.email },
      create: {
        nombre: request.fullName,
        email: request.email,
        password: hashedPassword,
        role: "VISITANTE",
        activo: true,
        visitorAccessExpiresAt: expiresAt,
        visitorDeviceIdHash: null,
        visitorLastLoginAt: null,
        refreshToken: null,
        refreshTokenExpiry: null,
      },
      update: {
        nombre: request.fullName,
        password: hashedPassword,
        role: "VISITANTE",
        activo: true,
        visitorAccessExpiresAt: expiresAt,
        visitorDeviceIdHash: null,
        visitorLastLoginAt: null,
        refreshToken: null,
        refreshTokenExpiry: null,
      },
      select: { id: true, nombre: true, email: true, role: true, activo: true, visitorAccessExpiresAt: true },
    });

    const emailSent = await sendVisitorAccessEmail({
      email: request.email,
      name: request.fullName,
      password,
      expiresAt,
    });

    const updatedRequest = await prisma.dataRoomAccessRequest.update({
      where: { id },
      data: {
        status: "APPROVED",
        reviewedAt: new Date(),
        reviewedById: reviewerId,
        expiresAt,
        visitorUserId: user.id,
        visitorTemporaryPassword: password,
        adminNotes: data.adminNotes?.trim() || null,
      },
    });

    return { request: updatedRequest, user, temporaryPassword: password, emailSent };
  },

  async rejectDataRoomAccessRequest(id: string, data: RejectDataRoomAccessRequestDTO, reviewerId: number) {
    const request = await prisma.dataRoomAccessRequest.findUnique({ where: { id } });
    if (!request) throw new HttpError("Solicitud no encontrada", 404);
    if (request.status !== "PENDING") throw new HttpError("La solicitud ya fue revisada", 409);

    return prisma.dataRoomAccessRequest.update({
      where: { id },
      data: {
        status: "REJECTED",
        reviewedAt: new Date(),
        reviewedById: reviewerId,
        rejectionReason: data.rejectionReason.trim(),
      },
    });
  },

  async cancelDataRoomAccessRequest(id: string, data: CancelDataRoomAccessRequestDTO, reviewerId: number) {
    const request = await prisma.dataRoomAccessRequest.findUnique({ where: { id } });
    if (!request) throw new HttpError("Solicitud no encontrada", 404);
    if (request.status !== "APPROVED") {
      throw new HttpError("Solo se puede cancelar una solicitud aprobada", 409);
    }

    await prisma.$transaction(async (tx) => {
      await tx.dataRoomAccessRequest.update({
        where: { id },
        data: {
          status: "CANCELLED",
          reviewedAt: new Date(),
          reviewedById: reviewerId,
          rejectionReason: data.cancellationReason.trim(),
          visitorTemporaryPassword: null,
        },
      });

      if (request.visitorUserId) {
        await tx.user.update({
          where: { id: request.visitorUserId },
          data: {
            activo: false,
            refreshToken: null,
            refreshTokenExpiry: null,
            visitorAccessExpiresAt: new Date(),
            visitorDeviceIdHash: null,
          },
        });
      }
    });

    return prisma.dataRoomAccessRequest.findUnique({ where: { id } });
  },

  async forgotPassword(data: ForgotPasswordDTO) {
    const user = await prisma.user.findFirst({ where: userEmailWhere(data.email) });
    if (!user) throw new HttpError("Usuario no encontrado", 404);

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry },
    });

    const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:4001"}?token=${resetToken}`;
    console.log(`🔑 RESET TOKEN PARA ${user.email}: ${resetToken}`);

    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: user.email,
        subject: "Recuperación de contraseña - Minera Marte Exploración",
        html: `<p>Hola ${user.nombre},</p><p>Haz clic para resetear tu contraseña: <a href="${resetUrl}">${resetUrl}</a></p><p>Expira en 10 minutos.</p>`,
      });
    }

    logger.info({ userId: user.id }, "Token de recuperación enviado");
    return { message: "Correo de recuperación enviado" };
  },

  async resetPassword(token: string, newPassword: string) {
    const user = await prisma.user.findFirst({
      where: { resetToken: token, resetTokenExpiry: { gt: new Date() } },
    });

    if (!user) throw new HttpError("Token inválido o expirado", 400);

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword, resetToken: null, resetTokenExpiry: null },
    });

    logger.info({ userId: user.id }, "Contraseña reseteada");
    return { message: "Contraseña actualizada exitosamente" };
  },

  async changePassword(userId: number, data: ChangePasswordDTO) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !(await bcrypt.compare(data.currentPassword, user.password))) {
      throw new HttpError("Contraseña actual incorrecta", 400);
    }

    const hashedPassword = await bcrypt.hash(data.newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    logger.info({ userId }, "Contraseña cambiada");
    return { message: "Contraseña cambiada exitosamente" };
  },

  async refresh(refreshToken: string, deviceId?: string) {
    try {
      const decoded = jwt.verify(refreshToken, getRefreshTokenSecret()) as { id: number };
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          role: true,
          nombre: true,
          email: true,
          activo: true,
          refreshToken: true,
          refreshTokenExpiry: true,
          visitorAccessExpiresAt: true,
          visitorDeviceIdHash: true,
        },
      });

      if (!user || user.refreshToken !== refreshToken) {
        throw new HttpError("Refresh token inválido o revocado", 401);
      }
      if (!user.refreshTokenExpiry || user.refreshTokenExpiry < new Date()) {
        throw new HttpError("Refresh token expirado", 401);
      }
      if (!user.activo) {
        throw new HttpError("Usuario inactivo", 403);
      }
      if (user.role === "VISITANTE") {
        if (!user.visitorAccessExpiresAt || user.visitorAccessExpiresAt <= new Date()) {
          throw new HttpError("El acceso visitante expiró", 403);
        }
        if (!deviceId || !user.visitorDeviceIdHash || user.visitorDeviceIdHash !== hashDeviceId(deviceId)) {
          throw new HttpError("Este acceso visitante pertenece a otro dispositivo", 403);
        }
      }

      const newAccessToken = jwt.sign({ id: user.id, role: user.role }, getJwtSecret(), {
        expiresIn: ACCESS_TOKEN_EXPIRY,
      });

      logger.info({ userId: user.id }, "Access token renovado");
      return {
        accessToken: newAccessToken,
        user: { id: user.id, nombre: user.nombre, email: user.email, role: user.role, activo: user.activo },
      };
    } catch (error) {
      if (error instanceof HttpError) throw error;
      throw new HttpError("Refresh token inválido", 401);
    }
  },

  async logout(userId: number) {
    await prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null, refreshTokenExpiry: null },
    });
    logger.info({ userId }, "Usuario deslogueado");
    return { message: "Logout exitoso" };
  },
};
