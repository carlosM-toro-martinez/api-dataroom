import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import type { LoginDTO, RegisterDTO, ForgotPasswordDTO, ChangePasswordDTO, UpdateUserDTO } from "./auth.types.js";
import { logger } from "../../config/logger.js";
import { HttpError } from "../../errors/http.error.js";

const JWT_SECRET = process.env.JWT_SECRET || "default_secret";
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || "refresh_secret";
const ACCESS_TOKEN_EXPIRY = "8h";
const REFRESH_TOKEN_EXPIRY = "7d";
const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const authService = {
  async register(data: RegisterDTO) {
    const hashedPassword = await bcrypt.hash(data.password, 10);

    try {
      const user = await prisma.user.create({
        data: {
          nombre: data.nombre,
          email: data.email,
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
    const user = await prisma.user.findUnique({ where: { email: data.email } });

    if (!user || !(await bcrypt.compare(data.password, user.password))) {
      logger.warn({ email: data.email }, "Intento de login fallido");
      throw new HttpError("Credenciales inválidas", 401);
    }

    if (user.activo === false) {
      throw new HttpError("Usuario inactivo", 403);
    }

    const accessToken = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    });

    const refreshToken = jwt.sign({ id: user.id }, REFRESH_TOKEN_SECRET, {
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
      user: { id: user.id, nombre: user.nombre, email: user.email, role: user.role },
    };
  },

  async getAllUsers() {
    return prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, nombre: true, email: true, role: true, activo: true, createdAt: true },
    });
  },

  async updateUser(id: number, data: UpdateUserDTO) {
    const updateData: Record<string, unknown> = {};
    if (data.nombre !== undefined) updateData["nombre"] = data.nombre.trim();
    if (data.email !== undefined) updateData["email"] = data.email.trim();
    if (data.role !== undefined) updateData["role"] = data.role;
    if (data.activo !== undefined) updateData["activo"] = data.activo;

    if (Object.keys(updateData).length === 0) {
      throw new HttpError("No hay datos para actualizar", 400);
    }

    return prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, nombre: true, email: true, role: true, activo: true, createdAt: true },
    });
  },

  async forgotPassword(data: ForgotPasswordDTO) {
    const user = await prisma.user.findUnique({ where: { email: data.email } });
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

  async refresh(refreshToken: string) {
    try {
      const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET) as { id: number };
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, role: true, nombre: true, email: true, refreshToken: true, refreshTokenExpiry: true },
      });

      if (!user || user.refreshToken !== refreshToken) {
        throw new HttpError("Refresh token inválido o revocado", 401);
      }
      if (!user.refreshTokenExpiry || user.refreshTokenExpiry < new Date()) {
        throw new HttpError("Refresh token expirado", 401);
      }

      const newAccessToken = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, {
        expiresIn: ACCESS_TOKEN_EXPIRY,
      });

      logger.info({ userId: user.id }, "Access token renovado");
      return {
        accessToken: newAccessToken,
        user: { id: user.id, nombre: user.nombre, email: user.email, role: user.role },
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
