-- Warehouse Zone Management
CREATE TABLE "WarehouseZone" (
  "id" SERIAL NOT NULL,
  "warehouseId" INTEGER NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "pickSequence" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WarehouseZone_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "WarehouseLocation" ADD COLUMN "zoneId" INTEGER;

CREATE TABLE "WarehouseLocationZoneHistory" (
  "id" SERIAL NOT NULL,
  "warehouseId" INTEGER NOT NULL,
  "locationId" INTEGER NOT NULL,
  "oldZoneId" INTEGER,
  "newZoneId" INTEGER,
  "changedBy" TEXT,
  "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WarehouseLocationZoneHistory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "warehouse_zone_code_unique" ON "WarehouseZone"("warehouseId", "code");
CREATE INDEX "WarehouseZone_warehouseId_isActive_idx" ON "WarehouseZone"("warehouseId", "isActive");
CREATE INDEX "WarehouseZone_warehouseId_pickSequence_idx" ON "WarehouseZone"("warehouseId", "pickSequence");
CREATE INDEX "WarehouseLocation_zoneId_idx" ON "WarehouseLocation"("zoneId");
CREATE INDEX "WarehouseLocation_warehouseId_zoneId_idx" ON "WarehouseLocation"("warehouseId", "zoneId");
CREATE INDEX "WarehouseLocationZoneHistory_warehouseId_changedAt_idx" ON "WarehouseLocationZoneHistory"("warehouseId", "changedAt");
CREATE INDEX "WarehouseLocationZoneHistory_locationId_changedAt_idx" ON "WarehouseLocationZoneHistory"("locationId", "changedAt");
CREATE INDEX "WarehouseLocationZoneHistory_oldZoneId_idx" ON "WarehouseLocationZoneHistory"("oldZoneId");
CREATE INDEX "WarehouseLocationZoneHistory_newZoneId_idx" ON "WarehouseLocationZoneHistory"("newZoneId");

ALTER TABLE "WarehouseZone" ADD CONSTRAINT "WarehouseZone_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WarehouseLocation" ADD CONSTRAINT "WarehouseLocation_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "WarehouseZone"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WarehouseLocationZoneHistory" ADD CONSTRAINT "WarehouseLocationZoneHistory_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WarehouseLocationZoneHistory" ADD CONSTRAINT "WarehouseLocationZoneHistory_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "WarehouseLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WarehouseLocationZoneHistory" ADD CONSTRAINT "WarehouseLocationZoneHistory_oldZoneId_fkey" FOREIGN KEY ("oldZoneId") REFERENCES "WarehouseZone"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WarehouseLocationZoneHistory" ADD CONSTRAINT "WarehouseLocationZoneHistory_newZoneId_fkey" FOREIGN KEY ("newZoneId") REFERENCES "WarehouseZone"("id") ON DELETE SET NULL ON UPDATE CASCADE;
