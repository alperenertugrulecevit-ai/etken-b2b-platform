-- CreateTable
CREATE TABLE "B2BCompanyProfile" (
  "id" SERIAL NOT NULL,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "brandName" TEXT NOT NULL,
  "legalName" TEXT NOT NULL,
  "taxOffice" TEXT,
  "taxNumber" TEXT,
  "mersisNumber" TEXT,
  "tradeRegistryNumber" TEXT,
  "authorizedPerson" TEXT,
  "phone" TEXT,
  "supportEmail" TEXT,
  "email" TEXT,
  "kepAddress" TEXT,
  "website" TEXT,
  "addressLine" TEXT,
  "city" TEXT,
  "district" TEXT,
  "postalCode" TEXT,
  "country" TEXT NOT NULL DEFAULT 'Türkiye',
  "workingHours" TEXT,
  "logoUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "B2BCompanyProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "B2BCompanyProfile_tenantId_companyId_key"
ON "B2BCompanyProfile"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "B2BCompanyProfile_tenantId_companyId_idx"
ON "B2BCompanyProfile"("tenantId", "companyId");
