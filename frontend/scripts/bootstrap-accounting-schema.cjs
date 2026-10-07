const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const statements = [
  // Runtime-safe compatibility bootstrap for migrations that production may not have applied yet.
  `ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "invoiceAddress" TEXT`,
  `ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "invoiceCity" TEXT`,
  `ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "invoiceDistrict" TEXT`,
  `ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "invoicePostalCode" TEXT`,
  `ALTER TABLE "B2BBankAccount" ADD COLUMN IF NOT EXISTS "bankCode" TEXT`,
  `ALTER TABLE "B2BBankAccount" ADD COLUMN IF NOT EXISTS "accountNo" TEXT`,
  `ALTER TABLE "B2BBankAccount" ADD COLUMN IF NOT EXISTS "swiftCode" TEXT`,
  `ALTER TABLE "B2BBankAccount" ADD COLUMN IF NOT EXISTS "apiProvider" TEXT`,
  `ALTER TABLE "B2BBankAccount" ADD COLUMN IF NOT EXISTS "apiEnabled" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "B2BBankAccount" ADD COLUMN IF NOT EXISTS "paymentNoteTemplate" TEXT NOT NULL DEFAULT 'Ödeme açıklamasına sipariş numaranızı yazınız: {ORDER_NUMBER}'`,
  `ALTER TABLE "ShippingCarrier" ADD COLUMN IF NOT EXISTS "trackingUrlTemplate" TEXT`,
  `ALTER TABLE "ShippingCarrier" ADD COLUMN IF NOT EXISTS "integrationProvider" TEXT`,
  `ALTER TABLE "ShippingCarrier" ADD COLUMN IF NOT EXISTS "integrationEnabled" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "ShippingCarrier" ADD COLUMN IF NOT EXISTS "integrationConfig" JSONB`,
  `CREATE TYPE "BankTransactionMatchStatus" AS ENUM ('UNMATCHED','MATCHED','IGNORED')`,
  `CREATE TABLE IF NOT EXISTS "BankTransaction" (
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
    CONSTRAINT "BankTransaction_pkey" PRIMARY KEY ("id")
  )`,
  `ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "B2BBankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
  `ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_matchedOrderId_fkey" FOREIGN KEY ("matchedOrderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "BankTransaction_bankAccountId_externalId_key" ON "BankTransaction"("bankAccountId","externalId")`,
  `CREATE INDEX IF NOT EXISTS "BankTransaction_tenantId_companyId_matchStatus_transactionDate_idx" ON "BankTransaction"("tenantId","companyId","matchStatus","transactionDate")`,
  `CREATE INDEX IF NOT EXISTS "BankTransaction_matchedOrderId_idx" ON "BankTransaction"("matchedOrderId")`,
  `CREATE TYPE "PaymentTransactionStatus" AS ENUM ('CREATED','PENDING','AUTHORIZED','PAID','FAILED','CANCELLED','REFUNDED','PARTIALLY_REFUNDED')`,
  `CREATE TYPE "CargoTrackingEventStatus" AS ENUM ('CREATED','LABEL_CREATED','PICKED_UP','IN_TRANSIT','AT_BRANCH','OUT_FOR_DELIVERY','DELIVERED','DELIVERY_FAILED','RETURNING','RETURNED','CANCELLED','UNKNOWN')`,
  `CREATE TABLE IF NOT EXISTS "PaymentTransaction" ("id" TEXT PRIMARY KEY,"orderId" INTEGER NOT NULL,"provider" TEXT NOT NULL,"externalId" TEXT,"status" "PaymentTransactionStatus" NOT NULL DEFAULT 'CREATED',"amount" DOUBLE PRECISION NOT NULL,"currency" TEXT NOT NULL DEFAULT 'TRY',"installment" INTEGER NOT NULL DEFAULT 1,"maskedCard" TEXT,"cardBrand" TEXT,"threeDSecure" BOOLEAN NOT NULL DEFAULT false,"providerReference" TEXT,"errorCode" TEXT,"errorMessage" TEXT,"rawPayload" JSONB,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"paidAt" TIMESTAMP(3),"refundedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS "CargoTrackingEvent" ("id" TEXT PRIMARY KEY,"orderId" INTEGER NOT NULL,"provider" TEXT NOT NULL,"trackingNumber" TEXT NOT NULL,"externalEventId" TEXT,"status" "CargoTrackingEventStatus" NOT NULL DEFAULT 'UNKNOWN',"description" TEXT,"location" TEXT,"eventAt" TIMESTAMP(3) NOT NULL,"rawPayload" JSONB,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS "PaymentGatewaySetting" ("id" SERIAL PRIMARY KEY,"tenantId" TEXT NOT NULL,"companyId" TEXT NOT NULL,"provider" TEXT NOT NULL,"displayName" TEXT NOT NULL,"isActive" BOOLEAN NOT NULL DEFAULT false,"testMode" BOOLEAN NOT NULL DEFAULT true,"threeDSecureRequired" BOOLEAN NOT NULL DEFAULT true,"installmentEnabled" BOOLEAN NOT NULL DEFAULT false,"config" JSONB,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  `ALTER TABLE "CargoTrackingEvent" ADD CONSTRAINT "CargoTrackingEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "PaymentTransaction_provider_externalId_key" ON "PaymentTransaction"("provider","externalId")`,
  `CREATE INDEX IF NOT EXISTS "PaymentTransaction_orderId_status_idx" ON "PaymentTransaction"("orderId","status")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "CargoTrackingEvent_provider_trackingNumber_externalEventId_key" ON "CargoTrackingEvent"("provider","trackingNumber","externalEventId")`,
  `CREATE INDEX IF NOT EXISTS "CargoTrackingEvent_orderId_eventAt_idx" ON "CargoTrackingEvent"("orderId","eventAt")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "PaymentGatewaySetting_tenantId_companyId_provider_key" ON "PaymentGatewaySetting"("tenantId","companyId","provider")`,
  `DO $ BEGIN CREATE TYPE "AccountingDocumentType" AS ENUM ('MEAL','FUEL','ENERGY','TELECOMMUNICATION','CONSUMABLE','WATER','OTHER_INCOME','OTHER_EXPENSE','PAYMENT_RECEIPT','INCOME_RECEIPT'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
  `DO $$ BEGIN CREATE TYPE "AccountingMovementType" AS ENUM ('EXPENSE','INCOME','PAYMENT_OUT','PAYMENT_IN'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
  `DO $$ BEGIN CREATE TYPE "AccountingPaymentType" AS ENUM ('CASH','DEFERRED','BANK_TRANSFER','CREDIT_CARD','OTHER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
  `DO $$ BEGIN CREATE TYPE "AccountingPartyType" AS ENUM ('CUSTOMER','SUPPLIER','OTHER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
  `CREATE TABLE IF NOT EXISTS "AccountingEntry" (
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
  )`,
  `DO $$ BEGIN ALTER TABLE "AccountingEntry" ADD CONSTRAINT "AccountingEntry_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
  `DO $$ BEGIN ALTER TABLE "AccountingEntry" ADD CONSTRAINT "AccountingEntry_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
  `CREATE INDEX IF NOT EXISTS "AccountingEntry_transactionDate_idx" ON "AccountingEntry"("transactionDate")`,
  `CREATE INDEX IF NOT EXISTS "AccountingEntry_companyName_idx" ON "AccountingEntry"("companyName")`,
  `CREATE INDEX IF NOT EXISTS "AccountingEntry_partyType_idx" ON "AccountingEntry"("partyType")`,
  `CREATE INDEX IF NOT EXISTS "AccountingEntry_customerId_transactionDate_idx" ON "AccountingEntry"("customerId","transactionDate")`,
  `CREATE INDEX IF NOT EXISTS "AccountingEntry_supplierId_transactionDate_idx" ON "AccountingEntry"("supplierId","transactionDate")`,
  `CREATE INDEX IF NOT EXISTS "AccountingEntry_documentType_idx" ON "AccountingEntry"("documentType")`,
  `CREATE INDEX IF NOT EXISTS "AccountingEntry_movementType_idx" ON "AccountingEntry"("movementType")`,
  `CREATE INDEX IF NOT EXISTS "AccountingEntry_paymentType_idx" ON "AccountingEntry"("paymentType")`,
  `CREATE INDEX IF NOT EXISTS "AccountingEntry_documentNo_idx" ON "AccountingEntry"("documentNo")`,
  `CREATE INDEX IF NOT EXISTS "AccountingEntry_bankReference_idx" ON "AccountingEntry"("bankReference")`,
];

async function main() {
  for (const sql of statements) {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch (error) {
      if (error?.meta?.code === "42710") continue;
      throw error;
    }
  }

  const invoiceColumns = await prisma.$queryRawUnsafe(
    `SELECT column_name
       FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'Order'
        AND column_name IN ('invoiceAddress', 'invoiceCity', 'invoiceDistrict', 'invoicePostalCode')`
  );

  const found = new Set(invoiceColumns.map((row) => row.column_name));
  const required = ["invoiceAddress", "invoiceCity", "invoiceDistrict", "invoicePostalCode"];
  const missing = required.filter((column) => !found.has(column));

  if (missing.length > 0) {
    throw new Error(`Order invoice schema bootstrap verification failed. Missing columns: ${missing.join(", ")}`);
  }

  const readiness = await prisma.$queryRawUnsafe(
    `SELECT
       to_regclass('"BankTransaction"') IS NOT NULL AS "bankTransactionReady",
       EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='B2BBankAccount' AND column_name='apiEnabled') AS "bankAccountReady",
       EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ShippingCarrier' AND column_name='integrationEnabled') AS "carrierReady",
       to_regclass('"PaymentTransaction"') IS NOT NULL AS "paymentReady",
       to_regclass('"CargoTrackingEvent"') IS NOT NULL AS "cargoEventReady",
       to_regclass('"PaymentGatewaySetting"') IS NOT NULL AS "gatewayReady"`
  );
  const ready = readiness[0];
  if (!ready?.bankTransactionReady || !ready?.bankAccountReady || !ready?.carrierReady || !ready?.paymentReady || !ready?.cargoEventReady || !ready?.gatewayReady) {
    throw new Error("Banking/cargo runtime schema bootstrap verification failed.");
  }

  console.log("Runtime schema bootstrap completed. Order invoice, banking, cargo tracking and payment gateway schema verified.");
}

main()
  .catch((error) => {
    console.error("Accounting schema bootstrap failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
