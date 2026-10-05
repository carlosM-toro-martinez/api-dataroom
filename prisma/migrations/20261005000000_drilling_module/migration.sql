-- Módulo Sondajes (perforaciones en curso). Solo crea objetos nuevos; no modifica tablas existentes.
-- El folio de los lotes usa la misma secuencia que Interior Mina y Superficie (dispatch_folio_seq).

-- CreateEnum
CREATE TYPE "DrillingCampaignStatus" AS ENUM ('PLANNED', 'ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "DrillingHoleStatus" AS ENUM ('PLANNED', 'DRILLING', 'PAUSED', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "DrillingLocationType" AS ENUM ('SURFACE', 'UNDERGROUND');

-- CreateEnum
CREATE TYPE "DrillingShift" AS ENUM ('DAY', 'NIGHT');

-- CreateEnum
CREATE TYPE "DrillingSampleType" AS ENUM ('CORE_WHOLE', 'CORE_HALF', 'CORE_QUARTER', 'CHIPS', 'DUPLICATE', 'STANDARD', 'BLANK');

-- CreateTable
CREATE TABLE "DrillingContractor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "DrillingContractor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrillingRig" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "model" TEXT,
    "contractorId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "DrillingRig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrillingCampaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "category" "SampleCategory" NOT NULL DEFAULT 'EXPLORATION',
    "status" "DrillingCampaignStatus" NOT NULL DEFAULT 'PLANNED',
    "objective" TEXT,
    "plannedMeters" DOUBLE PRECISION,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "DrillingCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrillingHole" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "DrillHoleType" NOT NULL DEFAULT 'DDH',
    "status" "DrillingHoleStatus" NOT NULL DEFAULT 'PLANNED',
    "locationType" "DrillingLocationType" NOT NULL DEFAULT 'SURFACE',
    "sector" TEXT,
    "target" TEXT,
    "rigId" TEXT,
    "contractorId" TEXT,
    "plannedEast" DOUBLE PRECISION,
    "plannedNorth" DOUBLE PRECISION,
    "plannedElevation" DOUBLE PRECISION,
    "plannedAzimuth" DOUBLE PRECISION,
    "plannedDip" DOUBLE PRECISION,
    "plannedDepth" DOUBLE PRECISION,
    "east" DOUBLE PRECISION,
    "north" DOUBLE PRECISION,
    "elevation" DOUBLE PRECISION,
    "azimuth" DOUBLE PRECISION,
    "dip" DOUBLE PRECISION,
    "finalDepth" DOUBLE PRECISION,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "DrillingHole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrillingShiftReport" (
    "id" TEXT NOT NULL,
    "holeId" TEXT NOT NULL,
    "rigId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "shift" "DrillingShift" NOT NULL DEFAULT 'DAY',
    "fromDepth" DOUBLE PRECISION NOT NULL,
    "toDepth" DOUBLE PRECISION NOT NULL,
    "metersDrilled" DOUBLE PRECISION NOT NULL,
    "drillingHours" DOUBLE PRECISION,
    "standbyHours" DOUBLE PRECISION,
    "diameter" TEXT,
    "operator" TEXT,
    "observations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "DrillingShiftReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrillingSurvey" (
    "id" TEXT NOT NULL,
    "holeId" TEXT NOT NULL,
    "depth" DOUBLE PRECISION NOT NULL,
    "azimuth" DOUBLE PRECISION NOT NULL,
    "dip" DOUBLE PRECISION NOT NULL,
    "instrument" TEXT,
    "measuredAt" TIMESTAMP(3),
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "DrillingSurvey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrillingRun" (
    "id" TEXT NOT NULL,
    "holeId" TEXT NOT NULL,
    "fromDepth" DOUBLE PRECISION NOT NULL,
    "toDepth" DOUBLE PRECISION NOT NULL,
    "recoveredLength" DOUBLE PRECISION,
    "recoveryPercent" DOUBLE PRECISION,
    "rqdPercent" DOUBLE PRECISION,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "DrillingRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrillingCoreBox" (
    "id" TEXT NOT NULL,
    "holeId" TEXT NOT NULL,
    "boxNumber" INTEGER NOT NULL,
    "fromDepth" DOUBLE PRECISION NOT NULL,
    "toDepth" DOUBLE PRECISION NOT NULL,
    "storageLocation" TEXT,
    "photoPath" TEXT,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "DrillingCoreBox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrillingLogInterval" (
    "id" TEXT NOT NULL,
    "holeId" TEXT NOT NULL,
    "fromDepth" DOUBLE PRECISION NOT NULL,
    "toDepth" DOUBLE PRECISION NOT NULL,
    "lithology" TEXT,
    "alteration" TEXT,
    "mineralization" TEXT,
    "structure" TEXT,
    "description" TEXT,
    "loggedBy" TEXT,
    "loggedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "DrillingLogInterval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrillingLaboratory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "DrillingLaboratory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrillingSample" (
    "id" TEXT NOT NULL,
    "holeId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "fromDepth" DOUBLE PRECISION NOT NULL,
    "toDepth" DOUBLE PRECISION NOT NULL,
    "type" "DrillingSampleType" NOT NULL DEFAULT 'CORE_HALF',
    "status" "SampleStatus" NOT NULL DEFAULT 'REGISTERED',
    "priority" "SamplePriority" NOT NULL DEFAULT 'NORMAL',
    "weightKg" DOUBLE PRECISION,
    "sampledAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "DrillingSample_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrillingSampleDispatch" (
    "id" TEXT NOT NULL,
    "folio" INTEGER NOT NULL DEFAULT nextval('dispatch_folio_seq'::regclass),
    "laboratoryId" TEXT NOT NULL,
    "projectName" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "status" "DispatchStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "DrillingSampleDispatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrillingDispatchItem" (
    "id" TEXT NOT NULL,
    "dispatchId" TEXT NOT NULL,
    "sampleId" TEXT NOT NULL,
    "status" "DispatchStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "DrillingDispatchItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrillingDispatchElement" (
    "id" TEXT NOT NULL,
    "dispatchItemId" TEXT NOT NULL,
    "elementId" TEXT NOT NULL,

    CONSTRAINT "DrillingDispatchElement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrillingSampleResult" (
    "id" TEXT NOT NULL,
    "sampleId" TEXT NOT NULL,
    "laboratoryId" TEXT,
    "elementId" TEXT NOT NULL,
    "value" DOUBLE PRECISION,
    "unit" TEXT,
    "qualifier" TEXT,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "DrillingSampleResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DrillingContractor_name_key" ON "DrillingContractor"("name");

-- CreateIndex
CREATE UNIQUE INDEX "DrillingRig_code_key" ON "DrillingRig"("code");

-- CreateIndex
CREATE INDEX "DrillingRig_contractorId_idx" ON "DrillingRig"("contractorId");

-- CreateIndex
CREATE UNIQUE INDEX "DrillingCampaign_code_key" ON "DrillingCampaign"("code");

-- CreateIndex
CREATE INDEX "DrillingCampaign_category_idx" ON "DrillingCampaign"("category");

-- CreateIndex
CREATE INDEX "DrillingCampaign_status_idx" ON "DrillingCampaign"("status");

-- CreateIndex
CREATE UNIQUE INDEX "DrillingHole_code_key" ON "DrillingHole"("code");

-- CreateIndex
CREATE INDEX "DrillingHole_campaignId_idx" ON "DrillingHole"("campaignId");

-- CreateIndex
CREATE INDEX "DrillingHole_status_idx" ON "DrillingHole"("status");

-- CreateIndex
CREATE INDEX "DrillingHole_rigId_idx" ON "DrillingHole"("rigId");

-- CreateIndex
CREATE INDEX "DrillingHole_contractorId_idx" ON "DrillingHole"("contractorId");

-- CreateIndex
CREATE INDEX "DrillingShiftReport_holeId_idx" ON "DrillingShiftReport"("holeId");

-- CreateIndex
CREATE INDEX "DrillingShiftReport_rigId_idx" ON "DrillingShiftReport"("rigId");

-- CreateIndex
CREATE INDEX "DrillingShiftReport_date_idx" ON "DrillingShiftReport"("date");

-- CreateIndex
CREATE UNIQUE INDEX "DrillingShiftReport_holeId_date_shift_key" ON "DrillingShiftReport"("holeId", "date", "shift");

-- CreateIndex
CREATE INDEX "DrillingSurvey_holeId_idx" ON "DrillingSurvey"("holeId");

-- CreateIndex
CREATE UNIQUE INDEX "DrillingSurvey_holeId_depth_key" ON "DrillingSurvey"("holeId", "depth");

-- CreateIndex
CREATE INDEX "DrillingRun_holeId_idx" ON "DrillingRun"("holeId");

-- CreateIndex
CREATE INDEX "DrillingCoreBox_holeId_idx" ON "DrillingCoreBox"("holeId");

-- CreateIndex
CREATE UNIQUE INDEX "DrillingCoreBox_holeId_boxNumber_key" ON "DrillingCoreBox"("holeId", "boxNumber");

-- CreateIndex
CREATE INDEX "DrillingLogInterval_holeId_idx" ON "DrillingLogInterval"("holeId");

-- CreateIndex
CREATE UNIQUE INDEX "DrillingLaboratory_name_key" ON "DrillingLaboratory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "DrillingSample_code_key" ON "DrillingSample"("code");

-- CreateIndex
CREATE INDEX "DrillingSample_holeId_idx" ON "DrillingSample"("holeId");

-- CreateIndex
CREATE INDEX "DrillingSample_status_idx" ON "DrillingSample"("status");

-- CreateIndex
CREATE UNIQUE INDEX "DrillingSampleDispatch_folio_key" ON "DrillingSampleDispatch"("folio");

-- CreateIndex
CREATE INDEX "DrillingSampleDispatch_laboratoryId_idx" ON "DrillingSampleDispatch"("laboratoryId");

-- CreateIndex
CREATE INDEX "DrillingSampleDispatch_status_idx" ON "DrillingSampleDispatch"("status");

-- CreateIndex
CREATE INDEX "DrillingDispatchItem_dispatchId_idx" ON "DrillingDispatchItem"("dispatchId");

-- CreateIndex
CREATE INDEX "DrillingDispatchItem_sampleId_idx" ON "DrillingDispatchItem"("sampleId");

-- CreateIndex
CREATE UNIQUE INDEX "DrillingDispatchItem_dispatchId_sampleId_key" ON "DrillingDispatchItem"("dispatchId", "sampleId");

-- CreateIndex
CREATE INDEX "DrillingDispatchElement_elementId_idx" ON "DrillingDispatchElement"("elementId");

-- CreateIndex
CREATE UNIQUE INDEX "DrillingDispatchElement_dispatchItemId_elementId_key" ON "DrillingDispatchElement"("dispatchItemId", "elementId");

-- CreateIndex
CREATE INDEX "DrillingSampleResult_sampleId_idx" ON "DrillingSampleResult"("sampleId");

-- CreateIndex
CREATE INDEX "DrillingSampleResult_elementId_idx" ON "DrillingSampleResult"("elementId");

-- CreateIndex
CREATE UNIQUE INDEX "DrillingSampleResult_sampleId_laboratoryId_elementId_key" ON "DrillingSampleResult"("sampleId", "laboratoryId", "elementId");

-- AddForeignKey
ALTER TABLE "DrillingRig" ADD CONSTRAINT "DrillingRig_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "DrillingContractor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrillingHole" ADD CONSTRAINT "DrillingHole_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "DrillingCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrillingHole" ADD CONSTRAINT "DrillingHole_rigId_fkey" FOREIGN KEY ("rigId") REFERENCES "DrillingRig"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrillingHole" ADD CONSTRAINT "DrillingHole_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "DrillingContractor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrillingShiftReport" ADD CONSTRAINT "DrillingShiftReport_holeId_fkey" FOREIGN KEY ("holeId") REFERENCES "DrillingHole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrillingShiftReport" ADD CONSTRAINT "DrillingShiftReport_rigId_fkey" FOREIGN KEY ("rigId") REFERENCES "DrillingRig"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrillingSurvey" ADD CONSTRAINT "DrillingSurvey_holeId_fkey" FOREIGN KEY ("holeId") REFERENCES "DrillingHole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrillingRun" ADD CONSTRAINT "DrillingRun_holeId_fkey" FOREIGN KEY ("holeId") REFERENCES "DrillingHole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrillingCoreBox" ADD CONSTRAINT "DrillingCoreBox_holeId_fkey" FOREIGN KEY ("holeId") REFERENCES "DrillingHole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrillingLogInterval" ADD CONSTRAINT "DrillingLogInterval_holeId_fkey" FOREIGN KEY ("holeId") REFERENCES "DrillingHole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrillingSample" ADD CONSTRAINT "DrillingSample_holeId_fkey" FOREIGN KEY ("holeId") REFERENCES "DrillingHole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrillingSampleDispatch" ADD CONSTRAINT "DrillingSampleDispatch_laboratoryId_fkey" FOREIGN KEY ("laboratoryId") REFERENCES "DrillingLaboratory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrillingDispatchItem" ADD CONSTRAINT "DrillingDispatchItem_dispatchId_fkey" FOREIGN KEY ("dispatchId") REFERENCES "DrillingSampleDispatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrillingDispatchItem" ADD CONSTRAINT "DrillingDispatchItem_sampleId_fkey" FOREIGN KEY ("sampleId") REFERENCES "DrillingSample"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrillingDispatchElement" ADD CONSTRAINT "DrillingDispatchElement_dispatchItemId_fkey" FOREIGN KEY ("dispatchItemId") REFERENCES "DrillingDispatchItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrillingDispatchElement" ADD CONSTRAINT "DrillingDispatchElement_elementId_fkey" FOREIGN KEY ("elementId") REFERENCES "Element"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrillingSampleResult" ADD CONSTRAINT "DrillingSampleResult_sampleId_fkey" FOREIGN KEY ("sampleId") REFERENCES "DrillingSample"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrillingSampleResult" ADD CONSTRAINT "DrillingSampleResult_laboratoryId_fkey" FOREIGN KEY ("laboratoryId") REFERENCES "DrillingLaboratory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrillingSampleResult" ADD CONSTRAINT "DrillingSampleResult_elementId_fkey" FOREIGN KEY ("elementId") REFERENCES "Element"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

