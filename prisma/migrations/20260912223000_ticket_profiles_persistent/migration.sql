-- CHAMPIONS Z: perfis de ticket persistentes no PostgreSQL.
-- Substitui o antigo ticketPlayerProfiles.json local, evitando perda em redeploy/git update.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS "TicketPlayerProfile" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "guildId" TEXT NOT NULL,
  "discordUserId" TEXT NOT NULL,
  "gameNickname" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TicketPlayerProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TicketPlayerProfile_guildId_discordUserId_key"
  ON "TicketPlayerProfile"("guildId", "discordUserId");
CREATE INDEX IF NOT EXISTS "TicketPlayerProfile_discordUserId_idx"
  ON "TicketPlayerProfile"("discordUserId");
CREATE INDEX IF NOT EXISTS "TicketPlayerProfile_guildId_updatedAt_idx"
  ON "TicketPlayerProfile"("guildId", "updatedAt");
