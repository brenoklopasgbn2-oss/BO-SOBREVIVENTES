-- V128: transferência segura de moedas RZ entre jogadores.
CREATE TABLE "CoinTransfer" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "senderBalanceAfter" INTEGER NOT NULL,
    "recipientBalanceAfter" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CoinTransfer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CoinTransfer_token_key" ON "CoinTransfer"("token");
CREATE INDEX "CoinTransfer_senderId_createdAt_idx" ON "CoinTransfer"("senderId", "createdAt");
CREATE INDEX "CoinTransfer_recipientId_createdAt_idx" ON "CoinTransfer"("recipientId", "createdAt");

ALTER TABLE "CoinTransfer" ADD CONSTRAINT "CoinTransfer_senderId_fkey"
  FOREIGN KEY ("senderId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CoinTransfer" ADD CONSTRAINT "CoinTransfer_recipientId_fkey"
  FOREIGN KEY ("recipientId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
