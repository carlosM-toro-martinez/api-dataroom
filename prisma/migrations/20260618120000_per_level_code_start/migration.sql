-- Add codeStart to InteriorLevel (default 1)
ALTER TABLE "InteriorLevel" ADD COLUMN "codeStart" INTEGER NOT NULL DEFAULT 1;

-- Add interiorLevelId to InteriorSample (nullable first to populate existing rows)
ALTER TABLE "InteriorSample" ADD COLUMN "interiorLevelId" TEXT;

-- Populate from existing labor data
UPDATE "InteriorSample" s
SET "interiorLevelId" = l."interiorLevelId"
FROM "InteriorLabor" l
WHERE l.id = s."interiorLaborId";

-- Set NOT NULL after populating
ALTER TABLE "InteriorSample" ALTER COLUMN "interiorLevelId" SET NOT NULL;

-- Drop old unique constraint (per labor)
ALTER TABLE "InteriorSample" DROP CONSTRAINT IF EXISTS "InteriorSample_interiorLaborId_sequentialNumber_key";

-- Add new unique constraint (per level)
ALTER TABLE "InteriorSample" ADD CONSTRAINT "InteriorSample_interiorLevelId_sequentialNumber_key" UNIQUE ("interiorLevelId", "sequentialNumber");

-- Add index
CREATE INDEX "InteriorSample_interiorLevelId_idx" ON "InteriorSample"("interiorLevelId");

-- Add foreign key
ALTER TABLE "InteriorSample" ADD CONSTRAINT "InteriorSample_interiorLevelId_fkey" FOREIGN KEY ("interiorLevelId") REFERENCES "InteriorLevel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
