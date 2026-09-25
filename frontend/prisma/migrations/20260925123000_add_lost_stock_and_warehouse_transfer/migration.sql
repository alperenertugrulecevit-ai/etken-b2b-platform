-- Lost stock + general inter-warehouse transfer foundation
ALTER TYPE "StockMovementType" ADD VALUE IF NOT EXISTS 'LOST_STOCK_IN';
ALTER TYPE "StockMovementType" ADD VALUE IF NOT EXISTS 'LOST_STOCK_OUT';
ALTER TYPE "WmsOperationType" ADD VALUE IF NOT EXISTS 'LOST_STOCK';
ALTER TYPE "WmsOperationType" ADD VALUE IF NOT EXISTS 'WAREHOUSE_TRANSFER';

CREATE TYPE "WarehouseTransferType" AS ENUM ('PRODUCT', 'FULL_HU');
CREATE TYPE "WarehouseTransferStatus" AS ENUM ('COMPLETED', 'CANCELLED');

CREATE TABLE "WarehouseTransfer" (
  "id" TEXT NOT NULL,
  "transferNumber" TEXT NOT NULL,
  "transferType" "WarehouseTransferType" NOT NULL,
  "status" "WarehouseTransferStatus" NOT NULL DEFAULT 'COMPLETED',
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "sourceWarehouseId" INTEGER NOT NULL,
  "sourceWarehouseCode" TEXT NOT NULL,
  "targetWarehouseId" INTEGER NOT NULL,
  "targetWarehouseCode" TEXT NOT NULL,
  "sourceHandlingUnitId" INTEGER,
  "sourceHandlingUnitBarcode" TEXT,
  "targetHandlingUnitId" INTEGER,
  "targetHandlingUnitBarcode" TEXT,
  "operatorId" TEXT,
  "operatorName" TEXT,
  "terminalCode" TEXT,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "WarehouseTransfer_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WarehouseTransfer_transferNumber_key" ON "WarehouseTransfer"("transferNumber");
CREATE INDEX "WarehouseTransfer_tenantId_companyId_createdAt_idx" ON "WarehouseTransfer"("tenantId","companyId","createdAt");
CREATE INDEX "WarehouseTransfer_sourceWarehouseId_createdAt_idx" ON "WarehouseTransfer"("sourceWarehouseId","createdAt");
CREATE INDEX "WarehouseTransfer_targetWarehouseId_createdAt_idx" ON "WarehouseTransfer"("targetWarehouseId","createdAt");
CREATE INDEX "WarehouseTransfer_sourceHandlingUnitId_createdAt_idx" ON "WarehouseTransfer"("sourceHandlingUnitId","createdAt");
CREATE INDEX "WarehouseTransfer_targetHandlingUnitId_createdAt_idx" ON "WarehouseTransfer"("targetHandlingUnitId","createdAt");

CREATE TABLE "WarehouseTransferLine" (
  "id" TEXT NOT NULL,
  "transferId" TEXT NOT NULL,
  "productId" INTEGER NOT NULL,
  "productCode" TEXT NOT NULL,
  "productName" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "sourceLocationId" INTEGER,
  "sourceLocationCode" TEXT,
  "sourceHandlingUnitId" INTEGER,
  "sourceHandlingUnitBarcode" TEXT,
  "targetLocationId" INTEGER,
  "targetLocationCode" TEXT,
  "targetHandlingUnitId" INTEGER,
  "targetHandlingUnitBarcode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WarehouseTransferLine_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "WarehouseTransferLine_transferId_idx" ON "WarehouseTransferLine"("transferId");
CREATE INDEX "WarehouseTransferLine_productId_createdAt_idx" ON "WarehouseTransferLine"("productId","createdAt");
CREATE INDEX "WarehouseTransferLine_sourceHandlingUnitId_createdAt_idx" ON "WarehouseTransferLine"("sourceHandlingUnitId","createdAt");
CREATE INDEX "WarehouseTransferLine_targetHandlingUnitId_createdAt_idx" ON "WarehouseTransferLine"("targetHandlingUnitId","createdAt");
ALTER TABLE "WarehouseTransferLine" ADD CONSTRAINT "WarehouseTransferLine_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "WarehouseTransfer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "LostStockRecord" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "productId" INTEGER NOT NULL,
  "productCode" TEXT NOT NULL,
  "productName" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "sourceWarehouseId" INTEGER NOT NULL,
  "sourceWarehouseCode" TEXT NOT NULL,
  "sourceLocationId" INTEGER NOT NULL,
  "sourceLocationCode" TEXT NOT NULL,
  "sourceHandlingUnitId" INTEGER NOT NULL,
  "sourceHandlingUnitBarcode" TEXT NOT NULL,
  "lostWarehouseId" INTEGER NOT NULL,
  "lostWarehouseCode" TEXT NOT NULL,
  "lostLocationId" INTEGER NOT NULL,
  "lostLocationCode" TEXT NOT NULL,
  "lostHandlingUnitId" INTEGER,
  "lostHandlingUnitBarcode" TEXT,
  "orderId" INTEGER,
  "orderItemId" INTEGER,
  "operatorId" TEXT,
  "operatorName" TEXT,
  "terminalCode" TEXT,
  "stockMovementDocumentNo" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LostStockRecord_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "LostStockRecord_tenantId_companyId_createdAt_idx" ON "LostStockRecord"("tenantId","companyId","createdAt");
CREATE INDEX "LostStockRecord_productId_createdAt_idx" ON "LostStockRecord"("productId","createdAt");
CREATE INDEX "LostStockRecord_sourceWarehouseId_createdAt_idx" ON "LostStockRecord"("sourceWarehouseId","createdAt");
CREATE INDEX "LostStockRecord_lostWarehouseId_createdAt_idx" ON "LostStockRecord"("lostWarehouseId","createdAt");
CREATE INDEX "LostStockRecord_sourceHandlingUnitId_createdAt_idx" ON "LostStockRecord"("sourceHandlingUnitId","createdAt");
CREATE INDEX "LostStockRecord_orderId_createdAt_idx" ON "LostStockRecord"("orderId","createdAt");
