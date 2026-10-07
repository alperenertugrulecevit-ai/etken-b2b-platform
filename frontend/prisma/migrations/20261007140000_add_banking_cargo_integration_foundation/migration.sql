ALTER TABLE "B2BBankAccount"
ADD COLUMN "bankCode" TEXT,
ADD COLUMN "accountNo" TEXT,
ADD COLUMN "swiftCode" TEXT,
ADD COLUMN "apiProvider" TEXT,
ADD COLUMN "apiEnabled" BOOLEAN NOT NULL DEFAULT false;

CREATE TYPE "BankTransactionMatchStatus" AS ENUM ('UNMATCHED', 'MATCHED', 'IGNORED');

CREATE TABLE "BankTransaction" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL DEFAULT 'tenant_etken',
  "companyId" TEXT NOT NULL DEFAULT 'company_etken_office',
  "bankAccountId" INTEGER NOT NULL,
  "externalId" TEXT NOT NULL,
  "transactionDate" TIMESTAMP(3) NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'TRY',
  "senderName" TEXT,
  "senderIban" TEXT,
  "description" TEXT,
  "bankReference" TEXT,
  "matchStatus" "BankTransactionMatchStatus" NOT NULL DEFAULT 'UNMATCHED',
  "matchedOrderId" INTEGER,
  "matchedAt" TIMESTAMP(3),
  "matchedByUserId" TEXT,
  "matchedByName" TEXT,
  "rawPayload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BankTransaction_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BankTransaction_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "B2BBankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "BankTransaction_matchedOrderId_fkey" FOREIGN KEY ("matchedOrderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "BankTransaction_bankAccountId_externalId_key" ON "BankTransaction"("bankAccountId", "externalId");
CREATE INDEX "BankTransaction_tenantId_companyId_matchStatus_transactionDate_idx" ON "BankTransaction"("tenantId", "companyId", "matchStatus", "transactionDate");
CREATE INDEX "BankTransaction_matchedOrderId_idx" ON "BankTransaction"("matchedOrderId");

ALTER TABLE "ShippingCarrier"
ADD COLUMN "trackingUrlTemplate" TEXT,
ADD COLUMN "integrationProvider" TEXT,
ADD COLUMN "integrationEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "integrationConfig" JSONB;
