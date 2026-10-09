import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  findOrder: vi.fn(),
  updateOrder: vi.fn(),
  updateProduct: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({
  prisma: { $transaction: mocks.transaction },
}));

import { EcommerceStockReservationService } from "@/modules/ecommerce/services/ecommerce-stock-reservation.service";

const order = {
  id: 12,
  source: "ECOMMERCE",
  status: "PENDING",
  stockReserved: true,
  stockDeducted: false,
  items: [{
    productId: 7, quantity: 2, pickedQuantity: 0,
    packedQuantity: 0, shippedQuantity: 0, cancelledQuantity: 0,
  }],
};

describe("Ecommerce reservation release (mocked, no database)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findOrder.mockResolvedValue(order);
    mocks.updateOrder.mockResolvedValue({ count: 1 });
    mocks.updateProduct.mockResolvedValue({ count: 1 });
    mocks.transaction.mockImplementation(async (fn) => fn({
      order: { findUnique: mocks.findOrder, updateMany: mocks.updateOrder },
      product: { updateMany: mocks.updateProduct },
    }));
  });

  it("releases an unpicked order once and clears the reservation flag", async () => {
    expect(await EcommerceStockReservationService.releaseUnpickedOrder(12, "Payment expired")).toBe(true);
    expect(mocks.updateOrder).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ stockReserved: true, stockDeducted: false }),
      data: { stockReserved: false, stockReservedAt: null },
    }));
    expect(mocks.updateProduct).toHaveBeenCalledWith({
      where: { id: 7, reservedStock: { gte: 2 } },
      data: { reservedStock: { decrement: 2 } },
    });
  });

  it("does not decrement inventory if reservation is already cleared", async () => {
    mocks.findOrder.mockResolvedValueOnce({ ...order, stockReserved: false });
    expect(await EcommerceStockReservationService.releaseUnpickedOrder(12, "Repeat")).toBe(false);
    expect(mocks.updateProduct).not.toHaveBeenCalled();
  });

  it("refuses any picked or shipped stock", async () => {
    mocks.findOrder.mockResolvedValueOnce({
      ...order, items: [{ ...order.items[0], pickedQuantity: 1 }],
    });
    await expect(EcommerceStockReservationService.releaseUnpickedOrder(12, "Cancel"))
      .rejects.toThrow("WMS işlemi");
    expect(mocks.updateOrder).not.toHaveBeenCalled();
  });

  it("rejects release if global reserved stock is inconsistent", async () => {
    mocks.updateProduct.mockResolvedValueOnce({ count: 0 });
    await expect(EcommerceStockReservationService.releaseUnpickedOrder(12, "Cancel"))
      .rejects.toThrow("tutarsızlığı");
  });

  it("rejects release of a non-ecommerce order", async () => {
    mocks.findOrder.mockResolvedValueOnce({ ...order, source: "ADMIN" });
    await expect(EcommerceStockReservationService.releaseUnpickedOrder(12, "Cancel"))
      .rejects.toThrow("E-ticaret");
    expect(mocks.updateProduct).not.toHaveBeenCalled();
  });
});
