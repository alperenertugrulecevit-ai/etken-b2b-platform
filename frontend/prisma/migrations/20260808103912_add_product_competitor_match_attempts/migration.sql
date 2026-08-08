-- CreateEnum
CREATE TYPE "ProductCompetitorMatchStatus" AS ENUM ('PENDING', 'AUTO_MATCHED', 'REVIEW', 'NO_MATCH', 'SEARCH_ERROR');

-- CreateTable
CREATE TABLE "ProductCompetitorMatchAttempt" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'tenant_etken',
    "companyId" TEXT NOT NULL DEFAULT 'company_etken_office',
    "productId" INTEGER NOT NULL,
    "competitorSiteId" INTEGER NOT NULL,
    "status" "ProductCompetitorMatchStatus" NOT NULL DEFAULT 'PENDING',
    "candidateTitle" TEXT,
    "candidateUrl" TEXT,
    "candidateScore" INTEGER,
    "highConfidenceCount" INTEGER NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "rejectedCount" INTEGER NOT NULL DEFAULT 0,
    "message" TEXT,
    "searchedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductCompetitorMatchAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductCompetitorMatchAttempt_tenantId_companyId_status_idx" ON "ProductCompetitorMatchAttempt"("tenantId", "companyId", "status");

-- CreateIndex
CREATE INDEX "ProductCompetitorMatchAttempt_productId_status_idx" ON "ProductCompetitorMatchAttempt"("productId", "status");

-- CreateIndex
CREATE INDEX "ProductCompetitorMatchAttempt_competitorSiteId_status_idx" ON "ProductCompetitorMatchAttempt"("competitorSiteId", "status");

-- CreateIndex
CREATE INDEX "ProductCompetitorMatchAttempt_searchedAt_idx" ON "ProductCompetitorMatchAttempt"("searchedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCompetitorMatchAttempt_productId_competitorSiteId_key" ON "ProductCompetitorMatchAttempt"("productId", "competitorSiteId");

-- AddForeignKey
ALTER TABLE "ProductCompetitorMatchAttempt" ADD CONSTRAINT "ProductCompetitorMatchAttempt_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCompetitorMatchAttempt" ADD CONSTRAINT "ProductCompetitorMatchAttempt_competitorSiteId_fkey" FOREIGN KEY ("competitorSiteId") REFERENCES "CompetitorSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
