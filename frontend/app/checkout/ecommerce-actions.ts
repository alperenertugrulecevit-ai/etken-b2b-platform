"use server";

import { revalidatePath } from "next/cache";
import { EcommerceCheckoutError, EcommerceCheckoutService, type EcommerceCheckoutInput } from "@/modules/ecommerce/services/ecommerce-checkout.service";
import { SessionService } from "@/modules/auth/services/session.service";
import { CustomerType, UserType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

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
    let safeInput = input;

    if (isIndividual && user.customerId) {
      const customer = await prisma.customer.findUnique({
        where: { id: user.customerId },
        select: { contactName: true, email: true, phone: true },
      });
      const shippingAddressId = Number(input.shippingAddressId);
      const shippingAddress = Number.isInteger(shippingAddressId)
        ? await prisma.customerAddress.findFirst({
            where: {
              id: shippingAddressId,
              customerId: user.customerId,
              isActive: true,
              addressType: { in: ["DELIVERY", "BOTH"] },
            },
            select: { address: true, city: true, district: true, postalCode: true },
          })
        : null;

      if (!customer || !shippingAddress) {
        return { success: false, message: "Kayıtlı teslimat adresinizi seçin." };
      }

      const fullName = (customer.contactName ?? user.fullName ?? "").trim();
      const parts = fullName.split(/\s+/).filter(Boolean);
      safeInput = {
        ...input,
        firstName: parts[0] ?? "Müşteri",
        lastName: parts.slice(1).join(" ") || "-",
        email: customer.email ?? user.email ?? user.username,
        phone: customer.phone ?? "",
        address: shippingAddress.address,
        city: shippingAddress.city,
        district: shippingAddress.district,
        postalCode: shippingAddress.postalCode,
      };
    }

    const order = await EcommerceCheckoutService.createOrder({
      ...safeInput,
      accountCustomerId: isIndividual ? user.customerId : null,
      placedByUserId: isIndividual ? user.id : null,
      placedByUsername: isIndividual ? (user.fullName ?? user.username) : null,
      shippingAddressId: isIndividual ? input.shippingAddressId ?? null : null,
    });
    revalidatePath("/admin/orders");
    revalidatePath("/account/orders");
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
