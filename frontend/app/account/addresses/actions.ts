"use server";

import { UserType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { SessionService } from "@/modules/auth/services/session.service";

async function requireCustomer() {
  const user = await SessionService.getCurrentUser();

  if (
    !user ||
    user.userType !== UserType.CUSTOMER ||
    user.customerId === null ||
    !user.customer?.isActive
  ) {
    throw new Error("Yetkisiz işlem.");
  }

  return {
    user,
    customerId: user.customerId,
  };
}

export async function createCustomerAddress(formData: FormData) {
  const { user, customerId } = await requireCustomer();

  const title = String(formData.get("title") ?? "").trim().slice(0, 80);
  const address = String(formData.get("address") ?? "").trim().slice(0, 500);
  const city = String(formData.get("city") ?? "").trim().slice(0, 80);
  const district = String(formData.get("district") ?? "").trim().slice(0, 80);
  const postalCode =
    String(formData.get("postalCode") ?? "").trim().slice(0, 20) || null;

  if (!title || !address || !city || !district) {
    throw new Error("Adres bilgilerini eksiksiz doldurun.");
  }

  const activeCount = await prisma.customerAddress.count({
    where: { customerId, isActive: true },
  });

  await prisma.customerAddress.create({
    data: {
      customerId,
      addressCode: "ADR-" + Date.now().toString(36).toUpperCase(),
      title,
      addressType: "DELIVERY",
      contactName: user.fullName,
      address,
      city,
      district,
      postalCode,
      isDefault: activeCount === 0,
      isActive: true,
    },
  });

  revalidatePath("/account/addresses");
}

export async function setDefaultCustomerAddress(formData: FormData) {
  const { customerId } = await requireCustomer();
  const addressId = Number(formData.get("addressId"));

  if (!Number.isInteger(addressId) || addressId <= 0) {
    throw new Error("Geçersiz adres.");
  }

  const address = await prisma.customerAddress.findFirst({
    where: {
      id: addressId,
      customerId,
      isActive: true,
    },
    select: { id: true },
  });

  if (!address) {
    throw new Error("Adres bulunamadı.");
  }

  await prisma.$transaction([
    prisma.customerAddress.updateMany({
      where: { customerId, isActive: true },
      data: { isDefault: false },
    }),
    prisma.customerAddress.update({
      where: { id: addressId },
      data: { isDefault: true },
    }),
  ]);

  revalidatePath("/account/addresses");
}
