import { describe, expect, it } from "vitest";
import {
  activeQuantityForThm,
  moveActiveThmOwnership,
  reverseActiveTransaction,
} from "@/modules/manual-wave/domain/manual-sorting";

type Tx = Parameters<typeof moveActiveThmOwnership>[0][number];

const original: Tx = {
  id: "tx-1",
  handlingUnitId: 1,
  originalHandlingUnitId: 1,
  quantity: 2,
  status: "ACTIVE",
};

describe("manual Wave THM lifecycle", () => {
  it("moves active ownership from A to B and undo affects B", () => {
    const moved = moveActiveThmOwnership([original], 1, 2);
    expect(activeQuantityForThm(moved, 1)).toBe(0);
    expect(activeQuantityForThm(moved, 2)).toBe(2);
    expect(moved[0].originalHandlingUnitId).toBe(1);

    const reversed = reverseActiveTransaction(moved, "tx-1");
    expect(activeQuantityForThm(reversed, 2)).toBe(0);
    expect(reversed[0]).toMatchObject({
      handlingUnitId: 2,
      originalHandlingUnitId: 1,
      status: "REVERSED",
    });
  });

  it("keeps the final THM as active owner through A to B to C before undo", () => {
    const b = moveActiveThmOwnership([original], 1, 2);
    const c = moveActiveThmOwnership(b, 2, 3);
    expect(activeQuantityForThm(c, 1)).toBe(0);
    expect(activeQuantityForThm(c, 2)).toBe(0);
    expect(activeQuantityForThm(c, 3)).toBe(2);
    expect(c[0].originalHandlingUnitId).toBe(1);

    const reversed = reverseActiveTransaction(c, "tx-1");
    expect(activeQuantityForThm(reversed, 3)).toBe(0);
    expect(reversed[0].originalHandlingUnitId).toBe(1);
  });

  it("does not move reversed transactions and rejects a second undo", () => {
    const reversed = reverseActiveTransaction([original], "tx-1");
    const moved = moveActiveThmOwnership(reversed, 1, 2);
    expect(activeQuantityForThm(moved, 1)).toBe(0);
    expect(activeQuantityForThm(moved, 2)).toBe(0);
    expect(() => reverseActiveTransaction(reversed, "tx-1")).toThrow(
      "ALREADY_REVERSED"
    );
  });

  it("sums only active quantities, preventing reversed stock from going negative", () => {
    const transactions: Tx[] = [
      original,
      {
        ...original,
        id: "tx-2",
        quantity: 5,
        status: "REVERSED",
      },
    ];
    expect(activeQuantityForThm(transactions, 1)).toBe(2);
  });
});
