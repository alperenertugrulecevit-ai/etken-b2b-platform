"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
import { B2B_CONSTANTS } from "@/modules/b2b/constants/b2b.constants";

const value = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();

function normalizeIban(value: string) {
  return value.replace(/\s+/g, "").toUpperCase();
}

export async function createBankAccount(formData: FormData) {
  await AuthorizationService.requirePermission("ORDER_MANAGE");
  const iban = normalizeIban(value(formData, "iban"));
  const bankName = value(formData, "bankName").slice(0, 120);
  const accountHolder = value(formData, "accountHolder").slice(0, 160);
  if (!bankName || !accountHolder || !/^TR\d{24}$/.test(iban)) {
    throw new Error("Banka adı, hesap sahibi ve geçerli TR IBAN zorunludur.");
  }
  await prisma.b2BBankAccount.create({
    data: {
      tenantId: B2B_CONSTANTS.TENANT_ID,
      companyId: B2B_CONSTANTS.COMPANY_ID,
      bankName,
      branchName: value(formData, "branchName").slice(0, 120) || null,
      accountHolder,
      iban,
      currency: value(formData, "currency").slice(0, 8).toUpperCase() || "TRY",
      accountNumber: value(formData, "accountNumber").slice(0, 80) || null,
      swiftCode: value(formData, "swiftCode").slice(0, 32).toUpperCase() || null,
      paymentNoteTemplate: value(formData, "paymentNoteTemplate").slice(0, 240) || "Ödeme açıklamasına sipariş numaranızı yazınız: {ORDER_NUMBER}",
      integrationProvider: value(formData, "integrationProvider").slice(0, 80) || null,
      integrationEnabled: false,
      sortOrder: Number(value(formData, "sortOrder")) || 0,
    },
  });
  revalidatePath("/admin/e-ticaret/banking");
}

export async function setBankAccountActive(formData: FormData) {
  await AuthorizationService.requirePermission("ORDER_MANAGE");
  const id = Number(value(formData, "id"));
  if (!Number.isInteger(id) || id <= 0) throw new Error("Geçerli banka hesabı seçin.");
  await prisma.b2BBankAccount.update({ where: { id }, data: { isActive: value(formData, "active") === "true" } });
  revalidatePath("/admin/e-ticaret/banking");
}
