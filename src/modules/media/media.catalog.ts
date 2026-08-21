export type DataRoomMediaKey =
  | "intro-video"
  | "model-1"
  | "model-2";

export const dataRoomMediaCatalog: Record<DataRoomMediaKey, { filename: string; contentType: string; label: string }> = {
  "intro-video": {
    filename: "VIDEO DE PRESENTACION.mp4",
    contentType: "video/mp4",
    label: "Presentation video"
  },
  "model-1": {
    filename: "1MODELO.gif",
    contentType: "image/gif",
    label: "Model 1"
  },
  "model-2": {
    filename: "2MODELO_.gif",
    contentType: "image/gif",
    label: "Model 2"
  }
};

export function isDataRoomMediaKey(value: string): value is DataRoomMediaKey {
  return Object.prototype.hasOwnProperty.call(dataRoomMediaCatalog, value);
}
