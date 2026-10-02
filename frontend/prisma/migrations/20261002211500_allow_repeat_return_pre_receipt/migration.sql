DROP INDEX IF EXISTS "EcommerceReturnPreReceipt_carrierId_mode_scannedCode_key";
CREATE INDEX "EcommerceReturnPreReceipt_carrierId_mode_scannedCode_idx" ON "EcommerceReturnPreReceipt"("carrierId","mode","scannedCode");
