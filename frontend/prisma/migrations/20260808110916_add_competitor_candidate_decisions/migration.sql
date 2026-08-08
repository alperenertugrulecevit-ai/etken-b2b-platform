-- CreateEnum
CREATE TYPE "ProductCompetitorCandidateDecisionType" AS ENUM ('REJECTED');

-- CreateTable
CREATE TABLE "ProductCompetitorCandidateDecision" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'tenant_etken',
    "companyId" TEXT NOT NULL DEFAULT 'company_etken_office',
    "productId" INTEGER NOT NULL,
    "competitorSiteId" INTEGER NOT NULL,
    "candidateUrl" TEXT NOT NULL,
    "candidateTitle" TEXT,
    "decision" "ProductCompetitorCandidateDecisionType" NOT NULL DEFAULT 'REJECTED',
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductCompetitorCandidateDecision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductCompetitorCandidateDecision_tenantId_companyId_decis_idx" ON "ProductCompetitorCandidateDecision"("tenantId", "companyId", "decision");

-- CreateIndex
CREATE INDEX "ProductCompetitorCandidateDecision_productId_competitorSite_idx" ON "ProductCompetitorCandidateDecision"("productId", "competitorSiteId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCompetitorCandidateDecision_productId_competitorSite_key" ON "ProductCompetitorCandidateDecision"("productId", "competitorSiteId", "candidateUrl");

-- AddForeignKey
ALTER TABLE "ProductCompetitorCandidateDecision" ADD CONSTRAINT "ProductCompetitorCandidateDecision_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCompetitorCandidateDecision" ADD CONSTRAINT "ProductCompetitorCandidateDecision_competitorSiteId_fkey" FOREIGN KEY ("competitorSiteId") REFERENCES "CompetitorSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
