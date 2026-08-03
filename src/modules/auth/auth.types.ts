import type { z } from "zod";
import type {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  changePasswordSchema,
  approveDataRoomAccessRequestSchema,
  dataRoomAccessRequestSchema,
  updateUserSchema,
  rejectDataRoomAccessRequestSchema,
} from "./auth.schema.js";

export type LoginDTO = z.infer<typeof loginSchema>;
export type RegisterDTO = z.infer<typeof registerSchema>;
export type ForgotPasswordDTO = z.infer<typeof forgotPasswordSchema>;
export type ChangePasswordDTO = z.infer<typeof changePasswordSchema>;
export type UpdateUserDTO = z.infer<typeof updateUserSchema>;
export type DataRoomAccessRequestDTO = z.infer<typeof dataRoomAccessRequestSchema>;
export type ApproveDataRoomAccessRequestDTO = z.infer<typeof approveDataRoomAccessRequestSchema>;
export type RejectDataRoomAccessRequestDTO = z.infer<typeof rejectDataRoomAccessRequestSchema>;
