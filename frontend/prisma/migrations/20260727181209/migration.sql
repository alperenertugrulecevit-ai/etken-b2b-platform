-- RenameIndex
ALTER INDEX "logistics_center_tenant_code_unique" RENAME TO "LogisticsCenter_tenantId_code_key";

-- RenameIndex
ALTER INDEX "wms_company_user_unique" RENAME TO "UserCompanyAccess_companyId_userId_key";

-- RenameIndex
ALTER INDEX "wms_warehouse_user_unique" RENAME TO "UserWarehouseAccess_warehouseId_userId_key";

-- RenameIndex
ALTER INDEX "wms_company_tenant_code_unique" RENAME TO "WmsCompany_tenantId_code_key";

-- RenameIndex
ALTER INDEX "wms_tenant_user_unique" RENAME TO "WmsTenantMembership_tenantId_userId_key";
