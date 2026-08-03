-- V166: índices para catálogo, sessão streamer, histórico e fila de entrega.
CREATE INDEX IF NOT EXISTS "Product_status_serverType_category_idx" ON "Product"("status", "serverType", "category");
CREATE INDEX IF NOT EXISTS "Purchase_playerId_createdAt_idx" ON "Purchase"("playerId", "createdAt");
CREATE INDEX IF NOT EXISTS "DeliveryQueue_playerId_status_createdAt_idx" ON "DeliveryQueue"("playerId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "DeliveryQueue_steam64_status_createdAt_idx" ON "DeliveryQueue"("steam64", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "StreamerCode_streamerSteam64_active_updatedAt_idx" ON "StreamerCode"("streamerSteam64", "active", "updatedAt");
