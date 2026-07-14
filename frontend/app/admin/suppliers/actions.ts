"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

function optionalText(
  formData: FormData,
  fieldName: string
) {
  const value = String(
    formData.get(fieldName) ?? ""
  ).trim();

  return value || null;
}

export async function createSupplier(
  formData: FormData
) {
  const name = String(
    formData.get("name") ?? ""
  ).trim();

  if (!name) {
    throw new Error(
      "Tedarikçi firma adı zorunludur."
    );
  }

  const paymentTermDays = Number(
    formData.get("paymentTermDays") ?? 0
  );

  const discountRate = Number(
    formData.get("discountRate") ?? 0
  );

  const deliveryDays = Number(
    formData.get("deliveryDays") ?? 1
  );

  if (
    !Number.isInteger(paymentTermDays) ||
    paymentTermDays < 0
  ) {
    throw new Error(
      "Vade günü sıfır veya pozitif tam sayı olmalıdır."
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
    !Number.isInteger(deliveryDays) ||
    deliveryDays < 0
  ) {
    throw new Error(
      "Teslim süresi sıfır veya pozitif tam sayı olmalıdır."
    );
  }

  try {
    await prisma.supplier.create({
      data: {
        name,

        taxOffice: optionalText(
          formData,
          "taxOffice"
        ),

        taxNumber: optionalText(
          formData,
          "taxNumber"
        ),

        contactName: optionalText(
          formData,
          "contactName"
        ),

        phone: optionalText(
          formData,
          "phone"
        ),

        email: optionalText(
          formData,
          "email"
        ),

        address: optionalText(
          formData,
          "address"
        ),

        city: optionalText(
          formData,
          "city"
        ),

        district: optionalText(
          formData,
          "district"
        ),

        postalCode: optionalText(
          formData,
          "postalCode"
        ),

        paymentTermDays,
        discountRate,
        deliveryDays,
      },
    });
  } catch (error) {
    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new Error(
        "Aynı firma adı veya vergi numarasıyla kayıtlı başka bir tedarikçi bulunuyor."
      );
    }

    throw error;
  }

  revalidatePath("/admin");
  revalidatePath("/admin/suppliers");
  revalidatePath(
    "/admin/purchase-orders/new"
  );

  redirect("/admin/suppliers");
}

export async function toggleSupplierStatus(
  supplierId: number,
  currentStatus: boolean
) {
  if (
    !Number.isInteger(supplierId) ||
    supplierId <= 0
  ) {
    throw new Error(
      "Geçerli bir tedarikçi kimliği bulunamadı."
    );
  }

  await prisma.supplier.update({
    where: {
      id: supplierId,
    },

    data: {
      isActive: !currentStatus,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/suppliers");
  revalidatePath(
    "/admin/purchase-orders/new"
  );
}