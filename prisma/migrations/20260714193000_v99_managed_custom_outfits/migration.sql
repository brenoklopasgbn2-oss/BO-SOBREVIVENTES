-- V99: trajes gerenciados por streamer/líder de clã, pedidos personalizados e solicitações de bandeira.
ALTER TABLE "OutfitTemplate" ADD COLUMN IF NOT EXISTS "managedAccessEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "OutfitTemplate" ADD COLUMN IF NOT EXISTS "managedOwnerSteam64" TEXT;
ALTER TABLE "OutfitTemplate" ADD COLUMN IF NOT EXISTS "managedOwnerType" TEXT;
ALTER TABLE "OutfitTemplate" ADD COLUMN IF NOT EXISTS "maxManagedMembers" INTEGER NOT NULL DEFAULT 10;
ALTER TABLE "OutfitTemplate" ADD COLUMN IF NOT EXISTS "memberMonthlyPriceCoins" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "OutfitTemplate" ADD COLUMN IF NOT EXISTS "creationPriceCoins" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "OutfitTemplate" ADD COLUMN IF NOT EXISTS "flagClassname" TEXT;

CREATE INDEX IF NOT EXISTS "OutfitTemplate_managedAccessEnabled_idx" ON "OutfitTemplate"("managedAccessEnabled");
CREATE INDEX IF NOT EXISTS "OutfitTemplate_managedOwnerSteam64_idx" ON "OutfitTemplate"("managedOwnerSteam64");

CREATE TABLE IF NOT EXISTS "CustomOutfitOrder" (
  "id" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "steam64" TEXT NOT NULL,
  "leaderName" TEXT,
  "clanName" TEXT,
  "clanTag" TEXT,
  "status" TEXT NOT NULL DEFAULT 'AWAITING_TICKET',
  "creationPriceCoins" INTEGER NOT NULL DEFAULT 50000,
  "monthlyMemberPriceCoins" INTEGER NOT NULL DEFAULT 20000,
  "maxMembers" INTEGER NOT NULL DEFAULT 10,
  "outfitTemplateId" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomOutfitOrder_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CustomOutfitOrder_playerId_idx" ON "CustomOutfitOrder"("playerId");
CREATE INDEX IF NOT EXISTS "CustomOutfitOrder_steam64_idx" ON "CustomOutfitOrder"("steam64");
CREATE INDEX IF NOT EXISTS "CustomOutfitOrder_status_idx" ON "CustomOutfitOrder"("status");
DO $$ BEGIN
  ALTER TABLE "CustomOutfitOrder" ADD CONSTRAINT "CustomOutfitOrder_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "OutfitFlagRequest" (
  "id" TEXT NOT NULL,
  "outfitTemplateId" TEXT NOT NULL,
  "requesterSteam64" TEXT NOT NULL,
  "requesterName" TEXT,
  "ownerType" TEXT,
  "flagClassname" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "adminNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OutfitFlagRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "OutfitFlagRequest_outfitTemplateId_idx" ON "OutfitFlagRequest"("outfitTemplateId");
CREATE INDEX IF NOT EXISTS "OutfitFlagRequest_requesterSteam64_idx" ON "OutfitFlagRequest"("requesterSteam64");
CREATE INDEX IF NOT EXISTS "OutfitFlagRequest_status_idx" ON "OutfitFlagRequest"("status");
DO $$ BEGIN
  ALTER TABLE "OutfitFlagRequest" ADD CONSTRAINT "OutfitFlagRequest_outfitTemplateId_fkey" FOREIGN KEY ("outfitTemplateId") REFERENCES "OutfitTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
