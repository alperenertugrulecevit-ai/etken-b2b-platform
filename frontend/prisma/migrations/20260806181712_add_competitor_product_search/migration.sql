-- AlterTable
ALTER TABLE "CompetitorSite" ADD COLUMN     "productUrlPattern" TEXT,
ADD COLUMN     "searchEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "searchResultLimit" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "searchUrlTemplate" TEXT;

-- CreateIndex
CREATE INDEX "CompetitorSite_searchEnabled_isActive_idx" ON "CompetitorSite"("searchEnabled", "isActive");
