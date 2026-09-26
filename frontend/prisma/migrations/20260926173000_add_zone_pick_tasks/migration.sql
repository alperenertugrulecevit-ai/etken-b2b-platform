CREATE TYPE "ZonePickTaskStatus" AS ENUM ('OPEN','CLAIMED','IN_PROGRESS','COMPLETED','CANCELLED');

CREATE TABLE "ZonePickTask" (
 "id" TEXT NOT NULL,
 "warehouseId" INTEGER NOT NULL,
 "zoneId" INTEGER NOT NULL,
 "orderId" INTEGER NOT NULL,
 "waveId" TEXT,
 "status" "ZonePickTaskStatus" NOT NULL DEFAULT 'OPEN',
 "claimedByUserId" TEXT,
 "claimedAt" TIMESTAMP(3),
 "startedAt" TIMESTAMP(3),
 "completedAt" TIMESTAMP(3),
 "plannedLineCount" INTEGER NOT NULL DEFAULT 0,
 "plannedQuantity" INTEGER NOT NULL DEFAULT 0,
 "pickedQuantity" INTEGER NOT NULL DEFAULT 0,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "ZonePickTask_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "order_zone_wave_task_unique" ON "ZonePickTask"("orderId","zoneId","waveId");
CREATE INDEX "ZonePickTask_warehouseId_zoneId_status_idx" ON "ZonePickTask"("warehouseId","zoneId","status");
CREATE INDEX "ZonePickTask_claimedByUserId_status_idx" ON "ZonePickTask"("claimedByUserId","status");
CREATE INDEX "ZonePickTask_waveId_status_idx" ON "ZonePickTask"("waveId","status");
CREATE INDEX "ZonePickTask_orderId_status_idx" ON "ZonePickTask"("orderId","status");
ALTER TABLE "ZonePickTask" ADD CONSTRAINT "ZonePickTask_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ZonePickTask" ADD CONSTRAINT "ZonePickTask_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "WarehouseZone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ZonePickTask" ADD CONSTRAINT "ZonePickTask_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ZonePickTask" ADD CONSTRAINT "ZonePickTask_waveId_fkey" FOREIGN KEY ("waveId") REFERENCES "Wave"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ZonePickTask" ADD CONSTRAINT "ZonePickTask_claimedByUserId_fkey" FOREIGN KEY ("claimedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
