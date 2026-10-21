import { Prisma } from "@prisma/client";
import { basePrisma } from "../../config/prisma.js";

export type AuditQuery = {
  from?: string;
  to?: string;
  actorId?: number;
  action?: string;
  table?: string;
  recordId?: string;
  source?: string;
  search?: string;
  page: number;
  limit: number;
};

type Row = Record<string, unknown>;

// bigint no se puede serializar a JSON: se pasa a número (la bitácora nunca llegará a 2^53 registros).
const plain = (row: Row): Row =>
  Object.fromEntries(Object.entries(row).map(([key, value]) => [key, typeof value === "bigint" ? Number(value) : value]));

function where(query: Omit<AuditQuery, "page" | "limit">) {
  const parts: Prisma.Sql[] = [];
  if (query.from) parts.push(Prisma.sql`at >= ${new Date(query.from)}`);
  if (query.to) parts.push(Prisma.sql`at < ${new Date(query.to)}`);
  if (query.actorId != null) parts.push(Prisma.sql`actor_id = ${query.actorId}`);
  if (query.action) parts.push(Prisma.sql`action = ${query.action}`);
  if (query.table) parts.push(Prisma.sql`table_name = ${query.table}`);
  if (query.recordId) parts.push(Prisma.sql`record_id = ${query.recordId}`);
  // Las tareas internas del sistema (arranque, procesos automáticos) no interesan al revisar la bitácora:
  // solo se muestran si se pide ese origen de forma explícita.
  parts.push(query.source ? Prisma.sql`source = ${query.source}` : Prisma.sql`source <> 'system'`);
  if (query.search) {
    const like = `%${query.search.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
    parts.push(Prisma.sql`(record_label ILIKE ${like} OR record_id ILIKE ${like} OR actor_name ILIKE ${like} OR actor_email ILIKE ${like} OR route ILIKE ${like})`);
  }
  return parts.length ? Prisma.sql`WHERE ${Prisma.join(parts, " AND ")}` : Prisma.empty;
}

const LIST_COLUMNS = Prisma.sql`seq, at, source, action, table_name, record_id, record_label, actor_id, actor_name, actor_email,
  actor_role, request_id, ip, route, changed_fields`;

export const auditService = {
  async list(query: AuditQuery) {
    const filter = where(query);
    const offset = (query.page - 1) * query.limit;
    const [rows, total] = await Promise.all([
      basePrisma.$queryRaw<Row[]>`SELECT ${LIST_COLUMNS} FROM audit_log ${filter} ORDER BY seq DESC LIMIT ${query.limit} OFFSET ${offset}`,
      basePrisma.$queryRaw<Array<{ n: bigint }>>`SELECT count(*) AS n FROM audit_log ${filter}`,
    ]);
    const count = Number(total[0]?.n ?? 0);
    return { data: rows.map(plain), meta: { page: query.page, limit: query.limit, total: count, totalPages: Math.max(1, Math.ceil(count / query.limit)) } };
  },

  // Todo lo que se sabe de un registro de la bitácora (incluye valores antes/después y datos técnicos).
  async get(seq: number) {
    const rows = await basePrisma.$queryRaw<Row[]>`SELECT * FROM audit_log WHERE seq = ${seq}`;
    return rows[0] ? plain(rows[0]) : null;
  },

  // Historial completo de un registro (por ejemplo, un pozo o un parte), del más nuevo al más antiguo.
  async history(table: string, recordId: string, limit = 200) {
    const rows = await basePrisma.$queryRaw<Row[]>`
      SELECT seq, at, source, action, table_name, record_id, record_label, actor_id, actor_name, actor_email, actor_role,
             route, ip, changed_fields, old_data, new_data
      FROM audit_log WHERE table_name = ${table} AND record_id = ${recordId} ORDER BY seq DESC LIMIT ${limit}`;
    return rows.map(plain);
  },

  // Valores para armar los filtros de la pantalla.
  async filters() {
    const [actors, tables, actions] = await Promise.all([
      basePrisma.$queryRaw<Row[]>`
        SELECT actor_id AS id, max(actor_name) AS name, max(actor_email) AS email, count(*)::int AS events
        FROM audit_log WHERE actor_id IS NOT NULL AND source <> 'system' GROUP BY actor_id ORDER BY max(actor_name)`,
      basePrisma.$queryRaw<Row[]>`SELECT table_name AS name, count(*)::int AS events FROM audit_log WHERE source <> 'system' GROUP BY table_name ORDER BY table_name`,
      basePrisma.$queryRaw<Row[]>`SELECT action AS name, count(*)::int AS events FROM audit_log WHERE source <> 'system' GROUP BY action ORDER BY action`,
    ]);
    return { actors: actors.map(plain), tables: tables.map(plain), actions: actions.map(plain) };
  },

  async summary() {
    const [head] = await basePrisma.$queryRaw<Array<{ last_seq: bigint; last_hash: string }>>`SELECT last_seq, last_hash FROM audit_chain_head WHERE id = 1`;
    const [first] = await basePrisma.$queryRaw<Array<{ at: Date | null }>>`SELECT min(at) AS at FROM audit_log`;
    return { records: Number(head?.last_seq ?? 0), lastHash: head?.last_hash ?? null, since: first?.at ?? null };
  },

  // Recalcula toda la cadena de hashes. Si alguien alteró o borró un registro, lo dice y señala cuál.
  async verify() {
    const [result] = await basePrisma.$queryRaw<Array<{ ok: boolean; checked: bigint; broken_seq: bigint | null; reason: string | null }>>`SELECT * FROM audit_verify()`;
    return {
      ok: Boolean(result?.ok),
      checked: Number(result?.checked ?? 0),
      brokenAt: result?.broken_seq != null ? Number(result.broken_seq) : null,
      reason: result?.reason ?? null,
      verifiedAt: new Date().toISOString(),
    };
  },

  // Para exportar a Excel/CSV (hasta 50.000 filas por descarga).
  async exportRows(query: Omit<AuditQuery, "page" | "limit">) {
    const filter = where(query);
    const rows = await basePrisma.$queryRaw<Row[]>`
      SELECT seq, at, source, action, table_name, record_id, record_label, actor_id, actor_name, actor_email, actor_role,
             ip, route, request_id, changed_fields, old_data, new_data, detail, hash
      FROM audit_log ${filter} ORDER BY seq DESC LIMIT 50000`;
    return rows.map(plain);
  },
};
