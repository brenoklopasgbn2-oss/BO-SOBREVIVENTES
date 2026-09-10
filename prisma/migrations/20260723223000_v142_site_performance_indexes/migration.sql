-- V142: índices para acelerar painel VIP, expirações e histórico administrativo.
CREATE INDEX IF NOT EXISTS "AuditLog_action_createdAt_idx"
  ON "AuditLog"("action", "createdAt");

CREATE INDEX IF NOT EXISTS "PlayerOutfitSubscription_status_expiresAt_idx"
  ON "PlayerOutfitSubscription"("status", "expiresAt");

CREATE INDEX IF NOT EXISTS "PlayerOutfitSubscription_steam64_status_expiresAt_idx"
  ON "PlayerOutfitSubscription"("steam64", "status", "expiresAt");

CREATE INDEX IF NOT EXISTS "PlayerOutfitSubscription_outfitTemplateId_status_expiresAt_idx"
  ON "PlayerOutfitSubscription"("outfitTemplateId", "status", "expiresAt");
