-- ETKEN B2B müşteri hesabı ve sipariş kaynağı temeli

ALTER TYPE "UserType"
ADD VALUE IF NOT EXISTS 'CUSTOMER';

CREATE TYPE "OrderSource" AS ENUM (
  'ADMIN',
  'B2B',
  'IMPORT',
  'API'
);

CREATE TYPE "B2BPaymentMethod" AS ENUM (
  'BANK_TRANSFER',
  'CURRENT_ACCOUNT'
);

ALTER TABLE "User"
ADD COLUMN "customerId" INTEGER;

ALTER TABLE "Order"
ADD COLUMN "source" "OrderSource" NOT NULL DEFAULT 'ADMIN',
ADD COLUMN "paymentMethod" "B2BPaymentMethod",
ADD COLUMN "placedByUserId" TEXT,
ADD COLUMN "placedByUsername" TEXT;

ALTER TABLE "User"
ADD CONSTRAINT "User_customerId_fkey"
FOREIGN KEY ("customerId")
REFERENCES "Customer"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "Order"
ADD CONSTRAINT "Order_placedByUserId_fkey"
FOREIGN KEY ("placedByUserId")
REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

CREATE INDEX "User_customerId_status_idx"
ON "User"("customerId", "status");

CREATE INDEX "Order_placedByUserId_idx"
ON "Order"("placedByUserId");

CREATE INDEX "Order_source_status_idx"
ON "Order"("source", "status");
