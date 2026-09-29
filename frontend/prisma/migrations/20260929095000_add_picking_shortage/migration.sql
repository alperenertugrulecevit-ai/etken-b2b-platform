CREATE TYPE "PickingShortageReason" AS ENUM ('NOT_FOUND', 'DAMAGED', 'STOCK_DIFFERENCE', 'QUALITY_REJECTED', 'OTHER');

CREATE TABLE "PickingShortage" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "orderItemId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" "PickingShortageReason" NOT NULL,
    "note" TEXT,
    "createdByUserId" TEXT,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PickingShortage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PickingShortage_orderId_idx" ON "PickingShortage"("orderId");
CREATE INDEX "PickingShortage_orderItemId_idx" ON "PickingShortage"("orderItemId");
CREATE INDEX "PickingShortage_productId_idx" ON "PickingShortage"("productId");
CREATE INDEX "PickingShortage_reason_idx" ON "PickingShortage"("reason");
CREATE INDEX "PickingShortage_createdAt_idx" ON "PickingShortage"("createdAt");

ALTER TABLE "PickingShortage" ADD CONSTRAINT "PickingShortage_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PickingShortage" ADD CONSTRAINT "PickingShortage_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PickingShortage" ADD CONSTRAINT "PickingShortage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
