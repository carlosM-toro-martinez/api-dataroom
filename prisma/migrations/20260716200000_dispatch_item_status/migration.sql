-- AlterTable
ALTER TABLE "InteriorDispatchItem" ADD COLUMN     "status" "DispatchStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "SurfaceDispatchItem" ADD COLUMN     "status" "DispatchStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "InteriorDispatchItem_status_idx" ON "InteriorDispatchItem"("status");

-- CreateIndex
CREATE INDEX "SurfaceDispatchItem_status_idx" ON "SurfaceDispatchItem"("status");
