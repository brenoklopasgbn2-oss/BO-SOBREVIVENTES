-- V117 - ranking profissional, perfil competitivo e troféus automáticos
ALTER TABLE "PlayerBadge" ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'MANUAL';
ALTER TABLE "PlayerBadge" ADD COLUMN IF NOT EXISTS "automaticKey" TEXT;
ALTER TABLE "PlayerBadge" ADD COLUMN IF NOT EXISTS "ruleKey" TEXT;
ALTER TABLE "PlayerBadge" ADD COLUMN IF NOT EXISTS "tier" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PlayerBadge" ADD COLUMN IF NOT EXISTS "serverType" TEXT NOT NULL DEFAULT 'global';
ALTER TABLE "PlayerBadge" ADD COLUMN IF NOT EXISTS "metadata" JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS "PlayerBadge_automaticKey_key"
  ON "PlayerBadge"("automaticKey");
CREATE INDEX IF NOT EXISTS "PlayerBadge_source_idx" ON "PlayerBadge"("source");
CREATE INDEX IF NOT EXISTS "PlayerBadge_ruleKey_idx" ON "PlayerBadge"("ruleKey");
CREATE INDEX IF NOT EXISTS "PlayerBadge_serverType_idx" ON "PlayerBadge"("serverType");
