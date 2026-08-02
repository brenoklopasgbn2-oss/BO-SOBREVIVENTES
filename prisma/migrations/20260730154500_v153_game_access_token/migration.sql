-- V153: invalida definitivamente todas as credenciais antigas dos players.
-- As colunas legadas permanecem fisicamente apenas para manter o deploy não destrutivo,
-- mas saíram do schema/código e todos os valores são apagados nesta atualização.
UPDATE "Player"
SET "passwordHash" = NULL,
    "passwordSetAt" = NULL,
    "passwordResetAt" = NULL
WHERE "passwordHash" IS NOT NULL
   OR "passwordSetAt" IS NOT NULL
   OR "passwordResetAt" IS NOT NULL;

-- Maverick pode ser adquirido uma única vez sem seguro por valor diferente.
ALTER TABLE "VehicleTemplate" ADD COLUMN IF NOT EXISTS "noInsurancePriceCoins" INTEGER;

-- O link gerado pelo DayZ carrega apenas um token aleatório, temporário e de uso único.
CREATE TABLE IF NOT EXISTS "GameAccessToken" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "steam64" TEXT NOT NULL,
  "nickname" TEXT,
  "serverType" TEXT NOT NULL DEFAULT 'vanilla',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GameAccessToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "GameAccessToken_tokenHash_key" ON "GameAccessToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "GameAccessToken_steam64_idx" ON "GameAccessToken"("steam64");
CREATE INDEX IF NOT EXISTS "GameAccessToken_expiresAt_idx" ON "GameAccessToken"("expiresAt");
CREATE INDEX IF NOT EXISTS "GameAccessToken_usedAt_idx" ON "GameAccessToken"("usedAt");
