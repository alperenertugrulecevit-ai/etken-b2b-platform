import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  cancel: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { order: { findMany: mocks.findMany } },
}));
vi.mock("@/modules/orders/services/order-cancellation.service", () => ({
  OrderCancellationService: { request: mocks.cancel },
}));

import { processExpiredBankTransferOrders } from "@/modules/ecommerce/services/bank-transfer-expiry.service";

const eligible = {
  id: 1,
  pickingRecords: [],
  assignedHandlingUnits: [],
  zonePickTasks: [],
  shippingHandlingUnitOrders: [],
  bankTransactions: [],
  paymentTransactions: [],
  accountEntries: [],
};

describe("bank transfer expiry safety", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findMany.mockResolvedValueOnce([eligible]).mockResolvedValueOnce([]);
    mocks.cancel.mockResolvedValue({ orderNumber: "WEB-1" });
  });

  it("defaults to dry run without cancelling", async () => {
    const report = await processExpiredBankTransferOrders({
      now: new Date("2026-10-09T12:00:00.000Z"),
    });
    expect(report.eligible).toBe(1);
    expect(report.cancelled).toBe(0);
    expect(report.dryRun).toBe(true);
    expect(mocks.cancel).not.toHaveBeenCalled();
    expect(mocks.findMany.mock.calls[0][0].where.createdAt.lte.toISOString())
      .toBe("2026-10-08T12:00:00.000Z");
  });

  it("skips any recorded payment collection", async () => {
    mocks.findMany.mockReset();
    mocks.findMany.mockResolvedValueOnce([
      { ...eligible, accountEntries: [{ id: "paid" }] },
    ]).mockResolvedValueOnce([]);
    const report = await processExpiredBankTransferOrders({ dryRun: false });
    expect(report.skipped).toBe(1);
    expect(mocks.cancel).not.toHaveBeenCalled();
  });

  it("executes only when explicitly requested", async () => {
    const report = await processExpiredBankTransferOrders({ dryRun: false });
    expect(report.cancelled).toBe(1);
    expect(mocks.cancel).toHaveBeenCalledWith(expect.objectContaining({
      orderId: 1,
      bankTransferExpiryCutoff: expect.any(Date),
    }));
  });

  it("does not abort remaining orders after one cancellation failure", async () => {
    mocks.findMany.mockReset();
    mocks.findMany.mockResolvedValueOnce([
      eligible, { ...eligible, id: 2 },
    ]).mockResolvedValueOnce([]);
    mocks.cancel.mockRejectedValueOnce(new Error("concurrent payment")).mockResolvedValueOnce({});
    const report = await processExpiredBankTransferOrders({ dryRun: false });
    expect(report.errors).toBe(1);
    expect(report.cancelled).toBe(1);
  });

  it("rejects invalid batch limits", async () => {
    await expect(processExpiredBankTransferOrders({ maxOrders: 0 })).rejects.toThrow("maxOrders");
  });
});
