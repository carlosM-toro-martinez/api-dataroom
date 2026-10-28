import { HttpError } from "../../errors/http.error.js";

type NamedNode = { name: string; abbreviation?: string | null };

// Mirrors normalizeNameToken() in web-dataroom src/features/exploraciones/lib/sampleName.ts; keep both in sync.
export function normalizeNameToken(value?: string | null) {
  return (value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[ÁÀÂÄ]/g, "A")
    .replace(/[ÉÈÊË]/g, "E")
    .replace(/[ÍÌÎÏ]/g, "I")
    .replace(/[ÓÒÔÖ]/g, "O")
    .replace(/[ÚÙÛÜ]/g, "U")
    .replace(/[/\s]+/g, "-")
    .replace(/[^A-ZÑ0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// Catalog names sometimes carry their own abbreviation, e.g. "NIVEL 30 (NIV-30)"; the sample name uses "NIVEL 30".
function fullNameToken(node: NamedNode) {
  return normalizeNameToken((node.name ?? "").replace(/\s*\([^)]*\)/g, "") || node.abbreviation);
}

/** Legacy format: AREA-NIVEL-LABOR with the abbreviations. */
export function sampleNamePrefix(area: NamedNode, level: NamedNode, labor: NamedNode) {
  return [area, level, labor]
    .map((node) => normalizeNameToken(node.abbreviation ?? node.name))
    .filter(Boolean)
    .join("-");
}

/** Current format: the full names, e.g. "MOSA - SUPERFICIE - BANCO 6" (compared in normalized form). */
export function sampleFullNamePrefix(area: NamedNode, level: NamedNode, labor: NamedNode) {
  return [area, level, labor].map(fullNameToken).filter(Boolean).join("-");
}

/**
 * The client builds the sample name from the selected area, level and labor (full names; older clients still send
 * the abbreviations) while the stored location comes from the labor id. Reject names whose prefix disagrees with
 * the labor's real location so a sample can never be labelled with one area and saved under another.
 */
export function assertSampleNameMatchesLocation(
  name: string | null | undefined,
  location: { area: NamedNode; level: NamedNode; labor: NamedNode }
) {
  const normalized = normalizeNameToken(name);
  if (!normalized) return;
  const prefixes = [
    sampleFullNamePrefix(location.area, location.level, location.labor),
    sampleNamePrefix(location.area, location.level, location.labor)
  ];
  if (prefixes.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}-`))) return;
  throw new HttpError(
    `El nombre '${name}' no corresponde a la ubicación seleccionada (${prefixes[0]}). Vuelve a seleccionar área, nivel y labor.`,
    400
  );
}
