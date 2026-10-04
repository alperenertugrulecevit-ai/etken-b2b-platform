"use server";

import { CustomerType, CustomerUserRole, UserStatus, UserType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PasswordService } from "@/modules/auth/services/password.service";

export type RegisterResult = { success: boolean; message: string };

export async function registerIndividualCustomerAction(
  _previousState: RegisterResult,
  formData: FormData,
): Promise<RegisterResult> {
  const firstName = String(formData.get("firstName") ?? "").trim().slice(0, 80);
  const lastName = String(formData.get("lastName") ?? "").trim().slice(0, 80);
  const email = String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 160);
  const phone = String(formData.get("phone") ?? "").trim().slice(0, 30);
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

  if (!firstName || !lastName || !email || !phone) return { success:false, message:"Tüm zorunlu alanları doldurun." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { success:false, message:"Geçerli bir e-posta adresi girin." };
  if (password.length < 8) return { success:false, message:"Şifre en az 8 karakter olmalıdır." };
  if (password !== passwordConfirm) return { success:false, message:"Şifreler eşleşmiyor." };

  const existing = await prisma.user.findFirst({ where:{ OR:[{username:email},{email}] }, select:{id:true} });
  if (existing) return { success:false, message:"Bu e-posta adresiyle kayıtlı bir hesap zaten var." };

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
    return { success:true, message:"Üyeliğiniz oluşturuldu. E-posta adresiniz ve şifrenizle giriş yapabilirsiniz." };
  } catch {
    return { success:false, message:"Üyelik oluşturulamadı. Bilgilerinizi kontrol edip tekrar deneyin." };
  }
}
