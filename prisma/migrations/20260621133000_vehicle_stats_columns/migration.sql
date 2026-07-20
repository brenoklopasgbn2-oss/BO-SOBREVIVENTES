-- V23: colunas de estatística da garagem/seguro
ALTER TABLE "PlayerVehicle" ADD COLUMN IF NOT EXISTS "insuranceUsesTotal" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PlayerVehicle" ADD COLUMN IF NOT EXISTS "deliveriesCreated" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PlayerVehicle" ADD COLUMN IF NOT EXISTS "lastInsuranceUsedAt" TIMESTAMP(3);
