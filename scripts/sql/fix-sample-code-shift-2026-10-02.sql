-- Restaura los códigos EX corridos por el borrado del 02/10/2026 05:34 (antes los códigos se compactaban al borrar).
-- Ese borrado liberó el EX-0063 y todas las muestras posteriores bajaron un número.
--
--   Folios 46/47 (MS-SUP-B5-1..36) y 48 (AY/MS-SUP-B7-1..31) se imprimieron ANTES del borrado:
--   hoy EX-0063..EX-0129  ->  vuelven a EX-0064..EX-0130, como en el papel.
--   Folio 50 (MS-SUP-B6-*) se imprimió DESPUÉS: se queda igual,
--   salvo MS-SUP-B6-1, que chocaba con MS-SUP-B7-31 en EX-0130 y recibe un código nuevo (EX-0168).
--   Hay que avisar al laboratorio que el EX-0130 del folio 50 (MS-SUP-B6-1) ahora es el código nuevo.
--
-- Requiere la migración 20261009000000_immutable_sample_codes (secuencia sample_code_exploration_seq).
-- Uso: docker exec -i postgres_minero psql -U admin -d exploracion_db -v ON_ERROR_STOP=1 < scripts/sql/fix-sample-code-shift-2026-10-02.sql

BEGIN;

DO $$
BEGIN
  IF (SELECT name FROM "SurfaceSample" WHERE code = 'EX-0063') IS DISTINCT FROM 'MS-SUP-B5-1'
     OR (SELECT name FROM "SurfaceSample" WHERE code = 'EX-0129') IS DISTINCT FROM 'MS-SUP-B7-31'
     OR (SELECT name FROM "SurfaceSample" WHERE code = 'EX-0130') IS DISTINCT FROM 'MS-SUP-B6-1' THEN
    RAISE EXCEPTION 'Los datos no están en el estado esperado (¿el script ya se corrió?). No se cambió nada.';
  END IF;
  IF EXISTS (SELECT 1 FROM "InteriorSample" WHERE category = 'EXPLORATION' AND "sequentialNumber" BETWEEN 63 AND 130) THEN
    RAISE EXCEPTION 'Hay muestras de Interior en el rango afectado; revisar antes de continuar. No se cambió nada.';
  END IF;
END $$;

-- 1. MS-SUP-B6-1 deja libre el EX-0130 y toma el siguiente código de la secuencia.
UPDATE "SurfaceSample" s
SET "sequentialNumber" = n.num,
    code = 'EX-' || lpad(n.num::text, 4, '0'),
    "updatedAt" = now()
FROM (SELECT nextval('"sample_code_exploration_seq"') AS num) n
WHERE s.code = 'EX-0130' AND s.name = 'MS-SUP-B6-1';

-- 2. EX-0063..EX-0129 suben un número (paso intermedio para no chocar con el índice único de code).
UPDATE "SurfaceSample"
SET code = 'TMP-' || id
WHERE category = 'EXPLORATION' AND "sequentialNumber" BETWEEN 63 AND 129;

UPDATE "SurfaceSample"
SET "sequentialNumber" = "sequentialNumber" + 1,
    code = 'EX-' || lpad(("sequentialNumber" + 1)::text, 4, '0'),
    "updatedAt" = now()
WHERE category = 'EXPLORATION' AND code LIKE 'TMP-%';

-- Revisión: debe coincidir con los papeles de los folios 47, 48 y 50.
SELECT d.folio, s.code, s.name
FROM "SurfaceSample" s
JOIN "SurfaceDispatchItem" i ON i."surfaceSampleId" = s.id
JOIN "SurfaceSampleDispatch" d ON d.id = i."dispatchId"
WHERE s.category = 'EXPLORATION' AND (s."sequentialNumber" BETWEEN 62 AND 131 OR s.name = 'MS-SUP-B6-1')
  AND d.folio IN (47, 48, 50)
ORDER BY d.folio, s."sequentialNumber";

COMMIT;
