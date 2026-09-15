ALTER TABLE "Child"
  ADD COLUMN "forbiddenFoods" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "contactEmail" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "socialPublicationStatus" TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN "socialPublicationComment" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "safetyRevision" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "ChildDocument" (
  "id" TEXT NOT NULL,
  "childId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'other',
  "filename" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "uploaderId" TEXT,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "ChildDocument_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ChildDocument_filename_key" ON "ChildDocument"("filename");
CREATE INDEX "ChildDocument_childId_uploadedAt_idx" ON "ChildDocument"("childId", "uploadedAt");
ALTER TABLE "ChildDocument" ADD CONSTRAINT "ChildDocument_childId_fkey"
  FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChildDocument" ADD CONSTRAINT "ChildDocument_uploaderId_fkey"
  FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
