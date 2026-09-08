export type DataRoomMediaKey =
  | "intro-video"
  | "model-1"
  | "model-2";

export const dataRoomMediaCatalog: Record<DataRoomMediaKey, { filename: string; contentType: string; label: string }> = {
  "intro-video": {
    filename: "intro-video.optimized.mp4",
    contentType: "video/mp4",
    label: "Presentation video"
  },
  "model-1": {
    filename: "model-1.optimized.mp4",
    contentType: "video/mp4",
    label: "Model 1"
  },
  "model-2": {
    filename: "model-2.optimized.mp4",
    contentType: "video/mp4",
    label: "Model 2"
  }
};

export function isDataRoomMediaKey(value: string): value is DataRoomMediaKey {
  return Object.prototype.hasOwnProperty.call(dataRoomMediaCatalog, value);
}
