-- CreateEnum
CREATE TYPE "SampleCategory" AS ENUM ('EXPLORATION', 'PRODUCTION');

-- AlterTable
ALTER TABLE "InteriorSample" ADD COLUMN     "category" "SampleCategory" NOT NULL DEFAULT 'EXPLORATION';

-- AlterTable
ALTER TABLE "SurfaceSample" ADD COLUMN     "category" "SampleCategory" NOT NULL DEFAULT 'EXPLORATION';

-- CreateIndex
CREATE INDEX "InteriorSample_category_idx" ON "InteriorSample"("category");

-- CreateIndex
CREATE INDEX "SurfaceSample_category_idx" ON "SurfaceSample"("category");
