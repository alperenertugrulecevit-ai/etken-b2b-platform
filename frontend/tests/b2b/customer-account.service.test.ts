import {
  CustomerAccountEntryDirection,
} from "@prisma/client";
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  getCustomerAccountSummary,
  getCustomerDueDate,
} from "@/modules/b2b/services/customer-account.service";

const groupByMock =
  vi.hoisted(() =>
    vi.fn()
  );

vi.mock(
  "@/lib/prisma",
  () => ({
    prisma: {
      customerAccountEntry: {
        groupBy:
          groupByMock,
      },
    },
  })
);

describe(
  "customer-account.service",
  () => {
    beforeEach(() => {
      groupByMock.mockReset();
    });

    it("ödeme vadesini verilen gün kadar ileri taşır", () => {
      const dueDate =
        getCustomerDueDate(
          30,
          new Date(
            "2026-08-03T10:00:00.000Z"
          )
        );

      expect(
        dueDate.toISOString()
      ).toBe(
        "2026-09-02T10:00:00.000Z"
      );
    });

    it("geçersiz ödeme vadesini sıfır gün kabul eder", () => {
      const baseDate =
        new Date(
          "2026-08-03T10:00:00.000Z"
        );

      expect(
        getCustomerDueDate(
          -5,
          baseDate
        ).toISOString()
      ).toBe(
        baseDate.toISOString()
      );
    });

    it("borç, ödeme ve bakiyeyi iki ondalıkla hesaplar", async () => {
      groupByMock.mockResolvedValue([
        {
          direction:
            CustomerAccountEntryDirection.DEBIT,
          _sum: {
            amount: 1000.555,
          },
        },
        {
          direction:
            CustomerAccountEntryDirection.CREDIT,
          _sum: {
            amount: 250.333,
          },
        },
      ]);

      await expect(
        getCustomerAccountSummary(
          25
        )
      ).resolves.toEqual({
        totalDebit: 1000.56,
        totalCredit: 250.33,
        balance: 750.23,
      });

      expect(
        groupByMock
      ).toHaveBeenCalledWith({
        by: [
          "direction",
        ],
        where: {
          customerId: 25,
        },
        _sum: {
          amount: true,
        },
      });
    });

    it("hareket bulunmadığında sıfır bakiye döndürür", async () => {
      groupByMock.mockResolvedValue(
        []
      );

      await expect(
        getCustomerAccountSummary(
          25
        )
      ).resolves.toEqual({
        totalDebit: 0,
        totalCredit: 0,
        balance: 0,
      });
    });

    it("borçtan fazla ödeme olduğunda alacak bakiyesi üretir", async () => {
      groupByMock.mockResolvedValue([
        {
          direction:
            CustomerAccountEntryDirection.DEBIT,
          _sum: {
            amount: 100,
          },
        },
        {
          direction:
            CustomerAccountEntryDirection.CREDIT,
          _sum: {
            amount: 250,
          },
        },
      ]);

      await expect(
        getCustomerAccountSummary(
          25
        )
      ).resolves.toEqual({
        totalDebit: 100,
        totalCredit: 250,
        balance: -150,
      });
    });
  }
);
