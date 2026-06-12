-- CreateEnum
CREATE TYPE "ExploRole" AS ENUM ('ADMIN', 'GEOLOGOADMIN', 'GEOLOGO', 'VISITANTE');

-- CreateEnum
CREATE TYPE "DrillHoleType" AS ENUM ('DDH', 'RC', 'AC', 'OTHER');

-- CreateEnum
CREATE TYPE "AssayMethod" AS ENUM ('AAS', 'ICP', 'XRF', 'OTHER');

-- CreateEnum
CREATE TYPE "QAQCType" AS ENUM ('BLANK', 'DUPLICATE', 'STANDARD');

-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('OPEN_PIT', 'UNDERGROUND');

-- CreateEnum
CREATE TYPE "ResourceCategory" AS ENUM ('MEASURED', 'INDICATED', 'INFERRED');

-- CreateEnum
CREATE TYPE "SampleType" AS ENUM ('SIMPLE', 'DOUBLE', 'SIMPLE_DOUBLE', 'OTHER');

-- CreateEnum
CREATE TYPE "LaboratorySlot" AS ENUM ('L1', 'L2', 'L3');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "ExploRole" NOT NULL DEFAULT 'GEOLOGO',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resetToken" TEXT,
    "resetTokenExpiry" TIMESTAMP(3),
    "refreshToken" TEXT,
    "refreshTokenExpiry" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Zone" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "projectId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "Zone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrillHole" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "projectId" INTEGER NOT NULL,
    "zoneId" INTEGER NOT NULL,
    "east" DECIMAL(12,4) NOT NULL,
    "north" DECIMAL(12,4) NOT NULL,
    "elevation" DECIMAL(12,4),
    "depth" DECIMAL(12,4) NOT NULL,
    "azimuth" DECIMAL(9,4),
    "dip" DECIMAL(9,4),
    "type" "DrillHoleType" NOT NULL,
    "campaign" TEXT,
    "year" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "DrillHole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrillHoleSurvey" (
    "id" SERIAL NOT NULL,
    "drillHoleId" INTEGER,
    "depth" DECIMAL(12,4) NOT NULL,
    "azimuth" DECIMAL(9,4) NOT NULL,
    "dip" DECIMAL(9,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "DrillHoleSurvey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interval" (
    "id" SERIAL NOT NULL,
    "drillHoleId" INTEGER NOT NULL,
    "fromDepth" DECIMAL(12,4) NOT NULL,
    "toDepth" DECIMAL(12,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "Interval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assay" (
    "id" SERIAL NOT NULL,
    "intervalId" INTEGER NOT NULL,
    "au" DECIMAL(12,4) NOT NULL,
    "cu" DECIMAL(12,4) NOT NULL,
    "ag" DECIMAL(12,4) NOT NULL,
    "assayMethod" "AssayMethod" NOT NULL,
    "laboratory" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "Assay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssayValue" (
    "id" SERIAL NOT NULL,
    "assayId" INTEGER,
    "element" TEXT NOT NULL,
    "value" DECIMAL(18,6) NOT NULL,
    "unit" TEXT,
    "detectionLimit" DECIMAL(18,6),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "AssayValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QAQC" (
    "id" SERIAL NOT NULL,
    "assayId" INTEGER NOT NULL,
    "type" "QAQCType" NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "QAQC_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lithology" (
    "id" SERIAL NOT NULL,
    "intervalId" INTEGER NOT NULL,
    "rockType" TEXT,
    "code" TEXT,
    "color" TEXT,
    "grainSize" TEXT,
    "texture" TEXT,
    "weathering" TEXT,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "Lithology_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alteration" (
    "id" SERIAL NOT NULL,
    "intervalId" INTEGER,
    "type" TEXT NOT NULL,
    "intensity" DECIMAL(5,2),
    "description" TEXT,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "Alteration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mineralization" (
    "id" SERIAL NOT NULL,
    "intervalId" INTEGER,
    "mineral" TEXT NOT NULL,
    "percentage" DECIMAL(5,2),
    "style" TEXT,
    "habit" TEXT,
    "description" TEXT,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "Mineralization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeologicalStructure" (
    "id" SERIAL NOT NULL,
    "intervalId" INTEGER,
    "structureType" TEXT NOT NULL,
    "angle" DECIMAL(9,4),
    "width" DECIMAL(12,4),
    "orientation" TEXT,
    "description" TEXT,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "GeologicalStructure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recovery" (
    "id" SERIAL NOT NULL,
    "intervalId" INTEGER,
    "recoveryPercent" DECIMAL(5,2),
    "rqdPercent" DECIMAL(5,2),
    "coreLoss" DECIMAL(12,4),
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "Recovery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Density" (
    "id" SERIAL NOT NULL,
    "intervalId" INTEGER,
    "specificGravity" DECIMAL(8,4) NOT NULL,
    "method" TEXT,
    "dryDensity" DECIMAL(8,4),
    "wetDensity" DECIMAL(8,4),
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "Density_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MagneticSusceptibility" (
    "id" SERIAL NOT NULL,
    "intervalId" INTEGER,
    "value" DECIMAL(18,6) NOT NULL,
    "unit" TEXT,
    "instrument" TEXT,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "MagneticSusceptibility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resource" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "type" "ResourceType" NOT NULL,
    "category" "ResourceCategory" NOT NULL,
    "cutoff" DECIMAL(12,4) NOT NULL,
    "tonnes" DECIMAL(18,2) NOT NULL,
    "au" DECIMAL(12,4) NOT NULL,
    "cu" DECIMAL(12,4) NOT NULL,
    "ag" DECIMAL(12,4) NOT NULL,
    "cuEq" DECIMAL(12,4) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignificantIntercept" (
    "id" SERIAL NOT NULL,
    "drillHoleId" INTEGER NOT NULL,
    "isIncluding" BOOLEAN NOT NULL DEFAULT false,
    "fromDepth" DECIMAL(12,4) NOT NULL,
    "toDepth" DECIMAL(12,4) NOT NULL,
    "width" DECIMAL(12,4) NOT NULL,
    "trueWidth" DECIMAL(12,4),
    "au" DECIMAL(12,4),
    "cu" DECIMAL(12,4),
    "ag" DECIMAL(12,4),
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "SignificantIntercept_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MiningArea" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "MiningArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MiningLevel" (
    "id" TEXT NOT NULL,
    "miningAreaId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT,
    "elevation" DOUBLE PRECISION,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "MiningLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MiningLabor" (
    "id" TEXT NOT NULL,
    "miningLevelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT,
    "code" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "MiningLabor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sample" (
    "id" TEXT NOT NULL,
    "miningLaborId" TEXT NOT NULL,
    "number" INTEGER,
    "sampledAt" TIMESTAMP(3),
    "name" TEXT,
    "sampleType" "SampleType",
    "code" TEXT NOT NULL,
    "placeReference" TEXT,
    "east" DOUBLE PRECISION,
    "north" DOUBLE PRECISION,
    "elevation" DOUBLE PRECISION,
    "description" TEXT,
    "observations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "Sample_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Laboratory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "Laboratory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SampleLaboratory" (
    "id" TEXT NOT NULL,
    "sampleId" TEXT NOT NULL,
    "laboratoryId" TEXT NOT NULL,
    "slot" "LaboratorySlot" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "SampleLaboratory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Element" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "defaultUnit" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "Element_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SampleResult" (
    "id" TEXT NOT NULL,
    "sampleId" TEXT NOT NULL,
    "sampleLaboratoryId" TEXT,
    "elementId" TEXT NOT NULL,
    "value" DOUBLE PRECISION,
    "qualifier" TEXT,
    "unit" TEXT,
    "sourceColumn" TEXT,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "SampleResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SampleQAQC" (
    "id" TEXT NOT NULL,
    "sampleId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "passed" BOOLEAN,
    "expectedValue" DOUBLE PRECISION,
    "obtainedValue" DOUBLE PRECISION,
    "deviationPercent" DOUBLE PRECISION,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "SampleQAQC_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Zone_projectId_idx" ON "Zone"("projectId");

-- CreateIndex
CREATE INDEX "DrillHole_east_north_idx" ON "DrillHole"("east", "north");

-- CreateIndex
CREATE INDEX "DrillHole_projectId_idx" ON "DrillHole"("projectId");

-- CreateIndex
CREATE INDEX "DrillHole_zoneId_idx" ON "DrillHole"("zoneId");

-- CreateIndex
CREATE INDEX "DrillHoleSurvey_drillHoleId_idx" ON "DrillHoleSurvey"("drillHoleId");

-- CreateIndex
CREATE INDEX "Interval_drillHoleId_idx" ON "Interval"("drillHoleId");

-- CreateIndex
CREATE INDEX "Assay_intervalId_idx" ON "Assay"("intervalId");

-- CreateIndex
CREATE INDEX "AssayValue_assayId_idx" ON "AssayValue"("assayId");

-- CreateIndex
CREATE INDEX "AssayValue_element_idx" ON "AssayValue"("element");

-- CreateIndex
CREATE INDEX "QAQC_assayId_idx" ON "QAQC"("assayId");

-- CreateIndex
CREATE INDEX "Lithology_intervalId_idx" ON "Lithology"("intervalId");

-- CreateIndex
CREATE INDEX "Alteration_intervalId_idx" ON "Alteration"("intervalId");

-- CreateIndex
CREATE INDEX "Mineralization_intervalId_idx" ON "Mineralization"("intervalId");

-- CreateIndex
CREATE INDEX "GeologicalStructure_intervalId_idx" ON "GeologicalStructure"("intervalId");

-- CreateIndex
CREATE INDEX "Recovery_intervalId_idx" ON "Recovery"("intervalId");

-- CreateIndex
CREATE INDEX "Density_intervalId_idx" ON "Density"("intervalId");

-- CreateIndex
CREATE INDEX "MagneticSusceptibility_intervalId_idx" ON "MagneticSusceptibility"("intervalId");

-- CreateIndex
CREATE INDEX "Resource_projectId_idx" ON "Resource"("projectId");

-- CreateIndex
CREATE INDEX "SignificantIntercept_drillHoleId_idx" ON "SignificantIntercept"("drillHoleId");

-- CreateIndex
CREATE INDEX "MiningLevel_miningAreaId_idx" ON "MiningLevel"("miningAreaId");

-- CreateIndex
CREATE INDEX "MiningLabor_miningLevelId_idx" ON "MiningLabor"("miningLevelId");

-- CreateIndex
CREATE UNIQUE INDEX "Sample_code_key" ON "Sample"("code");

-- CreateIndex
CREATE INDEX "Sample_miningLaborId_idx" ON "Sample"("miningLaborId");

-- CreateIndex
CREATE INDEX "Sample_code_idx" ON "Sample"("code");

-- CreateIndex
CREATE INDEX "Sample_east_north_idx" ON "Sample"("east", "north");

-- CreateIndex
CREATE UNIQUE INDEX "Laboratory_name_key" ON "Laboratory"("name");

-- CreateIndex
CREATE INDEX "SampleLaboratory_sampleId_idx" ON "SampleLaboratory"("sampleId");

-- CreateIndex
CREATE INDEX "SampleLaboratory_laboratoryId_idx" ON "SampleLaboratory"("laboratoryId");

-- CreateIndex
CREATE UNIQUE INDEX "SampleLaboratory_sampleId_slot_key" ON "SampleLaboratory"("sampleId", "slot");

-- CreateIndex
CREATE INDEX "Element_symbol_idx" ON "Element"("symbol");

-- CreateIndex
CREATE UNIQUE INDEX "Element_symbol_defaultUnit_key" ON "Element"("symbol", "defaultUnit");

-- CreateIndex
CREATE INDEX "SampleResult_sampleId_idx" ON "SampleResult"("sampleId");

-- CreateIndex
CREATE INDEX "SampleResult_sampleLaboratoryId_idx" ON "SampleResult"("sampleLaboratoryId");

-- CreateIndex
CREATE INDEX "SampleResult_elementId_idx" ON "SampleResult"("elementId");

-- CreateIndex
CREATE UNIQUE INDEX "SampleResult_sampleId_sampleLaboratoryId_elementId_unit_sou_key" ON "SampleResult"("sampleId", "sampleLaboratoryId", "elementId", "unit", "sourceColumn");

-- CreateIndex
CREATE INDEX "SampleQAQC_sampleId_idx" ON "SampleQAQC"("sampleId");

-- AddForeignKey
ALTER TABLE "Zone" ADD CONSTRAINT "Zone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrillHole" ADD CONSTRAINT "DrillHole_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrillHole" ADD CONSTRAINT "DrillHole_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrillHoleSurvey" ADD CONSTRAINT "DrillHoleSurvey_drillHoleId_fkey" FOREIGN KEY ("drillHoleId") REFERENCES "DrillHole"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interval" ADD CONSTRAINT "Interval_drillHoleId_fkey" FOREIGN KEY ("drillHoleId") REFERENCES "DrillHole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assay" ADD CONSTRAINT "Assay_intervalId_fkey" FOREIGN KEY ("intervalId") REFERENCES "Interval"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssayValue" ADD CONSTRAINT "AssayValue_assayId_fkey" FOREIGN KEY ("assayId") REFERENCES "Assay"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QAQC" ADD CONSTRAINT "QAQC_assayId_fkey" FOREIGN KEY ("assayId") REFERENCES "Assay"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lithology" ADD CONSTRAINT "Lithology_intervalId_fkey" FOREIGN KEY ("intervalId") REFERENCES "Interval"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alteration" ADD CONSTRAINT "Alteration_intervalId_fkey" FOREIGN KEY ("intervalId") REFERENCES "Interval"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mineralization" ADD CONSTRAINT "Mineralization_intervalId_fkey" FOREIGN KEY ("intervalId") REFERENCES "Interval"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeologicalStructure" ADD CONSTRAINT "GeologicalStructure_intervalId_fkey" FOREIGN KEY ("intervalId") REFERENCES "Interval"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recovery" ADD CONSTRAINT "Recovery_intervalId_fkey" FOREIGN KEY ("intervalId") REFERENCES "Interval"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Density" ADD CONSTRAINT "Density_intervalId_fkey" FOREIGN KEY ("intervalId") REFERENCES "Interval"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MagneticSusceptibility" ADD CONSTRAINT "MagneticSusceptibility_intervalId_fkey" FOREIGN KEY ("intervalId") REFERENCES "Interval"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignificantIntercept" ADD CONSTRAINT "SignificantIntercept_drillHoleId_fkey" FOREIGN KEY ("drillHoleId") REFERENCES "DrillHole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MiningLevel" ADD CONSTRAINT "MiningLevel_miningAreaId_fkey" FOREIGN KEY ("miningAreaId") REFERENCES "MiningArea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MiningLabor" ADD CONSTRAINT "MiningLabor_miningLevelId_fkey" FOREIGN KEY ("miningLevelId") REFERENCES "MiningLevel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sample" ADD CONSTRAINT "Sample_miningLaborId_fkey" FOREIGN KEY ("miningLaborId") REFERENCES "MiningLabor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SampleLaboratory" ADD CONSTRAINT "SampleLaboratory_sampleId_fkey" FOREIGN KEY ("sampleId") REFERENCES "Sample"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SampleLaboratory" ADD CONSTRAINT "SampleLaboratory_laboratoryId_fkey" FOREIGN KEY ("laboratoryId") REFERENCES "Laboratory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SampleResult" ADD CONSTRAINT "SampleResult_sampleId_fkey" FOREIGN KEY ("sampleId") REFERENCES "Sample"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SampleResult" ADD CONSTRAINT "SampleResult_sampleLaboratoryId_fkey" FOREIGN KEY ("sampleLaboratoryId") REFERENCES "SampleLaboratory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SampleResult" ADD CONSTRAINT "SampleResult_elementId_fkey" FOREIGN KEY ("elementId") REFERENCES "Element"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SampleQAQC" ADD CONSTRAINT "SampleQAQC_sampleId_fkey" FOREIGN KEY ("sampleId") REFERENCES "Sample"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
