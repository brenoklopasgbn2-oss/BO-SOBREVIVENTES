-- V27: tipo de seguro e status em tempo real do veículo
ALTER TABLE "VehicleInsurancePlan" ADD COLUMN IF NOT EXISTS "coverageType" TEXT NOT NULL DEFAULT 'NORMAL';

ALTER TABLE "PlayerVehicle" ADD COLUMN IF NOT EXISTS "currentVehicleMoving" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PlayerVehicle" ADD COLUMN IF NOT EXISTS "currentVehicleOccupied" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PlayerVehicle" ADD COLUMN IF NOT EXISTS "currentVehicleCanTheftClaim" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "PlayerVehicle" ADD COLUMN IF NOT EXISTS "currentVehicleSpeedKmh" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "PlayerVehicle" ADD COLUMN IF NOT EXISTS "currentVehiclePosition" TEXT;
ALTER TABLE "PlayerVehicle" ADD COLUMN IF NOT EXISTS "currentVehicleLastSeenAt" TIMESTAMP(3);
