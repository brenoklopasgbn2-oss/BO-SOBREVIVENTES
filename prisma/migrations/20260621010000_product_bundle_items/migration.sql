-- Add support for products that deliver multiple DayZ items.
CREATE TABLE "ProductItem" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "label" TEXT,
    "classname" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProductItem_productId_idx" ON "ProductItem"("productId");

ALTER TABLE "ProductItem" ADD CONSTRAINT "ProductItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
