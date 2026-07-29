/*
  Warnings:

  - You are about to drop the column `companyId` on the `HandlingUnit` table. All the data in the column will be lost.
  - You are about to drop the column `tenantId` on the `HandlingUnit` table. All the data in the column will be lost.
  - You are about to drop the column `companyId` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `tenantId` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `companyId` on the `StockMovement` table. All the data in the column will be lost.
  - You are about to drop the column `tenantId` on the `StockMovement` table. All the data in the column will be lost.
  - You are about to drop the column `warehouseId` on the `StockMovement` table. All the data in the column will be lost.
  - You are about to drop the `WarehouseProductStock` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "HandlingUnit" DROP CONSTRAINT "HandlingUnit_companyId_fkey";

-- DropForeignKey
ALTER TABLE "HandlingUnit" DROP CONSTRAINT "HandlingUnit_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_companyId_fkey";

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "StockMovement" DROP CONSTRAINT "StockMovement_companyId_fkey";

-- DropForeignKey
ALTER TABLE "StockMovement" DROP CONSTRAINT "StockMovement_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "StockMovement" DROP CONSTRAINT "StockMovement_warehouseId_fkey";

-- DropForeignKey
ALTER TABLE "WarehouseProductStock" DROP CONSTRAINT "WarehouseProductStock_companyId_fkey";

-- DropForeignKey
ALTER TABLE "WarehouseProductStock" DROP CONSTRAINT "WarehouseProductStock_productId_fkey";

-- DropForeignKey
ALTER TABLE "WarehouseProductStock" DROP CONSTRAINT "WarehouseProductStock_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "WarehouseProductStock" DROP CONSTRAINT "WarehouseProductStock_warehouseId_fkey";

-- DropIndex
DROP INDEX "HandlingUnit_companyId_barcode_idx";

-- DropIndex
DROP INDEX "HandlingUnit_tenantId_companyId_warehouseId_idx";

-- DropIndex
DROP INDEX "Product_companyId_barcode_idx";

-- DropIndex
DROP INDEX "Product_companyId_code_idx";

-- DropIndex
DROP INDEX "Product_tenantId_companyId_isActive_idx";

-- DropIndex
DROP INDEX "StockMovement_companyId_productId_createdAt_idx";

-- DropIndex
DROP INDEX "StockMovement_tenantId_companyId_warehouseId_idx";

-- DropIndex
DROP INDEX "StockMovement_warehouseId_productId_createdAt_idx";

-- AlterTable
ALTER TABLE "HandlingUnit" DROP COLUMN "companyId",
DROP COLUMN "tenantId";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "companyId",
DROP COLUMN "tenantId";

-- AlterTable
ALTER TABLE "StockMovement" DROP COLUMN "companyId",
DROP COLUMN "tenantId",
DROP COLUMN "warehouseId";

-- DropTable
DROP TABLE "WarehouseProductStock";
