-- CHAMPIONS Z: indicação persistente de streamers pelo Discord.
-- Todos os dados importantes ficam no PostgreSQL para sobreviver a redeploy/git update.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS "StreamerReferralProfile" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "guildId" TEXT NOT NULL,
  "discordUserId" TEXT NOT NULL,
  "streamerName" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "registeredByDiscordId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StreamerReferralProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StreamerReferralProfile_guildId_discordUserId_key"
  ON "StreamerReferralProfile"("guildId", "discordUserId");
CREATE INDEX IF NOT EXISTS "StreamerReferralProfile_guildId_active_idx"
  ON "StreamerReferralProfile"("guildId", "active");
CREATE INDEX IF NOT EXISTS "StreamerReferralProfile_discordUserId_idx"
  ON "StreamerReferralProfile"("discordUserId");

CREATE TABLE IF NOT EXISTS "StreamerReferral" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "guildId" TEXT NOT NULL,
  "playerDiscordId" TEXT NOT NULL,
  "playerDiscordUsername" TEXT,
  "playerDisplayName" TEXT,
  "playerSteam64" TEXT,
  "streamerProfileId" TEXT NOT NULL,
  "selectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StreamerReferral_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StreamerReferral_guildId_playerDiscordId_key"
  ON "StreamerReferral"("guildId", "playerDiscordId");
CREATE INDEX IF NOT EXISTS "StreamerReferral_streamerProfileId_selectedAt_idx"
  ON "StreamerReferral"("streamerProfileId", "selectedAt");
CREATE INDEX IF NOT EXISTS "StreamerReferral_guildId_selectedAt_idx"
  ON "StreamerReferral"("guildId", "selectedAt");
CREATE INDEX IF NOT EXISTS "StreamerReferral_playerSteam64_idx"
  ON "StreamerReferral"("playerSteam64");

DO $$ BEGIN
  ALTER TABLE "StreamerReferral"
    ADD CONSTRAINT "StreamerReferral_streamerProfileId_fkey"
    FOREIGN KEY ("streamerProfileId") REFERENCES "StreamerReferralProfile"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
