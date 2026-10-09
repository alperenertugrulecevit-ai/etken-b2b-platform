import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  orderFindUnique: vi.fn(),
  paymentFindFirst: vi.fn(),
  transactionFindFirst: vi.fn(),
  refundFindFirst: vi.fn(),
  entryCreate: vi.fn(),
  orderUpdate: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: mocks.transaction,
  },
}));

vi.mock("@/lib/stock/stock-service", () => ({
  createStockMovementWithTransaction: vi.fn(),
}));

vi.mock("@/lib/wms/zone-picking-service", () => ({
  ZonePickingService: {},
}));

import { OrderCancellationService } from "@/modules/orders/services/order-cancellation.service";

const order = {
  id: 10, customerId: 20, orderNumber: "WEB-10",
  status: "CANCELLED", totalAmount: 100,
  paymentMethod: "CREDIT_CARD", paymentStatus: "REFUND_PENDING",
  cancellationStatus: "REFUND_PENDING", cancellationRefundStatus: "PENDING",
};
const tx = {
  order: { findUnique: mocks.orderFindUnique, update: mocks.orderUpdate },
  customerAccountEntry: {
    findFirst: mocks.paymentFindFirst, create: mocks.entryCreate,
  },
  paymentTransaction: { findFirst: mocks.transactionFindFirst },
};

describe("refund completion fails closed for credit cards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (callback: (tx: typeof tx) => Promise<unknown>) => callback(tx));
    mocks.orderFindUnique.mockResolvedValue(order);
    mocks.paymentFindFirst.mockResolvedValue({ amount: 100, paymentMethod: "CREDIT_CARD" });
    mocks.transactionFindFirst.mockResolvedValue(null);
  });

  it("rejects missing provider payment proof", async () => {
    await expect(OrderCancellationService.completeRefund({
      orderId: 10, reference: "bank-proof", actor: { userId: "user", displayName: "Operator" },
    })).rejects.toThrow("Sanal POS iadesi");
    expect(mocks.orderUpdate).not.toHaveBeenCalled();
    expect(mocks.entryCreate).not.toHaveBeenCalled();
  });

  it("rejects insufficient confirmed refunded amount", async () => {
    mocks.transactionFindFirst.mockResolvedValue({ amount: 100, refundedAmount: 99 });
    await expect(OrderCancellationService.completeRefund({
      orderId: 10, reference: "bank-proof", actor: { userId: "user", displayName: "Operator" },
    })).rejects.toThrow("Sanal POS iadesi");
    expect(mocks.orderUpdate).not.toHaveBeenCalled();
  });
});
