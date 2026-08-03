CREATE TYPE "DataRoomRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

ALTER TABLE "User"
ADD COLUMN "visitorAccessExpiresAt" TIMESTAMP(3),
ADD COLUMN "visitorDeviceIdHash" TEXT,
ADD COLUMN "visitorLastLoginAt" TIMESTAMP(3);

CREATE TABLE "DataRoomAccessRequest" (
  "id" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "company" TEXT,
  "reason" TEXT NOT NULL,
  "status" "DataRoomRequestStatus" NOT NULL DEFAULT 'PENDING',
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  "reviewedById" INTEGER,
  "expiresAt" TIMESTAMP(3),
  "visitorUserId" INTEGER,
  "adminNotes" TEXT,
  "rejectionReason" TEXT,
  CONSTRAINT "DataRoomAccessRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DataRoomAccessRequest_status_idx" ON "DataRoomAccessRequest"("status");
CREATE INDEX "DataRoomAccessRequest_email_idx" ON "DataRoomAccessRequest"("email");
CREATE INDEX "DataRoomAccessRequest_requestedAt_idx" ON "DataRoomAccessRequest"("requestedAt");

ALTER TABLE "DataRoomAccessRequest"
ADD CONSTRAINT "DataRoomAccessRequest_reviewedById_fkey"
FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
