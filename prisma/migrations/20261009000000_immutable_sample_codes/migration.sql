-- Los códigos de muestra (EX-/M-) van impresos en talones y notas de remisión: nunca se reutilizan.
-- Una secuencia por categoría, compartida por Interior y Superficie, continúa desde el mayor número actual.

CREATE SEQUENCE IF NOT EXISTS "sample_code_exploration_seq";
CREATE SEQUENCE IF NOT EXISTS "sample_code_production_seq";

SELECT setval('"sample_code_exploration_seq"', COALESCE((
  SELECT max("sequentialNumber") FROM (
    SELECT "sequentialNumber" FROM "InteriorSample" WHERE "category" = 'EXPLORATION'
    UNION ALL
    SELECT "sequentialNumber" FROM "SurfaceSample" WHERE "category" = 'EXPLORATION'
  ) s), 0) + 1, false);

SELECT setval('"sample_code_production_seq"', COALESCE((
  SELECT max("sequentialNumber") FROM (
    SELECT "sequentialNumber" FROM "InteriorSample" WHERE "category" = 'PRODUCTION'
    UNION ALL
    SELECT "sequentialNumber" FROM "SurfaceSample" WHERE "category" = 'PRODUCTION'
  ) s), 0) + 1, false);

-- Una muestra que está en un lote no se puede borrar (antes el borrado la quitaba del lote en cascada).
ALTER TABLE "InteriorDispatchItem" DROP CONSTRAINT "InteriorDispatchItem_interiorSampleId_fkey";
ALTER TABLE "InteriorDispatchItem" ADD CONSTRAINT "InteriorDispatchItem_interiorSampleId_fkey"
  FOREIGN KEY ("interiorSampleId") REFERENCES "InteriorSample"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SurfaceDispatchItem" DROP CONSTRAINT "SurfaceDispatchItem_surfaceSampleId_fkey";
ALTER TABLE "SurfaceDispatchItem" ADD CONSTRAINT "SurfaceDispatchItem_surfaceSampleId_fkey"
  FOREIGN KEY ("surfaceSampleId") REFERENCES "SurfaceSample"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
