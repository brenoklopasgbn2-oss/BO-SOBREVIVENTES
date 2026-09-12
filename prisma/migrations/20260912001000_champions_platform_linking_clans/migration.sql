-- CHAMPIONS Z unified platform: Discord linking, lightweight presence, clan flags and championship.
ALTER TABLE "Player"
  ADD COLUMN IF NOT EXISTS "discordUsername" TEXT,
  ADD COLUMN IF NOT EXISTS "discordLinkedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastSeenOnlineAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "onlineSince" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastSeenServerId" TEXT,
  ADD COLUMN IF NOT EXISTS "unlinkedAlertedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "Player_discordId_key" ON "Player"("discordId");

ALTER TABLE "Clan"
  ADD COLUMN IF NOT EXISTS "championshipPoints" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "championshipRegistered" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "championshipRegisteredAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "selectedFlagId" TEXT,
  ADD COLUMN IF NOT EXISTS "flagDeliveryStatus" TEXT NOT NULL DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS "flagDeliveredAt" TIMESTAMP(3);

ALTER TABLE "KillEvent"
  ADD COLUMN IF NOT EXISTS "sourceEventId" TEXT,
  ADD COLUMN IF NOT EXISTS "cause" TEXT,
  ADD COLUMN IF NOT EXISTS "sourceClassname" TEXT,
  ADD COLUMN IF NOT EXISTS "ammoClassname" TEXT,
  ADD COLUMN IF NOT EXISTS "hitZone" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "KillEvent_sourceEventId_key" ON "KillEvent"("sourceEventId");

CREATE TABLE IF NOT EXISTS "DiscordLinkCode" (
  "id" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "discordId" TEXT NOT NULL,
  "discordUsername" TEXT,
  "guildId" TEXT,
  "playerId" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DiscordLinkCode_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "DiscordLinkCode_codeHash_key" ON "DiscordLinkCode"("codeHash");
CREATE INDEX IF NOT EXISTS "DiscordLinkCode_discordId_createdAt_idx" ON "DiscordLinkCode"("discordId", "createdAt");
CREATE INDEX IF NOT EXISTS "DiscordLinkCode_expiresAt_idx" ON "DiscordLinkCode"("expiresAt");
DO $$ BEGIN
  ALTER TABLE "DiscordLinkCode" ADD CONSTRAINT "DiscordLinkCode_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "ClanFlagOption" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "classname" TEXT,
  "description" TEXT,
  "imageData" TEXT,
  "imageMime" TEXT,
  "imageUrl" TEXT,
  "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
  "reservedAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClanFlagOption_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ClanFlagOption_slug_key" ON "ClanFlagOption"("slug");
CREATE INDEX IF NOT EXISTS "ClanFlagOption_status_idx" ON "ClanFlagOption"("status");
CREATE UNIQUE INDEX IF NOT EXISTS "Clan_selectedFlagId_key" ON "Clan"("selectedFlagId");
DO $$ BEGIN
  ALTER TABLE "Clan" ADD CONSTRAINT "Clan_selectedFlagId_fkey" FOREIGN KEY ("selectedFlagId") REFERENCES "ClanFlagOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "ChampionshipResult" (
  "id" TEXT NOT NULL,
  "clanId" TEXT NOT NULL,
  "eventName" TEXT NOT NULL,
  "title" TEXT,
  "description" TEXT,
  "points" INTEGER NOT NULL DEFAULT 0,
  "imageData" TEXT,
  "imageMime" TEXT,
  "adminActor" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "discordPublishedAt" TIMESTAMP(3),
  CONSTRAINT "ChampionshipResult_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ChampionshipResult_clanId_occurredAt_idx" ON "ChampionshipResult"("clanId", "occurredAt");
CREATE INDEX IF NOT EXISTS "ChampionshipResult_occurredAt_idx" ON "ChampionshipResult"("occurredAt");
DO $$ BEGIN
  ALTER TABLE "ChampionshipResult" ADD CONSTRAINT "ChampionshipResult_clanId_fkey" FOREIGN KEY ("clanId") REFERENCES "Clan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "DiscordOutbox" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "sentAt" TIMESTAMP(3),
  "lastError" TEXT,
  CONSTRAINT "DiscordOutbox_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "DiscordOutbox_status_availableAt_createdAt_idx" ON "DiscordOutbox"("status", "availableAt", "createdAt");
CREATE INDEX IF NOT EXISTS "DiscordOutbox_type_createdAt_idx" ON "DiscordOutbox"("type", "createdAt");
