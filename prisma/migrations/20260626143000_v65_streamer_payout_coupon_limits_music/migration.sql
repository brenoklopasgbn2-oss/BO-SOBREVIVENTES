-- V65 - pagamento streamer, saque semanal, limite de cupom por Steam64 e player de músicas

ALTER TABLE "CouponCode"
  ADD COLUMN IF NOT EXISTS "maxUsesPerSteam" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "CouponUse" (
  "id" TEXT NOT NULL,
  "couponId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "playerId" TEXT,
  "playerSteam64" TEXT,
  "source" TEXT NOT NULL DEFAULT 'PRODUCT',
  "purchaseId" TEXT,
  "totalCoins" INTEGER NOT NULL DEFAULT 0,
  "discountCoins" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CouponUse_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "CouponUse" ADD CONSTRAINT "CouponUse_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "CouponCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "CouponUse" ADD CONSTRAINT "CouponUse_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "CouponUse_couponId_idx" ON "CouponUse"("couponId");
CREATE INDEX IF NOT EXISTS "CouponUse_code_idx" ON "CouponUse"("code");
CREATE INDEX IF NOT EXISTS "CouponUse_playerSteam64_idx" ON "CouponUse"("playerSteam64");
CREATE INDEX IF NOT EXISTS "CouponUse_createdAt_idx" ON "CouponUse"("createdAt");

CREATE TABLE IF NOT EXISTS "StreamerPayout" (
  "id" TEXT NOT NULL,
  "streamerCodeId" TEXT,
  "code" TEXT NOT NULL,
  "streamerName" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "periodType" TEXT NOT NULL DEFAULT 'ALL',
  "periodStart" TIMESTAMP(3),
  "periodEnd" TIMESTAMP(3),
  "saleCount" INTEGER NOT NULL DEFAULT 0,
  "supporters" INTEGER NOT NULL DEFAULT 0,
  "salesCoins" INTEGER NOT NULL DEFAULT 0,
  "amountCoins" INTEGER NOT NULL DEFAULT 0,
  "amountBrl" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "requestedByStreamer" BOOLEAN NOT NULL DEFAULT false,
  "requestedAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "paidBy" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StreamerPayout_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "StreamerPayout" ADD CONSTRAINT "StreamerPayout_streamerCodeId_fkey" FOREIGN KEY ("streamerCodeId") REFERENCES "StreamerCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "StreamerSupportSale"
  ADD COLUMN IF NOT EXISTS "payoutId" TEXT,
  ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3);

DO $$ BEGIN
  ALTER TABLE "StreamerSupportSale" ADD CONSTRAINT "StreamerSupportSale_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "StreamerPayout"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "StreamerPayout_streamerCodeId_idx" ON "StreamerPayout"("streamerCodeId");
CREATE INDEX IF NOT EXISTS "StreamerPayout_code_idx" ON "StreamerPayout"("code");
CREATE INDEX IF NOT EXISTS "StreamerPayout_status_idx" ON "StreamerPayout"("status");
CREATE INDEX IF NOT EXISTS "StreamerPayout_periodType_idx" ON "StreamerPayout"("periodType");
CREATE INDEX IF NOT EXISTS "StreamerPayout_createdAt_idx" ON "StreamerPayout"("createdAt");
CREATE INDEX IF NOT EXISTS "StreamerSupportSale_payoutId_idx" ON "StreamerSupportSale"("payoutId");
CREATE INDEX IF NOT EXISTS "StreamerSupportSale_paidAt_idx" ON "StreamerSupportSale"("paidAt");
