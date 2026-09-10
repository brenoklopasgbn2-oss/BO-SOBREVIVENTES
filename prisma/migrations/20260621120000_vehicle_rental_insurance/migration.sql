-- Veiculos, aluguel e seguro RAIDZ Store
ALTER TABLE "DeliveryQueue" ALTER COLUMN "purchaseId" DROP NOT NULL;
ALTER TABLE "DeliveryQueue" ADD COLUMN IF NOT EXISTS "meta" JSONB;

CREATE TABLE IF NOT EXISTS "VehicleTemplate" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "serverType" TEXT NOT NULL DEFAULT 'vanilla',
  "vehicleClassname" TEXT NOT NULL,
  "buyPriceCoins" INTEGER NOT NULL DEFAULT 0,
  "rent1DayCoins" INTEGER NOT NULL DEFAULT 0,
  "rent7DaysCoins" INTEGER NOT NULL DEFAULT 0,
  "rent30DaysCoins" INTEGER NOT NULL DEFAULT 0,
  "imageUrl" TEXT,
  "imageData" TEXT,
  "imageMime" TEXT,
  "parts" JSONB,
  "fluids" JSONB,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VehicleTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "VehicleTemplate_slug_key" ON "VehicleTemplate"("slug");
CREATE INDEX IF NOT EXISTS "VehicleTemplate_serverType_idx" ON "VehicleTemplate"("serverType");
CREATE INDEX IF NOT EXISTS "VehicleTemplate_active_idx" ON "VehicleTemplate"("active");

CREATE TABLE IF NOT EXISTS "VehicleInsurancePlan" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "templateId" TEXT,
  "name" TEXT NOT NULL,
  "billingType" TEXT NOT NULL DEFAULT 'PER_USE',
  "priceCoins" INTEGER NOT NULL DEFAULT 0,
  "respawnFeeCoins" INTEGER NOT NULL DEFAULT 0,
  "durationDays" INTEGER NOT NULL DEFAULT 30,
  "maxUsesPerWeek" INTEGER NOT NULL DEFAULT 1,
  "description" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VehicleInsurancePlan_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "VehicleInsurancePlan_billingType_idx" ON "VehicleInsurancePlan"("billingType");
CREATE INDEX IF NOT EXISTS "VehicleInsurancePlan_active_idx" ON "VehicleInsurancePlan"("active");
ALTER TABLE "VehicleInsurancePlan" ADD CONSTRAINT "VehicleInsurancePlan_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "VehicleTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "PlayerVehicle" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "playerId" TEXT NOT NULL,
  "steam64" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "insurancePlanId" TEXT,
  "serverType" TEXT NOT NULL DEFAULT 'vanilla',
  "displayName" TEXT NOT NULL,
  "vehicleClassname" TEXT NOT NULL,
  "ownershipType" TEXT NOT NULL DEFAULT 'OWNED',
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "expiresAt" TIMESTAMP(3),
  "insuranceExpiresAt" TIMESTAMP(3),
  "insuranceUsesWeekStart" TIMESTAMP(3),
  "insuranceUsesThisWeek" INTEGER NOT NULL DEFAULT 0,
  "currentVehicleKey" TEXT,
  "lastRespawnAt" TIMESTAMP(3),
  "nextRespawnAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlayerVehicle_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PlayerVehicle_currentVehicleKey_key" ON "PlayerVehicle"("currentVehicleKey");
CREATE INDEX IF NOT EXISTS "PlayerVehicle_playerId_idx" ON "PlayerVehicle"("playerId");
CREATE INDEX IF NOT EXISTS "PlayerVehicle_steam64_idx" ON "PlayerVehicle"("steam64");
CREATE INDEX IF NOT EXISTS "PlayerVehicle_serverType_idx" ON "PlayerVehicle"("serverType");
CREATE INDEX IF NOT EXISTS "PlayerVehicle_status_idx" ON "PlayerVehicle"("status");
ALTER TABLE "PlayerVehicle" ADD CONSTRAINT "PlayerVehicle_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayerVehicle" ADD CONSTRAINT "PlayerVehicle_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "VehicleTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlayerVehicle" ADD CONSTRAINT "PlayerVehicle_insurancePlanId_fkey" FOREIGN KEY ("insurancePlanId") REFERENCES "VehicleInsurancePlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "VehicleRespawnLog" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "playerVehicleId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "deliveryId" TEXT,
  "action" TEXT NOT NULL DEFAULT 'SPAWN',
  "oldVehicleKey" TEXT,
  "newVehicleKey" TEXT,
  "costCoins" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VehicleRespawnLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "VehicleRespawnLog_playerVehicleId_idx" ON "VehicleRespawnLog"("playerVehicleId");
CREATE INDEX IF NOT EXISTS "VehicleRespawnLog_playerId_idx" ON "VehicleRespawnLog"("playerId");
CREATE INDEX IF NOT EXISTS "VehicleRespawnLog_status_idx" ON "VehicleRespawnLog"("status");
ALTER TABLE "VehicleRespawnLog" ADD CONSTRAINT "VehicleRespawnLog_playerVehicleId_fkey" FOREIGN KEY ("playerVehicleId") REFERENCES "PlayerVehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehicleRespawnLog" ADD CONSTRAINT "VehicleRespawnLog_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
