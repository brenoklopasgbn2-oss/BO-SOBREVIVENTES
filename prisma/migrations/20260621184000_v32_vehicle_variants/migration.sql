-- V32: permite cadastrar várias skins/opções do mesmo veículo no painel admin.
ALTER TABLE "VehicleTemplate" ADD COLUMN "variants" JSONB;
