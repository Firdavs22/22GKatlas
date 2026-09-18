ALTER TABLE "MethodicalDocument"
  ADD COLUMN "reviewStatus" TEXT NOT NULL DEFAULT 'approved',
  ADD COLUMN "reviewComment" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "reviewedById" TEXT,
  ADD COLUMN "reviewedAt" TIMESTAMP(3);

CREATE INDEX "MethodicalDocument_reviewStatus_authorId_idx"
  ON "MethodicalDocument"("reviewStatus", "authorId");
