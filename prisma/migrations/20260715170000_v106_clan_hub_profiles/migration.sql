ALTER TABLE "Player"
  ADD COLUMN IF NOT EXISTS "avatarData" TEXT,
  ADD COLUMN IF NOT EXISTS "avatarMime" TEXT,
  ADD COLUMN IF NOT EXISTS "profileBio" TEXT;

ALTER TABLE "Clan"
  ADD COLUMN IF NOT EXISTS "flagData" TEXT,
  ADD COLUMN IF NOT EXISTS "flagMime" TEXT,
  ADD COLUMN IF NOT EXISTS "bannerData" TEXT,
  ADD COLUMN IF NOT EXISTS "bannerMime" TEXT,
  ADD COLUMN IF NOT EXISTS "isRecruiting" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "recruitmentTitle" TEXT,
  ADD COLUMN IF NOT EXISTS "recruitmentMessage" TEXT,
  ADD COLUMN IF NOT EXISTS "recruitmentRequirements" TEXT,
  ADD COLUMN IF NOT EXISTS "recruitmentContact" TEXT,
  ADD COLUMN IF NOT EXISTS "accentColor" TEXT NOT NULL DEFAULT '#ef4444';

CREATE TABLE IF NOT EXISTS "ClanJoinApplication" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "clanId" TEXT NOT NULL,
  "playerId" TEXT,
  "requesterSteam64" TEXT NOT NULL,
  "requesterName" TEXT,
  "inGameName" TEXT,
  "message" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "ownerNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClanJoinApplication_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ClanJoinApplication_clanId_status_idx" ON "ClanJoinApplication"("clanId", "status");
CREATE INDEX IF NOT EXISTS "ClanJoinApplication_requesterSteam64_idx" ON "ClanJoinApplication"("requesterSteam64");
CREATE INDEX IF NOT EXISTS "ClanJoinApplication_playerId_idx" ON "ClanJoinApplication"("playerId");
CREATE INDEX IF NOT EXISTS "ClanJoinApplication_createdAt_idx" ON "ClanJoinApplication"("createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ClanJoinApplication_clanId_fkey'
  ) THEN
    ALTER TABLE "ClanJoinApplication"
      ADD CONSTRAINT "ClanJoinApplication_clanId_fkey"
      FOREIGN KEY ("clanId") REFERENCES "Clan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ClanJoinApplication_playerId_fkey'
  ) THEN
    ALTER TABLE "ClanJoinApplication"
      ADD CONSTRAINT "ClanJoinApplication_playerId_fkey"
      FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
