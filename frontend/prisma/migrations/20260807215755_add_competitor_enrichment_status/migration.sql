-- CreateEnum
CREATE TYPE "CompetitorProductEnrichmentStatus" AS ENUM ('PENDING', 'SUCCESS', 'PARTIAL', 'ERROR');

-- AlterTable
ALTER TABLE "CompetitorProduct" ADD COLUMN     "enrichmentBarcodeCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "enrichmentImageCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "enrichmentMessage" TEXT,
ADD COLUMN     "enrichmentStatus" "CompetitorProductEnrichmentStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "lastEnrichedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "CompetitorProduct_enrichmentStatus_isActive_idx" ON "CompetitorProduct"("enrichmentStatus", "isActive");
