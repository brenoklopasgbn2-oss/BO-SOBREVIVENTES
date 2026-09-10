-- V34 ranking, kills, clans, seasons and trophies
CREATE TABLE IF NOT EXISTS "Clan" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "name" TEXT NOT NULL,
  "tag" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "serverType" TEXT NOT NULL DEFAULT 'all',
  "description" TEXT,
  "flagUrl" TEXT,
  "ownerPlayerId" TEXT,
  "subOwnerPlayerId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "eventWins" INTEGER NOT NULL DEFAULT 0,
  "pointsBonus" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Clan_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Clan_slug_key" ON "Clan"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "Clan_tag_serverType_key" ON "Clan"("tag", "serverType");
CREATE INDEX IF NOT EXISTS "Clan_serverType_idx" ON "Clan"("serverType");
CREATE INDEX IF NOT EXISTS "Clan_status_idx" ON "Clan"("status");
ALTER TABLE "Clan" ADD CONSTRAINT "Clan_ownerPlayerId_fkey" FOREIGN KEY ("ownerPlayerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Clan" ADD CONSTRAINT "Clan_subOwnerPlayerId_fkey" FOREIGN KEY ("subOwnerPlayerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "ClanMember" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "clanId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "steam64" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'MEMBER',
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClanMember_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ClanMember_clanId_playerId_key" ON "ClanMember"("clanId", "playerId");
CREATE INDEX IF NOT EXISTS "ClanMember_steam64_idx" ON "ClanMember"("steam64");
CREATE INDEX IF NOT EXISTS "ClanMember_status_idx" ON "ClanMember"("status");
ALTER TABLE "ClanMember" ADD CONSTRAINT "ClanMember_clanId_fkey" FOREIGN KEY ("clanId") REFERENCES "Clan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClanMember" ADD CONSTRAINT "ClanMember_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "ClanRequest" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "requesterPlayerId" TEXT,
  "requesterSteam64" TEXT NOT NULL,
  "requesterName" TEXT,
  "clanName" TEXT NOT NULL,
  "clanTag" TEXT NOT NULL,
  "serverType" TEXT NOT NULL DEFAULT 'all',
  "description" TEXT,
  "flagUrl" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "adminNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClanRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ClanRequest_requesterSteam64_idx" ON "ClanRequest"("requesterSteam64");
CREATE INDEX IF NOT EXISTS "ClanRequest_status_idx" ON "ClanRequest"("status");
CREATE INDEX IF NOT EXISTS "ClanRequest_serverType_idx" ON "ClanRequest"("serverType");

CREATE TABLE IF NOT EXISTS "KillEvent" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "serverType" TEXT NOT NULL DEFAULT 'vanilla',
  "killerSteam64" TEXT NOT NULL,
  "killerName" TEXT,
  "victimSteam64" TEXT NOT NULL,
  "victimName" TEXT,
  "killerClanId" TEXT,
  "victimClanId" TEXT,
  "weapon" TEXT,
  "distanceMeters" DOUBLE PRECISION,
  "place" TEXT,
  "headshot" BOOLEAN NOT NULL DEFAULT false,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "raw" JSONB,
  CONSTRAINT "KillEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "KillEvent_serverType_idx" ON "KillEvent"("serverType");
CREATE INDEX IF NOT EXISTS "KillEvent_killerSteam64_idx" ON "KillEvent"("killerSteam64");
CREATE INDEX IF NOT EXISTS "KillEvent_victimSteam64_idx" ON "KillEvent"("victimSteam64");
CREATE INDEX IF NOT EXISTS "KillEvent_killerClanId_idx" ON "KillEvent"("killerClanId");
CREATE INDEX IF NOT EXISTS "KillEvent_victimClanId_idx" ON "KillEvent"("victimClanId");
CREATE INDEX IF NOT EXISTS "KillEvent_occurredAt_idx" ON "KillEvent"("occurredAt");

CREATE TABLE IF NOT EXISTS "Season" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endsAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "championClanId" TEXT,
  "championPlayerSteam64" TEXT,
  "championTitle" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Season_slug_key" ON "Season"("slug");
CREATE INDEX IF NOT EXISTS "Season_status_idx" ON "Season"("status");
CREATE INDEX IF NOT EXISTS "Season_startsAt_idx" ON "Season"("startsAt");

CREATE TABLE IF NOT EXISTS "ClanAward" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "clanId" TEXT NOT NULL,
  "seasonId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "eventName" TEXT,
  "icon" TEXT NOT NULL DEFAULT '🏆',
  "color" TEXT NOT NULL DEFAULT '#f7bd44',
  "visible" BOOLEAN NOT NULL DEFAULT true,
  "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClanAward_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ClanAward_clanId_idx" ON "ClanAward"("clanId");
CREATE INDEX IF NOT EXISTS "ClanAward_seasonId_idx" ON "ClanAward"("seasonId");
CREATE INDEX IF NOT EXISTS "ClanAward_visible_idx" ON "ClanAward"("visible");
ALTER TABLE "ClanAward" ADD CONSTRAINT "ClanAward_clanId_fkey" FOREIGN KEY ("clanId") REFERENCES "Clan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClanAward" ADD CONSTRAINT "ClanAward_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "PlayerBadge" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "steam64" TEXT NOT NULL,
  "playerName" TEXT,
  "seasonId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "icon" TEXT NOT NULL DEFAULT '⭐',
  "color" TEXT NOT NULL DEFAULT '#38bdf8',
  "visible" BOOLEAN NOT NULL DEFAULT true,
  "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlayerBadge_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "PlayerBadge_steam64_idx" ON "PlayerBadge"("steam64");
CREATE INDEX IF NOT EXISTS "PlayerBadge_seasonId_idx" ON "PlayerBadge"("seasonId");
CREATE INDEX IF NOT EXISTS "PlayerBadge_visible_idx" ON "PlayerBadge"("visible");
