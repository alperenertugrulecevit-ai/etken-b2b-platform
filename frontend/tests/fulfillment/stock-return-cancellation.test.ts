import { beforeEach, describe, expect, it, vi } from "vitest";
import { OrderStatus, StockReturnReason } from "@prisma/client";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  orderFindUnique: vi.fn(),
  handlingUnitFindUnique: vi.fn(),
  stockMovement: vi.fn(),
  refreshOrderProgress: vi.fn(),
  finalizeCancellation: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({
  prisma: { $transaction: mocks.transaction },
}));
vi.mock("@/lib/stock/stock-service", () => ({
  createStockMovementWithTransaction: mocks.stockMovement,
}));
vi.mock("@/modules/fulfillment/services/fulfillment.service", () => ({
  FulfillmentService: { refreshOrderProgress: mocks.refreshOrderProgress },
}));
vi.mock("@/lib/wms/zone-picking-service", () => ({
  ZonePickingService: { releaseOrderPlan: vi.fn(), buildTasksForOrders: vi.fn() },
}));
vi.mock("@/modules/orders/services/order-cancellation.service", () => ({
  OrderCancellationService: { tryFinalizeAfterStockReturn: mocks.finalizeCancellation },
}));

import { StockReturnService } from "@/modules/fulfillment/services/stock-return.service";

const actor = { userId: "admin", displayName: "Admin" };
const baseInput = {
  orderNumber: "WEB-100",
  sourceBarcode: "SRC",
  productBarcode: "P10",
  targetBarcode: "DST",
  targetLocationCode: "A-01",
  reason: StockReturnReason.WRONG_PICK,
  actor,
};

describe("RF stock return cancellation integrity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({ order: { findUnique: mocks.orderFindUnique }, handlingUnit: { findUnique: mocks.handlingUnitFindUnique } }),
    );
    mocks.orderFindUnique.mockResolvedValue({
      id: 100,
      orderNumber: "WEB-100",
      status: OrderStatus.PICKING,
      cancellationStatus: "STOCK_RETURN_PENDING",
      items: [],
    });
  });

  it("does not reopen picking for wrong-pick scans while cancellation is pending", async () => {
    await expect(StockReturnService.returnOne(baseInput)).rejects.toThrow(
      "yalnızca müşteri iptali",
    );
    expect(mocks.handlingUnitFindUnique).not.toHaveBeenCalled();
    expect(mocks.stockMovement).not.toHaveBeenCalled();
  });

  it("blocks stock return scans after refund has begun", async () => {
    mocks.orderFindUnique.mockResolvedValue({
      id: 100,
      status: OrderStatus.PICKING,
      cancellationStatus: "REFUND_PENDING",
      items: [],
    });
    await expect(StockReturnService.returnOne({
      ...baseInput, reason: StockReturnReason.CUSTOMER_FULL_CANCEL,
    })).rejects.toThrow("iptal aşaması");
    expect(mocks.handlingUnitFindUnique).not.toHaveBeenCalled();
  });

  it("allows customer cancellation return to pass cancellation preflight", async () => {
    await expect(StockReturnService.returnOne({
      ...baseInput, reason: StockReturnReason.CUSTOMER_FULL_CANCEL,
    })).rejects.toThrow("Okutulan ürün bu siparişte bulunmuyor");
    expect(mocks.stockMovement).not.toHaveBeenCalled();
  });
});
