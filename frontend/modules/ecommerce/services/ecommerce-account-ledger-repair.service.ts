import "server-only";

import {
  CustomerAccountEntryDirection,
  CustomerAccountEntryType,
  CustomerAccountPaymentMethod,
  EcommerceReturnRefundStatus,
  OrderSource,
  Prisma,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

type Actor = { userId: string; displayName: string };
type Tx = Prisma.TransactionClient;

const PAID_STATES = new Set(["PAID", "REFUNDED", "REFUND_PENDING"]);

async function ensureOrderAndPayment(tx: Tx, order: {
  id: number;
  customerId: number;
  orderNumber: string;
  totalAmount: number;
  paymentStatus: string | null;
  paymentReference: string | null;
}, actor: Actor) {
  let created = 0;
  const orderDebit = await tx.customerAccountEntry.findFirst({
    where: { orderId: order.id, direction: CustomerAccountEntryDirection.DEBIT, entryType: CustomerAccountEntryType.ORDER },
    select: { id: true },
  });
  if (!orderDebit) {
    await tx.customerAccountEntry.create({ data: {
      customerId: order.customerId,
      orderId: order.id,
      direction: CustomerAccountEntryDirection.DEBIT,
      entryType: CustomerAccountEntryType.ORDER,
      amount: order.totalAmount,
      description: `${order.orderNumber} B2C sipariş borç kaydı (cari bütünlük onarımı)`,
      referenceNo: order.orderNumber,
      createdByUserId: actor.userId,
      createdByUsername: actor.displayName,
    }});
    created++;
  }

  if (!PAID_STATES.has(order.paymentStatus?.toUpperCase() ?? "")) return created;

  const payment = await tx.customerAccountEntry.findFirst({
    where: { orderId: order.id, direction: CustomerAccountEntryDirection.CREDIT, entryType: CustomerAccountEntryType.PAYMENT },
    select: { id: true },
  });
  if (!payment) {
    await tx.customerAccountEntry.create({ data: {
      customerId: order.customerId,
      orderId: order.id,
      direction: CustomerAccountEntryDirection.CREDIT,
      entryType: CustomerAccountEntryType.PAYMENT,
      paymentMethod: CustomerAccountPaymentMethod.BANK_TRANSFER,
      amount: order.totalAmount,
      description: `${order.orderNumber} B2C tahsilat kaydı (cari bütünlük onarımı)`,
      referenceNo: order.paymentReference ?? `LEDGER-REPAIR:${order.orderNumber}`,
      createdByUserId: actor.userId,
      createdByUsername: actor.displayName,
    }});
    created++;
  }
  return created;
}

async function ensureCompletedReturnPairs(tx: Tx, order: {
  id: number;
  customerId: number;
  orderNumber: string;
  ecommerceReturns: Array<{
    refunds: Array<{ id: string; amount: number; providerReference: string | null; completedAt: Date | null }>;
  }>;
}, actor: Actor) {
  let created = 0;
  for (const ecommerceReturn of order.ecommerceReturns) {
    for (const refund of ecommerceReturn.refunds) {
      const creditReference = `RETURN-CREDIT:${refund.id}`;
      const credit = await tx.customerAccountEntry.findFirst({
        where: {
          orderId: order.id,
          direction: CustomerAccountEntryDirection.CREDIT,
          entryType: CustomerAccountEntryType.ADJUSTMENT,
          referenceNo: creditReference,
        },
        select: { id: true },
      });
      if (!credit) {
        await tx.customerAccountEntry.create({ data: {
          customerId: order.customerId,
          orderId: order.id,
          direction: CustomerAccountEntryDirection.CREDIT,
          entryType: CustomerAccountEntryType.ADJUSTMENT,
          amount: refund.amount,
          description: `${order.orderNumber} B2C ürün iadesi cari ters kaydı (cari bütünlük onarımı)`,
          referenceNo: creditReference,
          transactionDate: refund.completedAt ?? new Date(),
          createdByUserId: actor.userId,
          createdByUsername: actor.displayName,
        }});
        created++;
      }

      const refundEntry = await tx.customerAccountEntry.findUnique({
        where: { ecommerceReturnRefundId: refund.id },
        select: { id: true },
      });
      if (!refundEntry) {
        await tx.customerAccountEntry.create({ data: {
          customerId: order.customerId,
          orderId: order.id,
          direction: CustomerAccountEntryDirection.DEBIT,
          entryType: CustomerAccountEntryType.REFUND,
          paymentMethod: CustomerAccountPaymentMethod.BANK_TRANSFER,
          amount: refund.amount,
          description: `${order.orderNumber} B2C ürün iadesi ödeme kaydı (cari bütünlük onarımı)`,
          referenceNo: refund.providerReference ?? `LEDGER-REPAIR-REFUND:${refund.id}`,
          ecommerceReturnRefundId: refund.id,
          transactionDate: refund.completedAt ?? new Date(),
          createdByUserId: actor.userId,
          createdByUsername: actor.displayName,
        }});
        created++;
      }
    }
  }
  return created;
}

export class EcommerceAccountLedgerRepairService {
  static async repair(actor: Actor) {
    return prisma.$transaction(async (tx) => {
      const orders = await tx.order.findMany({
        where: { source: OrderSource.ECOMMERCE },
        select: {
          id: true,
          customerId: true,
          orderNumber: true,
          totalAmount: true,
          paymentStatus: true,
          paymentReference: true,
          ecommerceReturns: {
            select: {
              refunds: {
                where: { status: EcommerceReturnRefundStatus.REFUNDED },
                select: { id: true, amount: true, providerReference: true, completedAt: true },
              },
            },
          },
        },
      });

      let createdEntries = 0;
      let repairedOrders = 0;
      for (const order of orders) {
        const before = createdEntries;
        createdEntries += await ensureOrderAndPayment(tx, order, actor);
        createdEntries += await ensureCompletedReturnPairs(tx, order, actor);
        if (createdEntries > before) repairedOrders++;
      }
      return { scannedOrders: orders.length, repairedOrders, createdEntries };
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 10000,
      timeout: 60000,
    });
  }
}
