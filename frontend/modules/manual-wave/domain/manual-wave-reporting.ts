export type ReportingTransaction = { id: string; tenantId: string; companyId: string; warehouseId: number; waveId: string; operatorId: string; productId: number; distributionId: string; handlingUnitId: number; quantity: number; status: "ACTIVE" | "REVERSED"; createdAt: Date };

/** Reference rules for focused tests; production aggregation remains in PostgreSQL. */
export function productiveTotals(rows: ReportingTransaction[]) {
  const active = rows.filter((row) => row.status === "ACTIVE");
  return { quantity: active.reduce((sum, row) => sum + row.quantity, 0), transactions: active.length, waves: new Set(active.map((row) => row.waveId)).size, operators: new Set(active.map((row) => row.operatorId)).size, products: new Set(active.map((row) => row.productId)).size };
}
export function istanbulHour(date: Date) { return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit" }).format(date); }
export function distributionBalance(planned: number, rows: ReportingTransaction[]) { const distributed = productiveTotals(rows).quantity; return { planned, distributed, remaining: Math.max(0, planned - distributed), completion: planned === 0 ? 100 : Math.min(100, distributed * 100 / planned) }; }
