export const THM_PREFIX = "ST-";

export function isValidThmBarcode(value: string) {
  return value.startsWith(THM_PREFIX) && value.length > THM_PREFIX.length;
}

export type PriorityInput = { distributionId: string; targetCode: string; plannedQuantity: number };

/** Frozen once at Wave initialization; later progress never reorders targets. */
export function calculateStableTargetPriorities(rows: PriorityInput[]) {
  const totals = new Map<string, PriorityInput>();
  for (const row of rows) {
    const current = totals.get(row.distributionId);
    totals.set(row.distributionId, {
      distributionId: row.distributionId,
      targetCode: row.targetCode,
      plannedQuantity: (current?.plannedQuantity ?? 0) + row.plannedQuantity,
    });
  }
  return [...totals.values()]
    .sort((a, b) => b.plannedQuantity - a.plannedQuantity || a.targetCode.localeCompare(b.targetCode))
    .map((row, index) => ({ ...row, priorityRank: index + 1 }));
}
