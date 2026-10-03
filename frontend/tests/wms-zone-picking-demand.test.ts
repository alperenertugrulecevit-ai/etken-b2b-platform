import { describe, expect, it } from "vitest";

import { calculateRemainingPickDemand } from "@/lib/wms/zone-picking-service";

describe("calculateRemainingPickDemand", () => {
  it("returns zero when the remaining demand is fully covered by an active shortage", () => {
    expect(
      calculateRemainingPickDemand({
        quantity: 5,
        cancelledQuantity: 0,
        pickedQuantity: 2,
        pickingShortages: [{ quantity: 3 }],
      }),
    ).toBe(0);
  });

  it("keeps only the still-open quantity after picked, cancelled and shortage quantities", () => {
    expect(
      calculateRemainingPickDemand({
        quantity: 10,
        cancelledQuantity: 1,
        pickedQuantity: 4,
        pickingShortages: [{ quantity: 2 }],
      }),
    ).toBe(3);
  });

  it("restores shortage quantity after the shortage is reopened and no longer active", () => {
    expect(
      calculateRemainingPickDemand({
        quantity: 5,
        cancelledQuantity: 0,
        pickedQuantity: 2,
        pickingShortages: [],
      }),
    ).toBe(3);
  });

  it("never returns a negative demand", () => {
    expect(
      calculateRemainingPickDemand({
        quantity: 2,
        cancelledQuantity: 1,
        pickedQuantity: 2,
        pickingShortages: [{ quantity: 1 }],
      }),
    ).toBe(0);
  });
});
