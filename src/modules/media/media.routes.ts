import fsp from "node:fs/promises";
import { Router } from "express";
import multer from "multer";
import { requirePermission } from "../../middleware/permission.middleware.js";
import { authenticateMedia } from "./media.auth.js";
import { dataRoomMediaRoot } from "./media.paths.js";
import { mediaController } from "./media.controller.js";

const router = Router();

const upload = multer({
  storage: multer.diskStorage({
    destination: async (_req, _file, callback) => {
      try {
        await fsp.mkdir(dataRoomMediaRoot, { recursive: true });
        callback(null, dataRoomMediaRoot);
      } catch (error) {
        callback(error as Error, dataRoomMediaRoot);
      }
    },
    filename: (_req, file, callback) => {
      callback(null, `${Date.now()}-${file.originalname}`);
    }
  }),
  limits: {
    fileSize: 250 * 1024 * 1024
  }
});

router.use(authenticateMedia);
router.use(requirePermission("dataRoom"));
router.get("/data-room", mediaController.listDataRoomMedia);
router.get("/data-room/:key", mediaController.streamDataRoomMedia);
router.post("/data-room/:key", upload.single("file"), mediaController.uploadDataRoomMedia);

export default router;
