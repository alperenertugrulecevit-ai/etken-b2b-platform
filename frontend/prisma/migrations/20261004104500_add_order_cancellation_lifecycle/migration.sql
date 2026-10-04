ALTER TABLE "Order"
ADD COLUMN "cancellationStatus" TEXT,
ADD COLUMN "cancellationReason" TEXT,
ADD COLUMN "cancellationRequestedAt" TIMESTAMP(3),
ADD COLUMN "cancellationRequestedByUserId" TEXT,
ADD COLUMN "cancellationRequestedByName" TEXT,
ADD COLUMN "cancellationCompletedAt" TIMESTAMP(3),
ADD COLUMN "cancellationRefundStatus" TEXT,
ADD COLUMN "cancellationRefundReference" TEXT,
ADD COLUMN "cancellationRefundedAt" TIMESTAMP(3);

CREATE INDEX "Order_cancellationStatus_idx" ON "Order"("cancellationStatus");
CREATE INDEX "Order_cancellationRefundStatus_idx" ON "Order"("cancellationRefundStatus");