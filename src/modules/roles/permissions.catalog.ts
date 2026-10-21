export const PERMISSION_ACTIONS = ["create", "read", "update", "delete"] as const;
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export const PERMISSION_MODULES = [
  { key: "dataRoom", label: "Data Room", description: "Consultar el Data Room (proyectos, zonas, perforaciones, superficie) y administrar su estructura y medios." },
  { key: "exploracion", label: "Exploración", description: "Registro de muestras, ubicaciones y resultados de Exploración." },
  { key: "produccion", label: "Producción", description: "Registro de muestras, ubicaciones y resultados de Producción." },
  { key: "despachos", label: "Despachos de muestras", description: "Lotes de despacho de muestras al laboratorio." },
  { key: "sondajes", label: "Sondajes · Perforación", description: "Programas de perforación, pozos, partes diarios de turno y personal." },
  { key: "geologiaSondajes", label: "Sondajes · Geología", description: "Reporte geológico diario, logueo (quick log) y fotografías de testigos. Ve la lista de pozos sin poder editarla." },
  { key: "analisisMuestras", label: "Análisis de muestras", description: "Tablero con leyes, cobertura, laboratorios, calidad y estimación espacial de las muestras. Solo lectura." },
  { key: "elementos", label: "Códigos de muestra", description: "Revisión y reparación de códigos de muestra duplicados." },
  { key: "solicitudes", label: "Solicitudes Data Room", description: "Aprobar, rechazar o cancelar accesos de visitantes." },
  { key: "usuarios", label: "Usuarios y roles", description: "Crear usuarios, asignar roles y editar permisos. Equivale a poder de administración." },
] as const;

export type PermissionModule = (typeof PERMISSION_MODULES)[number]["key"];
export type PermissionMap = Partial<Record<PermissionModule, PermissionAction[]>>;

export const MODULE_KEYS = PERMISSION_MODULES.map((m) => m.key) as PermissionModule[];

export const ADMIN_ROLE = "ADMIN";
export const VISITOR_ROLE = "VISITANTE";

export const FULL_PERMISSIONS: PermissionMap = Object.fromEntries(
  MODULE_KEYS.map((key) => [key, [...PERMISSION_ACTIONS]]),
) as PermissionMap;

// Limpia un JSON arbitrario: solo módulos y acciones conocidos, sin duplicados.
export function normalizePermissions(value: unknown): PermissionMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: PermissionMap = {};
  for (const key of MODULE_KEYS) {
    const actions = (value as Record<string, unknown>)[key];
    if (!Array.isArray(actions)) continue;
    const valid = PERMISSION_ACTIONS.filter((action) => actions.includes(action));
    if (valid.length) result[key] = valid;
  }
  return result;
}
