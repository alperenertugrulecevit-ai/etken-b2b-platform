CREATE TABLE "ZonePickTaskLine" (
  "id" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "orderItemId" INTEGER NOT NULL,
  "handlingUnitItemId" INTEGER NOT NULL,
  "plannedQuantity" INTEGER NOT NULL,
  "pickedQuantity" INTEGER NOT NULL DEFAULT 0,
  "sequence" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ZonePickTaskLine_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ZonePickTaskLine_taskId_orderItemId_handlingUnitItemId_key" ON "ZonePickTaskLine"("taskId","orderItemId","handlingUnitItemId");
CREATE INDEX "ZonePickTaskLine_taskId_sequence_idx" ON "ZonePickTaskLine"("taskId","sequence");
CREATE INDEX "ZonePickTaskLine_orderItemId_idx" ON "ZonePickTaskLine"("orderItemId");
CREATE INDEX "ZonePickTaskLine_handlingUnitItemId_idx" ON "ZonePickTaskLine"("handlingUnitItemId");
ALTER TABLE "ZonePickTaskLine" ADD CONSTRAINT "ZonePickTaskLine_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "ZonePickTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ZonePickTaskLine" ADD CONSTRAINT "ZonePickTaskLine_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ZonePickTaskLine" ADD CONSTRAINT "ZonePickTaskLine_handlingUnitItemId_fkey" FOREIGN KEY ("handlingUnitItemId") REFERENCES "HandlingUnitItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
