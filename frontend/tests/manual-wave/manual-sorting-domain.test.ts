import { describe, expect, it } from "vitest";
import {
  activeQuantityForThm,
  calculateStableTargetPriorities,
  isValidThmBarcode,
  moveActiveThmOwnership,
  normalizeThmBarcode,
  reverseActiveTransaction,
  type ActiveThmTransaction,
} from "@/modules/manual-wave/domain/manual-sorting";

describe("manual Wave sorting domain", () => {
  it("keeps Wave priority stable with quantity DESC and code ASC", () => {
    const source = [
      { distributionId: "b", targetCode: "B", plannedQuantity: 4 },
      { distributionId: "a", targetCode: "A", plannedQuantity: 2 },
      { distributionId: "a", targetCode: "A", plannedQuantity: 2 },
      { distributionId: "c", targetCode: "C", plannedQuantity: 8 },
    ];
    expect(calculateStableTargetPriorities(source)).toEqual([
      { distributionId: "c", targetCode: "C", plannedQuantity: 8, priorityRank: 1 },
      { distributionId: "a", targetCode: "A", plannedQuantity: 4, priorityRank: 2 },
      { distributionId: "b", targetCode: "B", plannedQuantity: 4, priorityRank: 3 },
    ]);
    expect(source[0]).toEqual({ distributionId: "b", targetCode: "B", plannedQuantity: 4 });
  });

  it("trims but never changes case for strict ST- validation", () => {
    expect(normalizeThmBarcode("  ST-123  ")).toBe("ST-123");
    expect(isValidThmBarcode("  ST-123  ")).toBe(true);
    expect(isValidThmBarcode("st-123")).toBe(false);
    expect(isValidThmBarcode("St-123")).toBe(false);
    expect(isValidThmBarcode("ST-")).toBe(false);
  });

  const original = (): ActiveThmTransaction[] => [
    { id: "tx-1", handlingUnitId: 1, originalHandlingUnitId: 1, quantity: 2, status: "ACTIVE" },
  ];

  it("A -> B merge then undo reduces current owner and preserves provenance", () => {
    const moved = moveActiveThmOwnership(original(), 1, 2);
    expect(activeQuantityForThm(moved, 1)).toBe(0);
    expect(activeQuantityForThm(moved, 2)).toBe(2);
    expect(moved[0].originalHandlingUnitId).toBe(1);
    const reversed = reverseActiveTransaction(moved, "tx-1");
    expect(activeQuantityForThm(reversed, 2)).toBe(0);
    expect(reversed[0].originalHandlingUnitId).toBe(1);
  });

  it("A -> B -> C merge then undo reduces only final owner", () => {
    const movedToB = moveActiveThmOwnership(original(), 1, 2);
    const movedToC = moveActiveThmOwnership(movedToB, 2, 3);
    expect(activeQuantityForThm(movedToC, 1)).toBe(0);
    expect(activeQuantityForThm(movedToC, 2)).toBe(0);
    expect(activeQuantityForThm(movedToC, 3)).toBe(2);
    const reversed = reverseActiveTransaction(movedToC, "tx-1");
    expect(activeQuantityForThm(reversed, 3)).toBe(0);
  });

  it("does not allow a second undo or negative active quantity", () => {
    const reversed = reverseActiveTransaction(original(), "tx-1");
    expect(activeQuantityForThm(reversed, 1)).toBe(0);
    expect(() => reverseActiveTransaction(reversed, "tx-1")).toThrow("ALREADY_REVERSED");
  });
});
