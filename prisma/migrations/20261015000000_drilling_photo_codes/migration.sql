-- Código único por foto, correlativo por pozo (<pozo>-F0001). Lo asigna el servidor y no se reutiliza.

ALTER TABLE "DrillingPhoto" ADD COLUMN "code" TEXT, ADD COLUMN "sequence" INTEGER;

-- Fotos que ya existan: se numeran por pozo en orden de creación.
WITH numbered AS (
  SELECT p."id", h."code" AS "holeCode", ROW_NUMBER() OVER (PARTITION BY p."holeId" ORDER BY p."createdAt", p."id") AS "seq"
  FROM "DrillingPhoto" p
  JOIN "DrillingHole" h ON h."id" = p."holeId"
)
UPDATE "DrillingPhoto" p
SET "sequence" = n."seq", "code" = n."holeCode" || '-F' || LPAD(n."seq"::text, 4, '0')
FROM numbered n
WHERE n."id" = p."id";

ALTER TABLE "DrillingPhoto" ALTER COLUMN "code" SET NOT NULL, ALTER COLUMN "sequence" SET NOT NULL;

CREATE TABLE "DrillingPhotoCounter" (
    "holeId" TEXT NOT NULL,
    "last" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "DrillingPhotoCounter_pkey" PRIMARY KEY ("holeId")
);

INSERT INTO "DrillingPhotoCounter" ("holeId", "last")
SELECT "holeId", MAX("sequence") FROM "DrillingPhoto" GROUP BY "holeId";

CREATE UNIQUE INDEX "DrillingPhoto_code_key" ON "DrillingPhoto"("code");
CREATE UNIQUE INDEX "DrillingPhoto_holeId_sequence_key" ON "DrillingPhoto"("holeId", "sequence");

ALTER TABLE "DrillingPhotoCounter" ADD CONSTRAINT "DrillingPhotoCounter_holeId_fkey" FOREIGN KEY ("holeId") REFERENCES "DrillingHole"("id") ON DELETE CASCADE ON UPDATE CASCADE;
