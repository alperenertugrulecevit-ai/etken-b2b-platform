CREATE TYPE "AccountingDocumentType" AS ENUM ('MEAL','FUEL','ENERGY','TELECOMMUNICATION','CONSUMABLE','WATER','OTHER_INCOME','OTHER_EXPENSE','PAYMENT_RECEIPT','INCOME_RECEIPT');
CREATE TYPE "AccountingMovementType" AS ENUM ('EXPENSE','INCOME','PAYMENT_OUT','PAYMENT_IN');
CREATE TYPE "AccountingPaymentType" AS ENUM ('CASH','DEFERRED','BANK_TRANSFER','CREDIT_CARD','OTHER');
CREATE TYPE "AccountingPartyType" AS ENUM ('CUSTOMER','SUPPLIER','OTHER');

CREATE TABLE "AccountingEntry" (
  "id" TEXT NOT NULL,
  "transactionDate" TIMESTAMP(3) NOT NULL,
  "companyName" TEXT NOT NULL,
  "partyType" "AccountingPartyType" NOT NULL DEFAULT 'OTHER',
  "customerId" INTEGER,
  "supplierId" INTEGER,
  "documentType" "AccountingDocumentType" NOT NULL,
  "movementType" "AccountingMovementType" NOT NULL,
  "documentNo" TEXT,
  "paymentType" "AccountingPaymentType",
  "netAmount" DOUBLE PRECISION NOT NULL,
  "vatRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "vatAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalAmount" DOUBLE PRECISION NOT NULL,
  "description" TEXT,
  "bankName" TEXT,
  "bankReference" TEXT,
  "dueDate" TIMESTAMP(3),
  "createdByUserId" TEXT,
  "createdByName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AccountingEntry_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "AccountingEntry" ADD CONSTRAINT "AccountingEntry_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AccountingEntry" ADD CONSTRAINT "AccountingEntry_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "AccountingEntry_transactionDate_idx" ON "AccountingEntry"("transactionDate");
CREATE INDEX "AccountingEntry_companyName_idx" ON "AccountingEntry"("companyName");
CREATE INDEX "AccountingEntry_partyType_idx" ON "AccountingEntry"("partyType");
CREATE INDEX "AccountingEntry_customerId_transactionDate_idx" ON "AccountingEntry"("customerId","transactionDate");
CREATE INDEX "AccountingEntry_supplierId_transactionDate_idx" ON "AccountingEntry"("supplierId","transactionDate");
CREATE INDEX "AccountingEntry_documentType_idx" ON "AccountingEntry"("documentType");
CREATE INDEX "AccountingEntry_movementType_idx" ON "AccountingEntry"("movementType");
CREATE INDEX "AccountingEntry_paymentType_idx" ON "AccountingEntry"("paymentType");
CREATE INDEX "AccountingEntry_documentNo_idx" ON "AccountingEntry"("documentNo");
CREATE INDEX "AccountingEntry_bankReference_idx" ON "AccountingEntry"("bankReference");
