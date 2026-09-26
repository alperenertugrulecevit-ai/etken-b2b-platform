CREATE TABLE "ConsolidationTaskUnit" (
  "id" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "handlingUnitId" INTEGER NOT NULL,
  "verifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConsolidationTaskUnit_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ConsolidationTaskUnit_taskId_handlingUnitId_key" ON "ConsolidationTaskUnit"("taskId","handlingUnitId");
CREATE INDEX "ConsolidationTaskUnit_taskId_verifiedAt_idx" ON "ConsolidationTaskUnit"("taskId","verifiedAt");
CREATE INDEX "ConsolidationTaskUnit_handlingUnitId_idx" ON "ConsolidationTaskUnit"("handlingUnitId");
ALTER TABLE "ConsolidationTaskUnit" ADD CONSTRAINT "ConsolidationTaskUnit_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "ConsolidationTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConsolidationTaskUnit" ADD CONSTRAINT "ConsolidationTaskUnit_handlingUnitId_fkey" FOREIGN KEY ("handlingUnitId") REFERENCES "HandlingUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
