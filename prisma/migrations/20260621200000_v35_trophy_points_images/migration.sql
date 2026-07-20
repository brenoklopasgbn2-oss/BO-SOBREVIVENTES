-- V35 - troféus com imagem PNG/link, pontos, wipe seguro e finalização com senha
ALTER TABLE "ClanAward" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
ALTER TABLE "ClanAward" ADD COLUMN IF NOT EXISTS "points" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PlayerBadge" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
ALTER TABLE "PlayerBadge" ADD COLUMN IF NOT EXISTS "points" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "ClanAward_points_idx" ON "ClanAward"("points");
CREATE INDEX IF NOT EXISTS "PlayerBadge_points_idx" ON "PlayerBadge"("points");
