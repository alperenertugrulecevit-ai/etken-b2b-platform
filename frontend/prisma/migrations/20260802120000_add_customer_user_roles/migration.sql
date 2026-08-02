-- CreateEnum
CREATE TYPE "CustomerUserRole" AS ENUM (
  'CUSTOMER_ADMIN',
  'BUYER',
  'ADDRESS_USER'
);

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "fullName" TEXT,
ADD COLUMN "customerRole" "CustomerUserRole";

-- Preserve dashboard and company-wide access for current customer users.
UPDATE "User"
SET "customerRole" = 'CUSTOMER_ADMIN'
WHERE "userType" = 'CUSTOMER'
  AND "customerId" IS NOT NULL;

-- CreateTable
CREATE TABLE "CustomerUserAddressAccess" (
  "userId" TEXT NOT NULL,
  "addressId" INTEGER NOT NULL,
  "assignedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CustomerUserAddressAccess_pkey"
  PRIMARY KEY ("userId", "addressId")
);

-- CreateIndex
CREATE INDEX "CustomerUserAddressAccess_addressId_idx"
ON "CustomerUserAddressAccess"("addressId");

-- CreateIndex
CREATE INDEX "CustomerUserAddressAccess_assignedById_idx"
ON "CustomerUserAddressAccess"("assignedById");

-- CreateIndex
CREATE INDEX "User_customerId_customerRole_status_idx"
ON "User"("customerId", "customerRole", "status");

-- AddForeignKey
ALTER TABLE "CustomerUserAddressAccess"
ADD CONSTRAINT "CustomerUserAddressAccess_userId_fkey"
FOREIGN KEY ("userId")
REFERENCES "User"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerUserAddressAccess"
ADD CONSTRAINT "CustomerUserAddressAccess_addressId_fkey"
FOREIGN KEY ("addressId")
REFERENCES "CustomerAddress"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerUserAddressAccess"
ADD CONSTRAINT "CustomerUserAddressAccess_assignedById_fkey"
FOREIGN KEY ("assignedById")
REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
