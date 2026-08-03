import { Router } from "express";
import { authController } from "./auth.controller.js";
import { validate } from "../../middleware/validate.middleware.js";
import { authenticate, authorize } from "../../middleware/auth.middleware.js";
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordBodySchema,
  changePasswordSchema,
  approveDataRoomAccessRequestSchema,
  dataRoomAccessRequestSchema,
  rejectDataRoomAccessRequestSchema,
  updateUserSchema,
} from "./auth.schema.js";

const router = Router();

router.post("/register", validate(registerSchema), authController.register);
router.post("/login", validate(loginSchema), authController.login);
router.post("/refresh", authController.refresh);
router.post("/logout", authenticate, authController.logout);
router.post(
  "/data-room/access-requests",
  validate(dataRoomAccessRequestSchema),
  authController.solicitarAccesoDataRoom,
);
router.get(
  "/data-room/access-requests",
  authenticate,
  authorize("ADMIN", "GEOLOGOADMIN"),
  authController.listarSolicitudesDataRoom,
);
router.post(
  "/data-room/access-requests/:id/approve",
  authenticate,
  authorize("ADMIN", "GEOLOGOADMIN"),
  validate(approveDataRoomAccessRequestSchema),
  authController.aprobarSolicitudDataRoom,
);
router.post(
  "/data-room/access-requests/:id/reject",
  authenticate,
  authorize("ADMIN", "GEOLOGOADMIN"),
  validate(rejectDataRoomAccessRequestSchema),
  authController.rechazarSolicitudDataRoom,
);

router.get(
  "/users",
  authenticate,
  authorize("ADMIN", "GEOLOGOADMIN"),
  authController.listarUsuarios,
);
router.put(
  "/users/:id",
  authenticate,
  authorize("ADMIN", "GEOLOGOADMIN"),
  validate(updateUserSchema),
  authController.actualizarUsuario,
);

router.post("/forgot-password", validate(forgotPasswordSchema), authController.forgotPassword);
router.post("/reset-password", validate(resetPasswordBodySchema), authController.resetPassword);
router.put("/change-password", authenticate, validate(changePasswordSchema), authController.changePassword);

export default router;
