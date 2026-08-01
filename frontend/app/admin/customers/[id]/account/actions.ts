"use server";

import {
  CustomerAccountEntryDirection,
  CustomerAccountEntryType,
  CustomerAccountPaymentMethod,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

const ENTRY_CONFIGURATION = {
  OPENING_DEBIT: {
    direction: CustomerAccountEntryDirection.DEBIT,
    entryType: CustomerAccountEntryType.OPENING_BALANCE,
  },
  OPENING_CREDIT: {
    direction: CustomerAccountEntryDirection.CREDIT,
    entryType: CustomerAccountEntryType.OPENING_BALANCE,
  },
  PAYMENT: {
    direction: CustomerAccountEntryDirection.CREDIT,
    entryType: CustomerAccountEntryType.PAYMENT,
  },
  ADJUSTMENT_DEBIT: {
    direction: CustomerAccountEntryDirection.DEBIT,
    entryType: CustomerAccountEntryType.ADJUSTMENT,
  },
  ADJUSTMENT_CREDIT: {
    direction: CustomerAccountEntryDirection.CREDIT,
    entryType: CustomerAccountEntryType.ADJUSTMENT,
  },
} as const;

function parseDate(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();

  if (!text) {
    return null;
  }

  const date = new Date(text + "T12:00:00+03:00");

  return Number.isNaN(date.getTime()) ? null : date;
}

function returnWithMessage(
  customerId: number,
  type: "success" | "error",
  message: string
): never {
  redirect(
    "/admin/customers/" +
      customerId +
      "/account?" +
      type +
      "=" +
      encodeURIComponent(message)
  );
}

export async function createCustomerAccountEntryAction(
  customerId: number,
  formData: FormData
) {
  const currentUser =
    await AuthorizationService.requirePermission(
      "CUSTOMER_MANAGE"
    );

  if (!Number.isInteger(customerId) || customerId <= 0) {
    redirect("/admin/customers");
  }

  const entryKind = String(
    formData.get("entryKind") ?? ""
  ).trim() as keyof typeof ENTRY_CONFIGURATION;

  const configuration = ENTRY_CONFIGURATION[entryKind];
  const amount = Number(formData.get("amount"));
  const description = String(
    formData.get("description") ?? ""
  ).trim();
  const referenceNo =
    String(formData.get("referenceNo") ?? "").trim() ||
    null;
  const transactionDate =
    parseDate(formData.get("transactionDate")) ??
    new Date();
  const dueDate = parseDate(formData.get("dueDate"));
  const paymentMethodValue = String(
    formData.get("paymentMethod") ?? ""
  ).trim();

  if (!configuration) {
    returnWithMessage(
      customerId,
      "error",
      "Geçerli bir hareket türü seçin."
    );
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    returnWithMessage(
      customerId,
      "error",
      "Tutar sıfırdan büyük olmalıdır."
    );
  }

  if (description.length < 3 || description.length > 250) {
    returnWithMessage(
      customerId,
      "error",
      "Açıklama 3-250 karakter olmalıdır."
    );
  }

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true },
  });

  if (!customer) {
    returnWithMessage(
      customerId,
      "error",
      "Müşteri bulunamadı."
    );
  }

  let paymentMethod: CustomerAccountPaymentMethod | null =
    null;

  if (configuration.entryType === CustomerAccountEntryType.PAYMENT) {
    const allowedMethods = Object.values(
      CustomerAccountPaymentMethod
    );

    if (
      !allowedMethods.includes(
        paymentMethodValue as CustomerAccountPaymentMethod
      )
    ) {
      returnWithMessage(
        customerId,
        "error",
        "Geçerli bir tahsilat yöntemi seçin."
      );
    }

    paymentMethod =
      paymentMethodValue as CustomerAccountPaymentMethod;
  }

  await prisma.customerAccountEntry.create({
    data: {
      customerId,
      direction: configuration.direction,
      entryType: configuration.entryType,
      paymentMethod,
      amount: Math.round((amount + Number.EPSILON) * 100) / 100,
      currency: "TRY",
      description,
      referenceNo,
      transactionDate,
      dueDate:
        configuration.direction ===
        CustomerAccountEntryDirection.DEBIT
          ? dueDate
          : null,
      createdByUserId: currentUser.id,
      createdByUsername: currentUser.username,
    },
  });

  const accountPath =
    "/admin/customers/" + customerId + "/account";

  revalidatePath(accountPath);
  revalidatePath("/admin/customers");
  revalidatePath("/account");

  returnWithMessage(
    customerId,
    "success",
    "Cari hesap hareketi kaydedildi."
  );
}
