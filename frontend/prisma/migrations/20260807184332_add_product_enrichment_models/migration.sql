-- CreateEnum
CREATE TYPE "ProductBarcodeType" AS ENUM ('EAN13', 'EAN8', 'UPC', 'GTIN', 'MANUFACTURER', 'UNIT', 'PACKAGE', 'CASE', 'SUPPLIER', 'OTHER');

-- CreateEnum
CREATE TYPE "ProductBarcodeSourceType" AS ENUM ('LEGACY', 'COMPETITOR_SITE', 'MANUFACTURER_SITE', 'SUPPLIER', 'MANUAL', 'IMPORT', 'API', 'OTHER');

-- CreateEnum
CREATE TYPE "ProductImageSourceType" AS ENUM ('LEGACY', 'COMPETITOR_SITE', 'MANUFACTURER_SITE', 'SUPPLIER', 'MANUAL', 'IMPORT', 'API', 'OTHER');

-- CreateTable
CREATE TABLE "ProductBarcode" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'tenant_etken',
    "companyId" TEXT NOT NULL DEFAULT 'company_etken_office',
    "productId" INTEGER NOT NULL,
    "barcode" TEXT NOT NULL,
    "barcodeType" "ProductBarcodeType" NOT NULL,
    "sourceType" "ProductBarcodeSourceType" NOT NULL DEFAULT 'MANUAL',
    "sourceSite" TEXT,
    "sourcePageUrl" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationCount" INTEGER NOT NULL DEFAULT 0,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductBarcode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductImageSource" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'tenant_etken',
    "companyId" TEXT NOT NULL DEFAULT 'company_etken_office',
    "productId" INTEGER NOT NULL,
    "sourceType" "ProductImageSourceType" NOT NULL DEFAULT 'MANUAL',
    "sourceSite" TEXT,
    "sourcePageUrl" TEXT,
    "sourceUrl" TEXT NOT NULL,
    "storageObjectName" TEXT,
    "storageUrl" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationCount" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductImageSource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductBarcode_productId_idx" ON "ProductBarcode"("productId");

-- CreateIndex
CREATE INDEX "ProductBarcode_productId_barcodeType_idx" ON "ProductBarcode"("productId", "barcodeType");

-- CreateIndex
CREATE INDEX "ProductBarcode_tenantId_companyId_productId_idx" ON "ProductBarcode"("tenantId", "companyId", "productId");

-- CreateIndex
CREATE INDEX "ProductBarcode_tenantId_companyId_isVerified_idx" ON "ProductBarcode"("tenantId", "companyId", "isVerified");

-- CreateIndex
CREATE UNIQUE INDEX "ProductBarcode_tenantId_companyId_barcode_key" ON "ProductBarcode"("tenantId", "companyId", "barcode");

-- CreateIndex
CREATE INDEX "ProductImageSource_tenantId_companyId_productId_idx" ON "ProductImageSource"("tenantId", "companyId", "productId");

-- CreateIndex
CREATE INDEX "ProductImageSource_productId_isPrimary_idx" ON "ProductImageSource"("productId", "isPrimary");

-- CreateIndex
CREATE INDEX "ProductImageSource_productId_isVerified_idx" ON "ProductImageSource"("productId", "isVerified");

-- CreateIndex
CREATE INDEX "ProductImageSource_productId_sortOrder_idx" ON "ProductImageSource"("productId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ProductImageSource_productId_sourceUrl_key" ON "ProductImageSource"("productId", "sourceUrl");

-- AddForeignKey
ALTER TABLE "ProductBarcode" ADD CONSTRAINT "ProductBarcode_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImageSource" ADD CONSTRAINT "ProductImageSource_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
