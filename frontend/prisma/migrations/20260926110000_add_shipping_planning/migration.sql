CREATE TYPE "ShipmentStatus" AS ENUM ('CREATED','ROUTING','ROUTED','LOADING','LOADED','SHIPPED');
CREATE TYPE "ShipmentHandlingUnitStatus" AS ENUM ('ROUTED','LOADED');
CREATE TYPE "ShipmentHandlingUnitEventType" AS ENUM ('ROUTED','REROUTED','LOADED','SHIPMENT_REMOVED','SHIPPED');
CREATE TYPE "ShippingVehicleOwnershipType" AS ENUM ('OWNED','RENTED');

CREATE TABLE "ShippingCarrier" (
 "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL DEFAULT 'tenant_etken', "companyId" TEXT NOT NULL DEFAULT 'company_etken_office',
 "code" TEXT NOT NULL, "name" TEXT NOT NULL, "taxNumber" TEXT, "phone" TEXT, "email" TEXT, "address" TEXT, "contactName" TEXT,
 "isActive" BOOLEAN NOT NULL DEFAULT true, "notes" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "ShippingCarrier_pkey" PRIMARY KEY ("id"));
CREATE TABLE "ShippingVehicle" (
 "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL DEFAULT 'tenant_etken', "companyId" TEXT NOT NULL DEFAULT 'company_etken_office',
 "code" TEXT NOT NULL, "plate" TEXT NOT NULL, "vehicleType" TEXT NOT NULL, "ownershipType" "ShippingVehicleOwnershipType" NOT NULL, "carrierId" TEXT,
 "registrationNo" TEXT, "driverName" TEXT, "driverPhone" TEXT, "driverIdentityNo" TEXT, "isActive" BOOLEAN NOT NULL DEFAULT true, "notes" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "ShippingVehicle_pkey" PRIMARY KEY ("id"));
CREATE TABLE "ShippingRoute" (
 "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL DEFAULT 'tenant_etken', "companyId" TEXT NOT NULL DEFAULT 'company_etken_office',
 "routeNumber" TEXT NOT NULL, "name" TEXT NOT NULL, "description" TEXT, "isActive" BOOLEAN NOT NULL DEFAULT true,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "ShippingRoute_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Shipment" (
 "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL DEFAULT 'tenant_etken', "companyId" TEXT NOT NULL DEFAULT 'company_etken_office',
 "shipmentNumber" TEXT NOT NULL, "shipmentDate" TIMESTAMP(3) NOT NULL, "status" "ShipmentStatus" NOT NULL DEFAULT 'CREATED',
 "carrierId" TEXT, "vehicleId" TEXT, "driverName" TEXT, "driverPhone" TEXT, "driverIdentityNo" TEXT, "createdById" TEXT, "createdByName" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, "routingStartedAt" TIMESTAMP(3), "routingCompletedAt" TIMESTAMP(3),
 "loadingStartedAt" TIMESTAMP(3), "loadingCompletedAt" TIMESTAMP(3), "shippedAt" TIMESTAMP(3), "shippedById" TEXT, "shippedByName" TEXT,
 "shippedTerminalCode" TEXT, "notes" TEXT, CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id"));
CREATE TABLE "ShipmentRoute" (
 "id" TEXT NOT NULL, "shipmentId" TEXT NOT NULL, "routeId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "ShipmentRoute_pkey" PRIMARY KEY ("id"));
CREATE TABLE "ShipmentHandlingUnit" (
 "id" TEXT NOT NULL, "shipmentId" TEXT NOT NULL, "shippingHandlingUnitId" TEXT NOT NULL, "routeId" TEXT NOT NULL,
 "status" "ShipmentHandlingUnitStatus" NOT NULL DEFAULT 'ROUTED', "routedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "routedById" TEXT, "routedByName" TEXT, "routedTerminalCode" TEXT, "loadedAt" TIMESTAMP(3), "loadedById" TEXT, "loadedByName" TEXT,
 "loadedTerminalCode" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "ShipmentHandlingUnit_pkey" PRIMARY KEY ("id"));
CREATE TABLE "ShipmentHandlingUnitEvent" (
 "id" TEXT NOT NULL, "shipmentId" TEXT, "shippingHandlingUnitId" TEXT NOT NULL, "eventType" "ShipmentHandlingUnitEventType" NOT NULL,
 "previousRouteId" TEXT, "newRouteId" TEXT, "operatorId" TEXT, "operatorName" TEXT, "terminalCode" TEXT, "notes" TEXT, "metadata" JSONB,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "ShipmentHandlingUnitEvent_pkey" PRIMARY KEY ("id"));

CREATE UNIQUE INDEX "ShippingCarrier_tenantId_companyId_code_key" ON "ShippingCarrier"("tenantId","companyId","code");
CREATE INDEX "ShippingCarrier_tenantId_companyId_name_idx" ON "ShippingCarrier"("tenantId","companyId","name");
CREATE INDEX "ShippingCarrier_tenantId_companyId_isActive_idx" ON "ShippingCarrier"("tenantId","companyId","isActive");
CREATE UNIQUE INDEX "ShippingVehicle_tenantId_companyId_code_key" ON "ShippingVehicle"("tenantId","companyId","code");
CREATE UNIQUE INDEX "ShippingVehicle_tenantId_companyId_plate_key" ON "ShippingVehicle"("tenantId","companyId","plate");
CREATE INDEX "ShippingVehicle_tenantId_companyId_carrierId_idx" ON "ShippingVehicle"("tenantId","companyId","carrierId");
CREATE INDEX "ShippingVehicle_tenantId_companyId_isActive_idx" ON "ShippingVehicle"("tenantId","companyId","isActive");
CREATE UNIQUE INDEX "ShippingRoute_tenantId_companyId_routeNumber_key" ON "ShippingRoute"("tenantId","companyId","routeNumber");
CREATE INDEX "ShippingRoute_tenantId_companyId_name_idx" ON "ShippingRoute"("tenantId","companyId","name");
CREATE INDEX "ShippingRoute_tenantId_companyId_isActive_idx" ON "ShippingRoute"("tenantId","companyId","isActive");
CREATE UNIQUE INDEX "Shipment_tenantId_companyId_shipmentNumber_key" ON "Shipment"("tenantId","companyId","shipmentNumber");
CREATE INDEX "Shipment_tenantId_companyId_shipmentDate_idx" ON "Shipment"("tenantId","companyId","shipmentDate");
CREATE INDEX "Shipment_tenantId_companyId_status_idx" ON "Shipment"("tenantId","companyId","status");
CREATE INDEX "Shipment_carrierId_idx" ON "Shipment"("carrierId"); CREATE INDEX "Shipment_vehicleId_idx" ON "Shipment"("vehicleId");
CREATE UNIQUE INDEX "ShipmentRoute_shipmentId_routeId_key" ON "ShipmentRoute"("shipmentId","routeId"); CREATE INDEX "ShipmentRoute_routeId_idx" ON "ShipmentRoute"("routeId");
CREATE UNIQUE INDEX "ShipmentHandlingUnit_shippingHandlingUnitId_key" ON "ShipmentHandlingUnit"("shippingHandlingUnitId");
CREATE INDEX "ShipmentHandlingUnit_shipmentId_status_idx" ON "ShipmentHandlingUnit"("shipmentId","status"); CREATE INDEX "ShipmentHandlingUnit_routeId_idx" ON "ShipmentHandlingUnit"("routeId");
CREATE INDEX "ShipmentHandlingUnit_routedAt_idx" ON "ShipmentHandlingUnit"("routedAt"); CREATE INDEX "ShipmentHandlingUnit_loadedAt_idx" ON "ShipmentHandlingUnit"("loadedAt");
CREATE INDEX "ShipmentHandlingUnitEvent_shipmentId_createdAt_idx" ON "ShipmentHandlingUnitEvent"("shipmentId","createdAt");
CREATE INDEX "ShipmentHandlingUnitEvent_shippingHandlingUnitId_createdAt_idx" ON "ShipmentHandlingUnitEvent"("shippingHandlingUnitId","createdAt");
CREATE INDEX "ShipmentHandlingUnitEvent_eventType_createdAt_idx" ON "ShipmentHandlingUnitEvent"("eventType","createdAt");

ALTER TABLE "ShippingVehicle" ADD CONSTRAINT "ShippingVehicle_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "ShippingCarrier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "ShippingCarrier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "ShippingVehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ShipmentRoute" ADD CONSTRAINT "ShipmentRoute_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShipmentRoute" ADD CONSTRAINT "ShipmentRoute_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "ShippingRoute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ShipmentHandlingUnit" ADD CONSTRAINT "ShipmentHandlingUnit_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShipmentHandlingUnit" ADD CONSTRAINT "ShipmentHandlingUnit_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "ShippingRoute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ShipmentHandlingUnit" ADD CONSTRAINT "ShipmentHandlingUnit_shippingHandlingUnitId_fkey" FOREIGN KEY ("shippingHandlingUnitId") REFERENCES "ShippingHandlingUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ShipmentHandlingUnitEvent" ADD CONSTRAINT "ShipmentHandlingUnitEvent_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ShipmentHandlingUnitEvent" ADD CONSTRAINT "ShipmentHandlingUnitEvent_shippingHandlingUnitId_fkey" FOREIGN KEY ("shippingHandlingUnitId") REFERENCES "ShippingHandlingUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
