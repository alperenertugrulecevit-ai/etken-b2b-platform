export const THM_PREFIX = "ST-";

export function normalizeThmBarcode(value: string) {
  return value.trim();
}

export function isValidThmBarcode(value: string) {
  const normalized = normalizeThmBarcode(value);
  return normalized.startsWith(THM_PREFIX) && normalized.length > THM_PREFIX.length;
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

export type ActiveThmTransaction = {
  id: string;
  handlingUnitId: number;
  originalHandlingUnitId: number;
  quantity: number;
  status: "ACTIVE" | "REVERSED";
};

/** Pure mirror of merge ownership semantics, used to verify merge chains. */
export function moveActiveThmOwnership(
  transactions: ActiveThmTransaction[],
  sourceHandlingUnitId: number,
  targetHandlingUnitId: number
) {
  return transactions.map((transaction) =>
    transaction.status === "ACTIVE" &&
    transaction.handlingUnitId === sourceHandlingUnitId
      ? { ...transaction, handlingUnitId: targetHandlingUnitId }
      : { ...transaction }
  );
}

export function activeQuantityForThm(
  transactions: ActiveThmTransaction[],
  handlingUnitId: number
) {
  return transactions
    .filter(
      (transaction) =>
        transaction.status === "ACTIVE" &&
        transaction.handlingUnitId === handlingUnitId
    )
    .reduce((total, transaction) => total + transaction.quantity, 0);
}

export function reverseActiveTransaction(
  transactions: ActiveThmTransaction[],
  transactionId: string
) {
  const transaction = transactions.find(({ id }) => id === transactionId);
  if (!transaction || transaction.status === "REVERSED") {
    throw new Error("ALREADY_REVERSED");
  }
  return transactions.map((candidate) =>
    candidate.id === transactionId
      ? { ...candidate, status: "REVERSED" as const }
      : { ...candidate }
  );
}
