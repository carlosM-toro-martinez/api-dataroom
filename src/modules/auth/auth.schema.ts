import { z } from "zod";

export const registerSchema = z.object({
  nombre: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z
    .enum(["ADMIN", "GEOLOGOADMIN", "GEOLOGO", "VISITANTE"])
    .default("GEOLOGO"),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  deviceId: z.string().min(16).max(160).optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordBodySchema = z.object({
  password: z.string().min(6),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6),
});

export const updateUserSchema = z.object({
  nombre: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(["ADMIN", "GEOLOGOADMIN", "GEOLOGO", "VISITANTE"]).optional(),
  activo: z.boolean().optional(),
  visitorAccessExpiresAt: z.string().datetime().nullable().optional(),
});

export const dataRoomAccessRequestSchema = z.object({
  fullName: z.string().min(2).max(160),
  email: z.string().email(),
  phone: z.string().min(5).max(60),
  company: z.string().max(160).optional().nullable(),
  reason: z.string().min(8).max(1200),
});

export const approveDataRoomAccessRequestSchema = z.object({
  expiresAt: z.string().datetime(),
  adminNotes: z.string().max(1200).optional().nullable(),
});

export const rejectDataRoomAccessRequestSchema = z.object({
  rejectionReason: z.string().min(3).max(1200),
});
