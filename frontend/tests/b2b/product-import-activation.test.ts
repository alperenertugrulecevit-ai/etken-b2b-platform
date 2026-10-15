import { describe, expect, it } from "vitest";
import { shouldActivateNewImportedProduct } from "@/modules/products/import/product-import-activation";

describe("Excel catalog activation policy", () => {
  it("keeps new products without prices inactive", () => {
    expect(shouldActivateNewImportedProduct(null)).toBe(false);
    expect(shouldActivateNewImportedProduct(0)).toBe(false);
    expect(shouldActivateNewImportedProduct(-1)).toBe(false);
  });

  it("accepts positive, finite sale prices", () => {
    expect(shouldActivateNewImportedProduct(0.01)).toBe(true);
    expect(shouldActivateNewImportedProduct(100)).toBe(true);
  });

  it("rejects non-finite prices", () => {
    expect(shouldActivateNewImportedProduct(Number.NaN)).toBe(false);
    expect(shouldActivateNewImportedProduct(Number.POSITIVE_INFINITY)).toBe(false);
  });
});
