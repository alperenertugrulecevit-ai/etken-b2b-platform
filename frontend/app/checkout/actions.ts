"use server";

import { revalidatePath } from "next/cache";

import {
  B2BCheckoutError,
  B2BCheckoutService,
  type B2BCheckoutInput,
} from "@/modules/b2b/services/b2b-checkout.service";
import { SessionService } from "@/modules/auth/services/session.service";

export type SubmitB2BOrderResult =
  | {
      success: true;
      orderId: number;
      orderNumber: string;
    }
  | {
      success: false;
      message: string;
    };

export async function submitB2BOrderAction(
  input: B2BCheckoutInput
): Promise<SubmitB2BOrderResult> {
  const user =
    await SessionService.getCurrentUser();

  if (!user) {
    return {
      success: false,
      message:
        "Oturumunuz sona ermiş. Yeniden giriş yapın.",
    };
  }

  try {
    const order =
      await B2BCheckoutService.createOrder(
        user,
        input
      );

    revalidatePath(
      "/account"
    );
    revalidatePath(
      "/account/orders"
    );
    revalidatePath(
      "/admin/orders"
    );

    return {
      success: true,
      orderId:
        order.orderId,
      orderNumber:
        order.orderNumber,
    };
  } catch (error) {
    console.error(
      "B2B sipariş oluşturma hatası:",
      error
    );

    return {
      success: false,
      message:
        error instanceof
        B2BCheckoutError
          ? error.message
          : "Sipariş oluşturulurken beklenmeyen bir hata oluştu.",
    };
  }
}
