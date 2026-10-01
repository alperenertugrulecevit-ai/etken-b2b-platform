CREATE TYPE "ReturnOrderStatus" AS ENUM ('OPEN', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');
CREATE TYPE "ReturnOrderSource" AS ENUM ('ETKEN', 'CUSTOMER');

CREATE TABLE "ReturnOrder" (
  "id" TEXT NOT NULL,
  "returnNumber" TEXT NOT NULL,
  "originalOrderId" INTEGER NOT NULL,
  "source" "ReturnOrderSource" NOT NULL,
  "customerDocumentNo" TEXT NOT NULL,
  "deliveryNoteNumber" TEXT NOT NULL,
  "deliveryNoteDate" TIMESTAMP(3) NOT NULL,
  "status" "ReturnOrderStatus" NOT NULL DEFAULT 'OPEN',
  "note" TEXT,
  "createdByUserId" TEXT,
  "createdByName" TEXT,
  "receivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReturnOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReturnOrderItem" (
  "id" TEXT NOT NULL,
  "returnOrderId" TEXT NOT NULL,
  "orderItemId" INTEGER NOT NULL,
  "productId" INTEGER NOT NULL,
  "productCode" TEXT NOT NULL,
  "productBarcode" TEXT NOT NULL,
  "productName" TEXT NOT NULL,
  "expectedQuantity" INTEGER NOT NULL,
  "receivedQuantity" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReturnOrderItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReturnOrder_returnNumber_key" ON "ReturnOrder"("returnNumber");
CREATE INDEX "ReturnOrder_originalOrderId_idx" ON "ReturnOrder"("originalOrderId");
CREATE INDEX "ReturnOrder_customerDocumentNo_idx" ON "ReturnOrder"("customerDocumentNo");
CREATE INDEX "ReturnOrder_deliveryNoteNumber_idx" ON "ReturnOrder"("deliveryNoteNumber");
CREATE INDEX "ReturnOrder_deliveryNoteDate_idx" ON "ReturnOrder"("deliveryNoteDate");
CREATE INDEX "ReturnOrder_status_idx" ON "ReturnOrder"("status");
CREATE INDEX "ReturnOrder_createdAt_idx" ON "ReturnOrder"("createdAt");
CREATE UNIQUE INDEX "ReturnOrderItem_returnOrderId_orderItemId_key" ON "ReturnOrderItem"("returnOrderId","orderItemId");
CREATE INDEX "ReturnOrderItem_returnOrderId_idx" ON "ReturnOrderItem"("returnOrderId");
CREATE INDEX "ReturnOrderItem_orderItemId_idx" ON "ReturnOrderItem"("orderItemId");
CREATE INDEX "ReturnOrderItem_productId_idx" ON "ReturnOrderItem"("productId");
CREATE INDEX "ReturnOrderItem_productCode_idx" ON "ReturnOrderItem"("productCode");
CREATE INDEX "ReturnOrderItem_productBarcode_idx" ON "ReturnOrderItem"("productBarcode");

ALTER TABLE "ReturnOrder" ADD CONSTRAINT "ReturnOrder_originalOrderId_fkey" FOREIGN KEY ("originalOrderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReturnOrderItem" ADD CONSTRAINT "ReturnOrderItem_returnOrderId_fkey" FOREIGN KEY ("returnOrderId") REFERENCES "ReturnOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReturnOrderItem" ADD CONSTRAINT "ReturnOrderItem_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
