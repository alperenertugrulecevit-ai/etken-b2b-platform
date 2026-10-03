"use server";

import {
  CustomerAccountEntryDirection,
  CustomerAccountEntryType,
  CustomerAccountPaymentMethod,
  OrderSource,
  OrderStatus,
  Prisma,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
import { EcommerceNotificationService } from "@/modules/ecommerce/services/ecommerce-notification.service";

export async function refundCancelledEcommerceOrder(orderId: number, formData: FormData) {
  const user = await AuthorizationService.requirePermission("ORDER_MANAGE");
  if (!Number.isInteger(orderId) || orderId <= 0) throw new Error("Geçerli sipariş gereklidir.");

  const referenceNo = String(formData.get("refundReference") ?? "").trim().slice(0, 120);
  if (!referenceNo) throw new Error("İade banka işlem / dekont referansı zorunludur.");

  const notification = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: {
        id: true, orderNumber: true, customerId: true, source: true, status: true,
        paymentStatus: true, totalAmount: true, ecommerceEmail: true,
      },
    });
    if (!order || order.source !== OrderSource.ECOMMERCE) throw new Error("E-ticaret siparişi bulunamadı.");
    if (order.status !== OrderStatus.CANCELLED) throw new Error("Ödeme iadesinden önce sipariş iptal edilmelidir.");
    if (order.paymentStatus?.toUpperCase() !== "PAID") throw new Error("Yalnızca ödemesi onaylanmış sipariş iade edilebilir.");

    const payment = await tx.customerAccountEntry.findFirst({
      where: { orderId, direction: CustomerAccountEntryDirection.CREDIT, entryType: CustomerAccountEntryType.PAYMENT },
      select: { id: true, amount: true },
    });
    if (!payment) throw new Error("Onaylı ödeme cari hareketi bulunamadı.");

    const existingRefund = await tx.customerAccountEntry.findFirst({
      where: { orderId, direction: CustomerAccountEntryDirection.DEBIT, entryType: CustomerAccountEntryType.REFUND },
      select: { id: true },
    });
    if (existingRefund) {
      throw new Error("Bu siparişin ödeme iadesi daha önce kaydedilmiş. Kısmi ürün iadesi bulunan sipariş için tam iptal iadesi otomatik tamamlanamaz.");
    }

    const actorName = user.employee
      ? `${user.employee.firstName} ${user.employee.lastName}`
      : user.username;

    await tx.customerAccountEntry.create({
      data: {
        customerId: order.customerId,
        orderId,
        direction: CustomerAccountEntryDirection.DEBIT,
        entryType: CustomerAccountEntryType.REFUND,
        paymentMethod: CustomerAccountPaymentMethod.BANK_TRANSFER,
        amount: payment.amount,
        description: `${order.orderNumber} B2C ödeme iadesi`,
        referenceNo,
        createdByUserId: user.id,
        createdByUsername: actorName,
      },
    });
    await tx.order.update({
      where: { id: orderId },
      data: { paymentStatus: "REFUNDED", paymentReference: referenceNo },
    });
    await tx.orderStatusHistory.create({
      data: {
        orderId,
        status: OrderStatus.CANCELLED,
        note: "Ödemeniz iade edildi.",
        changedByUserId: user.id,
        changedByUsername: actorName,
        visibleToCustomer: true,
      },
    });
    return { orderNumber:order.orderNumber, ecommerceEmail:order.ecommerceEmail };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  await EcommerceNotificationService.send({
    event:"REFUNDED",
    email:notification.ecommerceEmail,
    orderNumber:notification.orderNumber,
  });

  revalidatePath("/admin/e-ticaret/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/order-tracking");
  redirect("/admin/e-ticaret/orders?refunded=1");
}
