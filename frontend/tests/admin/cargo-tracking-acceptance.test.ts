import { beforeEach, describe, expect, it, vi } from "vitest";
import { CargoTrackingSyncService } from "@/modules/fulfillment/services/cargo-tracking-sync.service";

const mocks = vi.hoisted(() => ({
  orderFindUnique: vi.fn(),
  orderUpdate: vi.fn(),
  eventFindFirst: vi.fn(),
  eventCreate: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    order: { findUnique: mocks.orderFindUnique, update: mocks.orderUpdate },
    cargoTrackingEvent: { findFirst: mocks.eventFindFirst, create: mocks.eventCreate },
  },
}));

const order = { id: 23, cargoTrackingNumber: "TRACK-23", status: "SHIPPED" };
const delivered = {
  trackingNumber: "TRACK-23", status: "DELIVERED",
  externalEventId: "evt-delivered-23", eventAt: new Date("2026-10-08T10:00:00Z"),
};

describe("CargoTrackingSyncService provider-independent acceptance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.orderFindUnique.mockResolvedValue(order);
    mocks.eventFindFirst.mockResolvedValue(null);
    mocks.eventCreate.mockResolvedValue({ id: "event-23" });
    mocks.orderUpdate.mockResolvedValue({});
  });

  it("rejects orders without an assigned cargo tracking number", async () => {
    mocks.orderFindUnique.mockResolvedValue({ ...order, cargoTrackingNumber: null });
    await expect(CargoTrackingSyncService.record(23, "TEST_CARGO", delivered)).rejects.toThrow("Kargo takipli");
    expect(mocks.eventCreate).not.toHaveBeenCalled();
  });

  it("records a new tracking event with provider event ID", async () => {
    await CargoTrackingSyncService.record(23, "TEST_CARGO", { ...delivered, status: "IN_TRANSIT" });
    expect(mocks.eventCreate).toHaveBeenCalledWith({ data: expect.objectContaining({
      orderId: 23, provider: "TEST_CARGO", trackingNumber: "TRACK-23",
      externalEventId: "evt-delivered-23", status: "IN_TRANSIT",
    }) });
    expect(mocks.orderUpdate).not.toHaveBeenCalled();
  });

  it("does not create duplicate tracking event when provider event ID already exists", async () => {
    mocks.eventFindFirst.mockResolvedValue({ id: "existing-event" });
    await CargoTrackingSyncService.record(23, "TEST_CARGO", delivered);
    expect(mocks.eventCreate).not.toHaveBeenCalled();
  });

  it("marks SHIPPED order DELIVERED after provider delivery confirmation", async () => {
    await CargoTrackingSyncService.record(23, "TEST_CARGO", delivered);
    expect(mocks.orderUpdate).toHaveBeenCalledWith({ where: { id: 23 }, data: { status: "DELIVERED" } });
  });

  it("does not change order state for non-delivery events", async () => {
    await CargoTrackingSyncService.record(23, "TEST_CARGO", { ...delivered, status: "IN_TRANSIT" });
    expect(mocks.orderUpdate).not.toHaveBeenCalled();
  });

  it("does not regress an already delivered order", async () => {
    mocks.orderFindUnique.mockResolvedValue({ ...order, status: "DELIVERED" });
    await CargoTrackingSyncService.record(23, "TEST_CARGO", delivered);
    expect(mocks.orderUpdate).not.toHaveBeenCalled();
  });

  it("syncs multiple events from a provider without requiring a live provider", async () => {
    const adapter = {
      provider: "TEST_CARGO",
      createShipment: vi.fn(),
      getStatus: vi.fn(),
      getEvents: vi.fn().mockResolvedValue([
        { trackingNumber: "TRACK-23", status: "IN_TRANSIT", externalEventId: "evt-1" },
        delivered,
      ]),
    };
    const result = await CargoTrackingSyncService.sync(adapter, 23, "TRACK-23");
    expect(result).toEqual({ events: 2 });
    expect(mocks.eventCreate).toHaveBeenCalledTimes(2);
  });
});
