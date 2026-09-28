CREATE TABLE "ShippingBoxDefinition" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL DEFAULT 'tenant_etken',
  "companyId" TEXT NOT NULL DEFAULT 'company_etken_office',
  "code" TEXT NOT NULL,
  "boxType" TEXT NOT NULL,
  "dimensions" TEXT NOT NULL,
  "desi" DOUBLE PRECISION NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ShippingBoxDefinition_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ShippingBoxDefinitionWarehouse" (
  "boxDefinitionId" TEXT NOT NULL,
  "warehouseId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShippingBoxDefinitionWarehouse_pkey" PRIMARY KEY ("boxDefinitionId","warehouseId")
);
ALTER TABLE "ShippingHandlingUnit" ADD COLUMN "boxDefinitionId" TEXT;
ALTER TABLE "ShippingHandlingUnit" ADD COLUMN "boxCode" TEXT;
ALTER TABLE "ShippingHandlingUnit" ADD COLUMN "boxType" TEXT;
ALTER TABLE "ShippingHandlingUnit" ADD COLUMN "boxDimensions" TEXT;
ALTER TABLE "ShippingHandlingUnit" ADD COLUMN "desi" DOUBLE PRECISION;
CREATE UNIQUE INDEX "ShippingBoxDefinition_tenantId_companyId_code_key" ON "ShippingBoxDefinition"("tenantId","companyId","code");
CREATE INDEX "ShippingBoxDefinition_tenantId_companyId_isActive_idx" ON "ShippingBoxDefinition"("tenantId","companyId","isActive");
CREATE INDEX "ShippingBoxDefinitionWarehouse_warehouseId_idx" ON "ShippingBoxDefinitionWarehouse"("warehouseId");
CREATE INDEX "ShippingHandlingUnit_boxDefinitionId_idx" ON "ShippingHandlingUnit"("boxDefinitionId");
CREATE INDEX "ShippingHandlingUnit_boxCode_idx" ON "ShippingHandlingUnit"("boxCode");
ALTER TABLE "ShippingBoxDefinitionWarehouse" ADD CONSTRAINT "ShippingBoxDefinitionWarehouse_boxDefinitionId_fkey" FOREIGN KEY ("boxDefinitionId") REFERENCES "ShippingBoxDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShippingBoxDefinitionWarehouse" ADD CONSTRAINT "ShippingBoxDefinitionWarehouse_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShippingHandlingUnit" ADD CONSTRAINT "ShippingHandlingUnit_boxDefinitionId_fkey" FOREIGN KEY ("boxDefinitionId") REFERENCES "ShippingBoxDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "ShippingBoxDefinition" ("id","code","boxType","dimensions","desi","updatedAt") VALUES
('box-b2b001','B2B001','B2B','15*20*20',8,CURRENT_TIMESTAMP),
('box-b2b002','B2B002','B2B','30*20*20',16,CURRENT_TIMESTAMP),
('box-b2b003','B2B003','B2B','60*40*40',32,CURRENT_TIMESTAMP),
('box-b2c001','B2C001','B2C','10*10*30',1,CURRENT_TIMESTAMP),
('box-b2c002','B2C002','B2C','15*20*20',8,CURRENT_TIMESTAMP),
('box-b2c003','B2C003','B2C','30*20*20',16,CURRENT_TIMESTAMP),
('box-b2c004','B2C004','B2C','60*40*40',32,CURRENT_TIMESTAMP);
INSERT INTO "ShippingBoxDefinitionWarehouse" ("boxDefinitionId","warehouseId")
SELECT b."id",w."id" FROM "ShippingBoxDefinition" b CROSS JOIN "Warehouse" w
WHERE b."id" IN ('box-b2b001','box-b2b002','box-b2b003','box-b2c001','box-b2c002','box-b2c003','box-b2c004') AND w."isActive"=true;
