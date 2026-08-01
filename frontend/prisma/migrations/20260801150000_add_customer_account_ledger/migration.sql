CREATE TYPE "CustomerAccountEntryDirection" AS ENUM (
  'DEBIT',
  'CREDIT'
);

CREATE TYPE "CustomerAccountEntryType" AS ENUM (
  'OPENING_BALANCE',
  'ORDER',
  'PAYMENT',
  'ADJUSTMENT',
  'REFUND',
  'CANCELLATION'
);

CREATE TYPE "CustomerAccountPaymentMethod" AS ENUM (
  'MANUAL',
  'BANK_TRANSFER',
  'CASH',
  'CREDIT_CARD',
  'OTHER'
);

CREATE TABLE "CustomerAccountEntry" (
  "id" SERIAL NOT NULL,
  "customerId" INTEGER NOT NULL,
  "orderId" INTEGER,
  "direction" "CustomerAccountEntryDirection" NOT NULL,
  "entryType" "CustomerAccountEntryType" NOT NULL,
  "paymentMethod" "CustomerAccountPaymentMethod",
  "amount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'TRY',
  "description" TEXT NOT NULL,
  "referenceNo" TEXT,
  "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dueDate" TIMESTAMP(3),
  "createdByUserId" TEXT,
  "createdByUsername" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CustomerAccountEntry_pkey"
    PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX
  "CustomerAccountEntry_orderId_entryType_direction_key"
ON "CustomerAccountEntry"(
  "orderId",
  "entryType",
  "direction"
);

CREATE INDEX
  "CustomerAccountEntry_customerId_transactionDate_idx"
ON "CustomerAccountEntry"(
  "customerId",
  "transactionDate"
);

CREATE INDEX
  "CustomerAccountEntry_customerId_dueDate_idx"
ON "CustomerAccountEntry"(
  "customerId",
  "dueDate"
);

CREATE INDEX
  "CustomerAccountEntry_customerId_direction_idx"
ON "CustomerAccountEntry"(
  "customerId",
  "direction"
);

CREATE INDEX
  "CustomerAccountEntry_orderId_idx"
ON "CustomerAccountEntry"(
  "orderId"
);

ALTER TABLE "CustomerAccountEntry"
ADD CONSTRAINT
  "CustomerAccountEntry_customerId_fkey"
FOREIGN KEY ("customerId")
REFERENCES "Customer"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE "CustomerAccountEntry"
ADD CONSTRAINT
  "CustomerAccountEntry_orderId_fkey"
FOREIGN KEY ("orderId")
REFERENCES "Order"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
