"use server";

import { OrderStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { OrderCancellationService } from "@/modules/orders/services/order-cancellation.service";
import { EcommerceNotificationService } from "@/modules/ecommerce/services/ecommerce-notification.service";

export type GuestCancellationState = { success: boolean; message: string };

export async function cancelGuestOrderAction(
  orderNumber: string,
  email: string,
  _previousState: GuestCancellationState,
  formData: FormData,
): Promise<GuestCancellationState> {
  const normalizedOrder = orderNumber.trim().slice(0, 100);
  const normalizedEmail = email.trim().toLowerCase().slice(0, 160);
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 500);

  const order = await prisma.order.findFirst({
    where: {
      orderNumber: { equals: normalizedOrder, mode: "insensitive" },
      ecommerceEmail: { equals: normalizedEmail, mode: "insensitive" },
      source: "ECOMMERCE",
    },
    select: { id: true, status: true, orderNumber: true, ecommerceEmail: true },
  });

  if (!order) return { success: false, message: "Sipariş doğrulanamadı." };
  if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.APPROVED) {
    return {
      success: false,
      message: "Bu sipariş artık müşteri tarafından doğrudan iptal edilemez. Destek ekibimizle iletişime geçin.",
    };
  }

  try {
    const cancellation = await OrderCancellationService.request({
      orderId: order.id,
      reason: reason || "Müşteri tarafından e-ticaret sipariş takip ekranından iptal edildi.",
      actor: { userId: "b2c-customer", displayName: "B2C Müşteri" },
    });
    await EcommerceNotificationService.send({
      event:cancellation.stockReturnRequired?"CANCELLATION_REQUESTED":"CANCELLED",
      email:order.ecommerceEmail,
      orderNumber:order.orderNumber,
    });
    revalidatePath("/order-tracking");
    return {
      success: true,
      message: cancellation.stockReturnRequired
        ? "İptal talebiniz alındı. Toplanmış ürünler stoğa geri alındıktan sonra sipariş iptali tamamlanacaktır."
        : "Siparişiniz iptal edildi. Ödeme yaptıysanız para iadesi süreci başlatıldı.",
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Sipariş iptal edilemedi.",
    };
  }
}
