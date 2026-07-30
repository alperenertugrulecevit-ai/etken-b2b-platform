-- CreateTable
CREATE TABLE "B2BBankAccount" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "branchName" TEXT,
    "accountHolder" TEXT NOT NULL,
    "iban" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "B2BBankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderStatusHistory" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "note" TEXT,
    "changedByUserId" TEXT,
    "changedByUsername" TEXT,
    "visibleToCustomer" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "B2BBankAccount_tenantId_companyId_iban_key"
ON "B2BBankAccount"("tenantId", "companyId", "iban");

-- CreateIndex
CREATE INDEX "B2BBankAccount_tenantId_companyId_isActive_idx"
ON "B2BBankAccount"("tenantId", "companyId", "isActive");

-- CreateIndex
CREATE INDEX "OrderStatusHistory_orderId_createdAt_idx"
ON "OrderStatusHistory"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "OrderStatusHistory_orderId_visibleToCustomer_idx"
ON "OrderStatusHistory"("orderId", "visibleToCustomer");

-- AddForeignKey
ALTER TABLE "OrderStatusHistory"
ADD CONSTRAINT "OrderStatusHistory_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "Order"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill
INSERT INTO "OrderStatusHistory"
("orderId", "status", "note", "visibleToCustomer", "createdAt")
SELECT
  "id",
  "status",
  'Mevcut sipariş durumu sisteme aktarıldı.',
  true,
  "createdAt"
FROM "Order";
