ALTER TABLE "Order"
ADD COLUMN "cargoTrackingNumber" TEXT,
ADD COLUMN "cargoTrackingUrl" TEXT,
ADD COLUMN "cargoTrackingUpdatedAt" TIMESTAMP(3);

CREATE INDEX "Order_cargoTrackingNumber_idx" ON "Order"("cargoTrackingNumber");
