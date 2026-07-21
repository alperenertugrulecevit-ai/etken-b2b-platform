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

export async function updateCustomerAddress(
  customerId: number,
  customerAddressId: number,
  formData: FormData
) {
  await AuthorizationService.requirePermission(
    "CUSTOMER_MANAGE"
  );

  if (
    !Number.isInteger(customerId) ||
    customerId <= 0
  ) {
    throw new Error(
      "Geçerli bir müşteri kimliği bulunamadı."
    );
  }

  if (
    !Number.isInteger(
      customerAddressId
    ) ||
    customerAddressId <= 0
  ) {
    throw new Error(
      "Geçerli bir adres kimliği bulunamadı."
    );
  }

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
      "Açık adres bilgisi zorunludur."
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
        await tx.customer.findUnique({
          where: {
            id: customerId,
          },

          select: {
            id: true,
          },
        });

      if (!customer) {
        throw new Error(
          "Müşteri bulunamadı."
        );
      }

      const currentAddress =
        await tx.customerAddress.findFirst({
          where: {
            id: customerAddressId,
            customerId,
          },

          select: {
            id: true,
            isActive: true,
          },
        });

      if (!currentAddress) {
        throw new Error(
          "Güncellenecek müşteri adresi bulunamadı."
        );
      }

      if (isDefault) {
        await tx.customerAddress.updateMany({
          where: {
            customerId,

            id: {
              not:
                customerAddressId,
            },
          },

          data: {
            isDefault: false,
          },
        });
      }

      await tx.customerAddress.update({
        where: {
          id: customerAddressId,
        },

        data: {
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

          /*
           * Varsayılan yapılan adres
           * pasif durumda kalamaz.
           */
          isActive: isDefault
            ? true
            : currentAddress.isActive,
        },
      });
    },
    {
      maxWait: 10000,
      timeout: 20000,
    }
  );

  const addressListPath =
    `/admin/customers/${customerId}/addresses`;

  revalidatePath(
    "/admin/customers"
  );

  revalidatePath(
    `/admin/customers/${customerId}`
  );

  revalidatePath(
    addressListPath
  );

  revalidatePath(
    `/admin/customers/${customerId}/addresses/${customerAddressId}/edit`
  );

  revalidatePath(
    "/admin/orders/new"
  );

  redirect(addressListPath);
}