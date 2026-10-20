import { PrismaClient } from "@prisma/client";
import { auditStorage, transactionStorage, type AuditContext } from "./auditContext.js";

// Cliente "limpio" (sin auditoría de sesión). Solo se usa dentro de este archivo y para registrar eventos.
export const basePrisma: PrismaClient =
  (globalThis as unknown as { basePrisma?: PrismaClient }).basePrisma ||
  new PrismaClient({
    log: ["error", "warn"],
  } as any);

if (process.env.NODE_ENV !== "production") {
  (globalThis as unknown as { basePrisma?: PrismaClient }).basePrisma = basePrisma;
}

// ─── Auditoría: cada escritura corre en una transacción que le dice a la base QUIÉN la hace ──────────────
// Los triggers de la base de datos (migración audit_trail) registran el cambio; aquí solo se le informa el
// usuario, la IP y la ruta mediante variables de sesión locales a la transacción (set_config(..., true)).
const WRITE_OPERATIONS = new Set([
  "create",
  "createMany",
  "createManyAndReturn",
  "update",
  "updateMany",
  "upsert",
  "delete",
  "deleteMany",
]);

const DEFAULT_TRANSACTION_OPTIONS = { timeout: 30_000, maxWait: 10_000 };

type SessionClient = Pick<PrismaClient, "$queryRaw">;

async function applyAuditSession(tx: SessionClient, context: AuditContext | undefined, lockChain = true) {
  const actorId = context?.actorId != null ? String(context.actorId) : "";
  // Primero se toma la cabecera de la cadena: así todas las escrituras se ordenan una tras otra y nunca se
  // bloquean entre sí a medias (evita interbloqueos entre transacciones). Las transacciones SERIALIZABLE /
  // REPEATABLE READ no pueden esperar ese bloqueo sin arriesgar un error de serialización: ahí lo toma el trigger.
  if (lockChain) await tx.$queryRaw`SELECT 1 FROM audit_chain_head WHERE id = 1 FOR UPDATE`;
  await tx.$queryRaw`SELECT
      set_config('app.source', ${context?.source ?? "system"}, true),
      set_config('app.actor_id', ${actorId}, true),
      set_config('app.actor_name', coalesce((SELECT nombre FROM "User" WHERE id = NULLIF(${actorId}, '')::int), ''), true),
      set_config('app.actor_email', coalesce((SELECT email FROM "User" WHERE id = NULLIF(${actorId}, '')::int), ''), true),
      set_config('app.actor_role', ${context?.actorRole ?? ""}, true),
      set_config('app.request_id', ${context?.requestId ?? ""}, true),
      set_config('app.ip', ${context?.ip ?? ""}, true),
      set_config('app.user_agent', ${context?.userAgent ?? ""}, true),
      set_config('app.route', ${context?.route ?? ""}, true)`;
}

const lowerFirst = (value: string) => value.charAt(0).toLowerCase() + value.slice(1);

const extended = basePrisma.$extends({
  query: {
    $allModels: {
      $allOperations({ model, operation, args, query }) {
        // Lecturas y operaciones dentro de una transacción ya sellada: pasan tal cual.
        if (!WRITE_OPERATIONS.has(operation) || model === "AuditLog" || model === "AuditChainHead" || transactionStorage.getStore()) {
          return query(args);
        }
        // Escritura suelta: se envuelve en su propia transacción con la sesión de auditoría.
        const context = auditStorage.getStore();
        return basePrisma.$transaction(async (tx) => {
          await applyAuditSession(tx, context);
          return (tx as any)[lowerFirst(model)][operation](args);
        }, DEFAULT_TRANSACTION_OPTIONS);
      },
    },
  },
});

function auditedTransaction(arg: unknown, options?: Record<string, unknown>) {
  if (typeof arg !== "function") {
    throw new Error("prisma.$transaction([...]) ya no se usa: usa prisma.$transaction(async (tx) => { ... }) para que la auditoría sepa quién hizo el cambio.");
  }
  const context = auditStorage.getStore();
  const isolation = String(options?.["isolationLevel"] ?? "");
  const lockChain = !/Serializable|RepeatableRead/i.test(isolation);
  return extended.$transaction(
    async (tx) => {
      await applyAuditSession(tx as unknown as SessionClient, context, lockChain);
      return transactionStorage.run(true, () => (arg as (tx: unknown) => Promise<unknown>)(tx));
    },
    { ...DEFAULT_TRANSACTION_OPTIONS, ...(options ?? {}) } as any,
  );
}

// El resto del código sigue usando `prisma` como siempre.
const proxy = new Proxy(extended, {
  get(target, property, receiver) {
    if (property === "$transaction") return auditedTransaction;
    const value = Reflect.get(target, property, target);
    return typeof value === "function" ? value.bind(target) : value;
  },
}) as unknown as PrismaClient;

export const prisma: PrismaClient = proxy;
