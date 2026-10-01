-- Add delivery note tracking to purchase orders.
-- Nullable at database level so existing purchase orders remain valid;
-- application flows require both fields for newly created orders and RF receiving.
ALTER TABLE "PurchaseOrder"
  ADD COLUMN "deliveryNoteNumber" TEXT,
  ADD COLUMN "deliveryNoteDate" TIMESTAMP(3);

CREATE INDEX "PurchaseOrder_deliveryNoteNumber_idx" ON "PurchaseOrder"("deliveryNoteNumber");
CREATE INDEX "PurchaseOrder_deliveryNoteDate_idx" ON "PurchaseOrder"("deliveryNoteDate");
