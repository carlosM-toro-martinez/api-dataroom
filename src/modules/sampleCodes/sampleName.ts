import { HttpError } from "../../errors/http.error.js";

type NamedNode = { name: string; abbreviation?: string | null };

// Mirrors normalizeNameToken() in web-dataroom ExploracionesPage.tsx; keep both in sync.
export function normalizeNameToken(value?: string | null) {
  return (value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[/\s]+/g, "-")
    .replace(/[^A-Z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function sampleNamePrefix(area: NamedNode, level: NamedNode, labor: NamedNode) {
  return [area, level, labor]
    .map((node) => normalizeNameToken(node.abbreviation ?? node.name))
    .filter(Boolean)
    .join("-");
}

/**
 * The client builds the sample name as AREA-NIVEL-LABOR[-SUFIJO] while the stored location comes
 * from the labor id. Reject names whose prefix disagrees with the labor's real location so a
 * sample can never be labelled with one area and saved under another.
 */
export function assertSampleNameMatchesLocation(
  name: string | null | undefined,
  location: { area: NamedNode; level: NamedNode; labor: NamedNode }
) {
  const normalized = normalizeNameToken(name);
  if (!normalized) return;
  const prefix = sampleNamePrefix(location.area, location.level, location.labor);
  if (normalized === prefix || normalized.startsWith(`${prefix}-`)) return;
  throw new HttpError(
    `El nombre '${name}' no corresponde a la ubicación seleccionada (${prefix}). Vuelve a seleccionar área, nivel y labor.`,
    400
  );
}
