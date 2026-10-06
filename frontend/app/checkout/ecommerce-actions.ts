"use server";

import { revalidatePath } from "next/cache";
import { EcommerceCheckoutError, EcommerceCheckoutService, type EcommerceCheckoutInput } from "@/modules/ecommerce/services/ecommerce-checkout.service";
import { SessionService } from "@/modules/auth/services/session.service";
import { CustomerType, UserType } from "@prisma/client";

export type SubmitEcommerceOrderResult =
  | { success: true; orderId: number; orderNumber: string }
  | { success: false; message: string };

export async function submitEcommerceOrderAction(input: EcommerceCheckoutInput): Promise<SubmitEcommerceOrderResult> {
  try {
    const user = await SessionService.getCurrentUser();
    const isIndividual = user?.userType === UserType.CUSTOMER &&
      user.customerId &&
      user.customer?.isActive &&
      user.customer.customerType === CustomerType.INDIVIDUAL;
    const order = await EcommerceCheckoutService.createOrder({
      ...input,
      accountCustomerId: isIndividual ? user.customerId : null,
      placedByUserId: isIndividual ? user.id : null,
      placedByUsername: isIndividual ? (user.fullName ?? user.username) : null,
      shippingAddressId: isIndividual ? input.shippingAddressId ?? null : null,
    });
    revalidatePath("/admin/orders");
    return { success: true, orderId: order.id, orderNumber: order.orderNumber };
  } catch (error) {
    console.error("B2C sipariş oluşturma hatası:", error);
    return {
      success: false,
      message: error instanceof EcommerceCheckoutError
        ? error.message
        : "Sipariş oluşturulurken beklenmeyen bir hata oluştu.",
    };
  }
}
