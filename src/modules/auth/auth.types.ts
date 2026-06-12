import type { z } from "zod";
import type {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  changePasswordSchema,
  updateUserSchema,
} from "./auth.schema.js";

export type LoginDTO = z.infer<typeof loginSchema>;
export type RegisterDTO = z.infer<typeof registerSchema>;
export type ForgotPasswordDTO = z.infer<typeof forgotPasswordSchema>;
export type ChangePasswordDTO = z.infer<typeof changePasswordSchema>;
export type UpdateUserDTO = z.infer<typeof updateUserSchema>;
