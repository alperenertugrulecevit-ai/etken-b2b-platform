"use server";

import { UserType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { SessionService } from "@/modules/auth/services/session.service";

export type ProfileResult={success:boolean;message:string};
export const initialProfileState:ProfileResult={success:false,message:""};

function read(formData:FormData,name:string,max:number){
 return String(formData.get(name)??"").trim().slice(0,max);
}

export async function updateCustomerProfileAction(
 _previousState:ProfileResult,
 formData:FormData,
):Promise<ProfileResult>{
 const user=await SessionService.getCurrentUser();
 if(!user||user.userType!==UserType.CUSTOMER||!user.customerId||!user.customer?.isActive){
  return {success:false,message:"Oturumunuz geçersiz. Yeniden giriş yapın."};
 }

 const contactName=read(formData,"contactName",160);
 const phone=read(formData,"phone",30);
 if(!contactName||!phone) return {success:false,message:"Yetkili / ad soyad ve telefon zorunludur."};

 await prisma.customer.update({
  where:{id:user.customerId},
  data:{contactName,phone},
 });

 revalidatePath("/account");
 revalidatePath("/account/profile");
 return {success:true,message:"Hesap bilgileriniz güncellendi."};
}
