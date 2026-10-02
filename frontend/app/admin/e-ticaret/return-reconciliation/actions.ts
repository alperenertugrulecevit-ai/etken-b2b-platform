"use server";
import { EcommerceReturnPreReceiptOutcome } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

export async function markReturnToCarrier(formData:FormData){
 const profile=await AuthorizationService.requireAdminPortalAccess();
 const id=String(formData.get("id")??"");
 if(!id) throw new Error("Ön kabul kaydı bulunamadı.");
 await prisma.ecommerceReturnPreReceipt.update({where:{id},data:{outcome:EcommerceReturnPreReceiptOutcome.RETURNED_TO_CARRIER,returnedToCarrierAt:new Date(),returnedToCarrierBy:profile.employee?`${profile.employee.firstName} ${profile.employee.lastName}`:profile.username}});
 revalidatePath("/admin/e-ticaret/return-reconciliation");
 revalidatePath("/admin/e-ticaret/returns");
}
