"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

function getOptionalText(
  formData: FormData,
  fieldName: string
) {
  const value = String(
    formData.get(fieldName) ?? ""
  ).trim();

  return value || null;
}

function validateCustomerId(
  customerId: number
) {
  if (
    !Number.isInteger(customerId) ||
    customerId <= 0
  ) {
    throw new Error(
      "Geçerli bir müşteri kimliği bulunamadı."
    );
  }
}

function validateAddressId(
  addressId: number
) {
  if (
    !Number.isInteger(addressId) ||
    addressId <= 0
  ) {
    throw new Error(
      "Geçerli bir adres kimliği bulunamadı."
    );
  }
}

export async function createCustomerAddress(
  customerId: number,
  formData: FormData
) {
  await AuthorizationService.requirePermission(
    "CUSTOMER_MANAGE"
  );

  validateCustomerId(customerId);

  const addressCode = String(
    formData.get("addressCode") ?? ""
  ).trim().toUpperCase();

  const title = String(
    formData.get("title") ?? ""
  ).trim();

  const addressType = String(
    formData.get("addressType") ?? ""
  ).trim();

  const address = String(
    formData.get("address") ?? ""
  ).trim();

  const city = String(
    formData.get("city") ?? ""
  ).trim();

  const district = String(
    formData.get("district") ?? ""
  ).trim();

  if (!/^[A-Z0-9][A-Z0-9._-]{1,29}$/.test(addressCode)) {
    throw new Error("Adres kodu 2-30 karakter olmalı; harf, rakam, nokta, alt çizgi veya tire içerebilir.");
  }

  if (!title) {
    throw new Error(
      "Adres başlığı zorunludur."
    );
  }

  if (!addressType) {
    throw new Error(
      "Adres tipi zorunludur."
    );
  }

  if (!address) {
    throw new Error(
      "Adres bilgisi zorunludur."
    );
  }

  if (!city || !district) {
    throw new Error(
      "İl ve ilçe bilgileri zorunludur."
    );
  }

  const rampCount = Number(
    formData.get("rampCount") ?? 0
  );

  if (
    !Number.isInteger(rampCount) ||
    rampCount < 0
  ) {
    throw new Error(
      "Rampa sayısı sıfır veya pozitif bir tam sayı olmalıdır."
    );
  }

  const isDefault =
    formData.get("isDefault") ===
    "on";

  await prisma.$transaction(
    async (tx) => {
      const customer =
        await tx.customer.findFirst({
          where: {
            id: customerId,
            isActive: true,
          },

          select: {
            id: true,
          },
        });

      if (!customer) {
        throw new Error(
          "Müşteri bulunamadı veya müşteri pasif durumda."
        );
      }

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
          addressCode,
          title,
          addressType,

          contactName:
            getOptionalText(
              formData,
              "contactName"
            ),

          phone:
            getOptionalText(
              formData,
              "phone"
            ),

          address,
          city,
          district,

          postalCode:
            getOptionalText(
              formData,
              "postalCode"
            ),

          deliveryStartTime:
            getOptionalText(
              formData,
              "deliveryStartTime"
            ),

          deliveryEndTime:
            getOptionalText(
              formData,
              "deliveryEndTime"
            ),

          hasForklift:
            formData.get(
              "hasForklift"
            ) === "on",

          rampCount,

          vehicleType:
            getOptionalText(
              formData,
              "vehicleType"
            ),

          description:
            getOptionalText(
              formData,
              "description"
            ),

          isDefault,
          isActive: true,
        },
      });
    },
    {
      maxWait: 10000,
      timeout: 20000,
    }
  );

  const path =
    `/admin/customers/${customerId}/addresses`;

  revalidatePath(
    "/admin/customers"
  );

  revalidatePath(
    `/admin/customers/${customerId}`
  );

  revalidatePath(path);

  revalidatePath(
    "/admin/orders/new"
  );

  redirect(path);
}

export async function toggleCustomerAddressStatus(
  customerId: number,
  addressId: number,
  currentStatus: boolean
) {
  await AuthorizationService.requirePermission(
    "CUSTOMER_MANAGE"
  );

  validateCustomerId(customerId);
  validateAddressId(addressId);

  const address =
    await prisma.customerAddress.findFirst({
      where: {
        id: addressId,
        customerId,
      },

      select: {
        id: true,
        isDefault: true,
      },
    });

  if (!address) {
    throw new Error(
      "Müşteri adresi bulunamadı."
    );
  }

  await prisma.customerAddress.update({
    where: {
      id: addressId,
    },

    data: {
      isActive: !currentStatus,

      /*
       * Varsayılan adres pasif
       * yapılıyorsa varsayılanlığı kaldır.
       */
      isDefault:
        currentStatus &&
        address.isDefault
          ? false
          : address.isDefault,
    },
  });

  const path =
    `/admin/customers/${customerId}/addresses`;

  revalidatePath(
    "/admin/customers"
  );

  revalidatePath(
    `/admin/customers/${customerId}`
  );

  revalidatePath(path);

  revalidatePath(
    "/admin/orders/new"
  );

  redirect(path);
}

export async function setDefaultCustomerAddress(
  customerId: number,
  addressId: number
) {
  await AuthorizationService.requirePermission(
    "CUSTOMER_MANAGE"
  );

  validateCustomerId(customerId);
  validateAddressId(addressId);

  await prisma.$transaction(
    async (tx) => {
      const selectedAddress =
        await tx.customerAddress.findFirst({
          where: {
            id: addressId,
            customerId,
          },

          select: {
            id: true,
          },
        });

      if (!selectedAddress) {
        throw new Error(
          "Müşteri adresi bulunamadı."
        );
      }

      /*
       * Önce bu müşterinin bütün
       * adreslerinden varsayılan işaretini kaldır.
       */
      await tx.customerAddress.updateMany({
        where: {
          customerId,
        },

        data: {
          isDefault: false,
        },
      });

      /*
       * Ardından seçilen adresi
       * varsayılan ve aktif yap.
       */
      await tx.customerAddress.update({
        where: {
          id: addressId,
        },

        data: {
          isDefault: true,
          isActive: true,
        },
      });
    },
    {
      maxWait: 10000,
      timeout: 20000,
    }
  );

  const path =
    `/admin/customers/${customerId}/addresses`;

  revalidatePath(
    "/admin/customers"
  );

  revalidatePath(
    `/admin/customers/${customerId}`
  );

  revalidatePath(path);

  revalidatePath(
    "/admin/orders/new"
  );

  redirect(path);
}