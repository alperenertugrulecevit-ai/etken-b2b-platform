"use server";

import {
  CustomerUserRole,
  UserStatus,
  UserType,
} from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { PasswordService } from "@/modules/auth/services/password.service";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,49}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ImportedCredential = {
  fullName: string;
  username: string;
  password: string;
};

export type CustomerUserActionState = {
  success: boolean;
  message: string;
  credentials?: ImportedCredential[];
};

function getRole(value: FormDataEntryValue | null) {
  const role = String(value ?? "");
  return Object.values(CustomerUserRole).includes(role as CustomerUserRole)
    ? (role as CustomerUserRole)
    : null;
}

function isStrongPassword(password: string) {
  return password.length >= 8 && /[A-Z]/.test(password) &&
    /[a-z]/.test(password) && /[0-9]/.test(password);
}

function generateTemporaryPassword() {
  const token = Math.random().toString(36).slice(2, 8);
  return "Etken" + token.charAt(0).toUpperCase() + token.slice(1) + "9!";
}

function normalizeRole(value: string) {
  const normalized = value.trim().toLocaleUpperCase("tr-TR")
    .replaceAll("İ", "I").replaceAll("Ş", "S").replaceAll("Ğ", "G")
    .replaceAll("Ü", "U").replaceAll("Ö", "O").replaceAll("Ç", "C")
    .replace(/[\s-]+/g, "_");

  if (["CUSTOMER_ADMIN", "YETKILI", "MUSTERI_YETKILISI"].includes(normalized)) {
    return CustomerUserRole.CUSTOMER_ADMIN;
  }
  if (["BUYER", "SATIN_ALMA", "SATIN_ALMACI"].includes(normalized)) {
    return CustomerUserRole.BUYER;
  }
  if (["ADDRESS_USER", "ADRES_KULLANICISI", "ADRES"].includes(normalized)) {
    return CustomerUserRole.ADDRESS_USER;
  }
  return null;
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === ";" && !quoted) {
      values.push(value.trim());
      value = "";
    } else {
      value += char;
    }
  }
  values.push(value.trim());
  return values;
}

async function readImportRows(file: File): Promise<string[][]> {
  const bytes = Buffer.from(await file.arrayBuffer());
  if (file.name.toLowerCase().endsWith(".xlsx")) {
    const { readSheet } = await import("read-excel-file/node");
    const rows = await readSheet(bytes);
    return rows.map((row) => row.map((cell) => String(cell ?? "").trim()));
  }
  const text = bytes.toString("utf8").replace(/^\uFEFF/, "");
  return text.split(/\r?\n/).filter((line) => line.trim()).map(parseCsvLine);
}

function revalidate(customerId: number) {
  revalidatePath("/admin/customers");
  revalidatePath("/admin/customers/" + customerId + "/users");
}

export async function createCustomerUserAction(
  customerId: number,
  _previousState: CustomerUserActionState,
  formData: FormData
): Promise<CustomerUserActionState> {
  const currentUser = await AuthorizationService.requirePermission("CUSTOMER_MANAGE");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const email = String(formData.get("email") ?? "").trim().toLowerCase() || null;
  const password = String(formData.get("password") ?? "");
  const customerRole = getRole(formData.get("customerRole"));
  const addressIds = formData.getAll("addressIds").map(Number)
    .filter((id) => Number.isInteger(id) && id > 0);

  if (!Number.isInteger(customerId) || customerId <= 0 || !fullName) {
    return { success: false, message: "Müşteri ve ad-soyad bilgisi zorunludur." };
  }
  if (!USERNAME_PATTERN.test(username)) {
    return { success: false, message: "Kullanıcı adı 3-50 karakter olmalı; küçük harf, rakam, nokta, alt çizgi veya tire içerebilir." };
  }
  if (email && !EMAIL_PATTERN.test(email)) {
    return { success: false, message: "Geçerli bir e-posta adresi girin." };
  }
  if (!isStrongPassword(password)) {
    return { success: false, message: "Geçici şifre en az 8 karakter; büyük harf, küçük harf ve rakam içermelidir." };
  }
  if (!customerRole) {
    return { success: false, message: "Geçerli bir kullanıcı rolü seçin." };
  }
  if (customerRole === CustomerUserRole.ADDRESS_USER && addressIds.length === 0) {
    return { success: false, message: "Adres kullanıcısı için en az bir adres seçin." };
  }

  const [customer, duplicate, validAddressCount] = await Promise.all([
    prisma.customer.findFirst({ where: { id: customerId, isActive: true }, select: { id: true } }),
    prisma.user.findFirst({ where: { OR: [{ username }, ...(email ? [{ email }] : [])] }, select: { id: true } }),
    addressIds.length ? prisma.customerAddress.count({ where: { id: { in: addressIds }, customerId, isActive: true } }) : 0,
  ]);

  if (!customer) return { success: false, message: "Müşteri bulunamadı veya pasif." };
  if (duplicate) return { success: false, message: "Kullanıcı adı veya e-posta başka bir hesapta kullanılıyor." };
  if (validAddressCount !== addressIds.length) return { success: false, message: "Seçilen adreslerden biri müşteriye ait değil veya pasif." };

  await prisma.user.create({
    data: {
      customerId, fullName, username, email,
      passwordHash: await PasswordService.hash(password),
      customerRole, userType: UserType.CUSTOMER, status: UserStatus.ACTIVE,
      mustChangePassword: true, isRfUser: false, isAdminUser: false,
      createdById: currentUser.id,
      customerAddressAccesses: {
        create: addressIds.map((addressId) => ({ addressId, assignedById: currentUser.id })),
      },
    },
  });

  revalidate(customerId);
  return { success: true, message: "Kurumsal müşteri kullanıcısı oluşturuldu. İlk girişte şifre değişikliği istenecek." };
}

export async function importCustomerUsersAction(
  customerId: number,
  _previousState: CustomerUserActionState,
  formData: FormData
): Promise<CustomerUserActionState> {
  const currentUser = await AuthorizationService.requirePermission("CUSTOMER_MANAGE");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, message: "CSV veya XLSX dosyası seçin." };
  }

  const customer = await prisma.customer.findFirst({ where: { id: customerId, isActive: true }, select: { id: true } });
  if (!customer) return { success: false, message: "Müşteri bulunamadı veya pasif." };

  let rows: string[][];
  try { rows = await readImportRows(file); }
  catch { return { success: false, message: "Dosya okunamadı. Şablon biçimini kontrol edin." }; }
  if (rows.length < 2) return { success: false, message: "Dosyada aktarılacak kullanıcı satırı bulunmuyor." };

  const addresses = await prisma.customerAddress.findMany({
    where: { customerId, isActive: true }, select: { id: true, addressCode: true },
  });
  const addressMap = new Map(addresses.map((address) => [address.addressCode.toLocaleUpperCase("tr-TR"), address.id]));
  const prepared: Array<{ fullName: string; username: string; email: string | null; role: CustomerUserRole; password: string; addressIds: number[] }> = [];

  for (let index = 1; index < rows.length; index += 1) {
    const rowNumber = index + 1;
    const [fullNameValue, usernameValue, emailValue, roleValue, addressCodesValue, passwordValue] = rows[index];
    const fullName = String(fullNameValue ?? "").trim();
    const username = String(usernameValue ?? "").trim().toLowerCase();
    const email = String(emailValue ?? "").trim().toLowerCase() || null;
    const role = normalizeRole(String(roleValue ?? ""));
    const password = String(passwordValue ?? "").trim() || generateTemporaryPassword();
    const codes = String(addressCodesValue ?? "").split(",").map((value) => value.trim().toLocaleUpperCase("tr-TR")).filter(Boolean);
    const addressIds = codes.map((code) => addressMap.get(code)).filter((id): id is number => Boolean(id));

    if (!fullName || !USERNAME_PATTERN.test(username) || (email && !EMAIL_PATTERN.test(email)) || !role || !isStrongPassword(password)) {
      return { success: false, message: "Satır " + rowNumber + " geçersiz. Ad-soyad, kullanıcı adı, e-posta, rol ve şifreyi kontrol edin." };
    }
    if (codes.length !== addressIds.length) {
      return { success: false, message: "Satır " + rowNumber + " içinde müşteriye ait olmayan adres kodu var." };
    }
    if (role === CustomerUserRole.ADDRESS_USER && addressIds.length === 0) {
      return { success: false, message: "Satır " + rowNumber + ": Adres kullanıcısı için adres kodu zorunludur." };
    }
    prepared.push({ fullName, username, email, role, password, addressIds });
  }

  const usernames = prepared.map((item) => item.username);
  const emails = prepared.map((item) => item.email).filter((value): value is string => Boolean(value));
  if (new Set(usernames).size !== usernames.length || new Set(emails).size !== emails.length) {
    return { success: false, message: "Dosyada tekrarlanan kullanıcı adı veya e-posta bulunuyor." };
  }
  const duplicate = await prisma.user.findFirst({ where: { OR: [{ username: { in: usernames } }, ...(emails.length ? [{ email: { in: emails } }] : [])] }, select: { username: true, email: true } });
  if (duplicate) return { success: false, message: "Sistemde kayıtlı kullanıcı adı veya e-posta bulundu: " + duplicate.username };

  await prisma.$transaction(async (tx) => {
    for (const item of prepared) {
      await tx.user.create({
        data: {
          customerId, fullName: item.fullName, username: item.username, email: item.email,
          passwordHash: await PasswordService.hash(item.password),
          customerRole: item.role, userType: UserType.CUSTOMER, status: UserStatus.ACTIVE,
          mustChangePassword: true, isRfUser: false, isAdminUser: false,
          createdById: currentUser.id,
          customerAddressAccesses: { create: item.addressIds.map((addressId) => ({ addressId, assignedById: currentUser.id })) },
        },
      });
    }
  }, { maxWait: 15000, timeout: 60000 });

  revalidate(customerId);
  return {
    success: true,
    message: prepared.length + " kurumsal kullanıcı oluşturuldu. Geçici şifreleri bu ekran kapanmadan kaydedin.",
    credentials: prepared.map((item) => ({ fullName: item.fullName, username: item.username, password: item.password })),
  };
}

export async function toggleCustomerUserStatusAction(
  customerId: number,
  userId: string,
  currentStatus: UserStatus
) {
  await AuthorizationService.requirePermission("CUSTOMER_MANAGE");
  const user = await prisma.user.findFirst({
    where: { id: userId, customerId, userType: UserType.CUSTOMER }, select: { id: true },
  });
  if (!user) return;
  await prisma.user.update({
    where: { id: user.id },
    data: {
      status: currentStatus === UserStatus.ACTIVE ? UserStatus.PASSIVE : UserStatus.ACTIVE,
      sessionInvalidatedAt: new Date(),
    },
  });
  revalidate(customerId);
}
