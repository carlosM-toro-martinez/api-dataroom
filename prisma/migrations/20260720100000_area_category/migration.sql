-- DropIndex
DROP INDEX "InteriorArea_abbreviation_key";

-- DropIndex
DROP INDEX "SurfaceArea_abbreviation_key";

-- AlterTable
ALTER TABLE "InteriorArea" ADD COLUMN     "category" "SampleCategory" NOT NULL DEFAULT 'EXPLORATION';

-- AlterTable
ALTER TABLE "SurfaceArea" ADD COLUMN     "category" "SampleCategory" NOT NULL DEFAULT 'EXPLORATION';

-- CreateIndex
CREATE INDEX "InteriorArea_category_idx" ON "InteriorArea"("category");

-- CreateIndex
CREATE UNIQUE INDEX "InteriorArea_abbreviation_category_key" ON "InteriorArea"("abbreviation", "category");

-- CreateIndex
CREATE INDEX "SurfaceArea_category_idx" ON "SurfaceArea"("category");

-- CreateIndex
CREATE UNIQUE INDEX "SurfaceArea_abbreviation_category_key" ON "SurfaceArea"("abbreviation", "category");
