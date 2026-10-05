-- Parte diario con el formato completo "Reporte diario de perforación diamantina" e incidencias. Solo agrega columnas.
-- AlterTable
ALTER TABLE "DrillingShiftReport" ADD COLUMN     "activities" JSONB,
ADD COLUMN     "additives" JSONB,
ADD COLUMN     "casing" TEXT,
ADD COLUMN     "consumables" JSONB,
ADD COLUMN     "coreBoxNumber" TEXT,
ADD COLUMN     "coreRecovery" DOUBLE PRECISION,
ADD COLUMN     "crownNumber" TEXT,
ADD COLUMN     "drillingChief" TEXT,
ADD COLUMN     "drillingMethod" TEXT,
ADD COLUMN     "driver" TEXT,
ADD COLUMN     "firstHelper" TEXT,
ADD COLUMN     "incidents" JSONB,
ADD COLUMN     "rcDiameter" TEXT,
ADD COLUMN     "reamerNumber" TEXT,
ADD COLUMN     "reportNumber" TEXT,
ADD COLUMN     "reviewNotes" TEXT,
ADD COLUMN     "reviewStatus" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedBy" TEXT,
ADD COLUMN     "rigName" TEXT,
ADD COLUMN     "rockType" TEXT,
ADD COLUMN     "secondHelper" TEXT,
ADD COLUMN     "shoeNumber" TEXT,
ADD COLUMN     "supervisor" TEXT,
ADD COLUMN     "timeDetail" JSONB,
ADD COLUMN     "waterReturn" TEXT;

-- CreateIndex
CREATE INDEX "DrillingShiftReport_reviewStatus_idx" ON "DrillingShiftReport"("reviewStatus");

