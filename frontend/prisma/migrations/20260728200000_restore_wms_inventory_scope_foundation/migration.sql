-- ETKEN WMS 3PL inventory scope foundation
-- Existing records are preserved and assigned to their current/default company.

ALTER TABLE "Product"
ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'tenant_etken',
ADD COLUMN "companyId" TEXT NOT NULL DEFAULT 'company_etken_office';

ALTER TABLE "StockMovement"
ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'tenant_etken',
ADD COLUMN "companyId" TEXT NOT NULL DEFAULT 'company_etken_office',
ADD COLUMN "warehouseId" INTEGER;

ALTER TABLE "HandlingUnit"
ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'tenant_etken',
ADD COLUMN "companyId" TEXT NOT NULL DEFAULT 'company_etken_office';

UPDATE "Product" AS product
SET
  "tenantId" = company."tenantId",
  "companyId" = company."id"
FROM "WmsCompany" AS company
WHERE company."id" = 'company_etken_office';

UPDATE "HandlingUnit" AS handling_unit
SET
  "tenantId" = warehouse."tenantId",
  "companyId" = warehouse."companyId"
FROM "Warehouse" AS warehouse
WHERE handling_unit."warehouseId" = warehouse."id";

UPDATE "StockMovement" AS movement
SET
  "tenantId" = product."tenantId",
  "companyId" = product."companyId"
FROM "Product" AS product
WHERE movement."productId" = product."id";

UPDATE "StockMovement" AS movement
SET "warehouseId" = (
  SELECT warehouse."id"
  FROM "Warehouse" AS warehouse
  WHERE
    warehouse."tenantId" = movement."tenantId"
    AND warehouse."companyId" = movement."companyId"
  ORDER BY
    warehouse."isActive" DESC,
    warehouse."id" ASC
  LIMIT 1
)
WHERE movement."warehouseId" IS NULL;

CREATE TABLE "WarehouseProductStock" (
  "id" SERIAL NOT NULL,
  "tenantId" TEXT NOT NULL DEFAULT 'tenant_etken',
  "companyId" TEXT NOT NULL DEFAULT 'company_etken_office',
  "warehouseId" INTEGER NOT NULL,
  "productId" INTEGER NOT NULL,
  "physicalStock" INTEGER NOT NULL DEFAULT 0,
  "reservedStock" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WarehouseProductStock_pkey" PRIMARY KEY ("id")
);

INSERT INTO "WarehouseProductStock" (
  "tenantId",
  "companyId",
  "warehouseId",
  "productId",
  "physicalStock",
  "reservedStock",
  "createdAt",
  "updatedAt"
)
SELECT
  product."tenantId",
  product."companyId",
  selected_warehouse."id",
  product."id",
  product."stock",
  product."reservedStock",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Product" AS product
JOIN LATERAL (
  SELECT warehouse."id"
  FROM "Warehouse" AS warehouse
  WHERE
    warehouse."tenantId" = product."tenantId"
    AND warehouse."companyId" = product."companyId"
  ORDER BY
    warehouse."isActive" DESC,
    warehouse."id" ASC
  LIMIT 1
) AS selected_warehouse ON TRUE;

CREATE INDEX "Product_tenantId_companyId_isActive_idx"
ON "Product"("tenantId", "companyId", "isActive");

CREATE INDEX "Product_companyId_code_idx"
ON "Product"("companyId", "code");

CREATE INDEX "Product_companyId_barcode_idx"
ON "Product"("companyId", "barcode");

CREATE INDEX "StockMovement_tenantId_companyId_warehouseId_idx"
ON "StockMovement"("tenantId", "companyId", "warehouseId");

CREATE INDEX "StockMovement_companyId_productId_createdAt_idx"
ON "StockMovement"("companyId", "productId", "createdAt");

CREATE INDEX "StockMovement_warehouseId_productId_createdAt_idx"
ON "StockMovement"("warehouseId", "productId", "createdAt");

CREATE INDEX "HandlingUnit_tenantId_companyId_warehouseId_idx"
ON "HandlingUnit"("tenantId", "companyId", "warehouseId");

CREATE INDEX "HandlingUnit_companyId_barcode_idx"
ON "HandlingUnit"("companyId", "barcode");

CREATE UNIQUE INDEX "WarehouseProductStock_warehouseId_productId_key"
ON "WarehouseProductStock"("warehouseId", "productId");

CREATE INDEX "WarehouseProductStock_tenantId_companyId_warehouseId_idx"
ON "WarehouseProductStock"("tenantId", "companyId", "warehouseId");

CREATE INDEX "WarehouseProductStock_companyId_productId_idx"
ON "WarehouseProductStock"("companyId", "productId");

CREATE INDEX "WarehouseProductStock_warehouseId_physicalStock_idx"
ON "WarehouseProductStock"("warehouseId", "physicalStock");

CREATE INDEX "WarehouseProductStock_warehouseId_reservedStock_idx"
ON "WarehouseProductStock"("warehouseId", "reservedStock");

ALTER TABLE "Product"
ADD CONSTRAINT "Product_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "WmsTenant"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Product"
ADD CONSTRAINT "Product_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "WmsCompany"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StockMovement"
ADD CONSTRAINT "StockMovement_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "WmsTenant"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StockMovement"
ADD CONSTRAINT "StockMovement_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "WmsCompany"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StockMovement"
ADD CONSTRAINT "StockMovement_warehouseId_fkey"
FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "HandlingUnit"
ADD CONSTRAINT "HandlingUnit_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "WmsTenant"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "HandlingUnit"
ADD CONSTRAINT "HandlingUnit_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "WmsCompany"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WarehouseProductStock"
ADD CONSTRAINT "WarehouseProductStock_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "WmsTenant"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WarehouseProductStock"
ADD CONSTRAINT "WarehouseProductStock_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "WmsCompany"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WarehouseProductStock"
ADD CONSTRAINT "WarehouseProductStock_warehouseId_fkey"
FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WarehouseProductStock"
ADD CONSTRAINT "WarehouseProductStock_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
