ALTER TYPE "Role" ADD VALUE 'director';

CREATE TABLE "StaffClockSession" (
  "id" TEXT NOT NULL,
  "requestKey" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "date" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  "startIp" TEXT NOT NULL,
  "endIp" TEXT,
  "closedById" TEXT,
  "note" TEXT NOT NULL DEFAULT '',
  CONSTRAINT "StaffClockSession_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StaffClockSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "StaffClockSession_one_open_per_user" ON "StaffClockSession"("userId") WHERE "endedAt" IS NULL;
CREATE INDEX "StaffClockSession_userId_date_idx" ON "StaffClockSession"("userId", "date");
CREATE UNIQUE INDEX "StaffClockSession_requestKey_key" ON "StaffClockSession"("requestKey");

ALTER TABLE "Enrollment" ADD COLUMN "parentId" TEXT;
