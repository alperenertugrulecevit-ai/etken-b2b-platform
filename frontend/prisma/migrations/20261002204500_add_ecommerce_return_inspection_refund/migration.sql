CREATE TABLE "EcommerceReturnInspection" (
  "id" TEXT NOT NULL,
  "ecommerceReturnId" TEXT NOT NULL,
  "ecommerceReturnItemId" TEXT NOT NULL,
  "productId" INTEGER NOT NULL,
  "qualityResult" "EcommerceReturnQualityResult" NOT NULL,
  "refundStatus" "EcommerceReturnRefundStatus" NOT NULL,
  "refundAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "targetHandlingUnitId" INTEGER NOT NULL,
  "targetHandlingUnitBarcode" TEXT NOT NULL,
  "targetLocationId" INTEGER NOT NULL,
  "targetLocationCode" TEXT NOT NULL,
  "customerReason" TEXT,
  "qualityNote" TEXT,
  "inspectedByUserId" TEXT,
  "inspectedByName" TEXT,
  "inspectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EcommerceReturnInspection_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "EcommerceReturnRefund" (
  "id" TEXT NOT NULL,
  "ecommerceReturnId" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "status" "EcommerceReturnRefundStatus" NOT NULL DEFAULT 'WAITING',
  "provider" TEXT,
  "providerReference" TEXT,
  "requestedByUserId" TEXT,
  "requestedByName" TEXT,
  "requestedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EcommerceReturnRefund_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "EcommerceReturnInspection_ecommerceReturnId_inspectedAt_idx" ON "EcommerceReturnInspection"("ecommerceReturnId","inspectedAt");
CREATE INDEX "EcommerceReturnInspection_ecommerceReturnItemId_idx" ON "EcommerceReturnInspection"("ecommerceReturnItemId");
CREATE INDEX "EcommerceReturnInspection_productId_idx" ON "EcommerceReturnInspection"("productId");
CREATE INDEX "EcommerceReturnInspection_qualityResult_idx" ON "EcommerceReturnInspection"("qualityResult");
CREATE INDEX "EcommerceReturnInspection_refundStatus_idx" ON "EcommerceReturnInspection"("refundStatus");
CREATE INDEX "EcommerceReturnRefund_ecommerceReturnId_createdAt_idx" ON "EcommerceReturnRefund"("ecommerceReturnId","createdAt");
CREATE INDEX "EcommerceReturnRefund_status_idx" ON "EcommerceReturnRefund"("status");
CREATE INDEX "EcommerceReturnRefund_providerReference_idx" ON "EcommerceReturnRefund"("providerReference");
ALTER TABLE "EcommerceReturnInspection" ADD CONSTRAINT "EcommerceReturnInspection_ecommerceReturnId_fkey" FOREIGN KEY ("ecommerceReturnId") REFERENCES "EcommerceReturn"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EcommerceReturnInspection" ADD CONSTRAINT "EcommerceReturnInspection_ecommerceReturnItemId_fkey" FOREIGN KEY ("ecommerceReturnItemId") REFERENCES "EcommerceReturnItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EcommerceReturnRefund" ADD CONSTRAINT "EcommerceReturnRefund_ecommerceReturnId_fkey" FOREIGN KEY ("ecommerceReturnId") REFERENCES "EcommerceReturn"("id") ON DELETE CASCADE ON UPDATE CASCADE;
