-- V42: caixa customizada para produtos entregues dentro de caixa temporária.
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "dropBoxClassname" TEXT;
