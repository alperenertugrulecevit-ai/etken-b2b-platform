-- AlterTable
ALTER TABLE "ShippingHandlingUnit" ADD COLUMN     "packingListLastPrinterCode" TEXT,
ADD COLUMN     "packingListPrintCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "packingListPrintedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "BarcodePrinter" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "port" INTEGER NOT NULL DEFAULT 9100,
    "dpi" INTEGER NOT NULL DEFAULT 203,
    "labelWidthMm" INTEGER NOT NULL DEFAULT 100,
    "labelHeightMm" INTEGER NOT NULL DEFAULT 100,
    "commandLanguage" TEXT NOT NULL DEFAULT 'ZPL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BarcodePrinter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BarcodePrinter_code_key" ON "BarcodePrinter"("code");

-- CreateIndex
CREATE INDEX "BarcodePrinter_isActive_idx" ON "BarcodePrinter"("isActive");

-- CreateIndex
CREATE INDEX "BarcodePrinter_name_idx" ON "BarcodePrinter"("name");

-- CreateIndex
CREATE INDEX "BarcodePrinter_ipAddress_idx" ON "BarcodePrinter"("ipAddress");

-- CreateIndex
CREATE INDEX "ShippingHandlingUnit_packingListPrintedAt_idx" ON "ShippingHandlingUnit"("packingListPrintedAt");

-- CreateIndex
CREATE INDEX "ShippingHandlingUnit_packingListLastPrinterCode_idx" ON "ShippingHandlingUnit"("packingListLastPrinterCode");
