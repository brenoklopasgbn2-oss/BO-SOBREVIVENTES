-- V36: itens que podem nascer dentro do veículo, como chaves.
ALTER TABLE "VehicleTemplate" ADD COLUMN IF NOT EXISTS "cargoItems" JSONB;
