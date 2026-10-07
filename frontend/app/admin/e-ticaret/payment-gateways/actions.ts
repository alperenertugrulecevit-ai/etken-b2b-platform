"use server";
import {revalidatePath} from "next/cache";
import {AuthorizationService} from "@/modules/authorization/services/authorization.service";
import {prisma} from "@/lib/prisma";
export async function savePaymentGatewayAction(formData:FormData){
 await AuthorizationService.requirePermission("ORDER_MANAGE");
 const provider=String(formData.get("provider")??"").trim().toUpperCase(),displayName=String(formData.get("displayName")??"").trim();
 if(!provider||!displayName)throw new Error("Sağlayıcı kodu ve adı zorunludur.");
 await prisma.paymentGatewaySetting.upsert({where:{tenantId_companyId_provider:{tenantId:"tenant_etken",companyId:"company_etken_office",provider}},update:{displayName,isActive:String(formData.get("isActive"))==="true",testMode:String(formData.get("testMode"))==="true",threeDSecureRequired:String(formData.get("threeDSecureRequired"))!=="false",installmentEnabled:String(formData.get("installmentEnabled"))==="true"},create:{tenantId:"tenant_etken",companyId:"company_etken_office",provider,displayName,isActive:String(formData.get("isActive"))==="true",testMode:String(formData.get("testMode"))==="true",threeDSecureRequired:String(formData.get("threeDSecureRequired"))!=="false",installmentEnabled:String(formData.get("installmentEnabled"))==="true"}});
 revalidatePath("/admin/e-ticaret/payment-gateways");
}
