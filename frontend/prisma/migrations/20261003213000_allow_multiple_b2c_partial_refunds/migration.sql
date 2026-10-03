ALTER TABLE "CustomerAccountEntry"
ADD COLUMN "ecommerceReturnRefundId" TEXT;

DROP INDEX IF EXISTS "CustomerAccountEntry_orderId_entryType_direction_key";

CREATE INDEX "CustomerAccountEntry_orderId_entryType_direction_idx"
ON "CustomerAccountEntry"("orderId", "entryType", "direction");

CREATE UNIQUE INDEX "CustomerAccountEntry_single_order_debit_key"
ON "CustomerAccountEntry"("orderId")
WHERE "orderId" IS NOT NULL
  AND "entryType" = 'ORDER'::"CustomerAccountEntryType"
  AND "direction" = 'DEBIT'::"CustomerAccountEntryDirection";

CREATE UNIQUE INDEX "CustomerAccountEntry_single_payment_credit_key"
ON "CustomerAccountEntry"("orderId")
WHERE "orderId" IS NOT NULL
  AND "entryType" = 'PAYMENT'::"CustomerAccountEntryType"
  AND "direction" = 'CREDIT'::"CustomerAccountEntryDirection";

CREATE UNIQUE INDEX "CustomerAccountEntry_single_cancellation_credit_key"
ON "CustomerAccountEntry"("orderId")
WHERE "orderId" IS NOT NULL
  AND "entryType" = 'CANCELLATION'::"CustomerAccountEntryType"
  AND "direction" = 'CREDIT'::"CustomerAccountEntryDirection";

CREATE UNIQUE INDEX "CustomerAccountEntry_ecommerceReturnRefundId_key"
ON "CustomerAccountEntry"("ecommerceReturnRefundId")
WHERE "ecommerceReturnRefundId" IS NOT NULL;
