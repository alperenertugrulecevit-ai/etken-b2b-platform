-- CreateEnum
CREATE TYPE "BarcodeRecoveryStatus" AS ENUM ('PENDING', 'SUCCESS', 'REVIEW', 'NO_CANDIDATE', 'NO_BARCODE', 'ERROR');

-- CreateTable
CREATE TABLE "BarcodeRecoveryAttempt" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'tenant_etken',
    "companyId" TEXT NOT NULL DEFAULT 'company_etken_office',
    "productId" INTEGER NOT NULL,
    "sourceSite" TEXT NOT NULL DEFAULT 'AVANSAS',
    "status" "BarcodeRecoveryStatus" NOT NULL DEFAULT 'PENDING',
    "candidateTitle" TEXT,
    "candidateUrl" TEXT,
    "candidateScore" INTEGER,
    "barcodeCount" INTEGER NOT NULL DEFAULT 0,
    "message" TEXT,
    "attemptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BarcodeRecoveryAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BarcodeRecoveryAttempt_tenantId_companyId_status_idx" ON "BarcodeRecoveryAttempt"("tenantId", "companyId", "status");

-- CreateIndex
CREATE INDEX "BarcodeRecoveryAttempt_productId_status_idx" ON "BarcodeRecoveryAttempt"("productId", "status");

-- CreateIndex
CREATE INDEX "BarcodeRecoveryAttempt_attemptedAt_idx" ON "BarcodeRecoveryAttempt"("attemptedAt");

-- CreateIndex
CREATE UNIQUE INDEX "BarcodeRecoveryAttempt_productId_sourceSite_key" ON "BarcodeRecoveryAttempt"("productId", "sourceSite");

-- AddForeignKey
ALTER TABLE "BarcodeRecoveryAttempt" ADD CONSTRAINT "BarcodeRecoveryAttempt_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
