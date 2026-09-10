-- V92: VIP privado vitalício e oculto da loja
ALTER TABLE "OutfitTemplate"
ADD COLUMN "isPrivate" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "OutfitTemplate_isPrivate_idx" ON "OutfitTemplate"("isPrivate");
