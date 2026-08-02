-- V149: proteção em camadas contra crédito Pix duplicado.
-- Nenhum saldo ou histórico existente é removido.

CREATE TABLE IF NOT EXISTS "PaymentCreditGuard" (
  "paymentId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "providerPaymentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentCreditGuard_pkey" PRIMARY KEY ("paymentId")
);

CREATE INDEX IF NOT EXISTS "PaymentCreditGuard_playerId_createdAt_idx"
  ON "PaymentCreditGuard"("playerId", "createdAt");

-- Registra pagamentos que já possuem crédito no histórico. Isso impede que um
-- pagamento antigo, mesmo com status incorreto, seja creditado novamente.
INSERT INTO "PaymentCreditGuard" ("paymentId", "playerId", "createdAt")
SELECT DISTINCT ON (ledger."refId")
  ledger."refId",
  ledger."playerId",
  ledger."createdAt"
FROM "CoinLedger" ledger
WHERE ledger."refType" = 'payment'
  AND ledger."type" = 'CREDIT'
  AND ledger."refId" IS NOT NULL
ORDER BY ledger."refId", ledger."createdAt" ASC
ON CONFLICT ("paymentId") DO NOTHING;

-- Cobre também pagamentos já aprovados cujo histórico antigo não tenha refId.
INSERT INTO "PaymentCreditGuard" ("paymentId", "playerId", "providerPaymentId", "createdAt")
SELECT
  payment."id",
  payment."playerId",
  payment."providerPaymentId",
  COALESCE(payment."approvedAt", payment."updatedAt", payment."createdAt")
FROM "Payment" payment
WHERE payment."status" = 'APPROVED'
ON CONFLICT ("paymentId") DO UPDATE
SET "providerPaymentId" = COALESCE(EXCLUDED."providerPaymentId", "PaymentCreditGuard"."providerPaymentId");

-- Chave única adicional no histórico para todos os novos créditos.
ALTER TABLE "CoinLedger"
  ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "CoinLedger_idempotencyKey_key"
  ON "CoinLedger"("idempotencyKey");
