-- CreateEnum
CREATE TYPE "SampleStatus" AS ENUM ('REGISTERED', 'DISPATCHED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "DispatchStatus" AS ENUM ('PENDING', 'COMPLETED');

-- DropConstraint (was added via ADD CONSTRAINT)
ALTER TABLE "InteriorSample" DROP CONSTRAINT "InteriorSample_interiorLevelId_sequentialNumber_key";

-- DropIndex
DROP INDEX "InteriorSample_voucherNumber_idx";

-- DropIndex
DROP INDEX "SurfaceSample_surfaceAreaId_sequentialNumber_key";

-- DropIndex
DROP INDEX "SurfaceSample_voucherNumber_idx";

-- AlterTable
ALTER TABLE "InteriorSample" DROP COLUMN "voucherNumber",
ADD COLUMN     "status" "SampleStatus" NOT NULL DEFAULT 'REGISTERED';

-- AlterTable
ALTER TABLE "SurfaceSample" DROP COLUMN "voucherNumber",
ADD COLUMN     "status" "SampleStatus" NOT NULL DEFAULT 'REGISTERED';

-- CreateTable
CREATE TABLE "InteriorSampleDispatch" (
    "id" TEXT NOT NULL,
    "interiorLaboratoryId" TEXT NOT NULL,
    "projectName" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "status" "DispatchStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "InteriorSampleDispatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InteriorDispatchItem" (
    "id" TEXT NOT NULL,
    "dispatchId" TEXT NOT NULL,
    "interiorSampleId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "InteriorDispatchItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InteriorDispatchElement" (
    "id" TEXT NOT NULL,
    "dispatchItemId" TEXT NOT NULL,
    "elementId" TEXT NOT NULL,

    CONSTRAINT "InteriorDispatchElement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurfaceSampleDispatch" (
    "id" TEXT NOT NULL,
    "surfaceLaboratoryId" TEXT NOT NULL,
    "projectName" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "status" "DispatchStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "SurfaceSampleDispatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurfaceDispatchItem" (
    "id" TEXT NOT NULL,
    "dispatchId" TEXT NOT NULL,
    "surfaceSampleId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "SurfaceDispatchItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurfaceDispatchElement" (
    "id" TEXT NOT NULL,
    "dispatchItemId" TEXT NOT NULL,
    "elementId" TEXT NOT NULL,

    CONSTRAINT "SurfaceDispatchElement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InteriorSampleDispatch_interiorLaboratoryId_idx" ON "InteriorSampleDispatch"("interiorLaboratoryId");

-- CreateIndex
CREATE INDEX "InteriorSampleDispatch_status_idx" ON "InteriorSampleDispatch"("status");

-- CreateIndex
CREATE INDEX "InteriorDispatchItem_dispatchId_idx" ON "InteriorDispatchItem"("dispatchId");

-- CreateIndex
CREATE INDEX "InteriorDispatchItem_interiorSampleId_idx" ON "InteriorDispatchItem"("interiorSampleId");

-- CreateIndex
CREATE UNIQUE INDEX "InteriorDispatchItem_dispatchId_interiorSampleId_key" ON "InteriorDispatchItem"("dispatchId", "interiorSampleId");

-- CreateIndex
CREATE INDEX "InteriorDispatchElement_dispatchItemId_idx" ON "InteriorDispatchElement"("dispatchItemId");

-- CreateIndex
CREATE INDEX "InteriorDispatchElement_elementId_idx" ON "InteriorDispatchElement"("elementId");

-- CreateIndex
CREATE UNIQUE INDEX "InteriorDispatchElement_dispatchItemId_elementId_key" ON "InteriorDispatchElement"("dispatchItemId", "elementId");

-- CreateIndex
CREATE INDEX "SurfaceSampleDispatch_surfaceLaboratoryId_idx" ON "SurfaceSampleDispatch"("surfaceLaboratoryId");

-- CreateIndex
CREATE INDEX "SurfaceSampleDispatch_status_idx" ON "SurfaceSampleDispatch"("status");

-- CreateIndex
CREATE INDEX "SurfaceDispatchItem_dispatchId_idx" ON "SurfaceDispatchItem"("dispatchId");

-- CreateIndex
CREATE INDEX "SurfaceDispatchItem_surfaceSampleId_idx" ON "SurfaceDispatchItem"("surfaceSampleId");

-- CreateIndex
CREATE UNIQUE INDEX "SurfaceDispatchItem_dispatchId_surfaceSampleId_key" ON "SurfaceDispatchItem"("dispatchId", "surfaceSampleId");

-- CreateIndex
CREATE INDEX "SurfaceDispatchElement_dispatchItemId_idx" ON "SurfaceDispatchElement"("dispatchItemId");

-- CreateIndex
CREATE INDEX "SurfaceDispatchElement_elementId_idx" ON "SurfaceDispatchElement"("elementId");

-- CreateIndex
CREATE UNIQUE INDEX "SurfaceDispatchElement_dispatchItemId_elementId_key" ON "SurfaceDispatchElement"("dispatchItemId", "elementId");

-- CreateIndex
CREATE INDEX "InteriorSample_status_idx" ON "InteriorSample"("status");

-- CreateIndex
CREATE INDEX "SurfaceSample_status_idx" ON "SurfaceSample"("status");

-- AddForeignKey
ALTER TABLE "InteriorSampleDispatch" ADD CONSTRAINT "InteriorSampleDispatch_interiorLaboratoryId_fkey" FOREIGN KEY ("interiorLaboratoryId") REFERENCES "InteriorLaboratory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InteriorSampleDispatch" ADD CONSTRAINT "InteriorSampleDispatch_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InteriorDispatchItem" ADD CONSTRAINT "InteriorDispatchItem_dispatchId_fkey" FOREIGN KEY ("dispatchId") REFERENCES "InteriorSampleDispatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InteriorDispatchItem" ADD CONSTRAINT "InteriorDispatchItem_interiorSampleId_fkey" FOREIGN KEY ("interiorSampleId") REFERENCES "InteriorSample"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InteriorDispatchElement" ADD CONSTRAINT "InteriorDispatchElement_dispatchItemId_fkey" FOREIGN KEY ("dispatchItemId") REFERENCES "InteriorDispatchItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InteriorDispatchElement" ADD CONSTRAINT "InteriorDispatchElement_elementId_fkey" FOREIGN KEY ("elementId") REFERENCES "Element"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurfaceSampleDispatch" ADD CONSTRAINT "SurfaceSampleDispatch_surfaceLaboratoryId_fkey" FOREIGN KEY ("surfaceLaboratoryId") REFERENCES "SurfaceLaboratory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurfaceSampleDispatch" ADD CONSTRAINT "SurfaceSampleDispatch_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurfaceDispatchItem" ADD CONSTRAINT "SurfaceDispatchItem_dispatchId_fkey" FOREIGN KEY ("dispatchId") REFERENCES "SurfaceSampleDispatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurfaceDispatchItem" ADD CONSTRAINT "SurfaceDispatchItem_surfaceSampleId_fkey" FOREIGN KEY ("surfaceSampleId") REFERENCES "SurfaceSample"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurfaceDispatchElement" ADD CONSTRAINT "SurfaceDispatchElement_dispatchItemId_fkey" FOREIGN KEY ("dispatchItemId") REFERENCES "SurfaceDispatchItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurfaceDispatchElement" ADD CONSTRAINT "SurfaceDispatchElement_elementId_fkey" FOREIGN KEY ("elementId") REFERENCES "Element"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

