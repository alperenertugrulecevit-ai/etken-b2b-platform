"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export async function createCustomerAddress(
  customerId: number,
  formData: FormData
) {
  const title = String(formData.get("title") ?? "").trim();
  const addressType = String(
    formData.get("addressType") ?? ""
  ).trim();
  const address = String(formData.get("address") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const district = String(formData.get("district") ?? "").trim();

  if (!title || !addressType || !address || !city || !district) {
    return;
  }

  const isDefault = formData.get("isDefault") === "on";

  await prisma.$transaction(async (tx) => {
    if (isDefault) {
      await tx.customerAddress.updateMany({
        where: {
          customerId,
        },
        data: {
          isDefault: false,
        },
      });
    }

    await tx.customerAddress.create({
      data: {
        customerId,
        title,
        addressType,

        contactName:
          String(formData.get("contactName") ?? "").trim() ||
          null,

        phone:
          String(formData.get("phone") ?? "").trim() || null,

        address,
        city,
        district,

        postalCode:
          String(formData.get("postalCode") ?? "").trim() ||
          null,

        deliveryStartTime:
          String(
            formData.get("deliveryStartTime") ?? ""
          ).trim() || null,

        deliveryEndTime:
          String(
            formData.get("deliveryEndTime") ?? ""
          ).trim() || null,

        hasForklift: formData.get("hasForklift") === "on",

        rampCount: Number(formData.get("rampCount") ?? 0),

        vehicleType:
          String(formData.get("vehicleType") ?? "").trim() ||
          null,

        description:
          String(formData.get("description") ?? "").trim() ||
          null,

        isDefault,
        isActive: true,
      },
    });
  });

  const path = `/admin/customers/${customerId}/addresses`;

  revalidatePath(path);
  redirect(path);
}

export async function toggleCustomerAddressStatus(
  customerId: number,
  addressId: number,
  currentStatus: boolean
) {
  const address = await prisma.customerAddress.findFirst({
    where: {
      id: addressId,
      customerId,
    },
  });

  if (!address) {
    return;
  }

  await prisma.customerAddress.update({
    where: {
      id: addressId,
    },
    data: {
      isActive: !currentStatus,

      // Varsayılan adres pasif yapılıyorsa varsayılanlığı kaldır.
      isDefault:
        currentStatus && address.isDefault
          ? false
          : address.isDefault,
    },
  });

  const path = `/admin/customers/${customerId}/addresses`;

  revalidatePath(path);
  redirect(path);
}

export async function setDefaultCustomerAddress(
  customerId: number,
  addressId: number
) {
  const selectedAddress =
    await prisma.customerAddress.findFirst({
      where: {
        id: addressId,
        customerId,
      },
    });

  if (!selectedAddress) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    // Önce bu müşterinin bütün adreslerinden
    // varsayılan işaretini kaldır.
    await tx.customerAddress.updateMany({
      where: {
        customerId,
      },
      data: {
        isDefault: false,
      },
    });

    // Ardından seçilen adresi varsayılan ve aktif yap.
    await tx.customerAddress.update({
      where: {
        id: addressId,
      },
      data: {
        isDefault: true,
        isActive: true,
      },
    });
  });

  const path = `/admin/customers/${customerId}/addresses`;

  revalidatePath(path);
  redirect(path);
}