import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  transaction: vi.fn(),
  customerCreate: vi.fn(),
  addressCreate: vi.fn(),
  orderCreate: vi.fn(),
  notify: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: { findMany: mocks.findMany },
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/modules/ecommerce/services/ecommerce-notification.service", () => ({
  EcommerceNotificationService: { send: mocks.notify },
}));

import { EcommerceCheckoutService } from "@/modules/ecommerce/services/ecommerce-checkout.service";

const input = {
  firstName: "Synthetic",
  lastName: "Customer",
  email: "synthetic@example.invalid",
  phone: "5550000000",
  address: "Synthetic Street 1",
  city: "Istanbul",
  district: "Test",
  postalCode: null,
  invoiceType: "INDIVIDUAL" as const,
  invoiceName: "Synthetic Customer",
  invoiceTaxOffice: null,
  invoiceTaxNumber: null,
  customerNote: null,
  items: [{ productId: 1, quantity: 2 }],
};

describe("Ecommerce checkout transaction (mocked, no database/network)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findMany.mockResolvedValue([{
      id: 1, code: "LT-PRODUCT-0001", name: "Synthetic Product 1",
      price: 100, vat: 20, stock: 1000, reservedStock: 0,
    }]);
    mocks.customerCreate.mockResolvedValue({ id: 42 });
    mocks.addressCreate.mockResolvedValue({ id: 91 });
    mocks.orderCreate.mockResolvedValue({
      id: 123, orderNumber: "WEB-SYNTHETIC", totalAmount: 240,
    });
    mocks.transaction.mockImplementation(async (callback) => callback({
      customer: { create: mocks.customerCreate },
      customerAddress: { create: mocks.addressCreate },
      order: { create: mocks.orderCreate },
    }));
    mocks.notify.mockResolvedValue(undefined);
  });

  it("creates a pending bank-transfer order with one line, ledger debit and history", async () => {
    const result = await EcommerceCheckoutService.createOrder(input);
    expect(result.totalAmount).toBe(240);
    expect(mocks.transaction).toHaveBeenCalledOnce();
    expect(mocks.orderCreate).toHaveBeenCalledOnce();
    const data = mocks.orderCreate.mock.calls[0][0].data;
    expect(data.status).toBe("PENDING");
    expect(data.paymentMethod).toBe("BANK_TRANSFER");
    expect(data.paymentStatus).toBe("PENDING");
    expect(data.items.create).toMatchObject([{
      productId: 1, quantity: 2, lineNet: 200, vatAmount: 40, lineTotal: 240,
    }]);
    expect(data.accountEntries.create).toMatchObject({
      direction: "DEBIT", entryType: "ORDER", amount: 240,
    });
    expect(data.statusHistory.create.status).toBe("PENDING");
    expect(mocks.notify).toHaveBeenCalledOnce();
  });

  it("rejects insufficient available stock without writing or notifying", async () => {
    mocks.findMany.mockResolvedValueOnce([{
      id: 1, code: "LT-PRODUCT-0001", name: "Synthetic Product 1",
      price: 100, vat: 20, stock: 10, reservedStock: 9,
    }]);
    await expect(EcommerceCheckoutService.createOrder(input))
      .rejects.toThrow("kullanılabilir stok 1 adettir");
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.notify).not.toHaveBeenCalled();
  });

  it("rejects duplicate product lines before any database access", async () => {
    await expect(EcommerceCheckoutService.createOrder({
      ...input,
      items: [{ productId: 1, quantity: 1 }, { productId: 1, quantity: 1 }],
    })).rejects.toThrow("geçersiz ürün satırı");
    expect(mocks.findMany).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("logs a provider failure result without losing a committed order", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      mocks.notify.mockResolvedValueOnce({ status: "failed", reason: "HTTP 503" });
      const order = await EcommerceCheckoutService.createOrder(input);
      expect(order.orderNumber).toBe("WEB-SYNTHETIC");
      expect(log).toHaveBeenCalledWith(
        "Checkout notification delivery failed after order commit",
        expect.objectContaining({ orderId: 123, reason: "HTTP 503" }),
      );
    } finally {
      log.mockRestore();
    }
  });

  it("returns the committed order even if its notification webhook fails", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      mocks.notify.mockRejectedValueOnce(new Error("synthetic webhook outage"));
      const order = await EcommerceCheckoutService.createOrder(input);
      expect(order.orderNumber).toBe("WEB-SYNTHETIC");
      expect(mocks.orderCreate).toHaveBeenCalledOnce();
      expect(mocks.notify).toHaveBeenCalledOnce();
      expect(log).toHaveBeenCalledOnce();
    } finally {
      log.mockRestore();
    }
  });

  it("rejects zero, negative, fractional and nonnumeric quantities before database access", async () => {
    for (const quantity of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      await expect(EcommerceCheckoutService.createOrder({
        ...input, items: [{ productId: 1, quantity }],
      })).rejects.toThrow("geçersiz ürün satırı");
    }
    expect(mocks.findMany).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects invalid product identifiers before database access", async () => {
    for (const productId of [0, -2, 1.5, Number.NaN]) {
      await expect(EcommerceCheckoutService.createOrder({
        ...input, items: [{ productId, quantity: 1 }],
      })).rejects.toThrow("geçersiz ürün satırı");
    }
    expect(mocks.findMany).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects an empty cart before reading inventory", async () => {
    await expect(EcommerceCheckoutService.createOrder({
      ...input, items: [],
    })).rejects.toThrow("Sepetinizde");
    expect(mocks.findMany).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("does not create an order when one of multiple products is unavailable", async () => {
    await expect(EcommerceCheckoutService.createOrder({
      ...input, items: [{ productId: 1, quantity: 1 }, { productId: 2, quantity: 1 }],
    })).rejects.toThrow("artık satışta olmayan");
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.notify).not.toHaveBeenCalled();
  });

  it("rejects invalid customer email before reading products", async () => {
    await expect(EcommerceCheckoutService.createOrder({
      ...input, email: "not-an-email",
    })).rejects.toThrow("Geçerli bir e-posta");
    expect(mocks.findMany).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("requires corporate invoice name and tax number", async () => {
    await expect(EcommerceCheckoutService.createOrder({
      ...input, invoiceType: "CORPORATE", invoiceName: "", invoiceTaxNumber: null,
    })).rejects.toThrow("Kurumsal fatura");
    expect(mocks.findMany).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("does not notify when the transaction fails", async () => {
    mocks.transaction.mockRejectedValueOnce(new Error("synthetic transaction rollback"));
    await expect(EcommerceCheckoutService.createOrder(input))
      .rejects.toThrow("synthetic transaction rollback");
    expect(mocks.notify).not.toHaveBeenCalled();
  });

  it("rejects a missing catalog product before creating any records", async () => {
    mocks.findMany.mockResolvedValueOnce([]);
    await expect(EcommerceCheckoutService.createOrder(input))
      .rejects.toThrow("artık satışta olmayan");
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.notify).not.toHaveBeenCalled();
  });

});
