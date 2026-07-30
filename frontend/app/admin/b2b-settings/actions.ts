"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
import { B2B_CONSTANTS } from "@/modules/b2b/constants/b2b.constants";

export type B2BBankAccountActionState = {
  success: boolean;
  message: string;
};

function text(formData: FormData, name: string, maxLength: number) {
  return String(formData.get(name) ?? "").trim().slice(0, maxLength);
}

function normalizeIban(value: string) {
  return value.replace(/\s+/g, "").toUpperCase();
}

export async function saveB2BBankAccountAction(
  _previousState: B2BBankAccountActionState,
  formData: FormData
): Promise<B2BBankAccountActionState> {
  await AuthorizationService.requirePermission("ORDER_MANAGE");

  const idValue = Number(formData.get("id") ?? 0);
  const id = Number.isInteger(idValue) && idValue > 0 ? idValue : null;
  const bankName = text(formData, "bankName", 100);
  const branchName = text(formData, "branchName", 100) || null;
  const accountHolder = text(formData, "accountHolder", 160);
  const iban = normalizeIban(text(formData, "iban", 64));
  const currency = text(formData, "currency", 3).toUpperCase() || "TRY";
  const sortOrderValue = Number(formData.get("sortOrder") ?? 0);
  const sortOrder = Number.isInteger(sortOrderValue) ? sortOrderValue : 0;

  if (!bankName || !accountHolder) {
    return { success: false, message: "Banka adı ve hesap sahibi zorunludur." };
  }
  if (!/^TR\d{24}$/.test(iban)) {
    return { success: false, message: "IBAN TR ile başlayan 26 karakter olmalıdır." };
  }
  if (!/^[A-Z]{3}$/.test(currency)) {
    return { success: false, message: "Para birimi üç harfli olmalıdır. Örnek: TRY." };
  }

  try {
    if (id) {
      const existing = await prisma.b2BBankAccount.findFirst({
        where: {
          id,
          tenantId: B2B_CONSTANTS.TENANT_ID,
          companyId: B2B_CONSTANTS.COMPANY_ID,
        },
        select: { id: true },
      });
      if (!existing) {
        return { success: false, message: "Banka hesabı bulunamadı." };
      }
      await prisma.b2BBankAccount.update({
        where: { id },
        data: { bankName, branchName, accountHolder, iban, currency, sortOrder },
      });
    } else {
      await prisma.b2BBankAccount.create({
        data: {
          tenantId: B2B_CONSTANTS.TENANT_ID,
          companyId: B2B_CONSTANTS.COMPANY_ID,
          bankName,
          branchName,
          accountHolder,
          iban,
          currency,
          sortOrder,
        },
      });
    }
  } catch (error) {
    console.error("B2B banka hesabı kayıt hatası:", error);
    return {
      success: false,
      message: "Banka hesabı kaydedilemedi. Aynı IBAN daha önce tanımlanmış olabilir.",
    };
  }

  revalidatePath("/admin/b2b-settings");
  revalidatePath("/account/orders");
  return {
    success: true,
    message: id ? "Banka hesabı güncellendi." : "Banka hesabı oluşturuldu.",
  };
}

export async function toggleB2BBankAccountAction(formData: FormData) {
  await AuthorizationService.requirePermission("ORDER_MANAGE");
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Geçerli banka hesabı seçilmelidir.");
  }

  const account = await prisma.b2BBankAccount.findFirst({
    where: {
      id,
      tenantId: B2B_CONSTANTS.TENANT_ID,
      companyId: B2B_CONSTANTS.COMPANY_ID,
    },
  });
  if (!account) {
    throw new Error("Banka hesabı bulunamadı.");
  }

  await prisma.b2BBankAccount.update({
    where: { id },
    data: { isActive: !account.isActive },
  });
  revalidatePath("/admin/b2b-settings");
  revalidatePath("/account/orders");
}
