-- Add superadmin to Role enum.
-- PostgreSQL requires ALTER TYPE ... ADD VALUE to be its own transaction —
-- using the new value in the SAME transaction throws 55P04 (unsafe_new_enum_value_usage).
-- This migration adds the value only; promotion of the first admin happens in the next migration.

ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'superadmin';
