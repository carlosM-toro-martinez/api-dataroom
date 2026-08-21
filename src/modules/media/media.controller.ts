import fs from "node:fs";
import fsp from "node:fs/promises";
import type { Response } from "express";
import type { AuthRequest } from "../../middleware/auth.middleware.js";
import { dataRoomMediaCatalog, isDataRoomMediaKey } from "./media.catalog.js";
import { dataRoomMediaRoot, resolveDataRoomMediaPath } from "./media.paths.js";

function fileMissing(res: Response) {
  return res.status(404).json({ success: false, error: "Archivo no encontrado" });
}

async function statMediaFile(filename: string) {
  const filePath = resolveDataRoomMediaPath(filename);
  const stats = await fsp.stat(filePath);
  if (!stats.isFile()) {
    throw Object.assign(new Error("Archivo no encontrado"), { statusCode: 404 });
  }
  return { filePath, stats };
}

export const mediaController = {
  async listDataRoomMedia(req: AuthRequest, res: Response) {
    const items = await Promise.all(
      Object.entries(dataRoomMediaCatalog).map(async ([key, item]) => {
        try {
          const { stats } = await statMediaFile(item.filename);
          return {
            key,
            label: item.label,
            filename: item.filename,
            contentType: item.contentType,
            size: stats.size,
            available: true
          };
        } catch {
          return {
            key,
            label: item.label,
            filename: item.filename,
            contentType: item.contentType,
            size: 0,
            available: false
          };
        }
      })
    );

    res.json({ success: true, data: items });
  },

  async uploadDataRoomMedia(req: AuthRequest, res: Response) {
    const key = String(req.params.key ?? "");
    if (!isDataRoomMediaKey(key)) {
      return res.status(404).json({ success: false, error: "Medio no configurado" });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, error: "Archivo requerido" });
    }

    const item = dataRoomMediaCatalog[key];
    const finalPath = resolveDataRoomMediaPath(item.filename);
    await fsp.mkdir(dataRoomMediaRoot, { recursive: true });
    await fsp.rename(req.file.path, finalPath);

    const stats = await fsp.stat(finalPath);
    res.status(201).json({
      success: true,
      data: {
        key,
        filename: item.filename,
        contentType: item.contentType,
        size: stats.size
      }
    });
  },

  async streamDataRoomMedia(req: AuthRequest, res: Response) {
    const key = String(req.params.key ?? "");
    if (!isDataRoomMediaKey(key)) {
      return res.status(404).json({ success: false, error: "Medio no configurado" });
    }

    const item = dataRoomMediaCatalog[key];
    let media;
    try {
      media = await statMediaFile(item.filename);
    } catch {
      return fileMissing(res);
    }

    const { filePath, stats } = media;
    const range = req.headers.range;
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.setHeader("Content-Type", item.contentType);
    res.setHeader("X-Content-Type-Options", "nosniff");

    if (!range) {
      res.setHeader("Content-Length", stats.size);
      return fs.createReadStream(filePath).pipe(res);
    }

    const match = range.match(/bytes=(\d*)-(\d*)/);
    if (!match) {
      res.setHeader("Content-Range", `bytes */${stats.size}`);
      return res.sendStatus(416);
    }

    const start = match[1] ? Number.parseInt(match[1], 10) : 0;
    const end = match[2] ? Number.parseInt(match[2], 10) : stats.size - 1;
    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || end >= stats.size) {
      res.setHeader("Content-Range", `bytes */${stats.size}`);
      return res.sendStatus(416);
    }

    res.status(206);
    res.setHeader("Content-Range", `bytes ${start}-${end}/${stats.size}`);
    res.setHeader("Content-Length", end - start + 1);
    return fs.createReadStream(filePath, { start, end }).pipe(res);
  }
};
