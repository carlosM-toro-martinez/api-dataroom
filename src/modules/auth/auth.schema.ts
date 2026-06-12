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
});
