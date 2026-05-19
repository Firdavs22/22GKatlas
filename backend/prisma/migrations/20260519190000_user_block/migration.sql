-- Admin can suspend a user's login without deleting data: set blockedAt timestamp.
-- Null = active. Restoring access = set back to null.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "blockedAt" TIMESTAMP(3);
