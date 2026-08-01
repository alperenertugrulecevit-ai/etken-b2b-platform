import "server-only";

import {
  CustomerAccountEntryDirection,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type CustomerAccountSummary = {
  totalDebit: number;
  totalCredit: number;
  balance: number;
};

function roundMoney(
  value: number
) {
  return Math.round(
    (value + Number.EPSILON) *
      100
  ) / 100;
}

export function getCustomerDueDate(
  paymentTermDays: number,
  baseDate = new Date()
) {
  const safePaymentTermDays =
    Number.isInteger(
      paymentTermDays
    ) &&
    paymentTermDays > 0
      ? paymentTermDays
      : 0;

  const dueDate =
    new Date(baseDate);

  dueDate.setUTCDate(
    dueDate.getUTCDate() +
      safePaymentTermDays
  );

  return dueDate;
}

export async function getCustomerAccountSummary(
  customerId: number
): Promise<CustomerAccountSummary> {
  const groupedEntries =
    await prisma.customerAccountEntry.groupBy({
      by: [
        "direction",
      ],
      where: {
        customerId,
      },
      _sum: {
        amount: true,
      },
    });

  let totalDebit = 0;
  let totalCredit = 0;

  for (
    const entry of groupedEntries
  ) {
    const amount =
      entry._sum.amount ?? 0;

    if (
      entry.direction ===
      CustomerAccountEntryDirection.DEBIT
    ) {
      totalDebit += amount;
    } else {
      totalCredit += amount;
    }
  }

  totalDebit =
    roundMoney(totalDebit);

  totalCredit =
    roundMoney(totalCredit);

  return {
    totalDebit,
    totalCredit,
    balance:
      roundMoney(
        totalDebit -
          totalCredit
      ),
  };
}
