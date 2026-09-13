-- CreateEnum
CREATE TYPE "ManualSortingTransactionStatus" AS ENUM ('ACTIVE', 'REVERSED');

-- CreateEnum
CREATE TYPE "ThmOperationType" AS ENUM ('UNDO_DISTRIBUTION', 'MERGE');

-- CreateEnum
CREATE TYPE "PtlSessionStatus" AS ENUM ('ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "PtlCommandStatus" AS ENUM ('PENDING', 'DISPATCHED', 'ACKNOWLEDGED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PtlGatewayEventType" AS ENUM ('COMMAND_ACKNOWLEDGED', 'BUTTON_PRESSED', 'GATEWAY_STATUS', 'ERROR');

-- CreateTable
CREATE TABLE "WavePickingBarcode" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "warehouseId" INTEGER NOT NULL,
    "waveId" TEXT NOT NULL,
    "barcode" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WavePickingBarcode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManualSortingTargetPriority" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "warehouseId" INTEGER NOT NULL,
    "waveId" TEXT NOT NULL,
    "distributionId" TEXT NOT NULL,
    "targetCode" TEXT NOT NULL,
    "plannedQuantity" INTEGER NOT NULL,
    "priorityRank" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManualSortingTargetPriority_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManualSortingLine" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "warehouseId" INTEGER NOT NULL,
    "waveId" TEXT NOT NULL,
    "productId" INTEGER NOT NULL,
    "distributionId" TEXT NOT NULL,
    "plannedQuantity" INTEGER NOT NULL,
    "distributedQuantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManualSortingLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManualSortingThmBinding" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "warehouseId" INTEGER NOT NULL,
    "waveId" TEXT NOT NULL,
    "handlingUnitId" INTEGER NOT NULL,
    "distributionId" TEXT NOT NULL,
    "activeQuantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManualSortingThmBinding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManualSortingTransaction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "warehouseId" INTEGER NOT NULL,
    "waveId" TEXT NOT NULL,
    "pickingBarcodeId" TEXT,
    "sortingLineId" TEXT NOT NULL,
    "productId" INTEGER NOT NULL,
    "distributionId" TEXT NOT NULL,
    "handlingUnitId" INTEGER NOT NULL,
    "originalHandlingUnitId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "operatorId" TEXT NOT NULL,
    "terminalId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "status" "ManualSortingTransactionStatus" NOT NULL DEFAULT 'ACTIVE',
    "reversedAt" TIMESTAMP(3),
    "reversedById" TEXT,
    "reversalReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManualSortingTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThmOperation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "warehouseId" INTEGER NOT NULL,
    "waveId" TEXT NOT NULL,
    "type" "ThmOperationType" NOT NULL,
    "sourceHandlingUnitId" INTEGER,
    "targetHandlingUnitId" INTEGER,
    "transactionId" TEXT,
    "actorId" TEXT NOT NULL,
    "reason" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ThmOperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PtlTargetBinAssignment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "warehouseId" INTEGER NOT NULL,
    "waveId" TEXT NOT NULL,
    "distributionId" TEXT NOT NULL,
    "binCode" TEXT NOT NULL,
    "deviceAddress" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PtlTargetBinAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PtlSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "warehouseId" INTEGER NOT NULL,
    "waveId" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "terminalId" TEXT,
    "color" TEXT NOT NULL,
    "status" "PtlSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "PtlSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PtlCommand" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "warehouseId" INTEGER NOT NULL,
    "waveId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "distributionId" TEXT NOT NULL,
    "productId" INTEGER,
    "binCode" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "quantity" INTEGER,
    "status" "PtlCommandStatus" NOT NULL DEFAULT 'PENDING',
    "idempotencyKey" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PtlCommand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PtlGatewayEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "warehouseId" INTEGER NOT NULL,
    "waveId" TEXT NOT NULL,
    "commandId" TEXT,
    "eventType" "PtlGatewayEventType" NOT NULL,
    "correlationKey" TEXT,
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PtlGatewayEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WavePickingBarcode_tenantId_companyId_warehouseId_waveId_idx" ON "WavePickingBarcode"("tenantId", "companyId", "warehouseId", "waveId");

-- CreateIndex
CREATE INDEX "WavePickingBarcode_tenantId_companyId_warehouseId_barcode_i_idx" ON "WavePickingBarcode"("tenantId", "companyId", "warehouseId", "barcode", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "WavePickingBarcode_waveId_barcode_key" ON "WavePickingBarcode"("waveId", "barcode");

-- CreateIndex
CREATE INDEX "ManualSortingTargetPriority_tenantId_companyId_warehouseId__idx" ON "ManualSortingTargetPriority"("tenantId", "companyId", "warehouseId", "waveId");

-- CreateIndex
CREATE INDEX "ManualSortingTargetPriority_waveId_targetCode_idx" ON "ManualSortingTargetPriority"("waveId", "targetCode");

-- CreateIndex
CREATE UNIQUE INDEX "ManualSortingTargetPriority_waveId_distributionId_key" ON "ManualSortingTargetPriority"("waveId", "distributionId");

-- CreateIndex
CREATE UNIQUE INDEX "ManualSortingTargetPriority_waveId_priorityRank_key" ON "ManualSortingTargetPriority"("waveId", "priorityRank");

-- CreateIndex
CREATE INDEX "ManualSortingLine_tenantId_companyId_warehouseId_waveId_idx" ON "ManualSortingLine"("tenantId", "companyId", "warehouseId", "waveId");

-- CreateIndex
CREATE INDEX "ManualSortingLine_waveId_productId_idx" ON "ManualSortingLine"("waveId", "productId");

-- CreateIndex
CREATE INDEX "ManualSortingLine_waveId_distributionId_idx" ON "ManualSortingLine"("waveId", "distributionId");

-- CreateIndex
CREATE UNIQUE INDEX "ManualSortingLine_waveId_productId_distributionId_key" ON "ManualSortingLine"("waveId", "productId", "distributionId");

-- CreateIndex
CREATE INDEX "ManualSortingThmBinding_tenantId_companyId_warehouseId_wave_idx" ON "ManualSortingThmBinding"("tenantId", "companyId", "warehouseId", "waveId");

-- CreateIndex
CREATE INDEX "ManualSortingThmBinding_handlingUnitId_activeQuantity_idx" ON "ManualSortingThmBinding"("handlingUnitId", "activeQuantity");

-- CreateIndex
CREATE INDEX "ManualSortingThmBinding_waveId_distributionId_idx" ON "ManualSortingThmBinding"("waveId", "distributionId");

-- CreateIndex
CREATE UNIQUE INDEX "ManualSortingThmBinding_waveId_handlingUnitId_key" ON "ManualSortingThmBinding"("waveId", "handlingUnitId");

-- CreateIndex
CREATE INDEX "ManualSortingTransaction_tenantId_companyId_warehouseId_wav_idx" ON "ManualSortingTransaction"("tenantId", "companyId", "warehouseId", "waveId", "status");

-- CreateIndex
CREATE INDEX "ManualSortingTransaction_waveId_productId_status_idx" ON "ManualSortingTransaction"("waveId", "productId", "status");

-- CreateIndex
CREATE INDEX "ManualSortingTransaction_handlingUnitId_status_idx" ON "ManualSortingTransaction"("handlingUnitId", "status");

-- CreateIndex
CREATE INDEX "ManualSortingTransaction_createdAt_idx" ON "ManualSortingTransaction"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ManualSortingTransaction_tenantId_companyId_warehouseId_ide_key" ON "ManualSortingTransaction"("tenantId", "companyId", "warehouseId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "ThmOperation_tenantId_companyId_warehouseId_waveId_createdA_idx" ON "ThmOperation"("tenantId", "companyId", "warehouseId", "waveId", "createdAt");

-- CreateIndex
CREATE INDEX "ThmOperation_sourceHandlingUnitId_createdAt_idx" ON "ThmOperation"("sourceHandlingUnitId", "createdAt");

-- CreateIndex
CREATE INDEX "ThmOperation_targetHandlingUnitId_createdAt_idx" ON "ThmOperation"("targetHandlingUnitId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ThmOperation_tenantId_companyId_warehouseId_idempotencyKey_key" ON "ThmOperation"("tenantId", "companyId", "warehouseId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "PtlTargetBinAssignment_tenantId_companyId_warehouseId_waveI_idx" ON "PtlTargetBinAssignment"("tenantId", "companyId", "warehouseId", "waveId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PtlTargetBinAssignment_waveId_distributionId_key" ON "PtlTargetBinAssignment"("waveId", "distributionId");

-- CreateIndex
CREATE UNIQUE INDEX "PtlTargetBinAssignment_waveId_binCode_key" ON "PtlTargetBinAssignment"("waveId", "binCode");

-- CreateIndex
CREATE INDEX "PtlSession_tenantId_companyId_warehouseId_waveId_status_idx" ON "PtlSession"("tenantId", "companyId", "warehouseId", "waveId", "status");

-- CreateIndex
CREATE INDEX "PtlSession_operatorId_status_idx" ON "PtlSession"("operatorId", "status");

-- CreateIndex
CREATE INDEX "PtlCommand_tenantId_companyId_warehouseId_waveId_status_idx" ON "PtlCommand"("tenantId", "companyId", "warehouseId", "waveId", "status");

-- CreateIndex
CREATE INDEX "PtlCommand_distributionId_productId_idx" ON "PtlCommand"("distributionId", "productId");

-- CreateIndex
CREATE INDEX "PtlCommand_createdAt_idx" ON "PtlCommand"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PtlCommand_tenantId_companyId_warehouseId_idempotencyKey_key" ON "PtlCommand"("tenantId", "companyId", "warehouseId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "PtlGatewayEvent_tenantId_companyId_warehouseId_waveId_occur_idx" ON "PtlGatewayEvent"("tenantId", "companyId", "warehouseId", "waveId", "occurredAt");

-- CreateIndex
CREATE INDEX "PtlGatewayEvent_commandId_createdAt_idx" ON "PtlGatewayEvent"("commandId", "createdAt");

-- CreateIndex
CREATE INDEX "PtlGatewayEvent_correlationKey_idx" ON "PtlGatewayEvent"("correlationKey");

-- AddForeignKey
ALTER TABLE "WavePickingBarcode" ADD CONSTRAINT "WavePickingBarcode_waveId_fkey" FOREIGN KEY ("waveId") REFERENCES "Wave"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualSortingTargetPriority" ADD CONSTRAINT "ManualSortingTargetPriority_waveId_fkey" FOREIGN KEY ("waveId") REFERENCES "Wave"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualSortingTargetPriority" ADD CONSTRAINT "ManualSortingTargetPriority_distributionId_fkey" FOREIGN KEY ("distributionId") REFERENCES "WaveDistribution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualSortingLine" ADD CONSTRAINT "ManualSortingLine_waveId_fkey" FOREIGN KEY ("waveId") REFERENCES "Wave"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualSortingLine" ADD CONSTRAINT "ManualSortingLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualSortingLine" ADD CONSTRAINT "ManualSortingLine_distributionId_fkey" FOREIGN KEY ("distributionId") REFERENCES "WaveDistribution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualSortingThmBinding" ADD CONSTRAINT "ManualSortingThmBinding_waveId_fkey" FOREIGN KEY ("waveId") REFERENCES "Wave"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualSortingThmBinding" ADD CONSTRAINT "ManualSortingThmBinding_handlingUnitId_fkey" FOREIGN KEY ("handlingUnitId") REFERENCES "HandlingUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualSortingThmBinding" ADD CONSTRAINT "ManualSortingThmBinding_distributionId_fkey" FOREIGN KEY ("distributionId") REFERENCES "WaveDistribution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualSortingTransaction" ADD CONSTRAINT "ManualSortingTransaction_waveId_fkey" FOREIGN KEY ("waveId") REFERENCES "Wave"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualSortingTransaction" ADD CONSTRAINT "ManualSortingTransaction_pickingBarcodeId_fkey" FOREIGN KEY ("pickingBarcodeId") REFERENCES "WavePickingBarcode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualSortingTransaction" ADD CONSTRAINT "ManualSortingTransaction_sortingLineId_fkey" FOREIGN KEY ("sortingLineId") REFERENCES "ManualSortingLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualSortingTransaction" ADD CONSTRAINT "ManualSortingTransaction_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualSortingTransaction" ADD CONSTRAINT "ManualSortingTransaction_distributionId_fkey" FOREIGN KEY ("distributionId") REFERENCES "WaveDistribution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualSortingTransaction" ADD CONSTRAINT "ManualSortingTransaction_handlingUnitId_fkey" FOREIGN KEY ("handlingUnitId") REFERENCES "HandlingUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualSortingTransaction" ADD CONSTRAINT "ManualSortingTransaction_originalHandlingUnitId_fkey" FOREIGN KEY ("originalHandlingUnitId") REFERENCES "HandlingUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualSortingTransaction" ADD CONSTRAINT "ManualSortingTransaction_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualSortingTransaction" ADD CONSTRAINT "ManualSortingTransaction_reversedById_fkey" FOREIGN KEY ("reversedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThmOperation" ADD CONSTRAINT "ThmOperation_waveId_fkey" FOREIGN KEY ("waveId") REFERENCES "Wave"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThmOperation" ADD CONSTRAINT "ThmOperation_sourceHandlingUnitId_fkey" FOREIGN KEY ("sourceHandlingUnitId") REFERENCES "HandlingUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThmOperation" ADD CONSTRAINT "ThmOperation_targetHandlingUnitId_fkey" FOREIGN KEY ("targetHandlingUnitId") REFERENCES "HandlingUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThmOperation" ADD CONSTRAINT "ThmOperation_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "ManualSortingTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThmOperation" ADD CONSTRAINT "ThmOperation_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PtlTargetBinAssignment" ADD CONSTRAINT "PtlTargetBinAssignment_waveId_fkey" FOREIGN KEY ("waveId") REFERENCES "Wave"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PtlTargetBinAssignment" ADD CONSTRAINT "PtlTargetBinAssignment_distributionId_fkey" FOREIGN KEY ("distributionId") REFERENCES "WaveDistribution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PtlSession" ADD CONSTRAINT "PtlSession_waveId_fkey" FOREIGN KEY ("waveId") REFERENCES "Wave"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PtlSession" ADD CONSTRAINT "PtlSession_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PtlCommand" ADD CONSTRAINT "PtlCommand_waveId_fkey" FOREIGN KEY ("waveId") REFERENCES "Wave"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PtlCommand" ADD CONSTRAINT "PtlCommand_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PtlSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PtlCommand" ADD CONSTRAINT "PtlCommand_distributionId_fkey" FOREIGN KEY ("distributionId") REFERENCES "WaveDistribution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PtlCommand" ADD CONSTRAINT "PtlCommand_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PtlGatewayEvent" ADD CONSTRAINT "PtlGatewayEvent_waveId_fkey" FOREIGN KEY ("waveId") REFERENCES "Wave"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PtlGatewayEvent" ADD CONSTRAINT "PtlGatewayEvent_commandId_fkey" FOREIGN KEY ("commandId") REFERENCES "PtlCommand"("id") ON DELETE SET NULL ON UPDATE CASCADE;
