ALTER TABLE "B2BBankAccount"
ADD COLUMN "accountNumber" TEXT,
ADD COLUMN "swiftCode" TEXT,
ADD COLUMN "paymentNoteTemplate" TEXT,
ADD COLUMN "integrationProvider" TEXT,
ADD COLUMN "integrationEnabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "ShippingCarrier"
ADD COLUMN "trackingUrlTemplate" TEXT,
ADD COLUMN "integrationProvider" TEXT,
ADD COLUMN "integrationEnabled" BOOLEAN NOT NULL DEFAULT false;
