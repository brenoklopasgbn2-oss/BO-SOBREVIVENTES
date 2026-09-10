-- V143: login do player por Steam64 + senha, sem depender da Steam OpenID.
ALTER TABLE "Player" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;
ALTER TABLE "Player" ADD COLUMN IF NOT EXISTS "passwordSetAt" TIMESTAMP(3);
ALTER TABLE "Player" ADD COLUMN IF NOT EXISTS "passwordResetAt" TIMESTAMP(3);
ALTER TABLE "Player" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);
