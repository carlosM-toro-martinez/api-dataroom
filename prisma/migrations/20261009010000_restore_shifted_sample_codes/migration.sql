-- Restaura los códigos EX corridos por el borrado del 02/10/2026 05:34 (antes los códigos se compactaban al borrar).
--   Folios 46/47 (MS-SUP-B5-1..36) y 48 (AY/MS-SUP-B7-1..31) se imprimieron antes del borrado:
--   EX-0063..EX-0129 vuelven a EX-0064..EX-0130, como en el papel.
--   MS-SUP-B6-1 (folio 50) chocaba con MS-SUP-B7-31 en EX-0130 y recibe un código nuevo de la secuencia.
-- Si los datos no están en el estado esperado (ya corregidos u otra base) no cambia nada.

DO $$
BEGIN
  IF (SELECT name FROM "SurfaceSample" WHERE code = 'EX-0063') IS DISTINCT FROM 'MS-SUP-B5-1'
     OR (SELECT name FROM "SurfaceSample" WHERE code = 'EX-0129') IS DISTINCT FROM 'MS-SUP-B7-31'
     OR (SELECT name FROM "SurfaceSample" WHERE code = 'EX-0130') IS DISTINCT FROM 'MS-SUP-B6-1'
     OR EXISTS (SELECT 1 FROM "InteriorSample" WHERE category = 'EXPLORATION' AND "sequentialNumber" BETWEEN 63 AND 130) THEN
    RAISE NOTICE 'Códigos EX no están en el estado esperado; no se aplica la restauración.';
    RETURN;
  END IF;

  UPDATE "SurfaceSample" s
  SET "sequentialNumber" = n.num,
      code = 'EX-' || lpad(n.num::text, 4, '0'),
      "updatedAt" = now()
  FROM (SELECT nextval('"sample_code_exploration_seq"') AS num) n
  WHERE s.code = 'EX-0130' AND s.name = 'MS-SUP-B6-1';

  UPDATE "SurfaceSample"
  SET code = 'TMP-' || id
  WHERE category = 'EXPLORATION' AND "sequentialNumber" BETWEEN 63 AND 129;

  UPDATE "SurfaceSample"
  SET "sequentialNumber" = "sequentialNumber" + 1,
      code = 'EX-' || lpad(("sequentialNumber" + 1)::text, 4, '0'),
      "updatedAt" = now()
  WHERE category = 'EXPLORATION' AND code LIKE 'TMP-%';
END $$;
