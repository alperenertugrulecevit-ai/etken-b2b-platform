-- B2C e-commerce customer and order channel support
CREATE TYPE "CustomerType" AS ENUM ('CORPORATE', 'INDIVIDUAL');

ALTER TABLE "Customer"
ADD COLUMN "customerType" "CustomerType" NOT NULL DEFAULT 'CORPORATE';

ALTER TYPE "OrderSource" ADD VALUE 'ECOMMERCE';
ALTER TYPE "B2BPaymentMethod" ADD VALUE 'CREDIT_CARD';

ALTER TABLE "Order"
ADD COLUMN "ecommerceEmail" TEXT,
ADD COLUMN "ecommercePhone" TEXT,
ADD COLUMN "invoiceType" TEXT,
ADD COLUMN "invoiceName" TEXT,
ADD COLUMN "invoiceTaxOffice" TEXT,
ADD COLUMN "invoiceTaxNumber" TEXT,
ADD COLUMN "paymentStatus" TEXT,
ADD COLUMN "paymentProvider" TEXT,
ADD COLUMN "paymentReference" TEXT;

CREATE INDEX "Customer_customerType_idx" ON "Customer"("customerType");
CREATE INDEX "Order_orderType_source_status_idx" ON "Order"("orderType", "source", "status");
