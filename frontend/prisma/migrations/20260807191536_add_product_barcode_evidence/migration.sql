-- CreateTable
CREATE TABLE "ProductBarcodeEvidence" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'tenant_etken',
    "companyId" TEXT NOT NULL DEFAULT 'company_etken_office',
    "productBarcodeId" INTEGER NOT NULL,
    "sourceType" "ProductBarcodeSourceType" NOT NULL,
    "sourceSite" TEXT NOT NULL,
    "sourcePageUrl" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductBarcodeEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductBarcodeEvidence_tenantId_companyId_idx" ON "ProductBarcodeEvidence"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "ProductBarcodeEvidence_productBarcodeId_idx" ON "ProductBarcodeEvidence"("productBarcodeId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductBarcodeEvidence_productBarcodeId_sourceSite_key" ON "ProductBarcodeEvidence"("productBarcodeId", "sourceSite");

-- AddForeignKey
ALTER TABLE "ProductBarcodeEvidence" ADD CONSTRAINT "ProductBarcodeEvidence_productBarcodeId_fkey" FOREIGN KEY ("productBarcodeId") REFERENCES "ProductBarcode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
