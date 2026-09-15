-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'methodist';

-- CreateTable
CREATE TABLE "StaffTimesheet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,

    CONSTRAINT "StaffTimesheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffTimeEntry" (
    "id" TEXT NOT NULL,
    "sheetId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "plannedStart" TEXT,
    "plannedEnd" TEXT,
    "breakMinutes" INTEGER NOT NULL DEFAULT 0,
    "plannedMinutes" INTEGER NOT NULL DEFAULT 0,
    "actualMinutes" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'work',
    "note" TEXT NOT NULL DEFAULT '',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "updatedById" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffTimeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "kind" TEXT NOT NULL DEFAULT 'meeting',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'participants',
    "participantIds" TEXT[],
    "authorId" TEXT NOT NULL,
    "reminderMinutes" INTEGER NOT NULL DEFAULT 30,
    "remindedAt" TIMESTAMP(3),
    "cancelled" BOOLEAN NOT NULL DEFAULT false,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MethodicalDocument" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'manual',
    "body" TEXT NOT NULL,
    "audience" TEXT NOT NULL DEFAULT 'teachers',
    "published" BOOLEAN NOT NULL DEFAULT false,
    "attachments" TEXT[],
    "links" TEXT[],
    "authorId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MethodicalDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StaffTimesheet_userId_month_key" ON "StaffTimesheet"("userId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "StaffTimeEntry_sheetId_date_key" ON "StaffTimeEntry"("sheetId", "date");

-- CreateIndex
CREATE INDEX "TeamEvent_startsAt_idx" ON "TeamEvent"("startsAt");

-- CreateIndex
CREATE INDEX "MethodicalDocument_audience_published_idx" ON "MethodicalDocument"("audience", "published");

-- AddForeignKey
ALTER TABLE "StaffTimesheet" ADD CONSTRAINT "StaffTimesheet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffTimeEntry" ADD CONSTRAINT "StaffTimeEntry_sheetId_fkey" FOREIGN KEY ("sheetId") REFERENCES "StaffTimesheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
