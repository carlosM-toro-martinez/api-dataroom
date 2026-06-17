/*
  Warnings:

  - You are about to drop the column `surfaceLaboratoryId` on the `SurfaceSampleResult` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[interiorLabAssignmentId,elementId]` on the table `InteriorSampleResult` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[surfaceLabAssignmentId,elementId]` on the table `SurfaceSampleResult` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `interiorLabAssignmentId` to the `InteriorSampleResult` table without a default value. This is not possible if the table is not empty.
  - Added the required column `surfaceLabAssignmentId` to the `SurfaceSampleResult` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "SurfaceSampleResult" DROP CONSTRAINT "SurfaceSampleResult_surfaceLaboratoryId_fkey";

-- DropIndex
DROP INDEX "InteriorSampleResult_interiorSampleId_elementId_key";

-- DropIndex
DROP INDEX "SurfaceSampleResult_surfaceLaboratoryId_idx";

-- DropIndex
DROP INDEX "SurfaceSampleResult_surfaceSampleId_elementId_key";

-- AlterTable
ALTER TABLE "InteriorSampleResult" ADD COLUMN     "interiorLabAssignmentId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "SurfaceSampleResult" DROP COLUMN "surfaceLaboratoryId",
ADD COLUMN     "surfaceLabAssignmentId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "SurfaceLabAssignment" (
    "id" TEXT NOT NULL,
    "surfaceSampleId" TEXT NOT NULL,
    "surfaceLaboratoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "SurfaceLabAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SurfaceLabAssignment_surfaceSampleId_idx" ON "SurfaceLabAssignment"("surfaceSampleId");

-- CreateIndex
CREATE INDEX "SurfaceLabAssignment_surfaceLaboratoryId_idx" ON "SurfaceLabAssignment"("surfaceLaboratoryId");

-- CreateIndex
CREATE UNIQUE INDEX "SurfaceLabAssignment_surfaceSampleId_surfaceLaboratoryId_key" ON "SurfaceLabAssignment"("surfaceSampleId", "surfaceLaboratoryId");

-- CreateIndex
CREATE INDEX "InteriorSampleResult_interiorLabAssignmentId_idx" ON "InteriorSampleResult"("interiorLabAssignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "InteriorSampleResult_interiorLabAssignmentId_elementId_key" ON "InteriorSampleResult"("interiorLabAssignmentId", "elementId");

-- CreateIndex
CREATE INDEX "SurfaceSampleResult_surfaceLabAssignmentId_idx" ON "SurfaceSampleResult"("surfaceLabAssignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "SurfaceSampleResult_surfaceLabAssignmentId_elementId_key" ON "SurfaceSampleResult"("surfaceLabAssignmentId", "elementId");

-- AddForeignKey
ALTER TABLE "InteriorSample" ADD CONSTRAINT "InteriorSample_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InteriorSampleResult" ADD CONSTRAINT "InteriorSampleResult_interiorLabAssignmentId_fkey" FOREIGN KEY ("interiorLabAssignmentId") REFERENCES "InteriorLabAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurfaceSample" ADD CONSTRAINT "SurfaceSample_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurfaceLabAssignment" ADD CONSTRAINT "SurfaceLabAssignment_surfaceSampleId_fkey" FOREIGN KEY ("surfaceSampleId") REFERENCES "SurfaceSample"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurfaceLabAssignment" ADD CONSTRAINT "SurfaceLabAssignment_surfaceLaboratoryId_fkey" FOREIGN KEY ("surfaceLaboratoryId") REFERENCES "SurfaceLaboratory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurfaceSampleResult" ADD CONSTRAINT "SurfaceSampleResult_surfaceLabAssignmentId_fkey" FOREIGN KEY ("surfaceLabAssignmentId") REFERENCES "SurfaceLabAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
