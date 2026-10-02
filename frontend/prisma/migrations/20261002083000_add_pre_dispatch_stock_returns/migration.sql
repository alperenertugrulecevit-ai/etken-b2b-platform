-- Pre-dispatch stock return audit and cancellation quantities
ALTER TABLE "OrderItem"
ADD COLUMN "cancelledQuantity" INTEGER NOT NULL DEFAULT 0;

CREATE TYPE "StockReturnReason" AS ENUM (
  'CUSTOMER_PARTIAL_CANCEL',
  'CUSTOMER_FULL_CANCEL',
  'WRONG_PICK',
  'DAMAGED',
  'OPERATION_CORRECTION'
);

CREATE TYPE "StockReturnStage" AS ENUM (
  'PICKING',
  'PACKING',
  'ROUTED',
  'LOADED'
);

CREATE TABLE "StockReturnEvent" (
  "id" TEXT NOT NULL,
  "orderId" INTEGER NOT NULL,
  "orderItemId" INTEGER NOT NULL,
  "productId" INTEGER NOT NULL,
  "reason" "StockReturnReason" NOT NULL,
  "stage" "StockReturnStage" NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "sourceHandlingUnitId" INTEGER NOT NULL,
  "targetHandlingUnitId" INTEGER NOT NULL,
  "targetLocationId" INTEGER NOT NULL,
  "productCode" TEXT NOT NULL,
  "productBarcode" TEXT NOT NULL,
  "productName" TEXT NOT NULL,
  "sourceBarcode" TEXT NOT NULL,
  "targetBarcode" TEXT NOT NULL,
  "targetLocationCode" TEXT NOT NULL,
  "operatorId" TEXT,
  "operatorName" TEXT,
  "terminalCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StockReturnEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrderItem_cancelledQuantity_idx" ON "OrderItem"("cancelledQuantity");
CREATE INDEX "StockReturnEvent_orderId_createdAt_idx" ON "StockReturnEvent"("orderId","createdAt");
CREATE INDEX "StockReturnEvent_orderItemId_createdAt_idx" ON "StockReturnEvent"("orderItemId","createdAt");
CREATE INDEX "StockReturnEvent_productId_idx" ON "StockReturnEvent"("productId");
CREATE INDEX "StockReturnEvent_reason_idx" ON "StockReturnEvent"("reason");
CREATE INDEX "StockReturnEvent_stage_idx" ON "StockReturnEvent"("stage");
CREATE INDEX "StockReturnEvent_sourceHandlingUnitId_idx" ON "StockReturnEvent"("sourceHandlingUnitId");
CREATE INDEX "StockReturnEvent_targetHandlingUnitId_idx" ON "StockReturnEvent"("targetHandlingUnitId");
CREATE INDEX "StockReturnEvent_targetLocationId_idx" ON "StockReturnEvent"("targetLocationId");

ALTER TABLE "StockReturnEvent"
ADD CONSTRAINT "StockReturnEvent_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StockReturnEvent"
ADD CONSTRAINT "StockReturnEvent_orderItemId_fkey"
FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
