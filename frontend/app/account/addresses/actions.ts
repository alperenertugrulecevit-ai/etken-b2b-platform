"use server";

import { UserType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { SessionService } from "@/modules/auth/services/session.service";

async function requireCustomer() {
  const user = await SessionService.getCurrentUser();
  if (!user || user.userType !== UserType.CUSTOMER || user.customerId === null || !user.customer?.isActive) {
    throw new Error("Yetkisiz işlem.");
  }
  return { user, customerId: user.customerId };
}

export async function createCustomerAddress(formData: FormData) {
  const { customerId } = await requireCustomer();
  const title = String(formData.get("title") ?? "").trim().slice(0, 80);
  const requestedType = String(formData.get("addressType") ?? "DELIVERY");
  const addressType = requestedType === "INVOICE" ? "INVOICE" : "DELIVERY";
  const address = String(formData.get("address") ?? "").trim().slice(0, 500);
  const city = String(formData.get("city") ?? "").trim().slice(0, 80);
  const district = String(formData.get("district") ?? "").trim().slice(0, 80);
  const postalCode = String(formData.get("postalCode") ?? "").trim().slice(0, 20) || null;

  if (!title || !address || !city || !district) throw new Error("Adres bilgilerini eksiksiz doldurun.");

  const [customer, deliveryCount] = await Promise.all([
    prisma.customer.findUnique({
      where: { id: customerId },
      select: { contactName: true, phone: true },
    }),
    prisma.customerAddress.count({
      where: { customerId, isActive: true, addressType: { in: ["DELIVERY", "BOTH"] } },
    }),
  ]);

  await prisma.customerAddress.create({
    data: {
      customerId,
      addressCode: "ADR-" + Date.now().toString(36).toUpperCase(),
      title,
      addressType,
      contactName: customer?.contactName ?? null,
      phone: customer?.phone ?? null,
      address,
      city,
      district,
      postalCode,
      isDefault: addressType === "DELIVERY" && deliveryCount === 0,
      isActive: true,
    },
  });

  revalidatePath("/account/addresses");
  revalidatePath("/checkout");
}

export async function setDefaultCustomerAddress(formData: FormData) {
  const { customerId } = await requireCustomer();
  const addressId = Number(formData.get("addressId"));
  if (!Number.isInteger(addressId) || addressId <= 0) throw new Error("Geçersiz adres.");

  const address = await prisma.customerAddress.findFirst({
    where: {
      id: addressId,
      customerId,
      isActive: true,
      addressType: { in: ["DELIVERY", "BOTH"] },
    },
    select: { id: true },
  });
  if (!address) throw new Error("Teslimat adresi bulunamadı.");

  await prisma.$transaction([
    prisma.customerAddress.updateMany({
      where: {
        customerId,
        isActive: true,
        addressType: { in: ["DELIVERY", "BOTH"] },
      },
      data: { isDefault: false },
    }),
    prisma.customerAddress.update({
      where: { id: addressId },
      data: { isDefault: true },
    }),
  ]);

  revalidatePath("/account/addresses");
  revalidatePath("/checkout");
}
