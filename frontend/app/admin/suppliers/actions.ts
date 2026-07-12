"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function createSupplier(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    return;
  }

  const taxNumber =
    String(formData.get("taxNumber") ?? "").trim() || null;

  const contactName =
    String(formData.get("contactName") ?? "").trim() || null;

  const phone =
    String(formData.get("phone") ?? "").trim() || null;

  const email =
    String(formData.get("email") ?? "").trim() || null;

  const paymentTermDays = Number(
    formData.get("paymentTermDays") ?? 0
  );

  const discountRate = Number(
    formData.get("discountRate") ?? 0
  );

  const deliveryDays = Number(
    formData.get("deliveryDays") ?? 1
  );

  await prisma.supplier.create({
    data: {
      name,
      taxNumber,
      contactName,
      phone,
      email,
      paymentTermDays,
      discountRate,
      deliveryDays,
    },
  });

  revalidatePath("/admin/suppliers");
}

export async function toggleSupplierStatus(
  supplierId: number,
  currentStatus: boolean
) {
  await prisma.supplier.update({
    where: {
      id: supplierId,
    },
    data: {
      isActive: !currentStatus,
    },
  });

  revalidatePath("/admin/suppliers");
}