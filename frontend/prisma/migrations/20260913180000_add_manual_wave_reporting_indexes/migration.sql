-- Phase 4 reporting: scoped date, operator and distribution/product access paths.
CREATE INDEX "ManualSortingTransaction_scope_createdAt_status_idx"
ON "ManualSortingTransaction"("tenantId", "companyId", "warehouseId", "createdAt", "status");

CREATE INDEX "ManualSortingTransaction_scope_operator_createdAt_idx"
ON "ManualSortingTransaction"("tenantId", "companyId", "warehouseId", "operatorId", "createdAt");

CREATE INDEX "ManualSortingTransaction_scope_distribution_product_status_idx"
ON "ManualSortingTransaction"("tenantId", "companyId", "warehouseId", "distributionId", "productId", "status");
