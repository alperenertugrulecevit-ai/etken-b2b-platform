"use server";

import { revalidatePath } from "next/cache";
import { EcommerceCheckoutError, EcommerceCheckoutService, type EcommerceCheckoutInput } from "@/modules/ecommerce/services/ecommerce-checkout.service";

export type SubmitEcommerceOrderResult =
  | { success: true; orderId: number; orderNumber: string }
  | { success: false; message: string };

export async function submitEcommerceOrderAction(input: EcommerceCheckoutInput): Promise<SubmitEcommerceOrderResult> {
  try {
    const order = await EcommerceCheckoutService.createOrder(input);
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
