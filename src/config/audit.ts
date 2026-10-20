import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { basePrisma } from "./prisma.js";
import { auditStorage, currentAuditContext, type AuditContext } from "./auditContext.js";
import { logger } from "./logger.js";

// ─── Contexto de cada petición ───────────────────────────────────────────────
function clientIp(req: Request) {
  const forwarded = req.headers["x-forwarded-for"];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0]?.trim();
  return first || req.socket.remoteAddress || undefined;
}

export function auditContextMiddleware(req: Request, res: Response, next: NextFunction) {
  const incoming = req.headers["x-request-id"];
  const context: AuditContext = {
    requestId: (typeof incoming === "string" && incoming.length <= 64 ? incoming : undefined) ?? crypto.randomUUID(),
    ip: clientIp(req),
    userAgent: req.headers["user-agent"]?.slice(0, 300),
    // Sin querystring: podría traer tokens.
    route: `${req.method} ${req.originalUrl.split("?")[0]}`.slice(0, 300),
    actorId: null,
    actorRole: null,
    source: "api",
  };
  res.setHeader("x-request-id", context.requestId);
  auditStorage.run(context, next);
}

// ─── Eventos que no son un cambio de fila ────────────────────────────────────
export type AuditEventInput = {
  action: string; // LOGIN, LOGIN_FAILED, LOGOUT, ACCESS_DENIED, PASSWORD_RESET_REQUESTED, ...
  entity: string; // módulo o tabla afectada
  recordId?: string | number | null;
  label?: string | null;
  detail?: Record<string, unknown>;
  actorId?: number | null; // si no se indica, se toma del usuario de la petición
  actorRole?: string | null;
};

export async function auditEvent(input: AuditEventInput) {
  const context = currentAuditContext();
  try {
    await basePrisma.$queryRaw`SELECT audit_event(
      ${input.action}, ${input.entity}, ${input.recordId != null ? String(input.recordId) : null}, ${input.label ?? null},
      ${JSON.stringify(input.detail ?? {})}::jsonb,
      ${input.actorId ?? context?.actorId ?? null}::int, ${input.actorRole ?? context?.actorRole ?? null},
      ${context?.requestId ?? null}, ${context?.ip ?? null}, ${context?.userAgent ?? null}, ${context?.route ?? null}
    )`;
  } catch (error) {
    // Un fallo al registrar un evento nunca debe tumbar la petición, pero sí quedar en el log del servidor.
    logger.error({ err: error, action: input.action }, "No se pudo registrar un evento de auditoría");
  }
}

// ─── Mantenimiento ───────────────────────────────────────────────────────────
// Conecta la auditoría a las tablas nuevas (si una migración futura crea tablas) y verifica la cadena.
export async function startAudit() {
  try {
    const attached = await basePrisma.$queryRaw<Array<{ audit_attach_all: number }>>`SELECT audit_attach_all()`;
    if (attached[0]?.audit_attach_all) {
      logger.warn({ tablas: attached[0].audit_attach_all }, "Auditoría conectada a tablas nuevas");
    }
    const [check] = await basePrisma.$queryRaw<Array<{ ok: boolean; checked: bigint; broken_seq: bigint | null; reason: string | null }>>`SELECT * FROM audit_verify()`;
    if (check?.ok) logger.info({ registros: Number(check.checked) }, "Bitácora de auditoría verificada: la cadena está íntegra");
    else logger.error({ rotoEn: check?.broken_seq != null ? Number(check.broken_seq) : null, motivo: check?.reason }, "ALERTA: la bitácora de auditoría NO pasó la verificación");
  } catch (error) {
    logger.error({ err: error }, "No se pudo iniciar la auditoría");
  }
}

// Cada hora deja en el log del servidor el último hash de la cadena: es un "ancla" externa para detectar
// que alguien reescribió la bitácora completa (si el hash del log no coincide con el de la base, hubo manipulación).
export function scheduleAuditAnchor() {
  const log = async () => {
    try {
      const [head] = await basePrisma.$queryRaw<Array<{ last_seq: bigint; last_hash: string }>>`SELECT last_seq, last_hash FROM audit_chain_head WHERE id = 1`;
      if (head) logger.info({ audit_anchor: { seq: Number(head.last_seq), hash: head.last_hash } }, "Ancla de la bitácora de auditoría");
    } catch (error) {
      logger.error({ err: error }, "No se pudo leer el ancla de auditoría");
    }
  };
  void log();
  const timer = setInterval(log, 60 * 60 * 1000);
  timer.unref();
}
