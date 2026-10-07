DO $$ BEGIN
 CREATE TYPE "PaymentTransactionStatus" AS ENUM ('CREATED','PENDING','AUTHORIZED','PAID','FAILED','CANCELLED','REFUNDED','PARTIALLY_REFUNDED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
 CREATE TYPE "CargoTrackingEventStatus" AS ENUM ('CREATED','LABEL_CREATED','PICKED_UP','IN_TRANSIT','AT_BRANCH','OUT_FOR_DELIVERY','DELIVERED','DELIVERY_FAILED','RETURNING','RETURNED','CANCELLED','UNKNOWN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "PaymentTransaction" (
 "id" TEXT PRIMARY KEY, "orderId" INTEGER NOT NULL, "provider" TEXT NOT NULL, "externalId" TEXT,
 "status" "PaymentTransactionStatus" NOT NULL DEFAULT 'CREATED', "amount" DOUBLE PRECISION NOT NULL,
 "currency" TEXT NOT NULL DEFAULT 'TRY', "installment" INTEGER NOT NULL DEFAULT 1, "maskedCard" TEXT,
 "cardBrand" TEXT, "threeDSecure" BOOLEAN NOT NULL DEFAULT false, "providerReference" TEXT,
 "errorCode" TEXT, "errorMessage" TEXT, "rawPayload" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "paidAt" TIMESTAMP(3), "refundedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS "CargoTrackingEvent" (
 "id" TEXT PRIMARY KEY, "orderId" INTEGER NOT NULL, "provider" TEXT NOT NULL, "trackingNumber" TEXT NOT NULL,
 "externalEventId" TEXT, "status" "CargoTrackingEventStatus" NOT NULL DEFAULT 'UNKNOWN', "description" TEXT,
 "location" TEXT, "eventAt" TIMESTAMP(3) NOT NULL, "rawPayload" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "PaymentGatewaySetting" (
 "id" SERIAL PRIMARY KEY, "tenantId" TEXT NOT NULL, "companyId" TEXT NOT NULL, "provider" TEXT NOT NULL,
 "displayName" TEXT NOT NULL, "isActive" BOOLEAN NOT NULL DEFAULT false, "testMode" BOOLEAN NOT NULL DEFAULT true,
 "threeDSecureRequired" BOOLEAN NOT NULL DEFAULT true, "installmentEnabled" BOOLEAN NOT NULL DEFAULT false,
 "config" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentTransaction_provider_externalId_key" ON "PaymentTransaction"("provider","externalId");
CREATE INDEX IF NOT EXISTS "PaymentTransaction_orderId_status_idx" ON "PaymentTransaction"("orderId","status");
CREATE INDEX IF NOT EXISTS "PaymentTransaction_provider_status_createdAt_idx" ON "PaymentTransaction"("provider","status","createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "CargoTrackingEvent_provider_trackingNumber_externalEventId_key" ON "CargoTrackingEvent"("provider","trackingNumber","externalEventId");
CREATE INDEX IF NOT EXISTS "CargoTrackingEvent_orderId_eventAt_idx" ON "CargoTrackingEvent"("orderId","eventAt");
CREATE INDEX IF NOT EXISTS "CargoTrackingEvent_trackingNumber_eventAt_idx" ON "CargoTrackingEvent"("trackingNumber","eventAt");
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentGatewaySetting_tenantId_companyId_provider_key" ON "PaymentGatewaySetting"("tenantId","companyId","provider");
CREATE INDEX IF NOT EXISTS "PaymentGatewaySetting_tenantId_companyId_isActive_idx" ON "PaymentGatewaySetting"("tenantId","companyId","isActive");
DO $$ BEGIN ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "CargoTrackingEvent" ADD CONSTRAINT "CargoTrackingEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
