import { AsyncLocalStorage } from "node:async_hooks";

// Quién está haciendo la petición actual. Se llena al empezar cada petición (middleware) y la API se lo
// comunica a la base de datos en cada escritura para que la bitácora sepa quién fue.
export type AuditContext = {
  requestId: string;
  ip?: string | undefined;
  userAgent?: string | undefined;
  route?: string | undefined;
  actorId?: number | null;
  actorRole?: string | null;
  // "api" = petición de un usuario; "system" = tareas internas de la API (arranque, semillas).
  source: "api" | "system";
};

export const auditStorage = new AsyncLocalStorage<AuditContext>();
// true mientras corre el cuerpo de una transacción interactiva (ya tiene su propia sesión de auditoría).
export const transactionStorage = new AsyncLocalStorage<boolean>();

export const currentAuditContext = () => auditStorage.getStore();

export function setAuditActor(id: number | null | undefined, role?: string | null) {
  const context = auditStorage.getStore();
  if (!context) return;
  context.actorId = id ?? null;
  context.actorRole = role ?? null;
}
