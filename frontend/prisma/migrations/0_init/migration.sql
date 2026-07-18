-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."HandlingUnitPurpose" AS ENUM ('STOCK', 'PICKING', 'PACKING', 'SHIPPING', 'RECEIVING');

-- CreateEnum
CREATE TYPE "public"."HandlingUnitStatus" AS ENUM ('OPEN', 'CLOSED', 'STORED', 'IN_TRANSIT', 'EMPTY', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."HandlingUnitType" AS ENUM ('PALLET', 'BOX', 'PICKING_PALLET', 'PICKING_BOX');

-- CreateEnum
CREATE TYPE "public"."OrderStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'PREPARING', 'PICKING', 'PACKING', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."PurchaseOrderStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."StockMovementType" AS ENUM ('INITIAL_STOCK', 'PURCHASE_RECEIPT', 'MANUAL_IN', 'MANUAL_OUT', 'RESERVATION_CREATE', 'RESERVATION_RELEASE', 'SALE_SHIPMENT', 'SALE_RETURN', 'COUNT_INCREASE', 'COUNT_DECREASE', 'TRANSFER_IN', 'TRANSFER_OUT');

-- CreateEnum
CREATE TYPE "public"."WarehouseLocationType" AS ENUM ('PALLET', 'BOX', 'HANGING', 'FLOOR', 'RETURN', 'QUALITY', 'RFID', 'SHIPPING', 'RECEIVING', 'QUARANTINE');

-- CreateEnum
CREATE TYPE "public"."WmsOperationType" AS ENUM ('RECEIVING', 'HANDLING_UNIT_CREATE', 'HANDLING_UNIT_UPDATE', 'HANDLING_UNIT_CANCEL', 'ADDRESSING', 'UNADDRESSING', 'ITEM_TRANSFER', 'FULL_TRANSFER', 'PALLET_LINK', 'PALLET_UNLINK', 'PICKING', 'PACKING', 'SHIPPING', 'COUNT', 'STOCK_IN', 'STOCK_OUT', 'OTHER');

-- CreateTable
CREATE TABLE "public"."Brand" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Category" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Customer" (
    "id" SERIAL NOT NULL,
    "customerCode" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "taxOffice" TEXT,
    "taxNumber" TEXT,
    "contactName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "city" TEXT,
    "district" TEXT,
    "paymentTermDays" INTEGER NOT NULL DEFAULT 0,
    "discountRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "creditLimit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CustomerAddress" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "addressType" TEXT NOT NULL,
    "contactName" TEXT,
    "phone" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "postalCode" TEXT,
    "deliveryStartTime" TEXT,
    "deliveryEndTime" TEXT,
    "hasForklift" BOOLEAN NOT NULL DEFAULT false,
    "rampCount" INTEGER NOT NULL DEFAULT 0,
    "vehicleType" TEXT,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."HandlingUnit" (
    "id" SERIAL NOT NULL,
    "barcode" TEXT NOT NULL,
    "unitType" "public"."HandlingUnitType" NOT NULL,
    "status" "public"."HandlingUnitStatus" NOT NULL DEFAULT 'OPEN',
    "warehouseId" INTEGER,
    "locationId" INTEGER,
    "parentUnitId" INTEGER,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "assignedOrderId" INTEGER,
    "purpose" "public"."HandlingUnitPurpose" NOT NULL DEFAULT 'STOCK',

    CONSTRAINT "HandlingUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."HandlingUnitItem" (
    "id" SERIAL NOT NULL,
    "handlingUnitId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "reservedStock" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HandlingUnitItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Order" (
    "id" SERIAL NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "customerId" INTEGER NOT NULL,
    "shippingAddressId" INTEGER,
    "status" "public"."OrderStatus" NOT NULL DEFAULT 'PENDING',
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestedDate" TIMESTAMP(3),
    "paymentTermDays" INTEGER NOT NULL DEFAULT 0,
    "discountRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vatAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "customerNote" TEXT,
    "internalNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "stockDeducted" BOOLEAN NOT NULL DEFAULT false,
    "stockDeductedAt" TIMESTAMP(3),
    "stockReserved" BOOLEAN NOT NULL DEFAULT false,
    "stockReservedAt" TIMESTAMP(3),

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OrderItem" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "productCode" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "vatRate" INTEGER NOT NULL,
    "lineNet" DOUBLE PRECISION NOT NULL,
    "vatAmount" DOUBLE PRECISION NOT NULL,
    "lineTotal" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pickedQuantity" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PickingRecord" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "orderItemId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "sourceHandlingUnitId" INTEGER NOT NULL,
    "targetHandlingUnitId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "sourceQuantityAfter" INTEGER NOT NULL,
    "targetQuantityAfter" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PickingRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Product" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "barcode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "supplier" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "stock" INTEGER NOT NULL,
    "vat" INTEGER NOT NULL,
    "ownStock" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "reservedStock" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PurchaseOrder" (
    "id" SERIAL NOT NULL,
    "purchaseNumber" TEXT NOT NULL,
    "supplierId" INTEGER NOT NULL,
    "status" "public"."PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedDate" TIMESTAMP(3),
    "paymentTermDays" INTEGER NOT NULL DEFAULT 0,
    "discountRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vatAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "supplierNote" TEXT,
    "internalNote" TEXT,
    "approvedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PurchaseOrderItem" (
    "id" SERIAL NOT NULL,
    "purchaseOrderId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "productCode" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "orderedQuantity" INTEGER NOT NULL,
    "receivedQuantity" INTEGER NOT NULL DEFAULT 0,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "vatRate" INTEGER NOT NULL,
    "lineNet" DOUBLE PRECISION NOT NULL,
    "vatAmount" DOUBLE PRECISION NOT NULL,
    "lineTotal" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StockMovement" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "orderId" INTEGER,
    "movementType" "public"."StockMovementType" NOT NULL,
    "physicalChange" INTEGER NOT NULL DEFAULT 0,
    "reservedChange" INTEGER NOT NULL DEFAULT 0,
    "physicalBalanceAfter" INTEGER NOT NULL,
    "reservedBalanceAfter" INTEGER NOT NULL,
    "availableBalanceAfter" INTEGER NOT NULL,
    "documentNumber" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "purchaseOrderId" INTEGER,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Supplier" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "taxNumber" TEXT,
    "contactName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "paymentTermDays" INTEGER NOT NULL DEFAULT 0,
    "discountRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deliveryDays" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "district" TEXT,
    "postalCode" TEXT,
    "taxOffice" TEXT,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Warehouse" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "district" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WarehouseLocation" (
    "id" SERIAL NOT NULL,
    "warehouseId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "aisle" TEXT NOT NULL DEFAULT '',
    "section" TEXT NOT NULL DEFAULT '',
    "level" TEXT NOT NULL DEFAULT '',
    "bin" TEXT NOT NULL DEFAULT '',
    "locationType" "public"."WarehouseLocationType" NOT NULL DEFAULT 'PALLET',
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarehouseLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WarehouseLocationStock" (
    "id" SERIAL NOT NULL,
    "locationId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "reservedStock" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarehouseLocationStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WmsOperationLog" (
    "id" SERIAL NOT NULL,
    "operationType" "public"."WmsOperationType" NOT NULL,
    "module" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" INTEGER,
    "operatorId" TEXT,
    "operatorName" TEXT,
    "terminalCode" TEXT,
    "ipAddress" TEXT,
    "barcode" TEXT,
    "sourceBarcode" TEXT,
    "targetBarcode" TEXT,
    "orderId" INTEGER,
    "orderNumber" TEXT,
    "purchaseOrderId" INTEGER,
    "purchaseNumber" TEXT,
    "productId" INTEGER,
    "productCode" TEXT,
    "productName" TEXT,
    "quantity" INTEGER,
    "warehouseId" INTEGER,
    "warehouseCode" TEXT,
    "sourceLocationId" INTEGER,
    "sourceLocationCode" TEXT,
    "targetLocationId" INTEGER,
    "targetLocationCode" TEXT,
    "previousStatus" TEXT,
    "newStatus" TEXT,
    "description" TEXT,
    "metadata" JSONB,
    "isSuccessful" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WmsOperationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Brand_name_key" ON "public"."Brand"("name" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Brand_slug_key" ON "public"."Brand"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "public"."Category"("name" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "public"."Category"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_customerCode_key" ON "public"."Customer"("customerCode" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_taxNumber_key" ON "public"."Customer"("taxNumber" ASC);

-- CreateIndex
CREATE INDEX "CustomerAddress_customerId_idx" ON "public"."CustomerAddress"("customerId" ASC);

-- CreateIndex
CREATE INDEX "HandlingUnit_assignedOrderId_idx" ON "public"."HandlingUnit"("assignedOrderId" ASC);

-- CreateIndex
CREATE INDEX "HandlingUnit_barcode_idx" ON "public"."HandlingUnit"("barcode" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "HandlingUnit_barcode_key" ON "public"."HandlingUnit"("barcode" ASC);

-- CreateIndex
CREATE INDEX "HandlingUnit_locationId_idx" ON "public"."HandlingUnit"("locationId" ASC);

-- CreateIndex
CREATE INDEX "HandlingUnit_parentUnitId_idx" ON "public"."HandlingUnit"("parentUnitId" ASC);

-- CreateIndex
CREATE INDEX "HandlingUnit_purpose_idx" ON "public"."HandlingUnit"("purpose" ASC);

-- CreateIndex
CREATE INDEX "HandlingUnit_status_idx" ON "public"."HandlingUnit"("status" ASC);

-- CreateIndex
CREATE INDEX "HandlingUnit_unitType_idx" ON "public"."HandlingUnit"("unitType" ASC);

-- CreateIndex
CREATE INDEX "HandlingUnit_warehouseId_idx" ON "public"."HandlingUnit"("warehouseId" ASC);

-- CreateIndex
CREATE INDEX "HandlingUnitItem_handlingUnitId_idx" ON "public"."HandlingUnitItem"("handlingUnitId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "HandlingUnitItem_handlingUnitId_productId_key" ON "public"."HandlingUnitItem"("handlingUnitId" ASC, "productId" ASC);

-- CreateIndex
CREATE INDEX "HandlingUnitItem_productId_idx" ON "public"."HandlingUnitItem"("productId" ASC);

-- CreateIndex
CREATE INDEX "HandlingUnitItem_quantity_idx" ON "public"."HandlingUnitItem"("quantity" ASC);

-- CreateIndex
CREATE INDEX "Order_customerId_idx" ON "public"."Order"("customerId" ASC);

-- CreateIndex
CREATE INDEX "Order_orderDate_idx" ON "public"."Order"("orderDate" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "public"."Order"("orderNumber" ASC);

-- CreateIndex
CREATE INDEX "Order_shippingAddressId_idx" ON "public"."Order"("shippingAddressId" ASC);

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "public"."Order"("status" ASC);

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "public"."OrderItem"("orderId" ASC);

-- CreateIndex
CREATE INDEX "OrderItem_pickedQuantity_idx" ON "public"."OrderItem"("pickedQuantity" ASC);

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "public"."OrderItem"("productId" ASC);

-- CreateIndex
CREATE INDEX "PickingRecord_createdAt_idx" ON "public"."PickingRecord"("createdAt" ASC);

-- CreateIndex
CREATE INDEX "PickingRecord_orderId_idx" ON "public"."PickingRecord"("orderId" ASC);

-- CreateIndex
CREATE INDEX "PickingRecord_orderItemId_idx" ON "public"."PickingRecord"("orderItemId" ASC);

-- CreateIndex
CREATE INDEX "PickingRecord_productId_idx" ON "public"."PickingRecord"("productId" ASC);

-- CreateIndex
CREATE INDEX "PickingRecord_sourceHandlingUnitId_idx" ON "public"."PickingRecord"("sourceHandlingUnitId" ASC);

-- CreateIndex
CREATE INDEX "PickingRecord_targetHandlingUnitId_idx" ON "public"."PickingRecord"("targetHandlingUnitId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Product_barcode_key" ON "public"."Product"("barcode" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Product_code_key" ON "public"."Product"("code" ASC);

-- CreateIndex
CREATE INDEX "PurchaseOrder_expectedDate_idx" ON "public"."PurchaseOrder"("expectedDate" ASC);

-- CreateIndex
CREATE INDEX "PurchaseOrder_orderDate_idx" ON "public"."PurchaseOrder"("orderDate" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_purchaseNumber_key" ON "public"."PurchaseOrder"("purchaseNumber" ASC);

-- CreateIndex
CREATE INDEX "PurchaseOrder_status_idx" ON "public"."PurchaseOrder"("status" ASC);

-- CreateIndex
CREATE INDEX "PurchaseOrder_supplierId_idx" ON "public"."PurchaseOrder"("supplierId" ASC);

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_productId_idx" ON "public"."PurchaseOrderItem"("productId" ASC);

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_purchaseOrderId_idx" ON "public"."PurchaseOrderItem"("purchaseOrderId" ASC);

-- CreateIndex
CREATE INDEX "StockMovement_createdAt_idx" ON "public"."StockMovement"("createdAt" ASC);

-- CreateIndex
CREATE INDEX "StockMovement_movementType_idx" ON "public"."StockMovement"("movementType" ASC);

-- CreateIndex
CREATE INDEX "StockMovement_orderId_idx" ON "public"."StockMovement"("orderId" ASC);

-- CreateIndex
CREATE INDEX "StockMovement_productId_idx" ON "public"."StockMovement"("productId" ASC);

-- CreateIndex
CREATE INDEX "StockMovement_purchaseOrderId_idx" ON "public"."StockMovement"("purchaseOrderId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_name_key" ON "public"."Supplier"("name" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_taxNumber_key" ON "public"."Supplier"("taxNumber" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Warehouse_code_key" ON "public"."Warehouse"("code" ASC);

-- CreateIndex
CREATE INDEX "WarehouseLocation_aisle_idx" ON "public"."WarehouseLocation"("aisle" ASC);

-- CreateIndex
CREATE INDEX "WarehouseLocation_code_idx" ON "public"."WarehouseLocation"("code" ASC);

-- CreateIndex
CREATE INDEX "WarehouseLocation_isActive_idx" ON "public"."WarehouseLocation"("isActive" ASC);

-- CreateIndex
CREATE INDEX "WarehouseLocation_locationType_idx" ON "public"."WarehouseLocation"("locationType" ASC);

-- CreateIndex
CREATE INDEX "WarehouseLocation_sortOrder_idx" ON "public"."WarehouseLocation"("sortOrder" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "WarehouseLocation_warehouseId_code_aisle_section_level_bin_key" ON "public"."WarehouseLocation"("warehouseId" ASC, "code" ASC, "aisle" ASC, "section" ASC, "level" ASC, "bin" ASC);

-- CreateIndex
CREATE INDEX "WarehouseLocation_warehouseId_idx" ON "public"."WarehouseLocation"("warehouseId" ASC);

-- CreateIndex
CREATE INDEX "WarehouseLocationStock_locationId_idx" ON "public"."WarehouseLocationStock"("locationId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "WarehouseLocationStock_locationId_productId_key" ON "public"."WarehouseLocationStock"("locationId" ASC, "productId" ASC);

-- CreateIndex
CREATE INDEX "WarehouseLocationStock_productId_idx" ON "public"."WarehouseLocationStock"("productId" ASC);

-- CreateIndex
CREATE INDEX "WarehouseLocationStock_quantity_idx" ON "public"."WarehouseLocationStock"("quantity" ASC);

-- CreateIndex
CREATE INDEX "WmsOperationLog_barcode_idx" ON "public"."WmsOperationLog"("barcode" ASC);

-- CreateIndex
CREATE INDEX "WmsOperationLog_createdAt_idx" ON "public"."WmsOperationLog"("createdAt" ASC);

-- CreateIndex
CREATE INDEX "WmsOperationLog_entityType_entityId_idx" ON "public"."WmsOperationLog"("entityType" ASC, "entityId" ASC);

-- CreateIndex
CREATE INDEX "WmsOperationLog_isSuccessful_idx" ON "public"."WmsOperationLog"("isSuccessful" ASC);

-- CreateIndex
CREATE INDEX "WmsOperationLog_module_idx" ON "public"."WmsOperationLog"("module" ASC);

-- CreateIndex
CREATE INDEX "WmsOperationLog_operationType_idx" ON "public"."WmsOperationLog"("operationType" ASC);

-- CreateIndex
CREATE INDEX "WmsOperationLog_operatorId_idx" ON "public"."WmsOperationLog"("operatorId" ASC);

-- CreateIndex
CREATE INDEX "WmsOperationLog_operatorName_idx" ON "public"."WmsOperationLog"("operatorName" ASC);

-- CreateIndex
CREATE INDEX "WmsOperationLog_orderId_idx" ON "public"."WmsOperationLog"("orderId" ASC);

-- CreateIndex
CREATE INDEX "WmsOperationLog_orderNumber_idx" ON "public"."WmsOperationLog"("orderNumber" ASC);

-- CreateIndex
CREATE INDEX "WmsOperationLog_productCode_idx" ON "public"."WmsOperationLog"("productCode" ASC);

-- CreateIndex
CREATE INDEX "WmsOperationLog_productId_idx" ON "public"."WmsOperationLog"("productId" ASC);

-- CreateIndex
CREATE INDEX "WmsOperationLog_purchaseNumber_idx" ON "public"."WmsOperationLog"("purchaseNumber" ASC);

-- CreateIndex
CREATE INDEX "WmsOperationLog_purchaseOrderId_idx" ON "public"."WmsOperationLog"("purchaseOrderId" ASC);

-- CreateIndex
CREATE INDEX "WmsOperationLog_sourceBarcode_idx" ON "public"."WmsOperationLog"("sourceBarcode" ASC);

-- CreateIndex
CREATE INDEX "WmsOperationLog_sourceLocationId_idx" ON "public"."WmsOperationLog"("sourceLocationId" ASC);

-- CreateIndex
CREATE INDEX "WmsOperationLog_targetBarcode_idx" ON "public"."WmsOperationLog"("targetBarcode" ASC);

-- CreateIndex
CREATE INDEX "WmsOperationLog_targetLocationId_idx" ON "public"."WmsOperationLog"("targetLocationId" ASC);

-- CreateIndex
CREATE INDEX "WmsOperationLog_terminalCode_idx" ON "public"."WmsOperationLog"("terminalCode" ASC);

-- CreateIndex
CREATE INDEX "WmsOperationLog_warehouseId_idx" ON "public"."WmsOperationLog"("warehouseId" ASC);

-- AddForeignKey
ALTER TABLE "public"."CustomerAddress" ADD CONSTRAINT "CustomerAddress_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HandlingUnit" ADD CONSTRAINT "HandlingUnit_assignedOrderId_fkey" FOREIGN KEY ("assignedOrderId") REFERENCES "public"."Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HandlingUnit" ADD CONSTRAINT "HandlingUnit_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."WarehouseLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HandlingUnit" ADD CONSTRAINT "HandlingUnit_parentUnitId_fkey" FOREIGN KEY ("parentUnitId") REFERENCES "public"."HandlingUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HandlingUnit" ADD CONSTRAINT "HandlingUnit_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "public"."Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HandlingUnitItem" ADD CONSTRAINT "HandlingUnitItem_handlingUnitId_fkey" FOREIGN KEY ("handlingUnitId") REFERENCES "public"."HandlingUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HandlingUnitItem" ADD CONSTRAINT "HandlingUnitItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_shippingAddressId_fkey" FOREIGN KEY ("shippingAddressId") REFERENCES "public"."CustomerAddress"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PickingRecord" ADD CONSTRAINT "PickingRecord_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PickingRecord" ADD CONSTRAINT "PickingRecord_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "public"."OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PickingRecord" ADD CONSTRAINT "PickingRecord_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PickingRecord" ADD CONSTRAINT "PickingRecord_sourceHandlingUnitId_fkey" FOREIGN KEY ("sourceHandlingUnitId") REFERENCES "public"."HandlingUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PickingRecord" ADD CONSTRAINT "PickingRecord_targetHandlingUnitId_fkey" FOREIGN KEY ("targetHandlingUnitId") REFERENCES "public"."HandlingUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "public"."Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "public"."PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StockMovement" ADD CONSTRAINT "StockMovement_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StockMovement" ADD CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StockMovement" ADD CONSTRAINT "StockMovement_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "public"."PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WarehouseLocation" ADD CONSTRAINT "WarehouseLocation_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "public"."Warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WarehouseLocationStock" ADD CONSTRAINT "WarehouseLocationStock_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."WarehouseLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WarehouseLocationStock" ADD CONSTRAINT "WarehouseLocationStock_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
