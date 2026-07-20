-- V57: trava persistente do Kit Inicial por Steam64/player.
-- Não apaga dados antigos; só cria uma tabela nova para impedir resgate duplicado em atualização/restart.
CREATE TABLE IF NOT EXISTS "StarterKitClaim" (
  "id" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "steam64" TEXT NOT NULL,
  "serverType" TEXT NOT NULL DEFAULT 'vanilla',
  "kitName" TEXT,
  "deliveriesCreated" INTEGER NOT NULL DEFAULT 0,
  "bonusCoins" INTEGER NOT NULL DEFAULT 0,
  "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StarterKitClaim_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "StarterKitClaim_playerId_key" ON "StarterKitClaim"("playerId");
CREATE UNIQUE INDEX IF NOT EXISTS "StarterKitClaim_steam64_key" ON "StarterKitClaim"("steam64");
CREATE INDEX IF NOT EXISTS "StarterKitClaim_serverType_idx" ON "StarterKitClaim"("serverType");
CREATE INDEX IF NOT EXISTS "StarterKitClaim_claimedAt_idx" ON "StarterKitClaim"("claimedAt");
ALTER TABLE "StarterKitClaim" ADD CONSTRAINT "StarterKitClaim_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
