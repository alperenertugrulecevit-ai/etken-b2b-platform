-- CreateEnum
CREATE TYPE "InventoryCountScope" AS ENUM ('ALL_LOCATIONS', 'SELECTED_LOCATIONS');

-- CreateEnum
CREATE TYPE "InventoryCountStatus" AS ENUM ('DRAFT', 'ACTIVE', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InventoryCountLocationStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "InventoryCountLineStatus" AS ENUM ('PENDING', 'COUNTED', 'RECOUNT_REQUIRED', 'APPROVED');

-- CreateTable
CREATE TABLE "InventoryCount" (
    "id" SERIAL NOT NULL,
    "countNumber" TEXT NOT NULL,
    "warehouseId" INTEGER NOT NULL,
    "scope" "InventoryCountScope" NOT NULL,
    "status" "InventoryCountStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "snapshotAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedByName" TEXT,
    "cancelledById" TEXT,
    "cancelledByName" TEXT,
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryCount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryCountLocation" (
    "id" SERIAL NOT NULL,
    "inventoryCountId" INTEGER NOT NULL,
    "locationId" INTEGER NOT NULL,
    "status" "InventoryCountLocationStatus" NOT NULL DEFAULT 'PENDING',
    "locationCode" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "countedById" TEXT,
    "countedByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryCountLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryCountLine" (
    "id" SERIAL NOT NULL,
    "inventoryCountId" INTEGER NOT NULL,
    "inventoryCountLocationId" INTEGER NOT NULL,
    "locationId" INTEGER NOT NULL,
    "handlingUnitId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "status" "InventoryCountLineStatus" NOT NULL DEFAULT 'PENDING',
    "locationCode" TEXT NOT NULL,
    "handlingUnitBarcode" TEXT NOT NULL,
    "handlingUnitType" TEXT NOT NULL,
    "productCode" TEXT NOT NULL,
    "productBarcode" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "systemQuantity" INTEGER NOT NULL,
    "systemReservedStock" INTEGER NOT NULL DEFAULT 0,
    "locationSystemQuantity" INTEGER NOT NULL,
    "locationReservedStock" INTEGER NOT NULL DEFAULT 0,
    "countedQuantity" INTEGER,
    "difference" INTEGER,
    "isDiscovered" BOOLEAN NOT NULL DEFAULT false,
    "countedById" TEXT,
    "countedByName" TEXT,
    "countedAt" TIMESTAMP(3),
    "note" TEXT,
    "handlingUnitUpdatedAt" TIMESTAMP(3),
    "handlingUnitItemUpdatedAt" TIMESTAMP(3),
    "locationStockUpdatedAt" TIMESTAMP(3),
    "appliedQuantityChange" INTEGER,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryCountLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InventoryCount_countNumber_key" ON "InventoryCount"("countNumber");

-- CreateIndex
CREATE INDEX "InventoryCount_warehouseId_status_idx" ON "InventoryCount"("warehouseId", "status");

-- CreateIndex
CREATE INDEX "InventoryCount_status_createdAt_idx" ON "InventoryCount"("status", "createdAt");

-- CreateIndex
CREATE INDEX "InventoryCount_countNumber_idx" ON "InventoryCount"("countNumber");

-- CreateIndex
CREATE INDEX "InventoryCount_createdById_idx" ON "InventoryCount"("createdById");

-- CreateIndex
CREATE INDEX "InventoryCount_approvedById_idx" ON "InventoryCount"("approvedById");

-- CreateIndex
CREATE INDEX "InventoryCount_cancelledById_idx" ON "InventoryCount"("cancelledById");

-- CreateIndex
CREATE INDEX "InventoryCountLocation_inventoryCountId_status_idx" ON "InventoryCountLocation"("inventoryCountId", "status");

-- CreateIndex
CREATE INDEX "InventoryCountLocation_locationId_idx" ON "InventoryCountLocation"("locationId");

-- CreateIndex
CREATE INDEX "InventoryCountLocation_countedById_idx" ON "InventoryCountLocation"("countedById");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryCountLocation_inventoryCountId_locationId_key" ON "InventoryCountLocation"("inventoryCountId", "locationId");

-- CreateIndex
CREATE INDEX "InventoryCountLine_inventoryCountId_status_idx" ON "InventoryCountLine"("inventoryCountId", "status");

-- CreateIndex
CREATE INDEX "InventoryCountLine_inventoryCountLocationId_status_idx" ON "InventoryCountLine"("inventoryCountLocationId", "status");

-- CreateIndex
CREATE INDEX "InventoryCountLine_locationId_productId_idx" ON "InventoryCountLine"("locationId", "productId");

-- CreateIndex
CREATE INDEX "InventoryCountLine_handlingUnitId_productId_idx" ON "InventoryCountLine"("handlingUnitId", "productId");

-- CreateIndex
CREATE INDEX "InventoryCountLine_productId_idx" ON "InventoryCountLine"("productId");

-- CreateIndex
CREATE INDEX "InventoryCountLine_countedById_idx" ON "InventoryCountLine"("countedById");

-- CreateIndex
CREATE INDEX "InventoryCountLine_countedAt_idx" ON "InventoryCountLine"("countedAt");

-- CreateIndex
CREATE INDEX "InventoryCountLine_approvedAt_idx" ON "InventoryCountLine"("approvedAt");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryCountLine_inventoryCountId_locationId_handlingUnit_key" ON "InventoryCountLine"("inventoryCountId", "locationId", "handlingUnitId", "productId");

-- AddForeignKey
ALTER TABLE "InventoryCount" ADD CONSTRAINT "InventoryCount_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryCount" ADD CONSTRAINT "InventoryCount_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryCount" ADD CONSTRAINT "InventoryCount_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryCount" ADD CONSTRAINT "InventoryCount_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryCountLocation" ADD CONSTRAINT "InventoryCountLocation_inventoryCountId_fkey" FOREIGN KEY ("inventoryCountId") REFERENCES "InventoryCount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryCountLocation" ADD CONSTRAINT "InventoryCountLocation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "WarehouseLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryCountLocation" ADD CONSTRAINT "InventoryCountLocation_countedById_fkey" FOREIGN KEY ("countedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryCountLine" ADD CONSTRAINT "InventoryCountLine_inventoryCountId_fkey" FOREIGN KEY ("inventoryCountId") REFERENCES "InventoryCount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryCountLine" ADD CONSTRAINT "InventoryCountLine_inventoryCountLocationId_fkey" FOREIGN KEY ("inventoryCountLocationId") REFERENCES "InventoryCountLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryCountLine" ADD CONSTRAINT "InventoryCountLine_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "WarehouseLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryCountLine" ADD CONSTRAINT "InventoryCountLine_handlingUnitId_fkey" FOREIGN KEY ("handlingUnitId") REFERENCES "HandlingUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryCountLine" ADD CONSTRAINT "InventoryCountLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryCountLine" ADD CONSTRAINT "InventoryCountLine_countedById_fkey" FOREIGN KEY ("countedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
