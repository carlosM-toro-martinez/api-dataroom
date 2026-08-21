import path from "node:path";

export const mediaRoot = path.resolve(process.env.MEDIA_ROOT ?? path.join(process.cwd(), "storage", "media"));
export const dataRoomMediaRoot = path.join(mediaRoot, "data-room");

export function resolveDataRoomMediaPath(filename: string) {
  const resolved = path.resolve(dataRoomMediaRoot, filename);
  if (!resolved.startsWith(dataRoomMediaRoot)) {
    throw Object.assign(new Error("Ruta de medio inválida"), { statusCode: 400 });
  }
  return resolved;
}
