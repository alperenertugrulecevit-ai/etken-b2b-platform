-- CreateTable
CREATE TABLE "InventoryCountAssignee" (
    "id" SERIAL NOT NULL,
    "inventoryCountId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "employeeCode" TEXT,
    "fullName" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "assignedByName" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryCountAssignee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InventoryCountAssignee_inventoryCountId_idx" ON "InventoryCountAssignee"("inventoryCountId");

-- CreateIndex
CREATE INDEX "InventoryCountAssignee_userId_idx" ON "InventoryCountAssignee"("userId");

-- CreateIndex
CREATE INDEX "InventoryCountAssignee_assignedById_idx" ON "InventoryCountAssignee"("assignedById");

-- CreateIndex
CREATE INDEX "InventoryCountAssignee_assignedAt_idx" ON "InventoryCountAssignee"("assignedAt");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryCountAssignee_inventoryCountId_userId_key" ON "InventoryCountAssignee"("inventoryCountId", "userId");

-- AddForeignKey
ALTER TABLE "InventoryCountAssignee" ADD CONSTRAINT "InventoryCountAssignee_inventoryCountId_fkey" FOREIGN KEY ("inventoryCountId") REFERENCES "InventoryCount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryCountAssignee" ADD CONSTRAINT "InventoryCountAssignee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryCountAssignee" ADD CONSTRAINT "InventoryCountAssignee_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
