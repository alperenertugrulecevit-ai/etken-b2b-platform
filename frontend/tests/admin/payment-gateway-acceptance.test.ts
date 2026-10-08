import { beforeEach, describe, expect, it, vi } from "vitest";
import { PaymentGatewayService } from "@/modules/ecommerce/services/payment-gateway.service";
import { registerPaymentProvider } from "@/modules/ecommerce/services/payment-provider-adapter";

const mocks = vi.hoisted(() => ({
  orderFindFirst: vi.fn(),
  settingFindFirst: vi.fn(),
  paymentCreate: vi.fn(),
  paymentFindFirst: vi.fn(),
  paymentFindUnique: vi.fn(),
  paymentUpdate: vi.fn(),
  orderUpdate: vi.fn(),
  ledgerFindFirst: vi.fn(),
  ledgerCreate: vi.fn(),
  transaction: vi.fn(),
  initialize: vi.fn(),
  verify: vi.fn(),
  refund: vi.fn(),
}));
const tx = {
  paymentTransaction: { findUnique: mocks.paymentFindUnique, update: mocks.paymentUpdate },
  order: { update: mocks.orderUpdate },
  customerAccountEntry: { findFirst: mocks.ledgerFindFirst, create: mocks.ledgerCreate },
};
vi.mock("@/lib/prisma", () => ({
  prisma: {
    order: { findFirst: mocks.orderFindFirst },
    paymentGatewaySetting: { findFirst: mocks.settingFindFirst },
    paymentTransaction: { create: mocks.paymentCreate, findFirst: mocks.paymentFindFirst, update: mocks.paymentUpdate },
    $transaction: mocks.transaction,
  },
}));

const order = { id: 17, orderNumber: "WEB-17", totalAmount: 120, ecommerceEmail: "buyer@example.com", paymentStatus: "PENDING", customerId: 4, paymentMethod: "CREDIT_CARD", source: "ECOMMERCE" };
const payment = { id: "pay-17", orderId: 17, amount: 120, status: "PENDING", order };

describe("PaymentGatewayService provider-independent acceptance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    registerPaymentProvider("TEST_ACCEPTANCE", () => ({
      provider: "TEST_ACCEPTANCE",
      initialize: mocks.initialize,
      verify: mocks.verify,
      refund: mocks.refund,
    }));
    mocks.orderFindFirst.mockResolvedValue(order);
    mocks.settingFindFirst.mockResolvedValue({ provider: "TEST_ACCEPTANCE", isActive: true });
    mocks.paymentFindFirst.mockResolvedValue(payment);
    mocks.paymentFindUnique.mockResolvedValue(payment);
    mocks.ledgerFindFirst.mockResolvedValue(null);
    mocks.paymentUpdate.mockResolvedValue({});
    mocks.orderUpdate.mockResolvedValue({});
    mocks.ledgerCreate.mockResolvedValue({});
    mocks.paymentCreate.mockResolvedValue({});
    mocks.transaction.mockImplementation(async (cb: (client: typeof tx) => Promise<unknown>) => cb(tx));
    mocks.verify.mockResolvedValue({ externalId: "ext-17", status: "PAID", providerReference: "bank-ref-17", threeDSecure: true });
    mocks.initialize.mockResolvedValue({ externalId: "ext-17", redirectUrl: "https://example.com/pay" });
  });

  it("does not start card payment when no provider is active", async () => {
    mocks.settingFindFirst.mockResolvedValue(null);
    await expect(PaymentGatewayService.initialize(17, "https://example.com/callback")).rejects.toThrow("henüz etkinleştirilmedi");
    expect(mocks.initialize).not.toHaveBeenCalled();
  });

  it("rejects a second payment initialization for a paid order", async () => {
    mocks.orderFindFirst.mockResolvedValue({ ...order, paymentStatus: "PAID" });
    await expect(PaymentGatewayService.initialize(17, "https://example.com/callback")).rejects.toThrow("zaten ödenmiş");
    expect(mocks.initialize).not.toHaveBeenCalled();
  });

  it("records provider initialization as PENDING without claiming payment", async () => {
    await PaymentGatewayService.initialize(17, "https://example.com/callback");
    expect(mocks.paymentCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ amount: 120, status: "PENDING", provider: "TEST_ACCEPTANCE" }) });
    expect(mocks.orderUpdate).not.toHaveBeenCalled();
  });

  it("rejects unknown provider transaction without changing the order", async () => {
    mocks.paymentFindFirst.mockResolvedValue(null);
    await expect(PaymentGatewayService.verify("TEST_ACCEPTANCE", "ext-17")).rejects.toThrow("bulunamadı");
    expect(mocks.orderUpdate).not.toHaveBeenCalled();
  });

  it("rejects provider response with a different transaction identity", async () => {
    mocks.verify.mockResolvedValue({ externalId: "another-transaction", status: "PAID" });
    await expect(PaymentGatewayService.verify("TEST_ACCEPTANCE", "ext-17")).rejects.toThrow("kimliği eşleşmiyor");
    expect(mocks.orderUpdate).not.toHaveBeenCalled();
  });

  it("rejects a changed order total before marking the order paid", async () => {
    mocks.paymentFindFirst.mockResolvedValue({ ...payment, order: { ...order, totalAmount: 121 } });
    await expect(PaymentGatewayService.verify("TEST_ACCEPTANCE", "ext-17")).rejects.toThrow("tutarı veya sipariş türü");
    expect(mocks.orderUpdate).not.toHaveBeenCalled();
  });

  it("records FAILED verification without marking the order paid", async () => {
    mocks.verify.mockResolvedValue({ externalId: "ext-17", status: "FAILED" });
    await PaymentGatewayService.verify("TEST_ACCEPTANCE", "ext-17");
    expect(mocks.paymentUpdate).toHaveBeenCalledWith({ where: { id: "pay-17" }, data: expect.objectContaining({ status: "FAILED" }) });
    expect(mocks.orderUpdate).not.toHaveBeenCalled();
  });

  it("records successful verification and exactly one customer payment entry", async () => {
    await PaymentGatewayService.verify("TEST_ACCEPTANCE", "ext-17");
    expect(mocks.orderUpdate).toHaveBeenCalledWith({ where: { id: 17 }, data: expect.objectContaining({ paymentStatus: "PAID" }) });
    expect(mocks.ledgerCreate).toHaveBeenCalledTimes(1);
  });

  it("does not create a second ledger entry when the payment is already PAID", async () => {
    mocks.paymentFindUnique.mockResolvedValue({ ...payment, status: "PAID" });
    await PaymentGatewayService.verify("TEST_ACCEPTANCE", "ext-17");
    expect(mocks.ledgerCreate).not.toHaveBeenCalled();
    expect(mocks.orderUpdate).not.toHaveBeenCalled();
  });
});
