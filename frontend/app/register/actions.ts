"use server";

import { CustomerType, CustomerUserRole, UserStatus, UserType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PasswordService } from "@/modules/auth/services/password.service";

export type RegisterResult = { success: boolean; message: string };

function read(formData: FormData, name: string, maxLength: number) {
  return String(formData.get(name) ?? "").trim().slice(0, maxLength);
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeTaxNumber(value: string) {
  return value.replace(/\D/g, "").slice(0, 11);
}

async function emailAlreadyRegistered(email: string) {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ username: email }, { email }] },
    select: { id: true },
  });
  return Boolean(existing);
}

export async function registerIndividualCustomerAction(
  _previousState: RegisterResult,
  formData: FormData,
): Promise<RegisterResult> {
  const firstName = read(formData, "firstName", 80);
  const lastName = read(formData, "lastName", 80);
  const email = normalizeEmail(read(formData, "email", 160));
  const phone = read(formData, "phone", 30);
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

  if (!firstName || !lastName || !email || !phone) return { success:false, message:"Tüm zorunlu alanları doldurun." };
  if (!validEmail(email)) return { success:false, message:"Geçerli bir e-posta adresi girin." };
  if (password.length < 8) return { success:false, message:"Şifre en az 8 karakter olmalıdır." };
  if (password !== passwordConfirm) return { success:false, message:"Şifreler eşleşmiyor." };
  if (await emailAlreadyRegistered(email)) return { success:false, message:"Bu e-posta adresiyle kayıtlı bir hesap zaten var." };

  const fullName = firstName + " " + lastName;
  const passwordHash = await PasswordService.hash(password);
  const suffix = Date.now().toString(36).toUpperCase();

  try {
    await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.create({
        data:{
          customerCode:"B2C-" + suffix,
          customerType:CustomerType.INDIVIDUAL,
          companyName:fullName,
          contactName:fullName,
          phone,
          email,
          paymentTermDays:0,
          discountRate:0,
          creditLimit:0,
          isActive:true,
        },
        select:{id:true},
      });
      await tx.user.create({
        data:{
          customerId:customer.id,
          username:email,
          email,
          fullName,
          passwordHash,
          userType:UserType.CUSTOMER,
          status:UserStatus.ACTIVE,
          customerRole:CustomerUserRole.BUYER,
          mustChangePassword:false,
        },
      });
    });
    return { success:true, message:"Bireysel üyeliğiniz oluşturuldu. E-posta adresiniz ve şifrenizle giriş yapabilirsiniz." };
  } catch {
    return { success:false, message:"Üyelik oluşturulamadı. Bilgilerinizi kontrol edip tekrar deneyin." };
  }
}

export async function registerCorporateCustomerAction(
  _previousState: RegisterResult,
  formData: FormData,
): Promise<RegisterResult> {
  const companyName = read(formData, "companyName", 180);
  const taxOffice = read(formData, "taxOffice", 120);
  const taxNumber = normalizeTaxNumber(read(formData, "taxNumber", 20));
  const firstName = read(formData, "firstName", 80);
  const lastName = read(formData, "lastName", 80);
  const email = normalizeEmail(read(formData, "email", 160));
  const phone = read(formData, "phone", 30);
  const address = read(formData, "address", 500);
  const city = read(formData, "city", 80);
  const district = read(formData, "district", 80);
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

  if (!companyName || !taxOffice || !taxNumber || !firstName || !lastName || !email || !phone || !address || !city || !district) {
    return { success:false, message:"Tüm zorunlu alanları doldurun." };
  }
  if (taxNumber.length !== 10 && taxNumber.length !== 11) return { success:false, message:"Vergi / T.C. kimlik numarası 10 veya 11 haneli olmalıdır." };
  if (!validEmail(email)) return { success:false, message:"Geçerli bir e-posta adresi girin." };
  if (password.length < 8) return { success:false, message:"Şifre en az 8 karakter olmalıdır." };
  if (password !== passwordConfirm) return { success:false, message:"Şifreler eşleşmiyor." };
  if (await emailAlreadyRegistered(email)) return { success:false, message:"Bu e-posta adresiyle kayıtlı bir hesap zaten var." };

  const taxExists = await prisma.customer.findUnique({ where:{ taxNumber }, select:{id:true} });
  if (taxExists) return { success:false, message:"Bu vergi / T.C. kimlik numarasıyla kayıtlı bir müşteri zaten var." };

  const fullName = firstName + " " + lastName;
  const passwordHash = await PasswordService.hash(password);
  const suffix = Date.now().toString(36).toUpperCase();

  try {
    await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.create({
        data:{
          customerCode:"B2B-" + suffix,
          customerType:CustomerType.CORPORATE,
          companyName,
          taxOffice,
          taxNumber,
          contactName:fullName,
          phone,
          email,
          address,
          city,
          district,
          paymentTermDays:0,
          discountRate:0,
          creditLimit:0,
          isActive:true,
          addresses:{
            create:{
              addressCode:"MERKEZ",
              title:"Merkez / Fatura Adresi",
              addressType:"BOTH",
              contactName:fullName,
              phone,
              address,
              city,
              district,
              isDefault:true,
              isActive:true,
            },
          },
        },
        select:{id:true},
      });
      await tx.user.create({
        data:{
          customerId:customer.id,
          username:email,
          email,
          fullName,
          passwordHash,
          userType:UserType.CUSTOMER,
          status:UserStatus.ACTIVE,
          customerRole:CustomerUserRole.BUYER,
          mustChangePassword:false,
        },
      });
    });
    return { success:true, message:"Kurumsal üyeliğiniz oluşturuldu. E-posta adresiniz ve şifrenizle giriş yapabilirsiniz." };
  } catch {
    return { success:false, message:"Kurumsal üyelik oluşturulamadı. Bilgilerinizi kontrol edip tekrar deneyin." };
  }
}
