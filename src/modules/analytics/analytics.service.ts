import { Prisma } from "@prisma/client";
import { basePrisma } from "../../config/prisma.js";
import { idw } from "./idw.js";

export type AnalyticsFilters = {
  category?: "EXPLORATION" | "PRODUCTION" | undefined;
  source?: "INTERIOR" | "SURFACE" | undefined;
  from?: string | undefined;
  to?: string | undefined;
};

type Row = Record<string, unknown>;

// Una sola vista de muestras (interior mina + superficie) y otra de resultados, para consultar ambas igual.
const SAMPLES = Prisma.sql`
  SELECT 'INTERIOR'::text AS source, sa.id, sa.code, sa.category::text AS category, sa.status::text AS status,
         sa.east, sa.north, sa.elevation, COALESCE(sa."sampledAt", sa."createdAt") AS at,
         ar.id AS area_id, ar.name AS area, lv.id AS level_id, lv.name AS level, lb.id AS labor_id, lb.name AS labor, ob.name AS objective
  FROM "InteriorSample" sa
  JOIN "InteriorLevel" lv ON lv.id = sa."interiorLevelId"
  JOIN "InteriorArea" ar ON ar.id = lv."interiorAreaId"
  JOIN "InteriorLabor" lb ON lb.id = sa."interiorLaborId"
  JOIN "InteriorObjective" ob ON ob.id = sa."interiorObjectiveId"
  UNION ALL
  SELECT 'SURFACE'::text, sa.id, sa.code, sa.category::text, sa.status::text,
         sa.east, sa.north, sa.elevation, COALESCE(sa."sampledAt", sa."createdAt"),
         ar.id, ar.name, lv.id, lv.name, lb.id, lb.name, ob.name
  FROM "SurfaceSample" sa
  JOIN "SurfaceLevel" lv ON lv.id = sa."surfaceLevelId"
  JOIN "SurfaceArea" ar ON ar.id = lv."surfaceAreaId"
  JOIN "SurfaceLabor" lb ON lb.id = sa."surfaceLaborId"
  JOIN "SurfaceObjective" ob ON ob.id = sa."surfaceObjectiveId"`;

const RESULTS = Prisma.sql`
  SELECT 'INTERIOR'::text AS source, r."interiorSampleId" AS sample_id, la.id AS assignment_id, la.slot AS slot,
         l.id AS lab_id, l.name AS lab, e.symbol, COALESCE(NULLIF(r.unit, ''), e."defaultUnit", '') AS unit,
         r.value, COALESCE(r.qualifier, '') AS qualifier, r."createdAt" AS result_at
  FROM "InteriorSampleResult" r
  JOIN "InteriorLabAssignment" la ON la.id = r."interiorLabAssignmentId"
  JOIN "InteriorLaboratory" l ON l.id = la."interiorLaboratoryId"
  JOIN "Element" e ON e.id = r."elementId"
  UNION ALL
  SELECT 'SURFACE'::text, r."surfaceSampleId", la.id, NULL::text,
         l.id, l.name, e.symbol, COALESCE(NULLIF(r.unit, ''), e."defaultUnit", ''),
         r.value, COALESCE(r.qualifier, ''), r."createdAt"
  FROM "SurfaceSampleResult" r
  JOIN "SurfaceLabAssignment" la ON la.id = r."surfaceLabAssignmentId"
  JOIN "SurfaceLaboratory" l ON l.id = la."surfaceLaboratoryId"
  JOIN "Element" e ON e.id = r."elementId"`;

// Un resultado "< límite de detección" no es un valor real: no entra en promedios ni comparaciones.
const VALID = Prisma.sql`r.value IS NOT NULL AND r.qualifier NOT LIKE '<%'`;

function sampleFilter(f: AnalyticsFilters) {
  const parts: Prisma.Sql[] = [Prisma.sql`TRUE`];
  if (f.category) parts.push(Prisma.sql`x.category = ${f.category}`);
  if (f.source) parts.push(Prisma.sql`x.source = ${f.source}`);
  if (f.from) parts.push(Prisma.sql`x.at >= ${new Date(f.from)}`);
  if (f.to) parts.push(Prisma.sql`x.at < ${new Date(f.to)}`);
  return Prisma.join(parts, " AND ");
}

const withSamples = (f: AnalyticsFilters) => Prisma.sql`s AS (SELECT x.* FROM (${SAMPLES}) x WHERE ${sampleFilter(f)}), r AS (${RESULTS})`;

const query = (sql: Prisma.Sql) => basePrisma.$queryRaw<Row[]>(sql);
const num = (value: unknown) => (value == null ? null : Number(value));

// Valor por muestra de un elemento (si varios laboratorios lo midieron, se promedia).
const sampleValues = (element: string, unit: string) => Prisma.sql`
  v AS (SELECT r.source, r.sample_id, avg(r.value)::float8 AS value FROM r
        WHERE r.symbol = ${element} AND r.unit = ${unit} AND ${VALID} GROUP BY r.source, r.sample_id),
  g AS (SELECT s.*, v.value FROM s JOIN v ON v.source = s.source AND v.sample_id = s.id)`;

async function topElement(f: AnalyticsFilters) {
  const rows = await query(Prisma.sql`
    WITH ${withSamples(f)}
    SELECT r.symbol, r.unit, count(DISTINCT r.sample_id)::int AS samples
    FROM r JOIN s ON s.source = r.source AND s.id = r.sample_id
    WHERE ${VALID} GROUP BY r.symbol, r.unit ORDER BY samples DESC, r.symbol LIMIT 1`);
  return rows[0] ? { element: String(rows[0]["symbol"]), unit: String(rows[0]["unit"]) } : null;
}

async function resolveElement(f: AnalyticsFilters, element?: string, unit?: string) {
  if (element) return { element, unit: unit ?? "" };
  return topElement(f);
}

const GROUPS = {
  area: { key: Prisma.sql`g.area_id`, label: Prisma.sql`g.area`, parent: Prisma.sql`NULL::text` },
  level: { key: Prisma.sql`g.level_id`, label: Prisma.sql`g.level`, parent: Prisma.sql`g.area` },
  labor: { key: Prisma.sql`g.labor_id`, label: Prisma.sql`g.labor`, parent: Prisma.sql`g.area || ' · ' || g.level` },
  objective: { key: Prisma.sql`g.objective`, label: Prisma.sql`g.objective`, parent: Prisma.sql`NULL::text` },
} as const;
export type GroupBy = keyof typeof GROUPS;

export const analyticsService = {
  // Cifras generales para las tarjetas de arriba.
  async overview(f: AnalyticsFilters) {
    const [totals] = await query(Prisma.sql`
      WITH ${withSamples(f)}, rs AS (SELECT DISTINCT r.source, r.sample_id FROM r WHERE ${VALID})
      SELECT count(*)::int AS samples,
        count(*) FILTER (WHERE s.source = 'INTERIOR')::int AS interior,
        count(*) FILTER (WHERE s.source = 'SURFACE')::int AS surface,
        count(*) FILTER (WHERE s.category = 'EXPLORATION')::int AS exploration,
        count(*) FILTER (WHERE s.category = 'PRODUCTION')::int AS production,
        count(*) FILTER (WHERE s.east IS NOT NULL AND s.north IS NOT NULL)::int AS with_coords,
        count(*) FILTER (WHERE rs.sample_id IS NOT NULL)::int AS with_results,
        count(*) FILTER (WHERE s.status = 'REGISTERED')::int AS registered,
        count(*) FILTER (WHERE s.status = 'DISPATCHED')::int AS dispatched,
        count(*) FILTER (WHERE s.status = 'COMPLETED')::int AS completed,
        count(*) FILTER (WHERE s.at >= now() - interval '30 days')::int AS last30,
        count(*) FILTER (WHERE s.at >= now() - interval '60 days' AND s.at < now() - interval '30 days')::int AS prev30
      FROM s LEFT JOIN rs ON rs.source = s.source AND rs.sample_id = s.id`);

    const byMonth = await query(Prisma.sql`
      WITH ${withSamples(f)}
      SELECT to_char(date_trunc('month', s.at), 'YYYY-MM') AS month, count(*)::int AS samples,
             count(*) FILTER (WHERE s.category = 'EXPLORATION')::int AS exploration,
             count(*) FILTER (WHERE s.category = 'PRODUCTION')::int AS production
      FROM s GROUP BY 1 ORDER BY 1 DESC LIMIT 24`);

    const elements = await query(Prisma.sql`
      WITH ${withSamples(f)}
      SELECT r.symbol, r.unit, count(DISTINCT r.sample_id)::int AS samples, count(*)::int AS results,
             avg(r.value)::float8 AS avg, max(r.value)::float8 AS max
      FROM r JOIN s ON s.source = r.source AND s.id = r.sample_id
      WHERE ${VALID} GROUP BY r.symbol, r.unit ORDER BY samples DESC, r.symbol LIMIT 40`);

    const [dispatches] = await query(Prisma.sql`
      SELECT (SELECT count(*) FROM "InteriorSampleDispatch" WHERE status = 'PENDING')::int
           + (SELECT count(*) FROM "SurfaceSampleDispatch" WHERE status = 'PENDING')::int AS pending,
             (SELECT count(*) FROM "InteriorSampleDispatch" WHERE status = 'COMPLETED')::int
           + (SELECT count(*) FROM "SurfaceSampleDispatch" WHERE status = 'COMPLETED')::int AS completed`);

    return { totals, dispatches, byMonth: byMonth.reverse(), elements };
  },

  // Leyes de un elemento agrupadas por área, nivel, labor u objetivo, con su tendencia mensual.
  async grades(f: AnalyticsFilters, opts: { element?: string | undefined; unit?: string | undefined; groupBy: GroupBy }) {
    const chosen = await resolveElement(f, opts.element, opts.unit);
    if (!chosen) return { element: null, unit: null, groups: [], trend: [], top: [], belowDetection: 0 };
    const group = GROUPS[opts.groupBy];

    const groups = await query(Prisma.sql`
      WITH ${withSamples(f)}, ${sampleValues(chosen.element, chosen.unit)}
      SELECT ${group.key} AS key, ${group.label} AS label, ${group.parent} AS parent, count(*)::int AS n,
             avg(g.value)::float8 AS avg, percentile_cont(0.5) WITHIN GROUP (ORDER BY g.value)::float8 AS median,
             max(g.value)::float8 AS max, min(g.value)::float8 AS min, max(g.at) AS last_at
      FROM g GROUP BY 1, 2, 3 ORDER BY avg DESC`);

    const trend = await query(Prisma.sql`
      WITH ${withSamples(f)}, ${sampleValues(chosen.element, chosen.unit)}
      SELECT to_char(date_trunc('month', g.at), 'YYYY-MM') AS month, count(*)::int AS n,
             avg(g.value)::float8 AS avg, max(g.value)::float8 AS max
      FROM g GROUP BY 1 ORDER BY 1 DESC LIMIT 24`);

    const top = await query(Prisma.sql`
      WITH ${withSamples(f)}, ${sampleValues(chosen.element, chosen.unit)}
      SELECT g.code, g.value, g.area, g.level, g.labor, g.objective, g.source, g.at
      FROM g ORDER BY g.value DESC LIMIT 10`);

    const [below] = await query(Prisma.sql`
      WITH ${withSamples(f)}
      SELECT count(*)::int AS n FROM r JOIN s ON s.source = r.source AND s.id = r.sample_id
      WHERE r.symbol = ${chosen.element} AND r.unit = ${chosen.unit} AND r.qualifier LIKE '<%'`);

    return { ...chosen, groupBy: opts.groupBy, groups, trend: trend.reverse(), top, belowDetection: num(below?.["n"]) ?? 0 };
  },

  // Qué labores se muestrearon, cuáles están sin resultados o sin coordenadas, y cuáles nunca se muestrearon.
  async coverage(f: AnalyticsFilters) {
    const labors = await query(Prisma.sql`
      WITH ${withSamples(f)}, rs AS (SELECT DISTINCT r.source, r.sample_id FROM r WHERE ${VALID})
      SELECT s.source, s.category, s.area, s.level, s.labor, count(*)::int AS samples,
             count(*) FILTER (WHERE s.east IS NOT NULL AND s.north IS NOT NULL)::int AS with_coords,
             count(rs.sample_id)::int AS with_results,
             count(*) FILTER (WHERE s.status = 'REGISTERED')::int AS registered,
             max(s.at) AS last_at, (extract(epoch FROM now() - max(s.at)) / 86400)::float8 AS days_since
      FROM s LEFT JOIN rs ON rs.source = s.source AND rs.sample_id = s.id
      GROUP BY 1, 2, 3, 4, 5 ORDER BY samples DESC`);

    const emptyLabors =
      f.from || f.to
        ? []
        : await query(Prisma.sql`
      SELECT * FROM (
        SELECT 'INTERIOR'::text AS source, ar.category::text AS category, ar.name AS area, lv.name AS level, lb.name AS labor
        FROM "InteriorLabor" lb JOIN "InteriorLevel" lv ON lv.id = lb."interiorLevelId" JOIN "InteriorArea" ar ON ar.id = lv."interiorAreaId"
        WHERE NOT EXISTS (SELECT 1 FROM "InteriorSample" x WHERE x."interiorLaborId" = lb.id)
        UNION ALL
        SELECT 'SURFACE', ar.category::text, ar.name, lv.name, lb.name
        FROM "SurfaceLabor" lb JOIN "SurfaceLevel" lv ON lv.id = lb."surfaceLevelId" JOIN "SurfaceArea" ar ON ar.id = lv."surfaceAreaId"
        WHERE NOT EXISTS (SELECT 1 FROM "SurfaceSample" x WHERE x."surfaceLaborId" = lb.id)
      ) e
      WHERE (${f.category ?? null}::text IS NULL OR e.category = ${f.category ?? null})
        AND (${f.source ?? null}::text IS NULL OR e.source = ${f.source ?? null})
      ORDER BY e.area, e.level, e.labor`);

    return { labors, emptyLabors };
  },

  // Cuánto tarda cada laboratorio en entregar y qué envíos van más lentos de lo normal.
  async laboratories(f: AnalyticsFilters) {
    const items = Prisma.sql`
      items AS (
        SELECT 'INTERIOR'::text AS source, d.folio, d.id AS dispatch_id, d."interiorLaboratoryId" AS lab_id, l.name AS lab, d."sentAt" AS sent_at,
               i."interiorSampleId" AS sample_id, i.status::text AS item_status, i."updatedAt" AS item_updated
        FROM "InteriorDispatchItem" i JOIN "InteriorSampleDispatch" d ON d.id = i."dispatchId" JOIN "InteriorLaboratory" l ON l.id = d."interiorLaboratoryId"
        UNION ALL
        SELECT 'SURFACE', d.folio, d.id, d."surfaceLaboratoryId", l.name, d."sentAt", i."surfaceSampleId", i.status::text, i."updatedAt"
        FROM "SurfaceDispatchItem" i JOIN "SurfaceSampleDispatch" d ON d.id = i."dispatchId" JOIN "SurfaceLaboratory" l ON l.id = d."surfaceLaboratoryId"
      ),
      done AS (
        SELECT it.*, COALESCE(
          (SELECT min(r.result_at) FROM r WHERE r.source = it.source AND r.sample_id = it.sample_id AND r.lab_id = it.lab_id
             AND r.value IS NOT NULL AND r.result_at >= it.sent_at),
          CASE WHEN it.item_status = 'COMPLETED' THEN it.item_updated END) AS done_at
        FROM items it JOIN s ON s.source = it.source AND s.id = it.sample_id
      )`;

    const labs = await query(Prisma.sql`
      WITH ${withSamples(f)}, ${items}
      SELECT upper(lab) AS lab_key, min(lab) AS lab, count(*)::int AS items, count(done_at)::int AS completed, count(*) FILTER (WHERE done_at IS NULL)::int AS pending,
             avg(extract(epoch FROM done_at - sent_at) / 86400) FILTER (WHERE done_at >= sent_at)::float8 AS avg_days,
             percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM done_at - sent_at) / 86400) FILTER (WHERE done_at >= sent_at)::float8 AS median_days,
             percentile_cont(0.9) WITHIN GROUP (ORDER BY extract(epoch FROM done_at - sent_at) / 86400) FILTER (WHERE done_at >= sent_at)::float8 AS p90_days,
             count(*) FILTER (WHERE done_at >= sent_at)::int AS timed
      FROM done GROUP BY 1 ORDER BY items DESC`);

    const pending = await query(Prisma.sql`
      WITH ${withSamples(f)}, ${items}
      SELECT source, folio, upper(lab) AS lab_key, lab, min(sent_at) AS sent_at, count(*)::int AS items,
             count(*) FILTER (WHERE done_at IS NULL)::int AS pending,
             (extract(epoch FROM now() - min(sent_at)) / 86400)::float8 AS days_waiting
      FROM done GROUP BY source, folio, dispatch_id, lab
      HAVING count(*) FILTER (WHERE done_at IS NULL) > 0
      ORDER BY min(sent_at)`);

    const DEFAULT_NORMAL_DAYS = 15;
    const stats = new Map(labs.map((l) => [String(l["lab_key"]), l]));
    const normalFor = (labKey: string) => {
      const l = stats.get(labKey);
      const median = num(l?.["median_days"]);
      return median != null && (num(l?.["timed"]) ?? 0) >= 3 ? Math.max(median * 1.5, 3) : DEFAULT_NORMAL_DAYS;
    };

    return {
      laboratories: labs.map((l) => ({ ...l, normal_days: normalFor(String(l["lab_key"])) })),
      pending: pending.map((p) => {
        const normal = normalFor(String(p["lab_key"]));
        const waiting = num(p["days_waiting"]) ?? 0;
        return { ...p, normal_days: normal, overdue: waiting > normal };
      }),
      defaultNormalDays: DEFAULT_NORMAL_DAYS,
    };
  },

  // Compara la misma muestra analizada por dos laboratorios (o dos veces en el mismo): detecta sesgo y mala repetibilidad.
  async quality(f: AnalyticsFilters, opts: { element?: string | undefined; unit?: string | undefined }) {
    const chosen = await resolveElement(f, opts.element, opts.unit);
    if (!chosen) return { element: null, unit: null, tolerance: TOLERANCE_PCT, pairs: [], worst: [] };

    const pairValues = Prisma.sql`
      v AS (SELECT r.source, r.sample_id, r.assignment_id, r.lab, avg(r.value)::float8 AS value FROM r JOIN s ON s.source = r.source AND s.id = r.sample_id
            WHERE r.symbol = ${chosen.element} AND r.unit = ${chosen.unit} AND ${VALID} GROUP BY r.source, r.sample_id, r.assignment_id, r.lab),
      p AS (SELECT a.source, a.sample_id, a.lab AS lab_a, b.lab AS lab_b, a.value AS va, b.value AS vb,
                   (a.value - b.value) / ((a.value + b.value) / 2) * 100 AS diff_pct
            FROM v a JOIN v b ON a.source = b.source AND a.sample_id = b.sample_id
              AND (a.lab < b.lab OR (a.lab = b.lab AND a.assignment_id < b.assignment_id))
            WHERE a.value > 0 AND b.value > 0)`;

    const pairs = await query(Prisma.sql`
      WITH ${withSamples(f)}, ${pairValues}
      SELECT lab_a, lab_b, count(*)::int AS n, avg(diff_pct)::float8 AS bias_pct, avg(abs(diff_pct))::float8 AS mean_abs_pct,
             count(*) FILTER (WHERE abs(diff_pct) <= ${TOLERANCE_PCT})::int AS within, corr(va, vb)::float8 AS corr
      FROM p GROUP BY 1, 2 ORDER BY n DESC`);

    const worst = await query(Prisma.sql`
      WITH ${withSamples(f)}, ${pairValues}
      SELECT s.code, p.lab_a, p.lab_b, p.va, p.vb, p.diff_pct::float8 AS diff_pct
      FROM p JOIN s ON s.source = p.source AND s.id = p.sample_id
      ORDER BY abs(p.diff_pct) DESC LIMIT 10`);

    return { ...chosen, tolerance: TOLERANCE_PCT, pairs, worst };
  },

  // Mapa de leyes estimadas (IDW) de un nivel y puntos sugeridos para la próxima muestra.
  async estimation(f: AnalyticsFilters, opts: { element?: string | undefined; unit?: string | undefined; levelId?: string | undefined }) {
    const chosen = await resolveElement(f, opts.element, opts.unit);
    if (!chosen) return { element: null, unit: null, levels: [], selectedLevelId: null, result: null };

    const levels = await query(Prisma.sql`
      WITH ${withSamples(f)}, ${sampleValues(chosen.element, chosen.unit)}
      SELECT g.level_id AS id, g.level AS label, g.area AS parent, count(*)::int AS samples,
             count(*) FILTER (WHERE g.east IS NOT NULL AND g.north IS NOT NULL)::int AS points
      FROM g GROUP BY 1, 2, 3 ORDER BY points DESC, label`);

    const selectedLevelId = opts.levelId ?? (levels[0] ? String(levels[0]["id"]) : null);
    if (!selectedLevelId) return { ...chosen, levels, selectedLevelId, result: null };

    const rows = await query(Prisma.sql`
      WITH ${withSamples(f)}, ${sampleValues(chosen.element, chosen.unit)}
      SELECT g.id, g.code, g.east::float8 AS east, g.north::float8 AS north, g.value
      FROM g WHERE g.level_id = ${selectedLevelId} AND g.east IS NOT NULL AND g.north IS NOT NULL`);

    const points = rows.map((r) => ({ id: String(r["id"]), code: String(r["code"]), east: Number(r["east"]), north: Number(r["north"]), value: Number(r["value"]) }));
    const result = idw(points);
    return { ...chosen, levels, selectedLevelId, points, result };
  },
};

// Dos análisis de la misma muestra deberían coincidir dentro de este margen; más allá se considera sospechoso.
export const TOLERANCE_PCT = 20;
