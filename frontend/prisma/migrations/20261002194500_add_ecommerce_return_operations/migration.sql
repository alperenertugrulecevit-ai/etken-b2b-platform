CREATE TYPE "EcommerceReturnPreReceiptMode" AS ENUM ('RETURN_CODE', 'CARGO_BARCODE');
CREATE TYPE "EcommerceReturnPreReceiptMatchStatus" AS ENUM ('MATCHED', 'UNMATCHED', 'CONFLICT');
CREATE TYPE "EcommerceReturnPreReceiptOutcome" AS ENUM ('RETURN_ENTRY_PENDING', 'UNDELIVERED_RETURN', 'RETURN_TO_CARRIER', 'RETURNED_TO_CARRIER', 'CARRIER_STATUS_UNVERIFIED');
CREATE TYPE "EcommerceReturnStatus" AS ENUM ('PRE_RECEIVED', 'RECEIVING', 'QUALITY_CONTROL', 'PARTIALLY_COMPLETED', 'WAREHOUSE_COMPLETED', 'FINANCE_PENDING', 'COMPLETED', 'REJECTED', 'CANCELLED');
CREATE TYPE "EcommerceReturnQualityResult" AS ENUM ('SELLABLE', 'PACKAGING_DAMAGED', 'PRODUCT_DAMAGED', 'MISSING_PART', 'USED', 'WRONG_PRODUCT', 'REVIEW_REQUIRED');
CREATE TYPE "EcommerceReturnRefundStatus" AS ENUM ('WAITING', 'ELIGIBLE', 'REVIEW_REQUIRED', 'REQUESTED', 'REFUNDED', 'REJECTED');

CREATE TABLE "EcommerceReturn" (
  "id" TEXT NOT NULL,
  "returnNumber" TEXT NOT NULL,
  "originalOrderId" INTEGER NOT NULL,
  "externalReturnCode" TEXT,
  "status" "EcommerceReturnStatus" NOT NULL DEFAULT 'PRE_RECEIVED',
  "refundStatus" "EcommerceReturnRefundStatus" NOT NULL DEFAULT 'WAITING',
  "receivedAt" TIMESTAMP(3),
  "warehouseCompletedAt" TIMESTAMP(3),
  "financeCompletedAt" TIMESTAMP(3),
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EcommerceReturn_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EcommerceReturnItem" (
  "id" TEXT NOT NULL,
  "ecommerceReturnId" TEXT NOT NULL,
  "orderItemId" INTEGER NOT NULL,
  "productId" INTEGER NOT NULL,
  "productCode" TEXT NOT NULL,
  "productBarcode" TEXT NOT NULL,
  "productName" TEXT NOT NULL,
  "expectedQuantity" INTEGER NOT NULL,
  "receivedQuantity" INTEGER NOT NULL DEFAULT 0,
  "acceptedQuantity" INTEGER NOT NULL DEFAULT 0,
  "rejectedQuantity" INTEGER NOT NULL DEFAULT 0,
  "qualityResult" "EcommerceReturnQualityResult",
  "refundStatus" "EcommerceReturnRefundStatus" NOT NULL DEFAULT 'WAITING',
  "refundAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "customerReason" TEXT,
  "qualityNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EcommerceReturnItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EcommerceReturnPreReceipt" (
  "id" TEXT NOT NULL,
  "preReceiptNumber" TEXT NOT NULL,
  "warehouseId" INTEGER NOT NULL,
  "carrierId" TEXT NOT NULL,
  "mode" "EcommerceReturnPreReceiptMode" NOT NULL,
  "scannedCode" TEXT NOT NULL,
  "returnCode" TEXT,
  "cargoBarcode" TEXT,
  "originalOrderId" INTEGER,
  "ecommerceReturnId" TEXT,
  "matchStatus" "EcommerceReturnPreReceiptMatchStatus" NOT NULL,
  "outcome" "EcommerceReturnPreReceiptOutcome" NOT NULL,
  "carrierStatus" TEXT,
  "lateDetected" BOOLEAN NOT NULL DEFAULT false,
  "receivedByUserId" TEXT,
  "receivedByName" TEXT,
  "terminalCode" TEXT,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "returnedToCarrierAt" TIMESTAMP(3),
  "returnedToCarrierBy" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EcommerceReturnPreReceipt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EcommerceReturn_returnNumber_key" ON "EcommerceReturn"("returnNumber");
CREATE INDEX "EcommerceReturn_originalOrderId_idx" ON "EcommerceReturn"("originalOrderId");
CREATE INDEX "EcommerceReturn_externalReturnCode_idx" ON "EcommerceReturn"("externalReturnCode");
CREATE INDEX "EcommerceReturn_status_idx" ON "EcommerceReturn"("status");
CREATE INDEX "EcommerceReturn_refundStatus_idx" ON "EcommerceReturn"("refundStatus");

CREATE UNIQUE INDEX "EcommerceReturnItem_ecommerceReturnId_orderItemId_key" ON "EcommerceReturnItem"("ecommerceReturnId","orderItemId");
CREATE INDEX "EcommerceReturnItem_orderItemId_idx" ON "EcommerceReturnItem"("orderItemId");
CREATE INDEX "EcommerceReturnItem_productId_idx" ON "EcommerceReturnItem"("productId");
CREATE INDEX "EcommerceReturnItem_qualityResult_idx" ON "EcommerceReturnItem"("qualityResult");
CREATE INDEX "EcommerceReturnItem_refundStatus_idx" ON "EcommerceReturnItem"("refundStatus");

CREATE UNIQUE INDEX "EcommerceReturnPreReceipt_preReceiptNumber_key" ON "EcommerceReturnPreReceipt"("preReceiptNumber");
CREATE UNIQUE INDEX "EcommerceReturnPreReceipt_carrierId_mode_scannedCode_key" ON "EcommerceReturnPreReceipt"("carrierId","mode","scannedCode");
CREATE INDEX "EcommerceReturnPreReceipt_warehouseId_receivedAt_idx" ON "EcommerceReturnPreReceipt"("warehouseId","receivedAt");
CREATE INDEX "EcommerceReturnPreReceipt_carrierId_receivedAt_idx" ON "EcommerceReturnPreReceipt"("carrierId","receivedAt");
CREATE INDEX "EcommerceReturnPreReceipt_originalOrderId_idx" ON "EcommerceReturnPreReceipt"("originalOrderId");
CREATE INDEX "EcommerceReturnPreReceipt_ecommerceReturnId_idx" ON "EcommerceReturnPreReceipt"("ecommerceReturnId");
CREATE INDEX "EcommerceReturnPreReceipt_matchStatus_idx" ON "EcommerceReturnPreReceipt"("matchStatus");
CREATE INDEX "EcommerceReturnPreReceipt_outcome_idx" ON "EcommerceReturnPreReceipt"("outcome");
CREATE INDEX "EcommerceReturnPreReceipt_lateDetected_idx" ON "EcommerceReturnPreReceipt"("lateDetected");

ALTER TABLE "EcommerceReturn" ADD CONSTRAINT "EcommerceReturn_originalOrderId_fkey" FOREIGN KEY ("originalOrderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EcommerceReturnItem" ADD CONSTRAINT "EcommerceReturnItem_ecommerceReturnId_fkey" FOREIGN KEY ("ecommerceReturnId") REFERENCES "EcommerceReturn"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EcommerceReturnItem" ADD CONSTRAINT "EcommerceReturnItem_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EcommerceReturnPreReceipt" ADD CONSTRAINT "EcommerceReturnPreReceipt_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EcommerceReturnPreReceipt" ADD CONSTRAINT "EcommerceReturnPreReceipt_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "ShippingCarrier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EcommerceReturnPreReceipt" ADD CONSTRAINT "EcommerceReturnPreReceipt_originalOrderId_fkey" FOREIGN KEY ("originalOrderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EcommerceReturnPreReceipt" ADD CONSTRAINT "EcommerceReturnPreReceipt_ecommerceReturnId_fkey" FOREIGN KEY ("ecommerceReturnId") REFERENCES "EcommerceReturn"("id") ON DELETE SET NULL ON UPDATE CASCADE;
