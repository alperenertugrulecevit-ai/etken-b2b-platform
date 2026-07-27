-- ETKEN WMS 3PL / ÇOK ŞİRKETLİ TEMEL
-- Bu migration mevcut kayıtları silmez.

CREATE TABLE "WmsTenant" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "taxOffice" TEXT,
    "taxNumber" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "city" TEXT,
    "district" TEXT,
    "postalCode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WmsTenant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WmsCompany" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "taxOffice" TEXT,
    "taxNumber" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "contactName" TEXT,
    "address" TEXT,
    "city" TEXT,
    "district" TEXT,
    "postalCode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WmsCompany_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LogisticsCenter" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "district" TEXT,
    "postalCode" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LogisticsCenter_pkey" PRIMARY KEY ("id")
);

INSERT INTO "WmsTenant" (
    "id",
    "code",
    "name",
    "legalName",
    "isActive",
    "createdAt",
    "updatedAt"
)
VALUES (
    'tenant_etken',
    'ETKEN',
    'ETKEN WMS',
    'Etken Ofis Tedarik Hizm. Ltd. Şti.',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

INSERT INTO "WmsCompany" (
    "id",
    "tenantId",
    "code",
    "name",
    "legalName",
    "isActive",
    "createdAt",
    "updatedAt"
)
VALUES (
    'company_etken_office',
    'tenant_etken',
    'ETKEN-OFIS',
    'ETKEN OFİS',
    'Etken Ofis Tedarik Hizm. Ltd. Şti.',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

INSERT INTO "LogisticsCenter" (
    "id",
    "tenantId",
    "code",
    "name",
    "isActive",
    "createdAt",
    "updatedAt"
)
VALUES (
    'logistics_center_etken',
    'tenant_etken',
    'ETKEN-MERKEZ',
    'ETKEN Merkez Lojistik Merkezi',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

ALTER TABLE "Warehouse"
    ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'tenant_etken',
    ADD COLUMN "companyId" TEXT NOT NULL DEFAULT 'company_etken_office',
    ADD COLUMN "logisticsCenterId" TEXT NOT NULL DEFAULT 'logistics_center_etken';

CREATE TABLE "WmsTenantMembership" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isTenantAdmin" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WmsTenantMembership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserCompanyAccess" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "canView" BOOLEAN NOT NULL DEFAULT true,
    "canOperate" BOOLEAN NOT NULL DEFAULT true,
    "canManage" BOOLEAN NOT NULL DEFAULT false,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserCompanyAccess_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserWarehouseAccess" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "warehouseId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "canView" BOOLEAN NOT NULL DEFAULT true,
    "canOperate" BOOLEAN NOT NULL DEFAULT true,
    "canManage" BOOLEAN NOT NULL DEFAULT false,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserWarehouseAccess_pkey" PRIMARY KEY ("id")
);

INSERT INTO "WmsTenantMembership" (
    "id",
    "tenantId",
    "userId",
    "isTenantAdmin",
    "isActive",
    "createdAt",
    "updatedAt"
)
SELECT
    'tm_' || md5(
        random()::text ||
        clock_timestamp()::text ||
        "id"
    ),
    'tenant_etken',
    "id",
    "isAdminUser",
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "User";

INSERT INTO "UserCompanyAccess" (
    "id",
    "tenantId",
    "companyId",
    "userId",
    "canView",
    "canOperate",
    "canManage",
    "isDefault",
    "isActive",
    "createdAt",
    "updatedAt"
)
SELECT
    'ca_' || md5(
        random()::text ||
        clock_timestamp()::text ||
        "id"
    ),
    'tenant_etken',
    'company_etken_office',
    "id",
    true,
    true,
    "isAdminUser",
    true,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "User";

INSERT INTO "UserWarehouseAccess" (
    "id",
    "tenantId",
    "warehouseId",
    "userId",
    "canView",
    "canOperate",
    "canManage",
    "isDefault",
    "isActive",
    "createdAt",
    "updatedAt"
)
SELECT
    'wa_' || md5(
        random()::text ||
        clock_timestamp()::text ||
        "User"."id" ||
        "Warehouse"."id"::text
    ),
    'tenant_etken',
    "Warehouse"."id",
    "User"."id",
    true,
    true,
    "User"."isAdminUser",
    true,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "User"
CROSS JOIN "Warehouse";

CREATE UNIQUE INDEX "WmsTenant_code_key"
    ON "WmsTenant"("code");

CREATE INDEX "WmsTenant_name_idx"
    ON "WmsTenant"("name");

CREATE INDEX "WmsTenant_isActive_idx"
    ON "WmsTenant"("isActive");

CREATE UNIQUE INDEX "wms_company_tenant_code_unique"
    ON "WmsCompany"("tenantId", "code");

CREATE INDEX "WmsCompany_tenantId_isActive_idx"
    ON "WmsCompany"("tenantId", "isActive");

CREATE INDEX "WmsCompany_name_idx"
    ON "WmsCompany"("name");

CREATE INDEX "WmsCompany_taxNumber_idx"
    ON "WmsCompany"("taxNumber");

CREATE UNIQUE INDEX "logistics_center_tenant_code_unique"
    ON "LogisticsCenter"("tenantId", "code");

CREATE INDEX "LogisticsCenter_tenantId_isActive_idx"
    ON "LogisticsCenter"("tenantId", "isActive");

CREATE INDEX "LogisticsCenter_name_idx"
    ON "LogisticsCenter"("name");

CREATE INDEX "Warehouse_tenantId_idx"
    ON "Warehouse"("tenantId");

CREATE INDEX "Warehouse_companyId_idx"
    ON "Warehouse"("companyId");

CREATE INDEX "Warehouse_logisticsCenterId_idx"
    ON "Warehouse"("logisticsCenterId");

CREATE INDEX "Warehouse_tenantId_companyId_isActive_idx"
    ON "Warehouse"(
        "tenantId",
        "companyId",
        "isActive"
    );

CREATE UNIQUE INDEX "wms_tenant_user_unique"
    ON "WmsTenantMembership"(
        "tenantId",
        "userId"
    );

CREATE INDEX "WmsTenantMembership_userId_isActive_idx"
    ON "WmsTenantMembership"(
        "userId",
        "isActive"
    );

CREATE INDEX "WmsTenantMembership_tenantId_isActive_idx"
    ON "WmsTenantMembership"(
        "tenantId",
        "isActive"
    );

CREATE UNIQUE INDEX "wms_company_user_unique"
    ON "UserCompanyAccess"(
        "companyId",
        "userId"
    );

CREATE INDEX "UserCompanyAccess_tenantId_userId_isActive_idx"
    ON "UserCompanyAccess"(
        "tenantId",
        "userId",
        "isActive"
    );

CREATE INDEX "UserCompanyAccess_companyId_isActive_idx"
    ON "UserCompanyAccess"(
        "companyId",
        "isActive"
    );

CREATE INDEX "UserCompanyAccess_userId_isDefault_idx"
    ON "UserCompanyAccess"(
        "userId",
        "isDefault"
    );

CREATE UNIQUE INDEX "wms_warehouse_user_unique"
    ON "UserWarehouseAccess"(
        "warehouseId",
        "userId"
    );

CREATE INDEX "UserWarehouseAccess_tenantId_userId_isActive_idx"
    ON "UserWarehouseAccess"(
        "tenantId",
        "userId",
        "isActive"
    );

CREATE INDEX "UserWarehouseAccess_warehouseId_isActive_idx"
    ON "UserWarehouseAccess"(
        "warehouseId",
        "isActive"
    );

CREATE INDEX "UserWarehouseAccess_userId_isDefault_idx"
    ON "UserWarehouseAccess"(
        "userId",
        "isDefault"
    );

ALTER TABLE "WmsCompany"
    ADD CONSTRAINT "WmsCompany_tenantId_fkey"
    FOREIGN KEY ("tenantId")
    REFERENCES "WmsTenant"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

ALTER TABLE "LogisticsCenter"
    ADD CONSTRAINT "LogisticsCenter_tenantId_fkey"
    FOREIGN KEY ("tenantId")
    REFERENCES "WmsTenant"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

ALTER TABLE "Warehouse"
    ADD CONSTRAINT "Warehouse_tenantId_fkey"
    FOREIGN KEY ("tenantId")
    REFERENCES "WmsTenant"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

ALTER TABLE "Warehouse"
    ADD CONSTRAINT "Warehouse_companyId_fkey"
    FOREIGN KEY ("companyId")
    REFERENCES "WmsCompany"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

ALTER TABLE "Warehouse"
    ADD CONSTRAINT "Warehouse_logisticsCenterId_fkey"
    FOREIGN KEY ("logisticsCenterId")
    REFERENCES "LogisticsCenter"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

ALTER TABLE "WmsTenantMembership"
    ADD CONSTRAINT "WmsTenantMembership_tenantId_fkey"
    FOREIGN KEY ("tenantId")
    REFERENCES "WmsTenant"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE "WmsTenantMembership"
    ADD CONSTRAINT "WmsTenantMembership_userId_fkey"
    FOREIGN KEY ("userId")
    REFERENCES "User"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE "UserCompanyAccess"
    ADD CONSTRAINT "UserCompanyAccess_tenantId_fkey"
    FOREIGN KEY ("tenantId")
    REFERENCES "WmsTenant"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE "UserCompanyAccess"
    ADD CONSTRAINT "UserCompanyAccess_companyId_fkey"
    FOREIGN KEY ("companyId")
    REFERENCES "WmsCompany"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE "UserCompanyAccess"
    ADD CONSTRAINT "UserCompanyAccess_userId_fkey"
    FOREIGN KEY ("userId")
    REFERENCES "User"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE "UserWarehouseAccess"
    ADD CONSTRAINT "UserWarehouseAccess_tenantId_fkey"
    FOREIGN KEY ("tenantId")
    REFERENCES "WmsTenant"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE "UserWarehouseAccess"
    ADD CONSTRAINT "UserWarehouseAccess_warehouseId_fkey"
    FOREIGN KEY ("warehouseId")
    REFERENCES "Warehouse"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE "UserWarehouseAccess"
    ADD CONSTRAINT "UserWarehouseAccess_userId_fkey"
    FOREIGN KEY ("userId")
    REFERENCES "User"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
