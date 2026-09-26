CREATE TYPE "OrderType" AS ENUM ('ECOMMERCE', 'STORE', 'CUSTOMER', 'OTHER');

ALTER TABLE "Order"
  ADD COLUMN "orderType" "OrderType" NOT NULL DEFAULT 'CUSTOMER',
  ADD COLUMN "fulfillmentWarehouseId" INTEGER;

CREATE TABLE "OrderPickingAssignment" (
  "id" TEXT NOT NULL,
  "orderId" INTEGER NOT NULL,
  "userId" TEXT NOT NULL,
  "warehouseId" INTEGER NOT NULL,
  "assignedById" TEXT,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrderPickingAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrderPickingAssignment_orderId_key" ON "OrderPickingAssignment"("orderId");
CREATE INDEX "Order_orderType_status_idx" ON "Order"("orderType", "status");
CREATE INDEX "Order_fulfillmentWarehouseId_status_idx" ON "Order"("fulfillmentWarehouseId", "status");
CREATE INDEX "OrderPickingAssignment_userId_completedAt_cancelledAt_idx" ON "OrderPickingAssignment"("userId", "completedAt", "cancelledAt");
CREATE INDEX "OrderPickingAssignment_warehouseId_completedAt_cancelledAt_idx" ON "OrderPickingAssignment"("warehouseId", "completedAt", "cancelledAt");

ALTER TABLE "Order" ADD CONSTRAINT "Order_fulfillmentWarehouseId_fkey"
  FOREIGN KEY ("fulfillmentWarehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrderPickingAssignment" ADD CONSTRAINT "OrderPickingAssignment_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderPickingAssignment" ADD CONSTRAINT "OrderPickingAssignment_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrderPickingAssignment" ADD CONSTRAINT "OrderPickingAssignment_warehouseId_fkey"
  FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrderPickingAssignment" ADD CONSTRAINT "OrderPickingAssignment_assignedById_fkey"
  FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
