"use server";

import {
  OrderSource,
  OrderStatus,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
import { EcommerceNotificationService } from "@/modules/ecommerce/services/ecommerce-notification.service";
import { OrderCancellationService } from "@/modules/orders/services/order-cancellation.service";
import { EcommerceAccountLedgerRepairService } from "@/modules/ecommerce/services/ecommerce-account-ledger-repair.service";

export async function refundCancelledEcommerceOrder(orderId: number, formData: FormData) {
  const user = await AuthorizationService.requirePermission("ORDER_MANAGE");
  if (!Number.isInteger(orderId) || orderId <= 0) throw new Error("Geçerli sipariş gereklidir.");
  const referenceNo = String(formData.get("refundReference") ?? "").trim().slice(0, 120);
  if (!referenceNo) throw new Error("İade banka işlem / dekont referansı zorunludur.");

  const order = await prisma.order.findUnique({
    where:{id:orderId},
    select:{orderNumber:true,ecommerceEmail:true,source:true,status:true,paymentStatus:true,cancellationStatus:true,cancellationRefundStatus:true},
  });
  if(!order || order.source!==OrderSource.ECOMMERCE) throw new Error("E-ticaret siparişi bulunamadı.");
  if(order.status!==OrderStatus.CANCELLED) throw new Error("Ödeme iadesinden önce sipariş iptal edilmelidir.");
  if(!["PAID","REFUND_PENDING"].includes(order.paymentStatus?.toUpperCase()??"")) throw new Error("Yalnızca ödemesi onaylanmış sipariş iade edilebilir.");

  const actorName=user.employee?`${user.employee.firstName} ${user.employee.lastName}`:user.username;
  await OrderCancellationService.completeRefund({
    orderId,
    reference:referenceNo,
    actor:{userId:user.id,displayName:actorName},
  });

  await EcommerceNotificationService.send({
    event:"REFUNDED",
    email:order.ecommerceEmail,
    orderNumber:order.orderNumber,
  });

  revalidatePath("/admin/e-ticaret/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/order-tracking");
  redirect("/admin/e-ticaret/orders?refunded=1");
}


export async function repairEcommerceAccountLedger() {
  const user = await AuthorizationService.requirePermission("ORDER_MANAGE");
  const actorName = user.employee
    ? `${user.employee.firstName} ${user.employee.lastName}`
    : user.username;
  const result = await EcommerceAccountLedgerRepairService.repair({
    userId: user.id,
    displayName: actorName,
  });
  revalidatePath("/admin/e-ticaret/orders");
  revalidatePath("/admin/current-accounts");
  revalidatePath("/admin/accounting/reconciliation");
  redirect(
    "/admin/e-ticaret/orders?ledgerRepaired=1&scanned=" +
      result.scannedOrders +
      "&orders=" +
      result.repairedOrders +
      "&entries=" +
      result.createdEntries
  );
}
