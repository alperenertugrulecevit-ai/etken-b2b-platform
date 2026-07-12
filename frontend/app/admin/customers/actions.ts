"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function createCustomer(formData: FormData) {
  const customerCode = String(
    formData.get("customerCode") ?? ""
  )
    .trim()
    .toUpperCase();

  const companyName = String(
    formData.get("companyName") ?? ""
  ).trim();

  if (!customerCode || !companyName) {
    return;
  }

  const taxOffice =
    String(formData.get("taxOffice") ?? "").trim() || null;

  const taxNumber =
    String(formData.get("taxNumber") ?? "").trim() || null;

  const contactName =
    String(formData.get("contactName") ?? "").trim() || null;

  const phone =
    String(formData.get("phone") ?? "").trim() || null;

  const email =
    String(formData.get("email") ?? "").trim() || null;

  const address =
    String(formData.get("address") ?? "").trim() || null;

  const city =
    String(formData.get("city") ?? "").trim() || null;

  const district =
    String(formData.get("district") ?? "").trim() || null;

  const paymentTermDays = Number(
    formData.get("paymentTermDays") ?? 0
  );

  const discountRate = Number(
    formData.get("discountRate") ?? 0
  );

  const creditLimit = Number(
    formData.get("creditLimit") ?? 0
  );

  await prisma.customer.create({
    data: {
      customerCode,
      companyName,
      taxOffice,
      taxNumber,
      contactName,
      phone,
      email,
      address,
      city,
      district,
      paymentTermDays,
      discountRate,
      creditLimit,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/customers");
}

export async function toggleCustomerStatus(
  customerId: number,
  currentStatus: boolean
) {
  await prisma.customer.update({
    where: {
      id: customerId,
    },
    data: {
      isActive: !currentStatus,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/customers");
}