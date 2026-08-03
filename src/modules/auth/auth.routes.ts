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
  cancelDataRoomAccessRequestSchema,
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
  authorize("ADMIN"),
  authController.listarSolicitudesDataRoom,
);
router.post(
  "/data-room/access-requests/:id/approve",
  authenticate,
  authorize("ADMIN"),
  validate(approveDataRoomAccessRequestSchema),
  authController.aprobarSolicitudDataRoom,
);
router.post(
  "/data-room/access-requests/:id/reject",
  authenticate,
  authorize("ADMIN"),
  validate(rejectDataRoomAccessRequestSchema),
  authController.rechazarSolicitudDataRoom,
);
router.post(
  "/data-room/access-requests/:id/cancel",
  authenticate,
  authorize("ADMIN"),
  validate(cancelDataRoomAccessRequestSchema),
  authController.cancelarSolicitudDataRoom,
);

router.get(
  "/users",
  authenticate,
  authorize("ADMIN"),
  authController.listarUsuarios,
);
router.put(
  "/users/:id",
  authenticate,
  authorize("ADMIN"),
  validate(updateUserSchema),
  authController.actualizarUsuario,
);

router.post("/forgot-password", validate(forgotPasswordSchema), authController.forgotPassword);
router.post("/reset-password", validate(resetPasswordBodySchema), authController.resetPassword);
router.put("/change-password", authenticate, validate(changePasswordSchema), authController.changePassword);

export default router;
