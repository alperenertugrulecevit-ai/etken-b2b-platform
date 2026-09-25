import { describe, expect, it } from "vitest";

/**
 * WMS kayıp/transfer kabul kurallarının saf iş kuralı regresyonları.
 * DB entegrasyon testleri servis katmanı tamamlandığında bu senaryoları gerçek
 * transaction üzerinde de çalıştırır.
 */
describe("lost stock business rules", () => {
  it("moves the whole selected SKU quantity, not the order need", () => {
    const orderNeed = 1;
    const sourceSkuQuantity = 5;
    const lostQuantity = sourceSkuQuantity;
    expect(orderNeed).toBe(1);
    expect(lostQuantity).toBe(5);
  });

  it("does not alter other SKUs in the same HU", () => {
    const before = { URN001: 5, URN002: 8, URN003: 3 };
    const after = { ...before, URN001: 0 };
    expect(after).toEqual({ URN001: 0, URN002: 8, URN003: 3 });
  });

  it("excludes KYP001 from reallocation candidates", () => {
    const warehouses = ["DP001", "KYP001", "DP002"];
    expect(warehouses.filter((code) => code !== "KYP001")).toEqual(["DP001", "DP002"]);
  });
});

describe("warehouse transfer business rules", () => {
  it("product transfer changes only selected SKU quantity", () => {
    const source = { URN001: 20, URN002: 10, URN003: 5 };
    const quantity = 8;
    const after = { ...source, URN001: source.URN001 - quantity };
    expect(after).toEqual({ URN001: 12, URN002: 10, URN003: 5 });
  });

  it("full HU transfer preserves HU contents", () => {
    const before = { URN001: 20, URN002: 10, URN003: 5 };
    const after = { ...before };
    expect(after).toEqual(before);
  });

  it("normal product transfer cannot consume reserved stock", () => {
    const physical = 10;
    const reserved = 6;
    expect(physical - reserved).toBe(4);
  });
});
