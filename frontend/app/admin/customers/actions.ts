"use server";

import { revalidatePath } from "next/cache";

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

export async function createCustomer(
  formData: FormData
) {
  await AuthorizationService.requirePermission(
    "CUSTOMER_MANAGE"
  );

  const customerCode = String(
    formData.get("customerCode") ?? ""
  )
    .trim()
    .toUpperCase();

  const companyName = String(
    formData.get("companyName") ?? ""
  ).trim();

  if (!customerCode) {
    throw new Error(
      "Müşteri kodu zorunludur."
    );
  }

  if (!companyName) {
    throw new Error(
      "Firma adı zorunludur."
    );
  }

  const paymentTermDays = Number(
    formData.get("paymentTermDays") ?? 0
  );

  const discountRate = Number(
    formData.get("discountRate") ?? 0
  );

  const creditLimit = Number(
    formData.get("creditLimit") ?? 0
  );

  if (
    !Number.isInteger(paymentTermDays) ||
    paymentTermDays < 0
  ) {
    throw new Error(
      "Vade günü sıfır veya pozitif bir tam sayı olmalıdır."
    );
  }

  if (
    !Number.isFinite(discountRate) ||
    discountRate < 0 ||
    discountRate > 100
  ) {
    throw new Error(
      "İskonto oranı 0 ile 100 arasında olmalıdır."
    );
  }

  if (
    !Number.isFinite(creditLimit) ||
    creditLimit < 0
  ) {
    throw new Error(
      "Kredi limiti sıfır veya pozitif olmalıdır."
    );
  }

  await prisma.customer.create({
    data: {
      customerCode,
      companyName,

      taxOffice:
        getOptionalText(
          formData,
          "taxOffice"
        ),

      taxNumber:
        getOptionalText(
          formData,
          "taxNumber"
        ),

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

      email:
        getOptionalText(
          formData,
          "email"
        ),

      address:
        getOptionalText(
          formData,
          "address"
        ),

      city:
        getOptionalText(
          formData,
          "city"
        ),

      district:
        getOptionalText(
          formData,
          "district"
        ),

      paymentTermDays,
      discountRate,
      creditLimit,
    },
  });

  revalidatePath("/admin");

  revalidatePath(
    "/admin/customers"
  );

  revalidatePath(
    "/admin/orders/new"
  );
}

export async function toggleCustomerStatus(
  customerId: number,
  currentStatus: boolean
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

  await prisma.customer.update({
    where: {
      id: customerId,
    },

    data: {
      isActive: !currentStatus,
    },
  });

  revalidatePath("/admin");

  revalidatePath(
    "/admin/customers"
  );

  revalidatePath(
    `/admin/customers/${customerId}`
  );

  revalidatePath(
    "/admin/orders/new"
  );
}