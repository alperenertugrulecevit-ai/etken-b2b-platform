import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { EcommerceNotificationService } from "@/modules/ecommerce/services/ecommerce-notification.service";

const originalWebhook = process.env.ECOMMERCE_EMAIL_WEBHOOK_URL;
const originalToken = process.env.ECOMMERCE_EMAIL_WEBHOOK_TOKEN;
const originalFetch = globalThis.fetch;

describe("Ecommerce notifications (synthetic, no external requests)", () => {
  beforeEach(() => {
    process.env.ECOMMERCE_EMAIL_WEBHOOK_URL = "https://example.invalid/notification";
    delete process.env.ECOMMERCE_EMAIL_WEBHOOK_TOKEN;
  });

  afterEach(() => {
    if (originalWebhook === undefined) delete process.env.ECOMMERCE_EMAIL_WEBHOOK_URL;
    else process.env.ECOMMERCE_EMAIL_WEBHOOK_URL = originalWebhook;
    if (originalToken === undefined) delete process.env.ECOMMERCE_EMAIL_WEBHOOK_TOKEN;
    else process.env.ECOMMERCE_EMAIL_WEBHOOK_TOKEN = originalToken;
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  const event = {
    event: "ORDER_RECEIVED" as const,
    email: "BUYER@EXAMPLE.INVALID",
    orderNumber: "WEB-TEST-001",
  };

  it("skips missing recipient without a network request", async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock;
    expect(await EcommerceNotificationService.send({ ...event, email: " " }))
      .toMatchObject({ status: "skipped" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("skips missing provider configuration without a network request", async () => {
    delete process.env.ECOMMERCE_EMAIL_WEBHOOK_URL;
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock;
    expect(await EcommerceNotificationService.send(event))
      .toMatchObject({ status: "skipped" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends normalized recipient and order details on successful provider response", async () => {
    process.env.ECOMMERCE_EMAIL_WEBHOOK_TOKEN = "synthetic-test-token";
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    globalThis.fetch = fetchMock;
    expect(await EcommerceNotificationService.send(event)).toEqual({ status: "sent" });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://example.invalid/notification");
    expect(options.headers.authorization).toBe("Bearer synthetic-test-token");
    const payload = JSON.parse(options.body);
    expect(payload.to).toBe("buyer@example.invalid");
    expect(payload.orderNumber).toBe("WEB-TEST-001");
    expect(payload.event).toBe("ORDER_RECEIVED");
  });

  it("includes cargo tracking details in a shipped notification", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    globalThis.fetch = fetchMock;
    const result = await EcommerceNotificationService.send({
      ...event,
      event: "SHIPPED",
      trackingNumber: "SYNTH-123",
      trackingUrl: "https://example.invalid/track/SYNTH-123",
    });
    expect(result.status).toBe("sent");
    const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(payload.text).toContain("SYNTH-123");
    expect(payload.text).toContain("https://example.invalid/track/SYNTH-123");
    expect(payload.event).toBe("SHIPPED");
  });

  it("distinguishes a cancelled-order refund from a product-return refund", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    globalThis.fetch = fetchMock;
    await EcommerceNotificationService.send({
      ...event, event: "REFUNDED", refundContext: "ORDER_CANCELLATION",
    });
    await EcommerceNotificationService.send({
      ...event, event: "REFUNDED", refundContext: "PRODUCT_RETURN", returnNumber: "RET-SYNTH-1",
    });
    const cancellation = JSON.parse(fetchMock.mock.calls[0][1].body);
    const productReturn = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(cancellation.text).toContain("İptal edilen siparişinizin");
    expect(productReturn.text).toContain("Ürün iadenize");
    expect(productReturn.text).toContain("RET-SYNTH-1");
  });

  it("returns failed for non-2xx provider responses", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 503 });
    expect(await EcommerceNotificationService.send(event))
      .toMatchObject({ status: "failed", reason: expect.stringContaining("503") });
  });

  it("returns failed on provider network errors", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("synthetic timeout"));
    expect(await EcommerceNotificationService.send(event))
      .toMatchObject({ status: "failed", reason: "synthetic timeout" });
  });
});
