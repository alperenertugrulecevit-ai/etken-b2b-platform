-- CreateEnum
CREATE TYPE "CompetitorSourceType" AS ENUM ('MANUAL', 'HTML', 'API', 'EXCEL');

-- CreateEnum
CREATE TYPE "CompetitorStockStatus" AS ENUM ('UNKNOWN', 'IN_STOCK', 'OUT_OF_STOCK', 'PREORDER');

-- CreateEnum
CREATE TYPE "CompetitorPriceFetchStatus" AS ENUM ('SUCCESS', 'PRODUCT_NOT_FOUND', 'PRICE_NOT_FOUND', 'BLOCKED', 'INVALID_RESPONSE', 'ERROR');

-- CreateEnum
CREATE TYPE "CompetitorPriceRunStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'PARTIALLY_COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "CompetitorSite" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'tenant_etken',
    "companyId" TEXT NOT NULL DEFAULT 'company_etken_office',
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "sourceType" "CompetitorSourceType" NOT NULL DEFAULT 'MANUAL',
    "defaultVatRate" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetitorSite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitorProduct" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'tenant_etken',
    "companyId" TEXT NOT NULL DEFAULT 'company_etken_office',
    "productId" INTEGER NOT NULL,
    "competitorSiteId" INTEGER NOT NULL,
    "competitorSku" TEXT,
    "competitorName" TEXT,
    "productUrl" TEXT NOT NULL,
    "vatRate" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastPriceExclVat" DOUBLE PRECISION,
    "lastPriceInclVat" DOUBLE PRECISION,
    "lastCurrency" TEXT NOT NULL DEFAULT 'TRY',
    "lastStockStatus" "CompetitorStockStatus" NOT NULL DEFAULT 'UNKNOWN',
    "lastCheckedAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetitorProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitorPriceHistory" (
    "id" SERIAL NOT NULL,
    "competitorProductId" INTEGER NOT NULL,
    "priceRunId" INTEGER,
    "priceExclVat" DOUBLE PRECISION,
    "priceInclVat" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "vatRate" INTEGER,
    "stockStatus" "CompetitorStockStatus" NOT NULL DEFAULT 'UNKNOWN',
    "fetchStatus" "CompetitorPriceFetchStatus" NOT NULL,
    "rawPriceText" TEXT,
    "errorMessage" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompetitorPriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitorPriceRun" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'tenant_etken',
    "companyId" TEXT NOT NULL DEFAULT 'company_etken_office',
    "competitorSiteId" INTEGER,
    "status" "CompetitorPriceRunStatus" NOT NULL DEFAULT 'PENDING',
    "requestedCount" INTEGER NOT NULL DEFAULT 0,
    "processedCount" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetitorPriceRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompetitorSite_tenantId_companyId_isActive_idx" ON "CompetitorSite"("tenantId", "companyId", "isActive");

-- CreateIndex
CREATE INDEX "CompetitorSite_sourceType_isActive_idx" ON "CompetitorSite"("sourceType", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitorSite_tenantId_companyId_code_key" ON "CompetitorSite"("tenantId", "companyId", "code");

-- CreateIndex
CREATE INDEX "CompetitorProduct_tenantId_companyId_isActive_idx" ON "CompetitorProduct"("tenantId", "companyId", "isActive");

-- CreateIndex
CREATE INDEX "CompetitorProduct_productId_isActive_idx" ON "CompetitorProduct"("productId", "isActive");

-- CreateIndex
CREATE INDEX "CompetitorProduct_competitorSiteId_isActive_idx" ON "CompetitorProduct"("competitorSiteId", "isActive");

-- CreateIndex
CREATE INDEX "CompetitorProduct_lastCheckedAt_idx" ON "CompetitorProduct"("lastCheckedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitorProduct_competitorSiteId_productId_key" ON "CompetitorProduct"("competitorSiteId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitorProduct_competitorSiteId_productUrl_key" ON "CompetitorProduct"("competitorSiteId", "productUrl");

-- CreateIndex
CREATE INDEX "CompetitorPriceHistory_competitorProductId_checkedAt_idx" ON "CompetitorPriceHistory"("competitorProductId", "checkedAt");

-- CreateIndex
CREATE INDEX "CompetitorPriceHistory_priceRunId_idx" ON "CompetitorPriceHistory"("priceRunId");

-- CreateIndex
CREATE INDEX "CompetitorPriceHistory_fetchStatus_checkedAt_idx" ON "CompetitorPriceHistory"("fetchStatus", "checkedAt");

-- CreateIndex
CREATE INDEX "CompetitorPriceRun_tenantId_companyId_createdAt_idx" ON "CompetitorPriceRun"("tenantId", "companyId", "createdAt");

-- CreateIndex
CREATE INDEX "CompetitorPriceRun_competitorSiteId_createdAt_idx" ON "CompetitorPriceRun"("competitorSiteId", "createdAt");

-- CreateIndex
CREATE INDEX "CompetitorPriceRun_status_createdAt_idx" ON "CompetitorPriceRun"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "CompetitorProduct" ADD CONSTRAINT "CompetitorProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitorProduct" ADD CONSTRAINT "CompetitorProduct_competitorSiteId_fkey" FOREIGN KEY ("competitorSiteId") REFERENCES "CompetitorSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitorPriceHistory" ADD CONSTRAINT "CompetitorPriceHistory_competitorProductId_fkey" FOREIGN KEY ("competitorProductId") REFERENCES "CompetitorProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitorPriceHistory" ADD CONSTRAINT "CompetitorPriceHistory_priceRunId_fkey" FOREIGN KEY ("priceRunId") REFERENCES "CompetitorPriceRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitorPriceRun" ADD CONSTRAINT "CompetitorPriceRun_competitorSiteId_fkey" FOREIGN KEY ("competitorSiteId") REFERENCES "CompetitorSite"("id") ON DELETE SET NULL ON UPDATE CASCADE;
