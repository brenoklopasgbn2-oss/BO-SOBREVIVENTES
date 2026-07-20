CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "ProductStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'REFUNDED', 'ERROR');
CREATE TYPE "LedgerType" AS ENUM ('CREDIT', 'DEBIT', 'ADJUST');
CREATE TYPE "PurchaseStatus" AS ENUM ('PAID', 'CANCELLED', 'REFUNDED');
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'PROCESSING', 'DELIVERED', 'FAILED');

CREATE TABLE "Player" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "steam64" TEXT NOT NULL,
  "discordId" TEXT,
  "nickname" TEXT,
  "rememberToken" TEXT,
  "coins" INTEGER NOT NULL DEFAULT 0,
  "cash" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Product" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT NOT NULL DEFAULT 'Geral',
  "serverType" TEXT NOT NULL DEFAULT 'all',
  "classname" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "priceCoins" INTEGER NOT NULL,
  "stock" INTEGER,
  "imageUrl" TEXT,
  "imageData" TEXT,
  "imageMime" TEXT,
  "deliveryType" TEXT NOT NULL DEFAULT 'drop_at_feet',
  "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CoinPackage" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "name" TEXT NOT NULL,
  "amountBrl" DECIMAL(10,2) NOT NULL,
  "coins" INTEGER NOT NULL,
  "bonusText" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CoinPackage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Payment" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "playerId" TEXT NOT NULL,
  "packageId" TEXT,
  "provider" TEXT NOT NULL DEFAULT 'mercadopago',
  "providerPaymentId" TEXT,
  "externalReference" TEXT NOT NULL,
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "amountBrl" DECIMAL(10,2) NOT NULL,
  "coins" INTEGER NOT NULL,
  "qrCode" TEXT,
  "qrCodeBase64" TEXT,
  "payerEmail" TEXT,
  "rawProviderData" JSONB,
  "approvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Purchase" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "playerId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "totalCoins" INTEGER NOT NULL,
  "status" "PurchaseStatus" NOT NULL DEFAULT 'PAID',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DeliveryQueue" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "purchaseId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "steam64" TEXT NOT NULL,
  "serverType" TEXT NOT NULL,
  "productName" TEXT NOT NULL,
  "classname" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "deliveryType" TEXT NOT NULL DEFAULT 'drop_at_feet',
  "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "claimedAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DeliveryQueue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CoinLedger" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "playerId" TEXT NOT NULL,
  "type" "LedgerType" NOT NULL,
  "amount" INTEGER NOT NULL,
  "balanceAfter" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "refType" TEXT,
  "refId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CoinLedger_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "actor" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "target" TEXT,
  "data" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Player_steam64_key" ON "Player"("steam64");
CREATE UNIQUE INDEX "Player_rememberToken_key" ON "Player"("rememberToken");
CREATE INDEX "Player_createdAt_idx" ON "Player"("createdAt");

CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");
CREATE INDEX "Product_category_idx" ON "Product"("category");
CREATE INDEX "Product_serverType_idx" ON "Product"("serverType");
CREATE INDEX "Product_status_idx" ON "Product"("status");

CREATE UNIQUE INDEX "Payment_providerPaymentId_key" ON "Payment"("providerPaymentId");
CREATE UNIQUE INDEX "Payment_externalReference_key" ON "Payment"("externalReference");
CREATE INDEX "Payment_status_idx" ON "Payment"("status");
CREATE INDEX "Payment_createdAt_idx" ON "Payment"("createdAt");

CREATE INDEX "Purchase_createdAt_idx" ON "Purchase"("createdAt");
CREATE INDEX "DeliveryQueue_steam64_idx" ON "DeliveryQueue"("steam64");
CREATE INDEX "DeliveryQueue_status_idx" ON "DeliveryQueue"("status");
CREATE INDEX "DeliveryQueue_serverType_idx" ON "DeliveryQueue"("serverType");
CREATE INDEX "CoinLedger_createdAt_idx" ON "CoinLedger"("createdAt");
CREATE INDEX "CoinLedger_type_idx" ON "CoinLedger"("type");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "CoinPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DeliveryQueue" ADD CONSTRAINT "DeliveryQueue_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeliveryQueue" ADD CONSTRAINT "DeliveryQueue_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CoinLedger" ADD CONSTRAINT "CoinLedger_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
