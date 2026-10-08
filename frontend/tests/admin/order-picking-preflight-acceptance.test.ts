import { describe, expect, it, vi } from "vitest";
import { OrderPickingPreflightService } from "@/lib/wms/order-picking-preflight-service";

function mockDb(overrides: Record<string, unknown> = {}) {
  const orders = [
    { id: 11, orderNumber: "WEB-11", status: "APPROVED", orderDate: new Date("2026-10-08"), requestedDate: null, fulfillmentWarehouseId: 1,
      items: [{ id: 101, productId: 3, productCode: "ITEM-3", productName: "Test ürün", quantity: 2, pickedQuantity: 0 }] },
  ];
  return {
    order: { findMany: vi.fn().mockResolvedValue(overrides.orders ?? orders) },
    handlingUnitItem: { findMany: vi.fn().mockResolvedValue(overrides.stock ?? [{ productId: 3, quantity: 2, reservedStock: 0 }]) },
  };
}

describe("WMS order picking preflight acceptance", () => {
  it("allows an approved order when pickable stock meets demand", async () => {
    const db = mockDb();
    const result = await OrderPickingPreflightService.check(db as never, { orderIds: [11], warehouseId: 1 });
    expect(result.ok).toBe(true);
    expect(result.shortages).toEqual([]);
  });

  it("reports shortages without starting picking or altering inventory", async () => {
    const db = mockDb({ stock: [{ productId: 3, quantity: 1, reservedStock: 0 }] });
    const result = await OrderPickingPreflightService.check(db as never, { orderIds: [11], warehouseId: 1 });
    expect(result.ok).toBe(false);
    expect(result.shortages).toEqual([expect.objectContaining({ orderId: 11, shortageQuantity: 1, availableQuantity: 1 })]);
  });

  it("does not count stock reserved for other demand as pickable", async () => {
    const db = mockDb({ stock: [{ productId: 3, quantity: 3, reservedStock: 2 }] });
    const result = await OrderPickingPreflightService.check(db as never, { orderIds: [11], warehouseId: 1 });
    expect(result.shortages[0].shortageQuantity).toBe(1);
  });

  it("rejects picking for orders that are not approved", async () => {
    const db = mockDb({ orders: [{ id: 11, orderNumber: "WEB-11", status: "CANCELLED", fulfillmentWarehouseId: 1, items: [] }] });
    await expect(OrderPickingPreflightService.check(db as never, { orderIds: [11], warehouseId: 1 })).rejects.toThrow("Onaylandı");
    expect(db.handlingUnitItem.findMany).not.toHaveBeenCalled();
  });

  it("rejects picking from the wrong warehouse", async () => {
    const db = mockDb();
    await expect(OrderPickingPreflightService.check(db as never, { orderIds: [11], warehouseId: 2 })).rejects.toThrow("farklı bir depoya");
  });

  it("does not allocate the same stock twice across two orders", async () => {
    const first = { id: 11, orderNumber: "WEB-11", status: "APPROVED", orderDate: new Date("2026-10-08"), requestedDate: null, fulfillmentWarehouseId: 1,
      items: [{ id: 101, productId: 3, productCode: "ITEM-3", productName: "Test ürün", quantity: 2, pickedQuantity: 0 }] };
    const second = { ...first, id: 12, orderNumber: "WEB-12", items: [{ ...first.items[0], id: 102 }] };
    const db = mockDb({ orders: [first, second], stock: [{ productId: 3, quantity: 3, reservedStock: 0 }] });
    const result = await OrderPickingPreflightService.check(db as never, { orderIds: [11, 12], warehouseId: 1 });
    expect(result.ok).toBe(false);
    expect(result.shortages).toEqual([expect.objectContaining({ orderId: 12, shortageQuantity: 1 })]);
  });
});
