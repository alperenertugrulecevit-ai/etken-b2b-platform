import { describe, expect, it } from "vitest";
import { distributionBalance, istanbulHour, productiveTotals, type ReportingTransaction } from "@/modules/manual-wave/domain/manual-wave-reporting";
const row = (overrides: Partial<ReportingTransaction> = {}): ReportingTransaction => ({ id: "1", tenantId: "t", companyId: "c", warehouseId: 1, waveId: "w", operatorId: "u", productId: 1, distributionId: "d", handlingUnitId: 1, quantity: 4, status: "ACTIVE", createdAt: new Date("2026-01-01T20:30:00Z"), ...overrides });
describe("Phase 4 reporting semantics", () => {
  it("counts ACTIVE and excludes REVERSED productive quantity", () => expect(productiveTotals([row(), row({ id: "2", status: "REVERSED", quantity: 99 })])).toMatchObject({ quantity: 4, transactions: 1 }));
  it("does not duplicate quantity after a THM merge", () => expect(productiveTotals([row({ handlingUnitId: 7 })]).quantity).toBe(4));
  it("groups the UTC boundary by Istanbul local date and hour", () => expect(istanbulHour(row().createdAt)).toBe("2026-01-01 23"));
  it("keeps scope isolation", () => expect(productiveTotals([row(), row({ tenantId: "other" })].filter((x) => x.tenantId === "t")).quantity).toBe(4));
  it("calculates distinct operator totals", () => expect(productiveTotals([row(), row({ id: "2", operatorId: "u2" })]).operators).toBe(2));
  it("undo increases remaining and completion reaches 100%", () => { expect(distributionBalance(10, [row(), row({ id: "2", status: "REVERSED", quantity: 6 })])).toMatchObject({ distributed: 4, remaining: 6 }); expect(distributionBalance(4, [row()]).completion).toBe(100); });
  it("aggregates before interpreting remaining", () => expect(distributionBalance(5, [row({ quantity: 3 }), row({ id: "2", quantity: 2 })]).remaining).toBe(0));
});
