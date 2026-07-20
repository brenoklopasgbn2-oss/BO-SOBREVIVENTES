-- V104: compra idempotente e protegida contra clique duplo/reenvio do navegador.
CREATE TYPE "CheckoutStatus" AS ENUM ('PROCESSING', 'COMPLETED');

CREATE TABLE "CheckoutAttempt" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" "CheckoutStatus" NOT NULL DEFAULT 'PROCESSING',
    "totalCoins" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CheckoutAttempt_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Purchase" ADD COLUMN "checkoutAttemptId" TEXT;

CREATE UNIQUE INDEX "CheckoutAttempt_token_key" ON "CheckoutAttempt"("token");
CREATE INDEX "CheckoutAttempt_playerId_createdAt_idx" ON "CheckoutAttempt"("playerId", "createdAt");
CREATE INDEX "CheckoutAttempt_status_createdAt_idx" ON "CheckoutAttempt"("status", "createdAt");
CREATE INDEX "Purchase_checkoutAttemptId_idx" ON "Purchase"("checkoutAttemptId");

ALTER TABLE "CheckoutAttempt" ADD CONSTRAINT "CheckoutAttempt_playerId_fkey"
  FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_checkoutAttemptId_fkey"
  FOREIGN KEY ("checkoutAttemptId") REFERENCES "CheckoutAttempt"("id") ON DELETE SET NULL ON UPDATE CASCADE;
