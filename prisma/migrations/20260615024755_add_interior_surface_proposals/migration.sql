-- CreateTable
CREATE TABLE "InteriorArea" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "InteriorArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InteriorLevel" (
    "id" TEXT NOT NULL,
    "interiorAreaId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT NOT NULL,
    "elevation" DOUBLE PRECISION,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "InteriorLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InteriorLabor" (
    "id" TEXT NOT NULL,
    "interiorLevelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "InteriorLabor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InteriorObjective" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "InteriorObjective_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InteriorLaboratory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "InteriorLaboratory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InteriorSample" (
    "id" TEXT NOT NULL,
    "interiorLaborId" TEXT NOT NULL,
    "interiorObjectiveId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "sequentialNumber" INTEGER NOT NULL,
    "east" DOUBLE PRECISION,
    "north" DOUBLE PRECISION,
    "elevation" DOUBLE PRECISION,
    "sampledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "InteriorSample_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InteriorLabAssignment" (
    "id" TEXT NOT NULL,
    "interiorSampleId" TEXT NOT NULL,
    "interiorLaboratoryId" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "InteriorLabAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InteriorSampleResult" (
    "id" TEXT NOT NULL,
    "interiorSampleId" TEXT NOT NULL,
    "elementId" TEXT NOT NULL,
    "value" DOUBLE PRECISION,
    "unit" TEXT,
    "qualifier" TEXT,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "InteriorSampleResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurfaceArea" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "SurfaceArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurfaceObjective" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "SurfaceObjective_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurfaceLaboratory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "SurfaceLaboratory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurfaceSample" (
    "id" TEXT NOT NULL,
    "surfaceAreaId" TEXT NOT NULL,
    "surfaceObjectiveId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "sequentialNumber" INTEGER NOT NULL,
    "east" DOUBLE PRECISION,
    "north" DOUBLE PRECISION,
    "elevation" DOUBLE PRECISION,
    "sampledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "SurfaceSample_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurfaceSampleResult" (
    "id" TEXT NOT NULL,
    "surfaceSampleId" TEXT NOT NULL,
    "elementId" TEXT NOT NULL,
    "surfaceLaboratoryId" TEXT,
    "value" DOUBLE PRECISION,
    "unit" TEXT,
    "qualifier" TEXT,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "SurfaceSampleResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InteriorArea_abbreviation_key" ON "InteriorArea"("abbreviation");

-- CreateIndex
CREATE INDEX "InteriorLevel_interiorAreaId_idx" ON "InteriorLevel"("interiorAreaId");

-- CreateIndex
CREATE UNIQUE INDEX "InteriorLevel_interiorAreaId_abbreviation_key" ON "InteriorLevel"("interiorAreaId", "abbreviation");

-- CreateIndex
CREATE INDEX "InteriorLabor_interiorLevelId_idx" ON "InteriorLabor"("interiorLevelId");

-- CreateIndex
CREATE UNIQUE INDEX "InteriorLabor_interiorLevelId_abbreviation_key" ON "InteriorLabor"("interiorLevelId", "abbreviation");

-- CreateIndex
CREATE UNIQUE INDEX "InteriorObjective_name_key" ON "InteriorObjective"("name");

-- CreateIndex
CREATE UNIQUE INDEX "InteriorLaboratory_name_key" ON "InteriorLaboratory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "InteriorSample_code_key" ON "InteriorSample"("code");

-- CreateIndex
CREATE INDEX "InteriorSample_interiorLaborId_idx" ON "InteriorSample"("interiorLaborId");

-- CreateIndex
CREATE INDEX "InteriorSample_interiorObjectiveId_idx" ON "InteriorSample"("interiorObjectiveId");

-- CreateIndex
CREATE INDEX "InteriorSample_east_north_idx" ON "InteriorSample"("east", "north");

-- CreateIndex
CREATE UNIQUE INDEX "InteriorSample_interiorLaborId_sequentialNumber_key" ON "InteriorSample"("interiorLaborId", "sequentialNumber");

-- CreateIndex
CREATE INDEX "InteriorLabAssignment_interiorSampleId_idx" ON "InteriorLabAssignment"("interiorSampleId");

-- CreateIndex
CREATE INDEX "InteriorLabAssignment_interiorLaboratoryId_idx" ON "InteriorLabAssignment"("interiorLaboratoryId");

-- CreateIndex
CREATE UNIQUE INDEX "InteriorLabAssignment_interiorSampleId_slot_key" ON "InteriorLabAssignment"("interiorSampleId", "slot");

-- CreateIndex
CREATE INDEX "InteriorSampleResult_interiorSampleId_idx" ON "InteriorSampleResult"("interiorSampleId");

-- CreateIndex
CREATE INDEX "InteriorSampleResult_elementId_idx" ON "InteriorSampleResult"("elementId");

-- CreateIndex
CREATE UNIQUE INDEX "InteriorSampleResult_interiorSampleId_elementId_key" ON "InteriorSampleResult"("interiorSampleId", "elementId");

-- CreateIndex
CREATE UNIQUE INDEX "SurfaceArea_abbreviation_key" ON "SurfaceArea"("abbreviation");

-- CreateIndex
CREATE UNIQUE INDEX "SurfaceObjective_name_key" ON "SurfaceObjective"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SurfaceLaboratory_name_key" ON "SurfaceLaboratory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SurfaceSample_code_key" ON "SurfaceSample"("code");

-- CreateIndex
CREATE INDEX "SurfaceSample_surfaceAreaId_idx" ON "SurfaceSample"("surfaceAreaId");

-- CreateIndex
CREATE INDEX "SurfaceSample_surfaceObjectiveId_idx" ON "SurfaceSample"("surfaceObjectiveId");

-- CreateIndex
CREATE INDEX "SurfaceSample_east_north_idx" ON "SurfaceSample"("east", "north");

-- CreateIndex
CREATE UNIQUE INDEX "SurfaceSample_surfaceAreaId_sequentialNumber_key" ON "SurfaceSample"("surfaceAreaId", "sequentialNumber");

-- CreateIndex
CREATE INDEX "SurfaceSampleResult_surfaceSampleId_idx" ON "SurfaceSampleResult"("surfaceSampleId");

-- CreateIndex
CREATE INDEX "SurfaceSampleResult_elementId_idx" ON "SurfaceSampleResult"("elementId");

-- CreateIndex
CREATE INDEX "SurfaceSampleResult_surfaceLaboratoryId_idx" ON "SurfaceSampleResult"("surfaceLaboratoryId");

-- CreateIndex
CREATE UNIQUE INDEX "SurfaceSampleResult_surfaceSampleId_elementId_key" ON "SurfaceSampleResult"("surfaceSampleId", "elementId");

-- AddForeignKey
ALTER TABLE "InteriorLevel" ADD CONSTRAINT "InteriorLevel_interiorAreaId_fkey" FOREIGN KEY ("interiorAreaId") REFERENCES "InteriorArea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InteriorLabor" ADD CONSTRAINT "InteriorLabor_interiorLevelId_fkey" FOREIGN KEY ("interiorLevelId") REFERENCES "InteriorLevel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InteriorSample" ADD CONSTRAINT "InteriorSample_interiorLaborId_fkey" FOREIGN KEY ("interiorLaborId") REFERENCES "InteriorLabor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InteriorSample" ADD CONSTRAINT "InteriorSample_interiorObjectiveId_fkey" FOREIGN KEY ("interiorObjectiveId") REFERENCES "InteriorObjective"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InteriorLabAssignment" ADD CONSTRAINT "InteriorLabAssignment_interiorSampleId_fkey" FOREIGN KEY ("interiorSampleId") REFERENCES "InteriorSample"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InteriorLabAssignment" ADD CONSTRAINT "InteriorLabAssignment_interiorLaboratoryId_fkey" FOREIGN KEY ("interiorLaboratoryId") REFERENCES "InteriorLaboratory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InteriorSampleResult" ADD CONSTRAINT "InteriorSampleResult_interiorSampleId_fkey" FOREIGN KEY ("interiorSampleId") REFERENCES "InteriorSample"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InteriorSampleResult" ADD CONSTRAINT "InteriorSampleResult_elementId_fkey" FOREIGN KEY ("elementId") REFERENCES "Element"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurfaceSample" ADD CONSTRAINT "SurfaceSample_surfaceAreaId_fkey" FOREIGN KEY ("surfaceAreaId") REFERENCES "SurfaceArea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurfaceSample" ADD CONSTRAINT "SurfaceSample_surfaceObjectiveId_fkey" FOREIGN KEY ("surfaceObjectiveId") REFERENCES "SurfaceObjective"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurfaceSampleResult" ADD CONSTRAINT "SurfaceSampleResult_surfaceSampleId_fkey" FOREIGN KEY ("surfaceSampleId") REFERENCES "SurfaceSample"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurfaceSampleResult" ADD CONSTRAINT "SurfaceSampleResult_elementId_fkey" FOREIGN KEY ("elementId") REFERENCES "Element"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurfaceSampleResult" ADD CONSTRAINT "SurfaceSampleResult_surfaceLaboratoryId_fkey" FOREIGN KEY ("surfaceLaboratoryId") REFERENCES "SurfaceLaboratory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
