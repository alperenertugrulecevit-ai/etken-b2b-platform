ALTER TABLE "Order" ADD COLUMN "carrierId" TEXT;

CREATE INDEX "Order_carrierId_idx" ON "Order"("carrierId");

ALTER TABLE "Order"
ADD CONSTRAINT "Order_carrierId_fkey"
FOREIGN KEY ("carrierId") REFERENCES "ShippingCarrier"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
