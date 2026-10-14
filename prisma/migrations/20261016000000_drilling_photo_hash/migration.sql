-- AlterTable
ALTER TABLE "DrillingPhoto" ADD COLUMN     "contentHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "DrillingPhoto_holeId_contentHash_key" ON "DrillingPhoto"("holeId", "contentHash");

