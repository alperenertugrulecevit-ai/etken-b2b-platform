import "server-only";

import {
  B2BPaymentMethod,
  BankTransactionMatchStatus,
  CustomerAccountEntryDirection,
  CustomerAccountEntryType,
  CustomerAccountPaymentMethod,
  OrderSource,
  OrderStatus,
  Prisma,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { B2B_CONSTANTS } from "@/modules/b2b/constants/b2b.constants";
import { EcommerceNotificationService } from "@/modules/ecommerce/services/ecommerce-notification.service";

export type BankTransactionImport = {
  bankAccountId: number;
  externalId: string;
  transactionDate: Date;
  amount: number;
  currency?: string;
  senderName?: string | null;
  senderIban?: string | null;
  description?: string | null;
  bankReference?: string | null;
  rawPayload?: Prisma.InputJsonValue;
};

export class BankReconciliationService {
  static async importTransactions(rows: BankTransactionImport[]) {
    let imported = 0;
    for (const row of rows) {
      if (!row.externalId.trim() || !Number.isFinite(row.amount) || row.amount <= 0) continue;
      const account = await prisma.b2BBankAccount.findFirst({
        where: { id: row.bankAccountId, tenantId: B2B_CONSTANTS.TENANT_ID, companyId: B2B_CONSTANTS.COMPANY_ID },
        select: { id: true },
      });
      if (!account) throw new Error("Banka hesabı bulunamadı.");
      const externalId = row.externalId.trim();
      try {
        await prisma.bankTransaction.create({
          data: {
            tenantId: B2B_CONSTANTS.TENANT_ID,
            companyId: B2B_CONSTANTS.COMPANY_ID,
            bankAccountId: row.bankAccountId,
            externalId,
            transactionDate: row.transactionDate,
            amount: row.amount,
            currency: (row.currency ?? "TRY").trim().toUpperCase(),
            senderName: row.senderName?.trim() || null,
            senderIban: row.senderIban?.replace(/\s+/g, "").toUpperCase() || null,
            description: row.description?.trim() || null,
            bankReference: row.bankReference?.trim() || null,
            rawPayload: row.rawPayload,
          },
        });
        imported += 1;
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") continue;
        throw error;
      }
    }
    return { imported };
  }

  static async matchTransaction(input: { transactionId: string; orderId: number; actor: { userId: string; displayName: string } }) {
    const result = await prisma.$transaction(async (tx) => {
      const bankTx = await tx.bankTransaction.findFirst({
        where: {
          id: input.transactionId,
          tenantId: B2B_CONSTANTS.TENANT_ID,
          companyId: B2B_CONSTANTS.COMPANY_ID,
        },
      });
      if (!bankTx) throw new Error("Banka hareketi bulunamadı.");
      if (bankTx.matchStatus !== BankTransactionMatchStatus.UNMATCHED) {
        throw new Error("Yalnızca eşleştirilmemiş banka hareketleri siparişe bağlanabilir.");
      }

      const order = await tx.order.findUnique({
        where: { id: input.orderId },
        select: { id:true,orderNumber:true,customerId:true,source:true,status:true,paymentMethod:true,paymentStatus:true,totalAmount:true,ecommerceEmail:true },
      });
      if (!order || order.source !== OrderSource.ECOMMERCE) throw new Error("E-ticaret siparişi bulunamadı.");
      if (order.paymentMethod !== B2BPaymentMethod.BANK_TRANSFER) throw new Error("Sipariş Havale / EFT ödeme yönteminde değil.");
      if (order.status === OrderStatus.CANCELLED) throw new Error("İptal edilmiş siparişe ödeme eşleştirilemez.");
      if (order.paymentStatus?.toUpperCase() === "PAID") throw new Error("Sipariş ödemesi zaten onaylanmış.");
      if (bankTx.currency !== "TRY") throw new Error("Sipariş ödemesi için TRY banka hareketi gereklidir.");
      if (Math.abs(bankTx.amount - order.totalAmount) > 0.01) throw new Error("Banka hareketi tutarı sipariş toplamı ile eşleşmiyor.");

      const existingPayment = await tx.customerAccountEntry.findFirst({
        where: { orderId: order.id, direction: CustomerAccountEntryDirection.CREDIT, entryType: CustomerAccountEntryType.PAYMENT },
        select: { id: true },
      });
      if (existingPayment) throw new Error("Sipariş için ödeme cari hareketi zaten var.");

      const existingOrderDebit = await tx.customerAccountEntry.findFirst({
        where: { orderId: order.id, direction: CustomerAccountEntryDirection.DEBIT, entryType: CustomerAccountEntryType.ORDER },
        select: { id: true },
      });
      if (!existingOrderDebit) {
        await tx.customerAccountEntry.create({ data: {
          customerId: order.customerId, orderId: order.id,
          direction: CustomerAccountEntryDirection.DEBIT, entryType: CustomerAccountEntryType.ORDER,
          amount: order.totalAmount, description: `${order.orderNumber} B2C sipariş borç kaydı (geriye dönük tamamlama)`,
          referenceNo: order.orderNumber, createdByUserId: input.actor.userId, createdByUsername: input.actor.displayName,
        }});
      }
      const reference = bankTx.bankReference || bankTx.externalId;
      await tx.customerAccountEntry.create({ data: {
        customerId: order.customerId, orderId: order.id,
        direction: CustomerAccountEntryDirection.CREDIT, entryType: CustomerAccountEntryType.PAYMENT,
        paymentMethod: CustomerAccountPaymentMethod.BANK_TRANSFER, amount: order.totalAmount,
        description: `${order.orderNumber} e-ticaret Havale / EFT banka hareketi eşleştirmesi`,
        referenceNo: reference, transactionDate: bankTx.transactionDate,
        createdByUserId: input.actor.userId, createdByUsername: input.actor.displayName,
      }});
      await tx.order.update({ where:{id:order.id}, data:{paymentStatus:"PAID",paymentProvider:"BANK_TRANSFER",paymentReference:reference} });
      await tx.bankTransaction.update({ where:{id:bankTx.id}, data:{
        matchStatus:BankTransactionMatchStatus.MATCHED,matchedOrderId:order.id,matchedAt:new Date(),
        matchedByUserId:input.actor.userId,matchedByName:input.actor.displayName,
      }});
      await tx.orderStatusHistory.create({ data:{
        orderId:order.id,status:order.status,note:"Havale / EFT ödemeniz banka hareketi ile eşleştirildi.",
        changedByUserId:input.actor.userId,changedByUsername:input.actor.displayName,visibleToCustomer:true,
      }});
      return { orderNumber:order.orderNumber,email:order.ecommerceEmail,paymentMethod:order.paymentMethod };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    try {
      await EcommerceNotificationService.send({ event:"PAYMENT_CONFIRMED",email:result.email,orderNumber:result.orderNumber,paymentMethod:result.paymentMethod });
    } catch (error) {
      console.error("Ödeme onay bildirimi gönderilemedi:", error);
    }
    return result;
  }

  static async ignoreTransaction(transactionId: string, actor: { userId: string; displayName: string }) {
    const result = await prisma.bankTransaction.updateMany({
      where: {
        id: transactionId,
        tenantId: B2B_CONSTANTS.TENANT_ID,
        companyId: B2B_CONSTANTS.COMPANY_ID,
        matchStatus: BankTransactionMatchStatus.UNMATCHED,
      },
      data: {
        matchStatus: BankTransactionMatchStatus.IGNORED,
        matchedAt: new Date(),
        matchedByUserId: actor.userId,
        matchedByName: actor.displayName,
      },
    });
    if (result.count !== 1) {
      throw new Error("Banka hareketi bulunamadı veya artık işlem yapılabilir durumda değil.");
    }
    return { ignored: true };
  }
}
