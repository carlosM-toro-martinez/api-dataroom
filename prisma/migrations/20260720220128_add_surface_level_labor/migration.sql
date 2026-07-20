-- DropForeignKey
ALTER TABLE "SurfaceSample" DROP CONSTRAINT "SurfaceSample_surfaceAreaId_fkey";

-- DropIndex
DROP INDEX "SurfaceSample_surfaceAreaId_idx";

-- AlterTable
ALTER TABLE "SurfaceSample" DROP COLUMN "surfaceAreaId",
ADD COLUMN     "surfaceLaborId" TEXT NOT NULL,
ADD COLUMN     "surfaceLevelId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "SurfaceLevel" (
    "id" TEXT NOT NULL,
    "surfaceAreaId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT NOT NULL,
    "codeStart" INTEGER NOT NULL DEFAULT 1,
    "elevation" DOUBLE PRECISION,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "SurfaceLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurfaceLabor" (
    "id" TEXT NOT NULL,
    "surfaceLevelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "SurfaceLabor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SurfaceLevel_surfaceAreaId_idx" ON "SurfaceLevel"("surfaceAreaId");

-- CreateIndex
CREATE UNIQUE INDEX "SurfaceLevel_surfaceAreaId_abbreviation_key" ON "SurfaceLevel"("surfaceAreaId", "abbreviation");

-- CreateIndex
CREATE INDEX "SurfaceLabor_surfaceLevelId_idx" ON "SurfaceLabor"("surfaceLevelId");

-- CreateIndex
CREATE UNIQUE INDEX "SurfaceLabor_surfaceLevelId_abbreviation_key" ON "SurfaceLabor"("surfaceLevelId", "abbreviation");

-- CreateIndex
CREATE INDEX "SurfaceSample_surfaceLaborId_idx" ON "SurfaceSample"("surfaceLaborId");

-- CreateIndex
CREATE INDEX "SurfaceSample_surfaceLevelId_idx" ON "SurfaceSample"("surfaceLevelId");

-- AddForeignKey
ALTER TABLE "SurfaceLevel" ADD CONSTRAINT "SurfaceLevel_surfaceAreaId_fkey" FOREIGN KEY ("surfaceAreaId") REFERENCES "SurfaceArea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurfaceLabor" ADD CONSTRAINT "SurfaceLabor_surfaceLevelId_fkey" FOREIGN KEY ("surfaceLevelId") REFERENCES "SurfaceLevel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurfaceSample" ADD CONSTRAINT "SurfaceSample_surfaceLaborId_fkey" FOREIGN KEY ("surfaceLaborId") REFERENCES "SurfaceLabor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurfaceSample" ADD CONSTRAINT "SurfaceSample_surfaceLevelId_fkey" FOREIGN KEY ("surfaceLevelId") REFERENCES "SurfaceLevel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

