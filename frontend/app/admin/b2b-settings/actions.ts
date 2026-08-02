"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
import { B2B_CONSTANTS } from "@/modules/b2b/constants/b2b.constants";

export type B2BBankAccountActionState = {
  success: boolean;
  message: string;
};

export type B2BCompanyProfileActionState = {
  success: boolean;
  message: string;
};

function text(formData: FormData, name: string, maxLength: number) {
  return String(formData.get(name) ?? "").trim().slice(0, maxLength);
}

function nullableText(formData: FormData, name: string, maxLength: number) {
  return text(formData, name, maxLength) || null;
}

function normalizeIban(value: string) {
  return value.replace(/\s+/g, "").toUpperCase();
}

function isEmail(value: string | null) {
  return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function saveB2BCompanyProfileAction(
  _previousState: B2BCompanyProfileActionState,
  formData: FormData,
): Promise<B2BCompanyProfileActionState> {
  await AuthorizationService.requirePermission("ORDER_MANAGE");

  const brandName = text(formData, "brandName", 100);
  const legalName = text(formData, "legalName", 200);
  const taxOffice = nullableText(formData, "taxOffice", 100);
  const taxNumber = nullableText(formData, "taxNumber", 10)?.replace(/\s+/g, "") ?? null;
  const mersisNumber = nullableText(formData, "mersisNumber", 16)?.replace(/\s+/g, "") ?? null;
  const tradeRegistryNumber = nullableText(formData, "tradeRegistryNumber", 50);
  const authorizedPerson = nullableText(formData, "authorizedPerson", 120);
  const phone = nullableText(formData, "phone", 30);
  const supportEmail = nullableText(formData, "supportEmail", 160)?.toLowerCase() ?? null;
  const email = nullableText(formData, "email", 160)?.toLowerCase() ?? null;
  const kepAddress = nullableText(formData, "kepAddress", 160)?.toLowerCase() ?? null;
  const website = nullableText(formData, "website", 200);
  const addressLine = nullableText(formData, "addressLine", 500);
  const city = nullableText(formData, "city", 80);
  const district = nullableText(formData, "district", 80);
  const postalCode = nullableText(formData, "postalCode", 20);
  const country = text(formData, "country", 80) || "Türkiye";
  const workingHours = nullableText(formData, "workingHours", 160);
  const logoUrl = nullableText(formData, "logoUrl", 250);

  if (!brandName || !legalName) {
    return { success: false, message: "Kısa şirket adı ve ticari unvan zorunludur." };
  }
  if (taxNumber && !/^\d{10}$/.test(taxNumber)) {
    return { success: false, message: "Vergi numarası 10 rakam olmalıdır." };
  }
  if (mersisNumber && !/^\d{16}$/.test(mersisNumber)) {
    return { success: false, message: "MERSİS numarası 16 rakam olmalıdır." };
  }
  if (![email, supportEmail, kepAddress].every(isEmail)) {
    return { success: false, message: "E-posta veya KEP adreslerinden biri geçerli değil." };
  }
  if (website && !/^(https?:\/\/|www\.)/i.test(website)) {
    return { success: false, message: "Web sitesi https:// veya www. ile başlamalıdır." };
  }
  if (logoUrl && !logoUrl.startsWith("/") && !/^https?:\/\//i.test(logoUrl)) {
    return { success: false, message: "Logo adresi / veya http:// ya da https:// ile başlamalıdır." };
  }

  const data = {
    brandName,
    legalName,
    taxOffice,
    taxNumber,
    mersisNumber,
    tradeRegistryNumber,
    authorizedPerson,
    phone,
    supportEmail,
    email,
    kepAddress,
    website,
    addressLine,
    city,
    district,
    postalCode,
    country,
    workingHours,
    logoUrl,
  };

  try {
    const existing = await prisma.b2BCompanyProfile.findFirst({
      where: {
        tenantId: B2B_CONSTANTS.TENANT_ID,
        companyId: B2B_CONSTANTS.COMPANY_ID,
      },
      select: { id: true },
    });

    if (existing) {
      await prisma.b2BCompanyProfile.update({ where: { id: existing.id }, data });
    } else {
      await prisma.b2BCompanyProfile.create({
        data: {
          tenantId: B2B_CONSTANTS.TENANT_ID,
          companyId: B2B_CONSTANTS.COMPANY_ID,
          ...data,
        },
      });
    }
  } catch (error) {
    console.error("B2B şirket profili kayıt hatası:", error);
    return { success: false, message: "Şirket bilgileri kaydedilemedi." };
  }

  revalidatePath("/admin/b2b-settings");
  revalidatePath("/contact");
  revalidatePath("/", "layout");
  return { success: true, message: "Şirket bilgileri başarıyla güncellendi." };
}

export async function saveB2BBankAccountAction(
  _previousState: B2BBankAccountActionState,
  formData: FormData,
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
    return { success: false, message: "IBAN, TR ile başlayan 26 karakter olmalıdır." };
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
