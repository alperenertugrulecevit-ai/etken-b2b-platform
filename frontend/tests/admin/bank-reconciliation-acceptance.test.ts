import { beforeEach, describe, expect, it, vi } from "vitest";
import { BankReconciliationService } from "@/modules/ecommerce/services/bank-reconciliation.service";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  bankFindFirst: vi.fn(),
  orderFindUnique: vi.fn(),
  accountFindFirst: vi.fn(),
  accountCreate: vi.fn(),
  orderUpdate: vi.fn(),
  bankUpdate: vi.fn(),
  historyCreate: vi.fn(),
  notification: vi.fn(),
}));
const tx = {
  bankTransaction: { findFirst: mocks.bankFindFirst, update: mocks.bankUpdate },
  order: { findUnique: mocks.orderFindUnique, update: mocks.orderUpdate },
  customerAccountEntry: { findFirst: mocks.accountFindFirst, create: mocks.accountCreate },
  orderStatusHistory: { create: mocks.historyCreate },
};
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: mocks.transaction } }));
vi.mock("@/modules/ecommerce/services/ecommerce-notification.service", () => ({
  EcommerceNotificationService: { send: mocks.notification },
}));

const actor = { userId: "operator-1", displayName: "Finans Operatörü" };
const input = { transactionId: "bank-tx-1", orderId: 15, actor };
const bank = { id: "bank-tx-1", matchStatus: "UNMATCHED", currency: "TRY", amount: 120, externalId: "external-1", bankReference: "ref-1", transactionDate: new Date("2026-10-08") };
const order = { id: 15, orderNumber: "WEB-15", customerId: 5, source: "ECOMMERCE", status: "APPROVED", paymentMethod: "BANK_TRANSFER", paymentStatus: "PENDING", totalAmount: 120, ecommerceEmail: "buyer@example.com" };

describe("BankReconciliationService provider-independent acceptance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx));
    mocks.bankFindFirst.mockResolvedValue({ ...bank });
    mocks.orderFindUnique.mockResolvedValue({ ...order });
    mocks.accountFindFirst.mockResolvedValue(null);
    mocks.accountCreate.mockResolvedValue({ id: "entry-1" });
    mocks.orderUpdate.mockResolvedValue({});
    mocks.bankUpdate.mockResolvedValue({});
    mocks.historyCreate.mockResolvedValue({});
    mocks.notification.mockResolvedValue(undefined);
  });

  it("rejects a bank movement already matched and never records payment", async () => {
    mocks.bankFindFirst.mockResolvedValue({ ...bank, matchStatus: "MATCHED" });
    await expect(BankReconciliationService.matchTransaction(input)).rejects.toThrow("Yalnızca eşleştirilmemiş");
    expect(mocks.accountCreate).not.toHaveBeenCalled();
    expect(mocks.orderUpdate).not.toHaveBeenCalled();
  });

  it("rejects amount mismatch before recording payment", async () => {
    mocks.bankFindFirst.mockResolvedValue({ ...bank, amount: 119 });
    await expect(BankReconciliationService.matchTransaction(input)).rejects.toThrow("tutarı sipariş toplamı");
    expect(mocks.accountCreate).not.toHaveBeenCalled();
  });

  it("rejects a previously paid order", async () => {
    mocks.orderFindUnique.mockResolvedValue({ ...order, paymentStatus: "PAID" });
    await expect(BankReconciliationService.matchTransaction(input)).rejects.toThrow("zaten onaylanmış");
    expect(mocks.accountCreate).not.toHaveBeenCalled();
  });

  it("rejects a non-TRY bank movement", async () => {
    mocks.bankFindFirst.mockResolvedValue({ ...bank, currency: "EUR" });
    await expect(BankReconciliationService.matchTransaction(input)).rejects.toThrow("TRY");
    expect(mocks.accountCreate).not.toHaveBeenCalled();
  });

  it("rejects an existing payment ledger entry", async () => {
    mocks.accountFindFirst.mockResolvedValue({ id: "existing" });
    await expect(BankReconciliationService.matchTransaction(input)).rejects.toThrow("zaten var");
    expect(mocks.accountCreate).not.toHaveBeenCalled();
  });

  it("matches a valid transfer, marks order PAID and creates one payment ledger entry", async () => {
    await BankReconciliationService.matchTransaction(input);
    expect(mocks.orderUpdate).toHaveBeenCalledWith({ where: { id: 15 }, data: expect.objectContaining({ paymentStatus: "PAID", paymentProvider: "BANK_TRANSFER" }) });
    expect(mocks.bankUpdate).toHaveBeenCalledWith({ where: { id: "bank-tx-1" }, data: expect.objectContaining({ matchStatus: "MATCHED", matchedOrderId: 15 }) });
    expect(mocks.accountCreate).toHaveBeenCalledTimes(2);
    expect(mocks.notification).toHaveBeenCalledTimes(1);
  });
});
