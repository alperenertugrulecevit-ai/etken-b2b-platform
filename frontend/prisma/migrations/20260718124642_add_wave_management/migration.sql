-- CreateSequence
CREATE SEQUENCE IF NOT EXISTS WaveNumberSeq
START WITH 1
INCREMENT BY 1
MINVALUE 1
NO MAXVALUE
CACHE 1;

-- CreateEnum
CREATE TYPE "WaveStatus" AS ENUM ('DRAFT', 'READY', 'RELEASED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WavePriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "WaveType" AS ENUM ('STORE_REPLENISHMENT', 'CUSTOMER_ORDER', 'ECOMMERCE', 'TRANSFER', 'MIXED');

-- CreateEnum
CREATE TYPE "WaveAssignmentStatus" AS ENUM ('ASSIGNED', 'ACTIVE', 'WAITING', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Wave" (
    "id" TEXT NOT NULL,
    "waveNo" TEXT NOT NULL,
    "name" TEXT,
    "type" "WaveType" NOT NULL DEFAULT 'MIXED',
    "status" "WaveStatus" NOT NULL DEFAULT 'DRAFT',
    "priority" "WavePriority" NOT NULL DEFAULT 'NORMAL',
    "plannedStartAt" TIMESTAMP(3),
    "plannedFinishAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "pausedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "plannedOrderCount" INTEGER NOT NULL DEFAULT 0,
    "plannedLineCount" INTEGER NOT NULL DEFAULT 0,
    "plannedQuantity" INTEGER NOT NULL DEFAULT 0,
    "completedOrderCount" INTEGER NOT NULL DEFAULT 0,
    "completedLineCount" INTEGER NOT NULL DEFAULT 0,
    "completedQuantity" INTEGER NOT NULL DEFAULT 0,
    "pickingProgress" INTEGER NOT NULL DEFAULT 0,
    "transferProgress" INTEGER NOT NULL DEFAULT 0,
    "consolidationProgress" INTEGER NOT NULL DEFAULT 0,
    "packingProgress" INTEGER NOT NULL DEFAULT 0,
    "shippingProgress" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wave_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaveOrder" (
    "id" TEXT NOT NULL,
    "waveId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "customerCode" TEXT,
    "customerName" TEXT,
    "storeCode" TEXT,
    "storeName" TEXT,
    "lineCount" INTEGER NOT NULL DEFAULT 0,
    "plannedQuantity" INTEGER NOT NULL DEFAULT 0,
    "completedQuantity" INTEGER NOT NULL DEFAULT 0,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaveOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaveAssignment" (
    "id" TEXT NOT NULL,
    "waveId" TEXT NOT NULL,
    "operatorName" TEXT NOT NULL,
    "terminalCode" TEXT,
    "operationType" "WmsOperationType",
    "status" "WaveAssignmentStatus" NOT NULL DEFAULT 'ASSIGNED',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "lastActivityAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaveAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Wave_waveNo_key" ON "Wave"("waveNo");

-- CreateIndex
CREATE INDEX "Wave_status_priority_idx" ON "Wave"("status", "priority");

-- CreateIndex
CREATE INDEX "Wave_plannedStartAt_idx" ON "Wave"("plannedStartAt");

-- CreateIndex
CREATE INDEX "Wave_createdAt_idx" ON "Wave"("createdAt");

-- CreateIndex
CREATE INDEX "WaveOrder_orderNumber_idx" ON "WaveOrder"("orderNumber");

-- CreateIndex
CREATE INDEX "WaveOrder_waveId_isCompleted_idx" ON "WaveOrder"("waveId", "isCompleted");

-- CreateIndex
CREATE UNIQUE INDEX "WaveOrder_waveId_orderNumber_key" ON "WaveOrder"("waveId", "orderNumber");

-- CreateIndex
CREATE INDEX "WaveAssignment_waveId_status_idx" ON "WaveAssignment"("waveId", "status");

-- CreateIndex
CREATE INDEX "WaveAssignment_operatorName_idx" ON "WaveAssignment"("operatorName");

-- CreateIndex
CREATE INDEX "WaveAssignment_terminalCode_idx" ON "WaveAssignment"("terminalCode");

-- AddForeignKey
ALTER TABLE "WaveOrder" ADD CONSTRAINT "WaveOrder_waveId_fkey" FOREIGN KEY ("waveId") REFERENCES "Wave"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaveAssignment" ADD CONSTRAINT "WaveAssignment_waveId_fkey" FOREIGN KEY ("waveId") REFERENCES "Wave"("id") ON DELETE CASCADE ON UPDATE CASCADE;
