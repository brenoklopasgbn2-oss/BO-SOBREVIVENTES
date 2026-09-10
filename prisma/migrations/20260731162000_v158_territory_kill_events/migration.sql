-- V158: apoiadores streamer e evento de kills por território, sem apagar dados existentes.
ALTER TABLE "KillEvent" ADD COLUMN IF NOT EXISTS "killerPosX" DOUBLE PRECISION;
ALTER TABLE "KillEvent" ADD COLUMN IF NOT EXISTS "killerPosY" DOUBLE PRECISION;
ALTER TABLE "KillEvent" ADD COLUMN IF NOT EXISTS "killerPosZ" DOUBLE PRECISION;
ALTER TABLE "KillEvent" ADD COLUMN IF NOT EXISTS "victimPosX" DOUBLE PRECISION;
ALTER TABLE "KillEvent" ADD COLUMN IF NOT EXISTS "victimPosY" DOUBLE PRECISION;
ALTER TABLE "KillEvent" ADD COLUMN IF NOT EXISTS "victimPosZ" DOUBLE PRECISION;

CREATE TABLE IF NOT EXISTS "TerritoryKillEvent" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "serverType" TEXT NOT NULL DEFAULT 'vanilla',
  "active" BOOLEAN NOT NULL DEFAULT false,
  "centerX" DOUBLE PRECISION NOT NULL,
  "centerZ" DOUBLE PRECISION NOT NULL,
  "radiusMeters" DOUBLE PRECISION NOT NULL DEFAULT 300,
  "placeKeyword" TEXT,
  "positionRule" TEXT NOT NULL DEFAULT 'VICTIM',
  "rewardCoins" INTEGER NOT NULL DEFAULT 1000,
  "blockSameClan" BOOLEAN NOT NULL DEFAULT true,
  "blockSuicide" BOOLEAN NOT NULL DEFAULT true,
  "blockAdmins" BOOLEAN NOT NULL DEFAULT true,
  "pairCooldownSeconds" INTEGER NOT NULL DEFAULT 1800,
  "maxRewardsPerPlayer" INTEGER NOT NULL DEFAULT 0,
  "totalRewardBudgetCoins" INTEGER NOT NULL DEFAULT 0,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TerritoryKillEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "TerritoryKillEvent_serverType_idx" ON "TerritoryKillEvent"("serverType");
CREATE INDEX IF NOT EXISTS "TerritoryKillEvent_active_idx" ON "TerritoryKillEvent"("active");
CREATE INDEX IF NOT EXISTS "TerritoryKillEvent_startsAt_idx" ON "TerritoryKillEvent"("startsAt");
CREATE INDEX IF NOT EXISTS "TerritoryKillEvent_endsAt_idx" ON "TerritoryKillEvent"("endsAt");

CREATE TABLE IF NOT EXISTS "TerritoryKillScore" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "eventId" TEXT NOT NULL,
  "killEventId" TEXT NOT NULL,
  "playerId" TEXT,
  "killerSteam64" TEXT NOT NULL,
  "killerName" TEXT,
  "victimSteam64" TEXT NOT NULL,
  "victimName" TEXT,
  "killerClanId" TEXT,
  "victimClanId" TEXT,
  "qualified" BOOLEAN NOT NULL DEFAULT false,
  "rejectionReason" TEXT,
  "rewardCoins" INTEGER NOT NULL DEFAULT 0,
  "killerPosX" DOUBLE PRECISION,
  "killerPosY" DOUBLE PRECISION,
  "killerPosZ" DOUBLE PRECISION,
  "victimPosX" DOUBLE PRECISION,
  "victimPosY" DOUBLE PRECISION,
  "victimPosZ" DOUBLE PRECISION,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TerritoryKillScore_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "TerritoryKillScore_eventId_killEventId_key" ON "TerritoryKillScore"("eventId", "killEventId");
CREATE INDEX IF NOT EXISTS "TerritoryKillScore_eventId_qualified_idx" ON "TerritoryKillScore"("eventId", "qualified");
CREATE INDEX IF NOT EXISTS "TerritoryKillScore_killerSteam64_idx" ON "TerritoryKillScore"("killerSteam64");
CREATE INDEX IF NOT EXISTS "TerritoryKillScore_victimSteam64_idx" ON "TerritoryKillScore"("victimSteam64");
CREATE INDEX IF NOT EXISTS "TerritoryKillScore_occurredAt_idx" ON "TerritoryKillScore"("occurredAt");

DO $$ BEGIN
  ALTER TABLE "TerritoryKillScore" ADD CONSTRAINT "TerritoryKillScore_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "TerritoryKillEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "TerritoryKillScore" ADD CONSTRAINT "TerritoryKillScore_killEventId_fkey" FOREIGN KEY ("killEventId") REFERENCES "KillEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "TerritoryKillScore" ADD CONSTRAINT "TerritoryKillScore_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
