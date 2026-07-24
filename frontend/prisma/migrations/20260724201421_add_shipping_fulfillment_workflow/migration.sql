-- CreateEnum
CREATE TYPE "OrderFulfillmentFlow" AS ENUM ('DIRECT_ORDER', 'WAVE');

-- CreateEnum
CREATE TYPE "FulfillmentProgressStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'PARTIALLY_COMPLETED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WaveDistributionStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ShippingHandlingUnitStatus" AS ENUM ('OPEN', 'CLOSED', 'READY_TO_SHIP', 'SHIPPED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DispatchDocumentStatus" AS ENUM ('DRAFT', 'READY', 'ISSUED', 'CANCELLED');

-- AlterTable
ALTER TABLE "HandlingUnit" ADD COLUMN     "assignedWaveId" TEXT;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "packedQuantity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "shippedQuantity" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "PickingRecord" ADD COLUMN     "flowType" "OrderFulfillmentFlow" NOT NULL DEFAULT 'DIRECT_ORDER',
ADD COLUMN     "waveId" TEXT;

-- AlterTable
ALTER TABLE "StockMovement" ADD COLUMN     "shippingHandlingUnitId" TEXT;

-- CreateTable
CREATE TABLE "OrderFulfillment" (
    "id" TEXT NOT NULL,
    "orderId" INTEGER NOT NULL,
    "waveId" TEXT,
    "flowType" "OrderFulfillmentFlow" NOT NULL DEFAULT 'DIRECT_ORDER',
    "pickingStatus" "FulfillmentProgressStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "packingStatus" "FulfillmentProgressStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "shippingStatus" "FulfillmentProgressStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "plannedQuantity" INTEGER NOT NULL DEFAULT 0,
    "pickedQuantity" INTEGER NOT NULL DEFAULT 0,
    "packedQuantity" INTEGER NOT NULL DEFAULT 0,
    "shippedQuantity" INTEGER NOT NULL DEFAULT 0,
    "pickingStartedAt" TIMESTAMP(3),
    "pickingCompletedAt" TIMESTAMP(3),
    "packingStartedAt" TIMESTAMP(3),
    "packingCompletedAt" TIMESTAMP(3),
    "shippingStartedAt" TIMESTAMP(3),
    "shippingCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderFulfillment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaveDistribution" (
    "id" TEXT NOT NULL,
    "waveId" TEXT NOT NULL,
    "sequenceNumber" INTEGER NOT NULL,
    "distributionCode" TEXT NOT NULL,
    "groupKey" TEXT NOT NULL,
    "status" "WaveDistributionStatus" NOT NULL DEFAULT 'PLANNED',
    "customerId" INTEGER NOT NULL,
    "shippingAddressId" INTEGER,
    "customerCode" TEXT,
    "customerName" TEXT NOT NULL,
    "taxOffice" TEXT,
    "taxNumber" TEXT,
    "addressTitle" TEXT,
    "contactName" TEXT,
    "phone" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "postalCode" TEXT,
    "plannedOrderCount" INTEGER NOT NULL DEFAULT 0,
    "plannedLineCount" INTEGER NOT NULL DEFAULT 0,
    "plannedQuantity" INTEGER NOT NULL DEFAULT 0,
    "packedQuantity" INTEGER NOT NULL DEFAULT 0,
    "shippedQuantity" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdByName" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaveDistribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaveDistributionOrder" (
    "id" TEXT NOT NULL,
    "distributionId" TEXT NOT NULL,
    "waveOrderId" TEXT NOT NULL,
    "orderId" INTEGER NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "plannedQuantity" INTEGER NOT NULL DEFAULT 0,
    "packedQuantity" INTEGER NOT NULL DEFAULT 0,
    "shippedQuantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaveDistributionOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaveDistributionLine" (
    "id" TEXT NOT NULL,
    "distributionId" TEXT NOT NULL,
    "distributionOrderId" TEXT NOT NULL,
    "orderId" INTEGER NOT NULL,
    "orderItemId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "productCode" TEXT NOT NULL,
    "productBarcode" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "plannedQuantity" INTEGER NOT NULL,
    "packedQuantity" INTEGER NOT NULL DEFAULT 0,
    "shippedQuantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaveDistributionLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShippingHandlingUnit" (
    "id" TEXT NOT NULL,
    "handlingUnitId" INTEGER NOT NULL,
    "status" "ShippingHandlingUnitStatus" NOT NULL DEFAULT 'OPEN',
    "packageSequence" INTEGER NOT NULL DEFAULT 1,
    "waveDistributionId" TEXT,
    "customerId" INTEGER NOT NULL,
    "shippingAddressId" INTEGER,
    "customerCode" TEXT,
    "customerName" TEXT NOT NULL,
    "taxOffice" TEXT,
    "taxNumber" TEXT,
    "addressTitle" TEXT,
    "contactName" TEXT,
    "phone" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "postalCode" TEXT,
    "grossWeightKg" DOUBLE PRECISION,
    "netWeightKg" DOUBLE PRECISION,
    "lengthCm" DOUBLE PRECISION,
    "widthCm" DOUBLE PRECISION,
    "heightCm" DOUBLE PRECISION,
    "labelPrintedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "readyAt" TIMESTAMP(3),
    "shippedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdByName" TEXT,
    "closedById" TEXT,
    "closedByName" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingHandlingUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShippingHandlingUnitOrder" (
    "id" TEXT NOT NULL,
    "shippingHandlingUnitId" TEXT NOT NULL,
    "orderId" INTEGER NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "plannedQuantity" INTEGER NOT NULL DEFAULT 0,
    "packedQuantity" INTEGER NOT NULL DEFAULT 0,
    "shippedQuantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingHandlingUnitOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShippingHandlingUnitItem" (
    "id" TEXT NOT NULL,
    "shippingHandlingUnitId" TEXT NOT NULL,
    "shippingHandlingUnitOrderId" TEXT NOT NULL,
    "orderId" INTEGER NOT NULL,
    "orderItemId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "productCode" TEXT NOT NULL,
    "productBarcode" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "shippedQuantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingHandlingUnitItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackingRecord" (
    "id" SERIAL NOT NULL,
    "waveDistributionId" TEXT,
    "waveDistributionLineId" TEXT,
    "shippingHandlingUnitId" TEXT NOT NULL,
    "orderId" INTEGER NOT NULL,
    "orderItemId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "sourceHandlingUnitId" INTEGER NOT NULL,
    "targetHandlingUnitId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "sourceQuantityAfter" INTEGER NOT NULL,
    "targetQuantityAfter" INTEGER NOT NULL,
    "operatorId" TEXT,
    "operatorName" TEXT,
    "terminalCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PackingRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DispatchDocument" (
    "id" TEXT NOT NULL,
    "shippingHandlingUnitId" TEXT NOT NULL,
    "status" "DispatchDocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "dispatchNumber" TEXT,
    "ettn" TEXT,
    "documentDate" TIMESTAMP(3),
    "shipmentAt" TIMESTAMP(3),
    "recipientCode" TEXT,
    "recipientName" TEXT NOT NULL,
    "recipientTaxOffice" TEXT,
    "recipientTaxNumber" TEXT,
    "recipientAddress" TEXT NOT NULL,
    "recipientCity" TEXT NOT NULL,
    "recipientDistrict" TEXT NOT NULL,
    "recipientPostalCode" TEXT,
    "carrierName" TEXT,
    "vehiclePlate" TEXT,
    "driverName" TEXT,
    "driverIdentityNumber" TEXT,
    "issuedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdByName" TEXT,
    "issuedById" TEXT,
    "issuedByName" TEXT,
    "cancelledById" TEXT,
    "cancelledByName" TEXT,
    "cancelReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DispatchDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DispatchDocumentLine" (
    "id" TEXT NOT NULL,
    "dispatchDocumentId" TEXT NOT NULL,
    "shippingHandlingUnitItemId" TEXT NOT NULL,
    "orderId" INTEGER NOT NULL,
    "orderItemId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "productCode" TEXT NOT NULL,
    "productBarcode" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'ADET',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DispatchDocumentLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrderFulfillment_orderId_key" ON "OrderFulfillment"("orderId");

-- CreateIndex
CREATE INDEX "OrderFulfillment_waveId_idx" ON "OrderFulfillment"("waveId");

-- CreateIndex
CREATE INDEX "OrderFulfillment_flowType_idx" ON "OrderFulfillment"("flowType");

-- CreateIndex
CREATE INDEX "OrderFulfillment_pickingStatus_idx" ON "OrderFulfillment"("pickingStatus");

-- CreateIndex
CREATE INDEX "OrderFulfillment_packingStatus_idx" ON "OrderFulfillment"("packingStatus");

-- CreateIndex
CREATE INDEX "OrderFulfillment_shippingStatus_idx" ON "OrderFulfillment"("shippingStatus");

-- CreateIndex
CREATE INDEX "OrderFulfillment_updatedAt_idx" ON "OrderFulfillment"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "WaveDistribution_distributionCode_key" ON "WaveDistribution"("distributionCode");

-- CreateIndex
CREATE INDEX "WaveDistribution_waveId_status_idx" ON "WaveDistribution"("waveId", "status");

-- CreateIndex
CREATE INDEX "WaveDistribution_customerId_idx" ON "WaveDistribution"("customerId");

-- CreateIndex
CREATE INDEX "WaveDistribution_shippingAddressId_idx" ON "WaveDistribution"("shippingAddressId");

-- CreateIndex
CREATE INDEX "WaveDistribution_distributionCode_idx" ON "WaveDistribution"("distributionCode");

-- CreateIndex
CREATE INDEX "WaveDistribution_createdAt_idx" ON "WaveDistribution"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WaveDistribution_waveId_sequenceNumber_key" ON "WaveDistribution"("waveId", "sequenceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "WaveDistribution_waveId_groupKey_key" ON "WaveDistribution"("waveId", "groupKey");

-- CreateIndex
CREATE UNIQUE INDEX "WaveDistributionOrder_waveOrderId_key" ON "WaveDistributionOrder"("waveOrderId");

-- CreateIndex
CREATE INDEX "WaveDistributionOrder_distributionId_idx" ON "WaveDistributionOrder"("distributionId");

-- CreateIndex
CREATE INDEX "WaveDistributionOrder_orderId_idx" ON "WaveDistributionOrder"("orderId");

-- CreateIndex
CREATE INDEX "WaveDistributionOrder_orderNumber_idx" ON "WaveDistributionOrder"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "WaveDistributionOrder_distributionId_orderId_key" ON "WaveDistributionOrder"("distributionId", "orderId");

-- CreateIndex
CREATE INDEX "WaveDistributionLine_distributionOrderId_idx" ON "WaveDistributionLine"("distributionOrderId");

-- CreateIndex
CREATE INDEX "WaveDistributionLine_orderId_idx" ON "WaveDistributionLine"("orderId");

-- CreateIndex
CREATE INDEX "WaveDistributionLine_orderItemId_idx" ON "WaveDistributionLine"("orderItemId");

-- CreateIndex
CREATE INDEX "WaveDistributionLine_productId_idx" ON "WaveDistributionLine"("productId");

-- CreateIndex
CREATE INDEX "WaveDistributionLine_productCode_idx" ON "WaveDistributionLine"("productCode");

-- CreateIndex
CREATE UNIQUE INDEX "WaveDistributionLine_distributionId_orderItemId_key" ON "WaveDistributionLine"("distributionId", "orderItemId");

-- CreateIndex
CREATE UNIQUE INDEX "ShippingHandlingUnit_handlingUnitId_key" ON "ShippingHandlingUnit"("handlingUnitId");

-- CreateIndex
CREATE INDEX "ShippingHandlingUnit_status_idx" ON "ShippingHandlingUnit"("status");

-- CreateIndex
CREATE INDEX "ShippingHandlingUnit_waveDistributionId_idx" ON "ShippingHandlingUnit"("waveDistributionId");

-- CreateIndex
CREATE INDEX "ShippingHandlingUnit_customerId_idx" ON "ShippingHandlingUnit"("customerId");

-- CreateIndex
CREATE INDEX "ShippingHandlingUnit_shippingAddressId_idx" ON "ShippingHandlingUnit"("shippingAddressId");

-- CreateIndex
CREATE INDEX "ShippingHandlingUnit_createdAt_idx" ON "ShippingHandlingUnit"("createdAt");

-- CreateIndex
CREATE INDEX "ShippingHandlingUnit_closedAt_idx" ON "ShippingHandlingUnit"("closedAt");

-- CreateIndex
CREATE INDEX "ShippingHandlingUnit_shippedAt_idx" ON "ShippingHandlingUnit"("shippedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ShippingHandlingUnit_waveDistributionId_packageSequence_key" ON "ShippingHandlingUnit"("waveDistributionId", "packageSequence");

-- CreateIndex
CREATE INDEX "ShippingHandlingUnitOrder_orderId_idx" ON "ShippingHandlingUnitOrder"("orderId");

-- CreateIndex
CREATE INDEX "ShippingHandlingUnitOrder_orderNumber_idx" ON "ShippingHandlingUnitOrder"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ShippingHandlingUnitOrder_shippingHandlingUnitId_orderId_key" ON "ShippingHandlingUnitOrder"("shippingHandlingUnitId", "orderId");

-- CreateIndex
CREATE INDEX "ShippingHandlingUnitItem_shippingHandlingUnitOrderId_idx" ON "ShippingHandlingUnitItem"("shippingHandlingUnitOrderId");

-- CreateIndex
CREATE INDEX "ShippingHandlingUnitItem_orderId_idx" ON "ShippingHandlingUnitItem"("orderId");

-- CreateIndex
CREATE INDEX "ShippingHandlingUnitItem_orderItemId_idx" ON "ShippingHandlingUnitItem"("orderItemId");

-- CreateIndex
CREATE INDEX "ShippingHandlingUnitItem_productId_idx" ON "ShippingHandlingUnitItem"("productId");

-- CreateIndex
CREATE INDEX "ShippingHandlingUnitItem_productCode_idx" ON "ShippingHandlingUnitItem"("productCode");

-- CreateIndex
CREATE UNIQUE INDEX "ShippingHandlingUnitItem_shippingHandlingUnitId_orderItemId_key" ON "ShippingHandlingUnitItem"("shippingHandlingUnitId", "orderItemId");

-- CreateIndex
CREATE INDEX "PackingRecord_waveDistributionId_idx" ON "PackingRecord"("waveDistributionId");

-- CreateIndex
CREATE INDEX "PackingRecord_waveDistributionLineId_idx" ON "PackingRecord"("waveDistributionLineId");

-- CreateIndex
CREATE INDEX "PackingRecord_shippingHandlingUnitId_idx" ON "PackingRecord"("shippingHandlingUnitId");

-- CreateIndex
CREATE INDEX "PackingRecord_orderId_idx" ON "PackingRecord"("orderId");

-- CreateIndex
CREATE INDEX "PackingRecord_orderItemId_idx" ON "PackingRecord"("orderItemId");

-- CreateIndex
CREATE INDEX "PackingRecord_productId_idx" ON "PackingRecord"("productId");

-- CreateIndex
CREATE INDEX "PackingRecord_sourceHandlingUnitId_idx" ON "PackingRecord"("sourceHandlingUnitId");

-- CreateIndex
CREATE INDEX "PackingRecord_targetHandlingUnitId_idx" ON "PackingRecord"("targetHandlingUnitId");

-- CreateIndex
CREATE INDEX "PackingRecord_operatorId_idx" ON "PackingRecord"("operatorId");

-- CreateIndex
CREATE INDEX "PackingRecord_createdAt_idx" ON "PackingRecord"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DispatchDocument_shippingHandlingUnitId_key" ON "DispatchDocument"("shippingHandlingUnitId");

-- CreateIndex
CREATE UNIQUE INDEX "DispatchDocument_dispatchNumber_key" ON "DispatchDocument"("dispatchNumber");

-- CreateIndex
CREATE UNIQUE INDEX "DispatchDocument_ettn_key" ON "DispatchDocument"("ettn");

-- CreateIndex
CREATE INDEX "DispatchDocument_status_idx" ON "DispatchDocument"("status");

-- CreateIndex
CREATE INDEX "DispatchDocument_documentDate_idx" ON "DispatchDocument"("documentDate");

-- CreateIndex
CREATE INDEX "DispatchDocument_shipmentAt_idx" ON "DispatchDocument"("shipmentAt");

-- CreateIndex
CREATE INDEX "DispatchDocument_issuedAt_idx" ON "DispatchDocument"("issuedAt");

-- CreateIndex
CREATE INDEX "DispatchDocument_createdAt_idx" ON "DispatchDocument"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DispatchDocumentLine_shippingHandlingUnitItemId_key" ON "DispatchDocumentLine"("shippingHandlingUnitItemId");

-- CreateIndex
CREATE INDEX "DispatchDocumentLine_dispatchDocumentId_idx" ON "DispatchDocumentLine"("dispatchDocumentId");

-- CreateIndex
CREATE INDEX "DispatchDocumentLine_orderId_idx" ON "DispatchDocumentLine"("orderId");

-- CreateIndex
CREATE INDEX "DispatchDocumentLine_orderItemId_idx" ON "DispatchDocumentLine"("orderItemId");

-- CreateIndex
CREATE INDEX "DispatchDocumentLine_productId_idx" ON "DispatchDocumentLine"("productId");

-- CreateIndex
CREATE INDEX "DispatchDocumentLine_orderNumber_idx" ON "DispatchDocumentLine"("orderNumber");

-- CreateIndex
CREATE INDEX "DispatchDocumentLine_productCode_idx" ON "DispatchDocumentLine"("productCode");

-- CreateIndex
CREATE INDEX "HandlingUnit_assignedWaveId_idx" ON "HandlingUnit"("assignedWaveId");

-- CreateIndex
CREATE INDEX "OrderItem_packedQuantity_idx" ON "OrderItem"("packedQuantity");

-- CreateIndex
CREATE INDEX "OrderItem_shippedQuantity_idx" ON "OrderItem"("shippedQuantity");

-- CreateIndex
CREATE INDEX "PickingRecord_waveId_idx" ON "PickingRecord"("waveId");

-- CreateIndex
CREATE INDEX "PickingRecord_flowType_idx" ON "PickingRecord"("flowType");

-- CreateIndex
CREATE INDEX "StockMovement_shippingHandlingUnitId_idx" ON "StockMovement"("shippingHandlingUnitId");

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_shippingHandlingUnitId_fkey" FOREIGN KEY ("shippingHandlingUnitId") REFERENCES "ShippingHandlingUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HandlingUnit" ADD CONSTRAINT "HandlingUnit_assignedWaveId_fkey" FOREIGN KEY ("assignedWaveId") REFERENCES "Wave"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickingRecord" ADD CONSTRAINT "PickingRecord_waveId_fkey" FOREIGN KEY ("waveId") REFERENCES "Wave"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderFulfillment" ADD CONSTRAINT "OrderFulfillment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderFulfillment" ADD CONSTRAINT "OrderFulfillment_waveId_fkey" FOREIGN KEY ("waveId") REFERENCES "Wave"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaveDistribution" ADD CONSTRAINT "WaveDistribution_waveId_fkey" FOREIGN KEY ("waveId") REFERENCES "Wave"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaveDistribution" ADD CONSTRAINT "WaveDistribution_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaveDistribution" ADD CONSTRAINT "WaveDistribution_shippingAddressId_fkey" FOREIGN KEY ("shippingAddressId") REFERENCES "CustomerAddress"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaveDistributionOrder" ADD CONSTRAINT "WaveDistributionOrder_distributionId_fkey" FOREIGN KEY ("distributionId") REFERENCES "WaveDistribution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaveDistributionOrder" ADD CONSTRAINT "WaveDistributionOrder_waveOrderId_fkey" FOREIGN KEY ("waveOrderId") REFERENCES "WaveOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaveDistributionOrder" ADD CONSTRAINT "WaveDistributionOrder_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaveDistributionLine" ADD CONSTRAINT "WaveDistributionLine_distributionId_fkey" FOREIGN KEY ("distributionId") REFERENCES "WaveDistribution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaveDistributionLine" ADD CONSTRAINT "WaveDistributionLine_distributionOrderId_fkey" FOREIGN KEY ("distributionOrderId") REFERENCES "WaveDistributionOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaveDistributionLine" ADD CONSTRAINT "WaveDistributionLine_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaveDistributionLine" ADD CONSTRAINT "WaveDistributionLine_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaveDistributionLine" ADD CONSTRAINT "WaveDistributionLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingHandlingUnit" ADD CONSTRAINT "ShippingHandlingUnit_handlingUnitId_fkey" FOREIGN KEY ("handlingUnitId") REFERENCES "HandlingUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingHandlingUnit" ADD CONSTRAINT "ShippingHandlingUnit_waveDistributionId_fkey" FOREIGN KEY ("waveDistributionId") REFERENCES "WaveDistribution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingHandlingUnit" ADD CONSTRAINT "ShippingHandlingUnit_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingHandlingUnit" ADD CONSTRAINT "ShippingHandlingUnit_shippingAddressId_fkey" FOREIGN KEY ("shippingAddressId") REFERENCES "CustomerAddress"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingHandlingUnitOrder" ADD CONSTRAINT "ShippingHandlingUnitOrder_shippingHandlingUnitId_fkey" FOREIGN KEY ("shippingHandlingUnitId") REFERENCES "ShippingHandlingUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingHandlingUnitOrder" ADD CONSTRAINT "ShippingHandlingUnitOrder_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingHandlingUnitItem" ADD CONSTRAINT "ShippingHandlingUnitItem_shippingHandlingUnitId_fkey" FOREIGN KEY ("shippingHandlingUnitId") REFERENCES "ShippingHandlingUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingHandlingUnitItem" ADD CONSTRAINT "ShippingHandlingUnitItem_shippingHandlingUnitOrderId_fkey" FOREIGN KEY ("shippingHandlingUnitOrderId") REFERENCES "ShippingHandlingUnitOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingHandlingUnitItem" ADD CONSTRAINT "ShippingHandlingUnitItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingHandlingUnitItem" ADD CONSTRAINT "ShippingHandlingUnitItem_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingHandlingUnitItem" ADD CONSTRAINT "ShippingHandlingUnitItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackingRecord" ADD CONSTRAINT "PackingRecord_waveDistributionId_fkey" FOREIGN KEY ("waveDistributionId") REFERENCES "WaveDistribution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackingRecord" ADD CONSTRAINT "PackingRecord_waveDistributionLineId_fkey" FOREIGN KEY ("waveDistributionLineId") REFERENCES "WaveDistributionLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackingRecord" ADD CONSTRAINT "PackingRecord_shippingHandlingUnitId_fkey" FOREIGN KEY ("shippingHandlingUnitId") REFERENCES "ShippingHandlingUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackingRecord" ADD CONSTRAINT "PackingRecord_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackingRecord" ADD CONSTRAINT "PackingRecord_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackingRecord" ADD CONSTRAINT "PackingRecord_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackingRecord" ADD CONSTRAINT "PackingRecord_sourceHandlingUnitId_fkey" FOREIGN KEY ("sourceHandlingUnitId") REFERENCES "HandlingUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackingRecord" ADD CONSTRAINT "PackingRecord_targetHandlingUnitId_fkey" FOREIGN KEY ("targetHandlingUnitId") REFERENCES "HandlingUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchDocument" ADD CONSTRAINT "DispatchDocument_shippingHandlingUnitId_fkey" FOREIGN KEY ("shippingHandlingUnitId") REFERENCES "ShippingHandlingUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchDocumentLine" ADD CONSTRAINT "DispatchDocumentLine_dispatchDocumentId_fkey" FOREIGN KEY ("dispatchDocumentId") REFERENCES "DispatchDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchDocumentLine" ADD CONSTRAINT "DispatchDocumentLine_shippingHandlingUnitItemId_fkey" FOREIGN KEY ("shippingHandlingUnitItemId") REFERENCES "ShippingHandlingUnitItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchDocumentLine" ADD CONSTRAINT "DispatchDocumentLine_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchDocumentLine" ADD CONSTRAINT "DispatchDocumentLine_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchDocumentLine" ADD CONSTRAINT "DispatchDocumentLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
