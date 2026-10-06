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

type Tx = Prisma.TransactionClient;
type Actor = { userId: string; displayName: string };

const paidStatuses = new Set(["PAID", "REFUND_PENDING", "REFUNDED"]);

export type EcommerceLedgerRepairResult = {
  scannedOrders: number;
  createdOrderDebits: number;
  createdPayments: number;
  createdReturnCredits: number;
  skippedRefundsWithoutProof: number;
};

async function repairOrder(tx: Tx, orderId: number, actor: Actor, result: EcommerceLedgerRepairResult) {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNumber: true,
      customerId: true,
      source: true,
      totalAmount: true,
      paymentStatus: true,
      paymentReference: true,
      accountEntries: {
        select: { id:true, direction:true, entryType:true, amount:true, ecommerceReturnRefundId:true },
      },
      ecommerceReturns: {
        select: {
          refunds: {
            where: { status: EcommerceReturnRefundStatus.REFUNDED },
            select: { id:true, amount:true, providerReference:true, completedAt:true },
          },
        },
      },
    },
  });
  if (!order || order.source !== OrderSource.ECOMMERCE) return;

  result.scannedOrders += 1;
  const hasOrderDebit = order.accountEntries.some(
    e => e.entryType === CustomerAccountEntryType.ORDER && e.direction === CustomerAccountEntryDirection.DEBIT,
  );
  if (!hasOrderDebit) {
    await tx.customerAccountEntry.create({
      data: {
        customerId: order.customerId,
        orderId: order.id,
        direction: CustomerAccountEntryDirection.DEBIT,
        entryType: CustomerAccountEntryType.ORDER,
        amount: order.totalAmount,
        description: `${order.orderNumber} B2C sipariş borç kaydı (cari bütünlük onarımı)`,
        referenceNo: order.orderNumber,
        createdByUserId: actor.userId,
        createdByUsername: actor.displayName,
      },
    });
    result.createdOrderDebits += 1;
  }

  const paid = paidStatuses.has(order.paymentStatus?.toUpperCase() ?? "");
  const hasPayment = order.accountEntries.some(
    e => e.entryType === CustomerAccountEntryType.PAYMENT && e.direction === CustomerAccountEntryDirection.CREDIT,
  );
  if (paid && !hasPayment) {
    await tx.customerAccountEntry.create({
      data: {
        customerId: order.customerId,
        orderId: order.id,
        direction: CustomerAccountEntryDirection.CREDIT,
        entryType: CustomerAccountEntryType.PAYMENT,
        paymentMethod: CustomerAccountPaymentMethod.BANK_TRANSFER,
        amount: order.totalAmount,
        description: `${order.orderNumber} B2C tahsilat kaydı (cari bütünlük onarımı)`,
        referenceNo: order.paymentReference || `LEDGER-REPAIR:${order.orderNumber}`,
        createdByUserId: actor.userId,
        createdByUsername: actor.displayName,
      },
    });
    result.createdPayments += 1;
  }

  for (const ecommerceReturn of order.ecommerceReturns) {
    for (const refund of ecommerceReturn.refunds) {
      const refundEntry = order.accountEntries.find(
        e => e.ecommerceReturnRefundId === refund.id && e.entryType === CustomerAccountEntryType.REFUND && e.direction === CustomerAccountEntryDirection.DEBIT,
      );
      // REFUNDED finans kaydı gerçek para iadesinin kanıtıdır. Refund cari kaydı eksikse
      // otomatik üretmek yerine güvenli biçimde atlarız; banka/provider referansı olmadan
      // geriye dönük para çıkışı uydurulamaz.
      if (!refundEntry) {
        result.skippedRefundsWithoutProof += 1;
        continue;
      }

      const returnCreditReference = `RETURN-CREDIT:${refund.id}`;
      const hasReturnCredit = order.accountEntries.some(
        e => e.entryType === CustomerAccountEntryType.ADJUSTMENT && e.direction === CustomerAccountEntryDirection.CREDIT &&
          Math.abs(e.amount - refund.amount) < 0.005,
      );
      if (!hasReturnCredit) {
        await tx.customerAccountEntry.create({
          data: {
            customerId: order.customerId,
            orderId: order.id,
            direction: CustomerAccountEntryDirection.CREDIT,
            entryType: CustomerAccountEntryType.ADJUSTMENT,
            amount: refund.amount,
            description: `${order.orderNumber} B2C ürün iadesi cari ters kaydı (cari bütünlük onarımı)`,
            referenceNo: returnCreditReference,
            createdByUserId: actor.userId,
            createdByUsername: actor.displayName,
          },
        });
        result.createdReturnCredits += 1;
      }
    }
  }
}

export class EcommerceAccountLedgerIntegrityService {
  static async repair(actor: Actor): Promise<EcommerceLedgerRepairResult> {
    return prisma.$transaction(async tx => {
      const orders = await tx.order.findMany({
        where: { source: OrderSource.ECOMMERCE },
        select: { id:true },
        orderBy: { id:"asc" },
      });
      const result:EcommerceLedgerRepairResult = {
        scannedOrders:0, createdOrderDebits:0, createdPayments:0, createdReturnCredits:0, skippedRefundsWithoutProof:0,
      };
      for (const order of orders) await repairOrder(tx, order.id, actor, result);
      return result;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait:10000, timeout:60000 });
  }
}
