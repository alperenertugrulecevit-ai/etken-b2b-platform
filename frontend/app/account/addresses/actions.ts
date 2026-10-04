"use server";

import { CustomerType, UserType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { SessionService } from "@/modules/auth/services/session.service";

export async function createIndividualAddress(formData: FormData) {
  const user=await SessionService.getCurrentUser();
  if(!user||user.userType!==UserType.CUSTOMER||!user.customerId||user.customer?.customerType!==CustomerType.INDIVIDUAL) throw new Error("Yetkisiz işlem.");
  const title=String(formData.get("title")??"").trim().slice(0,80);
  const address=String(formData.get("address")??"").trim().slice(0,500);
  const city=String(formData.get("city")??"").trim().slice(0,80);
  const district=String(formData.get("district")??"").trim().slice(0,80);
  const postalCode=String(formData.get("postalCode")??"").trim().slice(0,20)||null;
  if(!title||!address||!city||!district) throw new Error("Adres bilgilerini eksiksiz doldurun.");
  await prisma.customerAddress.create({data:{
    customerId:user.customerId,addressCode:"B2C-"+Date.now().toString(36).toUpperCase(),title,addressType:"DELIVERY",
    contactName:user.fullName, address,city,district,postalCode,isActive:true,
  }});
  revalidatePath("/account/addresses");
}
