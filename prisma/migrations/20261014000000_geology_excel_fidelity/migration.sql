-- AlterTable
ALTER TABLE "DrillingGeologyReport" DROP COLUMN "holeFinished",
DROP COLUMN "surveyAzimuth",
DROP COLUMN "surveyDepth",
DROP COLUMN "surveyDip",
DROP COLUMN "surveyMagnetic",
ADD COLUMN     "azimuth" TEXT,
ADD COLUMN     "dip" TEXT,
ADD COLUMN     "endStatus" TEXT,
ADD COLUMN     "executedEast" DOUBLE PRECISION,
ADD COLUMN     "executedElevation" DOUBLE PRECISION,
ADD COLUMN     "executedNorth" DOUBLE PRECISION,
ADD COLUMN     "plannedEast" DOUBLE PRECISION,
ADD COLUMN     "plannedElevation" DOUBLE PRECISION,
ADD COLUMN     "plannedNorth" DOUBLE PRECISION,
ADD COLUMN     "programmedDepth" TEXT,
ADD COLUMN     "startDate" TIMESTAMP(3);


-- Roles de Sondajes:
--   SONDAJES           → solo el parte de perforación (sin cambios).
--   SONDAJES_COMPLETO  → ve y edita Perforación y Geología.
-- El rol que se había creado solo para geología pasa a ser el "completo".
UPDATE "Role" SET
  "key" = 'SONDAJES_COMPLETO',
  "name" = 'Sondajes · Perforación y Geología',
  "description" = 'Ve y edita el parte de perforación y el reporte geológico diario (logueo y fotografías).',
  "permissions" = '{"sondajes":["create","read","update","delete"],"geologiaSondajes":["create","read","update","delete"]}',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "key" = 'GEOLOGIA_SONDAJES';

INSERT INTO "Role" ("key", "name", "description", "isSystem", "permissions", "updatedAt") VALUES
('SONDAJES_COMPLETO', 'Sondajes · Perforación y Geología', 'Ve y edita el parte de perforación y el reporte geológico diario (logueo y fotografías).', false,
 '{"sondajes":["create","read","update","delete"],"geologiaSondajes":["create","read","update","delete"]}', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

UPDATE "Role" SET "name" = 'Sondajes · Solo perforación',
  "description" = 'Solo el parte diario de perforación, programas, pozos y personal. No ve nada de geología.',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "key" = 'SONDAJES';
