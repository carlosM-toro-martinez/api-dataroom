-- Add name column to InteriorSample
ALTER TABLE "InteriorSample" ADD COLUMN IF NOT EXISTS "name" TEXT;

-- Add name column to SurfaceSample
ALTER TABLE "SurfaceSample" ADD COLUMN IF NOT EXISTS "name" TEXT;

-- Drop old unique constraint/index (interiorLaborId, sequentialNumber) if still exists
ALTER TABLE "InteriorSample" DROP CONSTRAINT IF EXISTS "InteriorSample_interiorLaborId_sequentialNumber_key";
DROP INDEX IF EXISTS "InteriorSample_interiorLaborId_sequentialNumber_key";
