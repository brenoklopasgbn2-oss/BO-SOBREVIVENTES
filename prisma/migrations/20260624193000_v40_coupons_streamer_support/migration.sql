-- V40 - Cupons, apoio streamer e campos de apoio em pagamentos Pix.
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "supportStreamerCode" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "supportStreamerCodeId" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "supportCommissionPercent" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "CouponCode" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "label" TEXT,
  "percent" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "maxUses" INTEGER,
  "usedCount" INTEGER NOT NULL DEFAULT 0,
  "minCoins" INTEGER NOT NULL DEFAULT 0,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CouponCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CouponCode_code_key" ON "CouponCode"("code");
CREATE INDEX IF NOT EXISTS "CouponCode_active_idx" ON "CouponCode"("active");
CREATE INDEX IF NOT EXISTS "CouponCode_createdAt_idx" ON "CouponCode"("createdAt");

CREATE TABLE IF NOT EXISTS "StreamerCode" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "streamerName" TEXT NOT NULL,
  "streamerSteam64" TEXT,
  "pixKey" TEXT,
  "percent" INTEGER NOT NULL DEFAULT 10,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "totalSalesCoins" INTEGER NOT NULL DEFAULT 0,
  "totalCommissionCoins" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StreamerCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StreamerCode_code_key" ON "StreamerCode"("code");
CREATE INDEX IF NOT EXISTS "StreamerCode_active_idx" ON "StreamerCode"("active");
CREATE INDEX IF NOT EXISTS "StreamerCode_streamerSteam64_idx" ON "StreamerCode"("streamerSteam64");

CREATE TABLE IF NOT EXISTS "StreamerSupportSale" (
  "id" TEXT NOT NULL,
  "streamerCodeId" TEXT,
  "code" TEXT NOT NULL,
  "streamerName" TEXT NOT NULL,
  "playerId" TEXT,
  "playerSteam64" TEXT,
  "playerName" TEXT,
  "purchaseId" TEXT,
  "paymentId" TEXT,
  "source" TEXT NOT NULL DEFAULT 'PRODUCT',
  "totalCoins" INTEGER NOT NULL DEFAULT 0,
  "commissionPercent" INTEGER NOT NULL DEFAULT 0,
  "commissionCoins" INTEGER NOT NULL DEFAULT 0,
  "couponCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StreamerSupportSale_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "StreamerSupportSale_streamerCodeId_idx" ON "StreamerSupportSale"("streamerCodeId");
CREATE INDEX IF NOT EXISTS "StreamerSupportSale_code_idx" ON "StreamerSupportSale"("code");
CREATE INDEX IF NOT EXISTS "StreamerSupportSale_playerSteam64_idx" ON "StreamerSupportSale"("playerSteam64");
CREATE INDEX IF NOT EXISTS "StreamerSupportSale_source_idx" ON "StreamerSupportSale"("source");
CREATE INDEX IF NOT EXISTS "StreamerSupportSale_createdAt_idx" ON "StreamerSupportSale"("createdAt");
