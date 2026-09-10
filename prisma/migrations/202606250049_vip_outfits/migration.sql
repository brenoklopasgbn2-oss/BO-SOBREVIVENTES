-- V49: trajes VIP mensais e recompensa de 7 dias por apoio streamer.
CREATE TABLE IF NOT EXISTS "OutfitTemplate" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "serverType" TEXT NOT NULL DEFAULT 'vanilla',
  "level" INTEGER NOT NULL DEFAULT 1,
  "priceCoins" INTEGER NOT NULL DEFAULT 0,
  "durationDays" INTEGER NOT NULL DEFAULT 30,
  "imageUrl" TEXT,
  "imageData" TEXT,
  "imageMime" TEXT,
  "items" JSONB,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "streamerRewardEnabled" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OutfitTemplate_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "OutfitTemplate_slug_key" ON "OutfitTemplate"("slug");
CREATE INDEX IF NOT EXISTS "OutfitTemplate_serverType_idx" ON "OutfitTemplate"("serverType");
CREATE INDEX IF NOT EXISTS "OutfitTemplate_active_idx" ON "OutfitTemplate"("active");
CREATE INDEX IF NOT EXISTS "OutfitTemplate_streamerRewardEnabled_idx" ON "OutfitTemplate"("streamerRewardEnabled");

CREATE TABLE IF NOT EXISTS "PlayerOutfitSubscription" (
  "id" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "steam64" TEXT NOT NULL,
  "outfitTemplateId" TEXT NOT NULL,
  "serverType" TEXT NOT NULL DEFAULT 'vanilla',
  "source" TEXT NOT NULL DEFAULT 'PURCHASE',
  "streamerCodeId" TEXT,
  "streamerCode" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "lastSpawnAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlayerOutfitSubscription_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "PlayerOutfitSubscription_playerId_idx" ON "PlayerOutfitSubscription"("playerId");
CREATE INDEX IF NOT EXISTS "PlayerOutfitSubscription_steam64_idx" ON "PlayerOutfitSubscription"("steam64");
CREATE INDEX IF NOT EXISTS "PlayerOutfitSubscription_status_idx" ON "PlayerOutfitSubscription"("status");
CREATE INDEX IF NOT EXISTS "PlayerOutfitSubscription_expiresAt_idx" ON "PlayerOutfitSubscription"("expiresAt");
CREATE INDEX IF NOT EXISTS "PlayerOutfitSubscription_streamerCode_idx" ON "PlayerOutfitSubscription"("streamerCode");
ALTER TABLE "PlayerOutfitSubscription" ADD CONSTRAINT "PlayerOutfitSubscription_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayerOutfitSubscription" ADD CONSTRAINT "PlayerOutfitSubscription_outfitTemplateId_fkey" FOREIGN KEY ("outfitTemplateId") REFERENCES "OutfitTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
