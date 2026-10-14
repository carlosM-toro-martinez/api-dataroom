-- CreateEnum
CREATE TYPE "DrillingPhotoKind" AS ENUM ('CORE_BOX', 'DETAIL', 'SECTION', 'OTHER');

-- AlterTable
ALTER TABLE "DrillingLogInterval" ADD COLUMN     "alteration1" TEXT,
ADD COLUMN     "alteration1Int" INTEGER,
ADD COLUMN     "alteration2" TEXT,
ADD COLUMN     "alteration2Int" INTEGER,
ADD COLUMN     "dataSet" TEXT,
ADD COLUMN     "minerals" JSONB,
ADD COLUMN     "structures" JSONB,
ADD COLUMN     "support" TEXT,
ADD COLUMN     "texture" TEXT;

-- CreateTable
CREATE TABLE "DrillingGeologyReport" (
    "id" TEXT NOT NULL,
    "holeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "fromDepth" DOUBLE PRECISION NOT NULL,
    "toDepth" DOUBLE PRECISION NOT NULL,
    "rigName" TEXT,
    "diameter" TEXT,
    "casing" TEXT,
    "geologists" TEXT,
    "geologySummary" TEXT,
    "operationalNotes" TEXT,
    "surveyDepth" DOUBLE PRECISION,
    "surveyDip" DOUBLE PRECISION,
    "surveyAzimuth" DOUBLE PRECISION,
    "surveyMagnetic" DOUBLE PRECISION,
    "holeFinished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "DrillingGeologyReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrillingPhoto" (
    "id" TEXT NOT NULL,
    "holeId" TEXT NOT NULL,
    "reportId" TEXT,
    "kind" "DrillingPhotoKind" NOT NULL DEFAULT 'CORE_BOX',
    "caption" TEXT,
    "boxFrom" INTEGER,
    "boxTo" INTEGER,
    "fromDepth" DOUBLE PRECISION,
    "toDepth" DOUBLE PRECISION,
    "takenAt" TIMESTAMP(3),
    "fileName" TEXT NOT NULL,
    "thumbName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "DrillingPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DrillingGeologyReport_holeId_idx" ON "DrillingGeologyReport"("holeId");

-- CreateIndex
CREATE UNIQUE INDEX "DrillingGeologyReport_holeId_date_key" ON "DrillingGeologyReport"("holeId", "date");

-- CreateIndex
CREATE INDEX "DrillingPhoto_holeId_idx" ON "DrillingPhoto"("holeId");

-- CreateIndex
CREATE INDEX "DrillingPhoto_reportId_idx" ON "DrillingPhoto"("reportId");

-- AddForeignKey
ALTER TABLE "DrillingGeologyReport" ADD CONSTRAINT "DrillingGeologyReport_holeId_fkey" FOREIGN KEY ("holeId") REFERENCES "DrillingHole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrillingPhoto" ADD CONSTRAINT "DrillingPhoto_holeId_fkey" FOREIGN KEY ("holeId") REFERENCES "DrillingHole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrillingPhoto" ADD CONSTRAINT "DrillingPhoto_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "DrillingGeologyReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Rol para el equipo de geología de sondajes (no ve partes de perforación ni gestiona programas).
INSERT INTO "Role" ("key", "name", "description", "isSystem", "permissions", "updatedAt") VALUES
('GEOLOGIA_SONDAJES', 'Geología de sondajes', 'Reporte geológico diario, logueo y fotografías de testigos de los pozos.', false,
 '{"geologiaSondajes":["create","read","update","delete"]}', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

UPDATE "Role" SET "permissions" = jsonb_set("permissions", '{geologiaSondajes}', '["create","read","update","delete"]') WHERE "key" = 'ADMIN';
