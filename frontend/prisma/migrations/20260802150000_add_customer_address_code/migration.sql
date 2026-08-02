-- Add a stable customer-scoped address code.
ALTER TABLE "CustomerAddress"
ADD COLUMN "addressCode" TEXT;

UPDATE "CustomerAddress"
SET "addressCode" = 'ADR-' || LPAD("id"::TEXT, 4, '0')
WHERE "addressCode" IS NULL;

ALTER TABLE "CustomerAddress"
ALTER COLUMN "addressCode" SET NOT NULL;

CREATE UNIQUE INDEX "CustomerAddress_customerId_addressCode_key"
ON "CustomerAddress"("customerId", "addressCode");
