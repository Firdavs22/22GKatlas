-- AlterTable: 152-ФЗ consent + soft-delete on User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "consentGivenAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- CreateTable: AuditLog (mutating-action history for compliance + breach forensics)
CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorRole" TEXT,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "body" JSONB,
    "summary" TEXT,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_path_createdAt_idx" ON "AuditLog"("path", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateTable: FileMeta (access control for uploaded files)
CREATE TABLE IF NOT EXISTS "FileMeta" (
    "filename" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "uploaderId" TEXT,
    "childId" TEXT,
    "groupId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FileMeta_pkey" PRIMARY KEY ("filename")
);

CREATE INDEX IF NOT EXISTS "FileMeta_uploaderId_idx" ON "FileMeta"("uploaderId");
CREATE INDEX IF NOT EXISTS "FileMeta_childId_idx" ON "FileMeta"("childId");
CREATE INDEX IF NOT EXISTS "FileMeta_groupId_idx" ON "FileMeta"("groupId");
