-- Folio correlativo para las notas de remisión.
-- Una sola secuencia compartida por Interior y Superficie: el folio es único entre ambos módulos
-- y los dos tramos de un lote mixto (interior + superficie) comparten el mismo folio.

CREATE SEQUENCE "dispatch_folio_seq";

ALTER TABLE "InteriorSampleDispatch" ADD COLUMN "folio" INTEGER;
ALTER TABLE "SurfaceSampleDispatch" ADD COLUMN "folio" INTEGER;

-- Lotes existentes: numeración cronológica (por fecha de creación) entre ambos módulos.
WITH all_dispatches AS (
  SELECT id, 'I' AS module, "createdAt" FROM "InteriorSampleDispatch"
  UNION ALL
  SELECT id, 'S' AS module, "createdAt" FROM "SurfaceSampleDispatch"
), numbered AS (
  SELECT id, module, row_number() OVER (ORDER BY "createdAt", module, id) AS folio
  FROM all_dispatches
)
UPDATE "InteriorSampleDispatch" d SET "folio" = n.folio
FROM numbered n WHERE n.module = 'I' AND n.id = d.id;

WITH all_dispatches AS (
  SELECT id, 'I' AS module, "createdAt" FROM "InteriorSampleDispatch"
  UNION ALL
  SELECT id, 'S' AS module, "createdAt" FROM "SurfaceSampleDispatch"
), numbered AS (
  SELECT id, module, row_number() OVER (ORDER BY "createdAt", module, id) AS folio
  FROM all_dispatches
)
UPDATE "SurfaceSampleDispatch" d SET "folio" = n.folio
FROM numbered n WHERE n.module = 'S' AND n.id = d.id;

-- La secuencia continúa después del último folio asignado.
SELECT setval(
  '"dispatch_folio_seq"',
  COALESCE((SELECT max("folio") FROM (
    SELECT "folio" FROM "InteriorSampleDispatch"
    UNION ALL
    SELECT "folio" FROM "SurfaceSampleDispatch"
  ) f), 0) + 1,
  false
);

ALTER TABLE "InteriorSampleDispatch" ALTER COLUMN "folio" SET DEFAULT nextval('"dispatch_folio_seq"'::regclass);
ALTER TABLE "InteriorSampleDispatch" ALTER COLUMN "folio" SET NOT NULL;
ALTER TABLE "SurfaceSampleDispatch" ALTER COLUMN "folio" SET DEFAULT nextval('"dispatch_folio_seq"'::regclass);
ALTER TABLE "SurfaceSampleDispatch" ALTER COLUMN "folio" SET NOT NULL;

CREATE UNIQUE INDEX "InteriorSampleDispatch_folio_key" ON "InteriorSampleDispatch"("folio");
CREATE UNIQUE INDEX "SurfaceSampleDispatch_folio_key" ON "SurfaceSampleDispatch"("folio");
