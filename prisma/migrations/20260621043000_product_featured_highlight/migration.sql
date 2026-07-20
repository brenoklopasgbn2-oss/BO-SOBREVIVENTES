ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "featured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "highlightColor" TEXT NOT NULL DEFAULT '#ef4444';

UPDATE "Product"
SET "featured" = true, "highlightColor" = '#ef4444'
WHERE "slug" IN ('barril-metalico-200-slots', 'barril-metalico')
   OR LOWER("name") LIKE '%barril%';

UPDATE "Product"
SET "highlightColor" = '#38bdf8'
WHERE "featured" = true AND "serverType" = 'bbp';
