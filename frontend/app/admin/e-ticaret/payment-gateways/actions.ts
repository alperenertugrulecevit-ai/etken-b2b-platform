"use server";
import {revalidatePath} from "next/cache";
import {AuthorizationService} from "@/modules/authorization/services/authorization.service";
import {prisma} from "@/lib/prisma";
import {B2B_CONSTANTS} from "@/modules/b2b/constants/b2b.constants";
import {listRegisteredPaymentProviders} from "@/modules/ecommerce/services/payment-provider-adapter";

export async function savePaymentGatewayAction(formData:FormData){
 await AuthorizationService.requirePermission("ORDER_MANAGE");
 const provider=String(formData.get("provider")??"").trim().toUpperCase();
 const displayName=String(formData.get("displayName")??"").trim();
 const isActive=String(formData.get("isActive"))==="true";
 const testMode=String(formData.get("testMode"))==="true";
 const threeDSecureRequired=String(formData.get("threeDSecureRequired"))!=="false";
 const installmentEnabled=String(formData.get("installmentEnabled"))==="true";
 if(!provider||!displayName)throw new Error("Sağlayıcı kodu ve adı zorunludur.");
 if(isActive&&!listRegisteredPaymentProviders().includes(provider)){
  throw new Error(`Bu sağlayıcı için uygulamada kayıtlı ödeme adaptörü yok; aktif edilemez: ${provider}`);
 }
 await prisma.$transaction(async tx=>{
  if(isActive){
   await tx.paymentGatewaySetting.updateMany({
    where:{tenantId:B2B_CONSTANTS.TENANT_ID,companyId:B2B_CONSTANTS.COMPANY_ID,isActive:true,provider:{not:provider}},
    data:{isActive:false},
   });
  }
  await tx.paymentGatewaySetting.upsert({
   where:{tenantId_companyId_provider:{tenantId:B2B_CONSTANTS.TENANT_ID,companyId:B2B_CONSTANTS.COMPANY_ID,provider}},
   update:{displayName,isActive,testMode,threeDSecureRequired,installmentEnabled},
   create:{tenantId:B2B_CONSTANTS.TENANT_ID,companyId:B2B_CONSTANTS.COMPANY_ID,provider,displayName,isActive,testMode,threeDSecureRequired,installmentEnabled},
  });
 });
 revalidatePath("/admin/e-ticaret/payment-gateways");
}
