import { describe, expect, it } from "vitest";
import { calculateStableTargetPriorities, isValidThmBarcode } from "@/modules/manual-wave/domain/manual-sorting";
describe("manual Wave sorting domain", () => {
  it("orders Wave-wide totals descending and target codes ascending on ties", () => {
    expect(calculateStableTargetPriorities([
      { distributionId: "b", targetCode: "B", plannedQuantity: 4 },
      { distributionId: "a", targetCode: "A", plannedQuantity: 2 },
      { distributionId: "a", targetCode: "A", plannedQuantity: 2 },
      { distributionId: "c", targetCode: "C", plannedQuantity: 8 },
    ])).toEqual([
      { distributionId: "c", targetCode: "C", plannedQuantity: 8, priorityRank: 1 },
      { distributionId: "a", targetCode: "A", plannedQuantity: 4, priorityRank: 2 },
      { distributionId: "b", targetCode: "B", plannedQuantity: 4, priorityRank: 3 },
    ]);
  });
  it("accepts only exact uppercase ST- prefix", () => {
    expect(isValidThmBarcode("ST-123")).toBe(true);
    expect(isValidThmBarcode("st-123")).toBe(false);
    expect(isValidThmBarcode("St-123")).toBe(false);
    expect(isValidThmBarcode("ST-")).toBe(false);
  });
  it("returns a new immutable ranking without mutating planning input", () => {
    const source = [{ distributionId: "a", targetCode: "A", plannedQuantity: 1 }];
    const result = calculateStableTargetPriorities(source);
    expect(result[0].priorityRank).toBe(1); expect(source).toEqual([{ distributionId: "a", targetCode: "A", plannedQuantity: 1 }]);
  });
});
