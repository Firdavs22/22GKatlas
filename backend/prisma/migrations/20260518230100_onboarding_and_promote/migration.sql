-- Onboarding tour completion timestamp + promote the original admin to superadmin.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "onboardingCompletedAt" TIMESTAMP(3);

-- Promote the very first admin so the system isn't locked out of settings/audit/staff.
-- Picks the oldest admin (createdAt asc) — typically the seeded one.
UPDATE "User"
SET role = 'superadmin'
WHERE id = (
  SELECT id FROM "User" WHERE role = 'admin' ORDER BY "createdAt" ASC LIMIT 1
);
