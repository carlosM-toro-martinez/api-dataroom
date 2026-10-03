-- Corrige muestras cuyo nombre (AREA-NIVEL-LABOR-SUFIJO) no coincide con la ubicación guardada.
--
-- Origen: el formulario de Exploraciones mezclaba en la lista de labores las labores de todos los
-- niveles con el mismo nombre (p. ej. "SUPERFICIE (SUP)" de AYDA aparecía al elegir MOSA). El nombre
-- se armaba con el área elegida (MS-...) pero la muestra quedaba colgada de la labor de otra área (AYDA).
--
-- Regla: el nombre refleja lo que eligió el usuario, así que la muestra se reasigna a la labor
-- equivalente (misma abreviatura de nivel y labor) del área indicada por el nombre, en la misma
-- categoría. Si esa labor no existe se crea. Las labores origen que quedan sin muestras se eliminan.
-- Las muestras sin un destino único se reportan y NO se tocan.
--
-- Uso (por defecto es un ensayo: muestra todo y hace ROLLBACK):
--   psql -U admin -d exploracion_db -v ON_ERROR_STOP=1 -f fix-sample-location-mismatch.sql
-- Aplicar de verdad:
--   psql -U admin -d exploracion_db -v ON_ERROR_STOP=1 -v apply=1 -f fix-sample-location-mismatch.sql

\set ON_ERROR_STOP on
BEGIN;

-- Igual que normalizeNameToken() del frontend / api.
CREATE FUNCTION pg_temp.ntok(v text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT regexp_replace(regexp_replace(regexp_replace(regexp_replace(
    upper(trim(coalesce(v, ''))), '[/\s]+', '-', 'g'), '[^A-Z0-9-]', '', 'g'), '-+', '-', 'g'), '^-|-$', '', 'g')
$$;

-- ─── SUPERFICIE ─────────────────────────────────────────────────────────────
CREATE TEMP TABLE surface_bad ON COMMIT DROP AS
SELECT s.id AS sample_id, s.code, s.name, a.category, a.id AS area_id, a.abbreviation AS area_abbr,
       l.abbreviation AS level_abbr, lb.id AS labor_id, lb.name AS labor_name,
       lb.abbreviation AS labor_abbr, lb.description AS labor_description
FROM "SurfaceSample" s
JOIN "SurfaceLabor" lb ON lb.id = s."surfaceLaborId"
JOIN "SurfaceLevel" l ON l.id = lb."surfaceLevelId"
JOIN "SurfaceArea" a ON a.id = l."surfaceAreaId"
CROSS JOIN LATERAL (SELECT pg_temp.ntok(a.abbreviation) || '-' || pg_temp.ntok(l.abbreviation) || '-' || pg_temp.ntok(lb.abbreviation) AS prefix) p
WHERE s.name IS NOT NULL AND s.name <> p.prefix AND s.name NOT LIKE p.prefix || '-%';

CREATE TEMP TABLE surface_plan ON COMMIT DROP AS
SELECT b.*, l2.id AS target_level_id, a2.abbreviation AS target_area_abbr,
       count(*) OVER (PARTITION BY b.sample_id) AS candidates
FROM surface_bad b
JOIN "SurfaceArea" a2 ON a2.category = b.category AND a2.id <> b.area_id
JOIN "SurfaceLevel" l2 ON l2."surfaceAreaId" = a2.id AND l2.abbreviation = b.level_abbr
CROSS JOIN LATERAL (SELECT pg_temp.ntok(a2.abbreviation) || '-' || pg_temp.ntok(l2.abbreviation) || '-' || pg_temp.ntok(b.labor_abbr) AS prefix) p
WHERE b.name = p.prefix OR b.name LIKE p.prefix || '-%';

\echo '== SUPERFICIE: muestras a corregir (agrupadas) =='
SELECT category, area_abbr AS area_actual, target_area_abbr AS area_destino, level_abbr, labor_abbr,
       count(*) AS muestras, min(code) AS desde, max(code) AS hasta
FROM surface_plan WHERE candidates = 1 GROUP BY 1, 2, 3, 4, 5 ORDER BY 1, 2, 3, 4, 5;

\echo '== SUPERFICIE: muestras inconsistentes SIN destino unico (no se tocan, revisar a mano) =='
SELECT b.code, b.name, b.area_abbr, b.level_abbr, b.labor_abbr
FROM surface_bad b
WHERE NOT EXISTS (SELECT 1 FROM surface_plan p WHERE p.sample_id = b.sample_id AND p.candidates = 1)
ORDER BY b.code;

\echo '== SUPERFICIE: labores creadas en el area destino =='
INSERT INTO "SurfaceLabor" (id, "surfaceLevelId", name, abbreviation, description, "createdAt", "updatedAt")
SELECT DISTINCT ON (p.target_level_id, p.labor_abbr)
       gen_random_uuid()::text, p.target_level_id, p.labor_name, p.labor_abbr, p.labor_description, now(), now()
FROM surface_plan p
WHERE p.candidates = 1
  AND NOT EXISTS (SELECT 1 FROM "SurfaceLabor" x WHERE x."surfaceLevelId" = p.target_level_id AND x.abbreviation = p.labor_abbr)
ORDER BY p.target_level_id, p.labor_abbr
RETURNING id, "surfaceLevelId", name, abbreviation;

\echo '== SUPERFICIE: muestras reasignadas =='
UPDATE "SurfaceSample" s
SET "surfaceLaborId" = t.id, "surfaceLevelId" = p.target_level_id, "updatedAt" = now()
FROM surface_plan p
JOIN "SurfaceLabor" t ON t."surfaceLevelId" = p.target_level_id AND t.abbreviation = p.labor_abbr
WHERE p.candidates = 1 AND s.id = p.sample_id;

\echo '== SUPERFICIE: labores origen eliminadas (quedaron sin muestras) =='
DELETE FROM "SurfaceLabor" lb
WHERE lb.id IN (SELECT labor_id FROM surface_plan WHERE candidates = 1)
  AND NOT EXISTS (SELECT 1 FROM "SurfaceSample" s WHERE s."surfaceLaborId" = lb.id)
RETURNING lb.id, lb.name, lb.abbreviation;

-- ─── INTERIOR MINA ──────────────────────────────────────────────────────────
CREATE TEMP TABLE interior_bad ON COMMIT DROP AS
SELECT s.id AS sample_id, s.code, s.name, a.category, a.id AS area_id, a.abbreviation AS area_abbr,
       l.abbreviation AS level_abbr, lb.id AS labor_id, lb.name AS labor_name,
       lb.abbreviation AS labor_abbr, lb.description AS labor_description
FROM "InteriorSample" s
JOIN "InteriorLabor" lb ON lb.id = s."interiorLaborId"
JOIN "InteriorLevel" l ON l.id = lb."interiorLevelId"
JOIN "InteriorArea" a ON a.id = l."interiorAreaId"
CROSS JOIN LATERAL (SELECT pg_temp.ntok(a.abbreviation) || '-' || pg_temp.ntok(l.abbreviation) || '-' || pg_temp.ntok(lb.abbreviation) AS prefix) p
WHERE s.name IS NOT NULL AND s.name <> p.prefix AND s.name NOT LIKE p.prefix || '-%';

CREATE TEMP TABLE interior_plan ON COMMIT DROP AS
SELECT b.*, l2.id AS target_level_id, a2.abbreviation AS target_area_abbr,
       count(*) OVER (PARTITION BY b.sample_id) AS candidates
FROM interior_bad b
JOIN "InteriorArea" a2 ON a2.category = b.category AND a2.id <> b.area_id
JOIN "InteriorLevel" l2 ON l2."interiorAreaId" = a2.id AND l2.abbreviation = b.level_abbr
CROSS JOIN LATERAL (SELECT pg_temp.ntok(a2.abbreviation) || '-' || pg_temp.ntok(l2.abbreviation) || '-' || pg_temp.ntok(b.labor_abbr) AS prefix) p
WHERE b.name = p.prefix OR b.name LIKE p.prefix || '-%';

\echo '== INTERIOR: muestras a corregir (agrupadas) =='
SELECT category, area_abbr AS area_actual, target_area_abbr AS area_destino, level_abbr, labor_abbr,
       count(*) AS muestras, min(code) AS desde, max(code) AS hasta
FROM interior_plan WHERE candidates = 1 GROUP BY 1, 2, 3, 4, 5 ORDER BY 1, 2, 3, 4, 5;

\echo '== INTERIOR: muestras inconsistentes SIN destino unico (no se tocan, revisar a mano) =='
SELECT b.code, b.name, b.area_abbr, b.level_abbr, b.labor_abbr
FROM interior_bad b
WHERE NOT EXISTS (SELECT 1 FROM interior_plan p WHERE p.sample_id = b.sample_id AND p.candidates = 1)
ORDER BY b.code;

\echo '== INTERIOR: labores creadas en el area destino =='
INSERT INTO "InteriorLabor" (id, "interiorLevelId", name, abbreviation, description, "createdAt", "updatedAt")
SELECT DISTINCT ON (p.target_level_id, p.labor_abbr)
       gen_random_uuid()::text, p.target_level_id, p.labor_name, p.labor_abbr, p.labor_description, now(), now()
FROM interior_plan p
WHERE p.candidates = 1
  AND NOT EXISTS (SELECT 1 FROM "InteriorLabor" x WHERE x."interiorLevelId" = p.target_level_id AND x.abbreviation = p.labor_abbr)
ORDER BY p.target_level_id, p.labor_abbr
RETURNING id, "interiorLevelId", name, abbreviation;

\echo '== INTERIOR: muestras reasignadas =='
UPDATE "InteriorSample" s
SET "interiorLaborId" = t.id, "interiorLevelId" = p.target_level_id, "updatedAt" = now()
FROM interior_plan p
JOIN "InteriorLabor" t ON t."interiorLevelId" = p.target_level_id AND t.abbreviation = p.labor_abbr
WHERE p.candidates = 1 AND s.id = p.sample_id;

\echo '== INTERIOR: labores origen eliminadas (quedaron sin muestras) =='
DELETE FROM "InteriorLabor" lb
WHERE lb.id IN (SELECT labor_id FROM interior_plan WHERE candidates = 1)
  AND NOT EXISTS (SELECT 1 FROM "InteriorSample" s WHERE s."interiorLaborId" = lb.id)
RETURNING lb.id, lb.name, lb.abbreviation;

-- ─── Verificación ───────────────────────────────────────────────────────────
\echo '== VERIFICACION: inconsistencias restantes (deberian ser solo las "sin destino unico") =='
SELECT 'surface' AS modulo, count(*) FROM "SurfaceSample" s
JOIN "SurfaceLabor" lb ON lb.id = s."surfaceLaborId" JOIN "SurfaceLevel" l ON l.id = lb."surfaceLevelId" JOIN "SurfaceArea" a ON a.id = l."surfaceAreaId"
CROSS JOIN LATERAL (SELECT pg_temp.ntok(a.abbreviation) || '-' || pg_temp.ntok(l.abbreviation) || '-' || pg_temp.ntok(lb.abbreviation) AS prefix) p
WHERE s.name IS NOT NULL AND s.name <> p.prefix AND s.name NOT LIKE p.prefix || '-%'
UNION ALL
SELECT 'interior', count(*) FROM "InteriorSample" s
JOIN "InteriorLabor" lb ON lb.id = s."interiorLaborId" JOIN "InteriorLevel" l ON l.id = lb."interiorLevelId" JOIN "InteriorArea" a ON a.id = l."interiorAreaId"
CROSS JOIN LATERAL (SELECT pg_temp.ntok(a.abbreviation) || '-' || pg_temp.ntok(l.abbreviation) || '-' || pg_temp.ntok(lb.abbreviation) AS prefix) p
WHERE s.name IS NOT NULL AND s.name <> p.prefix AND s.name NOT LIKE p.prefix || '-%';

SELECT 'surface' AS modulo, count(*) AS nivel_de_muestra_distinto_al_de_su_labor
FROM "SurfaceSample" s JOIN "SurfaceLabor" lb ON lb.id = s."surfaceLaborId" WHERE s."surfaceLevelId" <> lb."surfaceLevelId"
UNION ALL
SELECT 'interior', count(*)
FROM "InteriorSample" s JOIN "InteriorLabor" lb ON lb.id = s."interiorLaborId" WHERE s."interiorLevelId" <> lb."interiorLevelId";

\if :{?apply}
  \echo '>>> apply=1: COMMIT'
  COMMIT;
\else
  \echo '>>> Ensayo: ROLLBACK (nada se guardo). Repite con -v apply=1 para aplicar.'
  ROLLBACK;
\endif
