-- CreateEnum
CREATE TYPE "SamplePriority" AS ENUM ('URGENT', 'HIGH', 'NORMAL', 'LOW');

-- AlterTable
ALTER TABLE "InteriorSample" ADD COLUMN     "priority" "SamplePriority" NOT NULL DEFAULT 'NORMAL',
ADD COLUMN     "voucherNumber" INTEGER;

-- AlterTable
ALTER TABLE "SurfaceSample" ADD COLUMN     "priority" "SamplePriority" NOT NULL DEFAULT 'NORMAL',
ADD COLUMN     "voucherNumber" INTEGER;

-- CreateIndex
CREATE INDEX "InteriorSample_priority_idx" ON "InteriorSample"("priority");

-- CreateIndex
CREATE INDEX "InteriorSample_voucherNumber_idx" ON "InteriorSample"("voucherNumber");

-- CreateIndex
CREATE INDEX "SurfaceSample_priority_idx" ON "SurfaceSample"("priority");

-- CreateIndex
CREATE INDEX "SurfaceSample_voucherNumber_idx" ON "SurfaceSample"("voucherNumber");
