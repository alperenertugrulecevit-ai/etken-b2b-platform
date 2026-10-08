import "server-only";
import {B2BPaymentMethod,CustomerAccountEntryDirection,CustomerAccountEntryType,CustomerAccountPaymentMethod,PaymentTransactionStatus,Prisma} from "@prisma/client";
import {prisma} from "@/lib/prisma";
import {getPaymentProvider} from "./payment-provider-adapter";
import {B2B_CONSTANTS} from "@/modules/b2b/constants/b2b.constants";

export class PaymentGatewayService{
 static async initialize(orderId:number,callbackUrl:string){
  const order=await prisma.order.findFirst({where:{id:orderId,source:"ECOMMERCE",paymentMethod:B2BPaymentMethod.CREDIT_CARD},select:{id:true,orderNumber:true,totalAmount:true,ecommerceEmail:true,paymentStatus:true}});
  if(!order)throw new Error("Kart ödemesine uygun sipariş bulunamadı.");
  if(order.paymentStatus==="PAID")throw new Error("Sipariş zaten ödenmiş.");
  const setting=await prisma.paymentGatewaySetting.findFirst({where:{tenantId:B2B_CONSTANTS.TENANT_ID,companyId:B2B_CONSTANTS.COMPANY_ID,isActive:true}});
  if(!setting)throw new Error("Kredi kartı ödeme altyapısı hazır; canlı sanal POS sağlayıcısı henüz etkinleştirilmedi.");
  const adapter=getPaymentProvider(setting.provider);
  const init=await adapter.initialize({orderId:order.id,orderNumber:order.orderNumber,amount:order.totalAmount,currency:"TRY",email:order.ecommerceEmail??"",callbackUrl});
  await prisma.paymentTransaction.create({data:{orderId:order.id,provider:setting.provider,externalId:init.externalId,status:PaymentTransactionStatus.PENDING,amount:order.totalAmount,currency:"TRY",providerReference:init.providerReference}});
  return init;
 }
 static async verify(provider:string,externalId:string){
  const adapter=getPaymentProvider(provider); const verified=await adapter.verify(externalId);
  const row=await prisma.paymentTransaction.findFirst({where:{provider,externalId},include:{order:true}});
  if(!row)throw new Error("Ödeme işlemi bulunamadı.");
  if(verified.externalId!==externalId)throw new Error("Sağlayıcı ödeme işlem kimliği eşleşmiyor.");
  if(row.amount!==row.order.totalAmount||row.order.paymentMethod!==B2BPaymentMethod.CREDIT_CARD||row.order.source!=="ECOMMERCE")throw new Error("Ödeme tutarı veya sipariş türü eşleşmiyor.");
  if(verified.status!=="PAID"){
   await prisma.paymentTransaction.updateMany({where:{id:row.id,status:{not:PaymentTransactionStatus.PAID}},data:{status:verified.status as PaymentTransactionStatus,errorMessage:verified.status==="FAILED"?"Sağlayıcı ödemeyi başarısız bildirdi.":null,...(verified.raw===undefined?{}:{rawPayload:verified.raw as Prisma.InputJsonValue})}});
   return verified;
  }
  await prisma.$transaction(async tx=>{
   const claimed=await tx.paymentTransaction.updateMany({where:{id:row.id,status:{not:PaymentTransactionStatus.PAID}},data:{status:PaymentTransactionStatus.PAID,paidAt:new Date(),providerReference:verified.providerReference,maskedCard:verified.maskedCard,cardBrand:verified.cardBrand,threeDSecure:Boolean(verified.threeDSecure),...(verified.raw===undefined?{}:{rawPayload:verified.raw as Prisma.InputJsonValue})}});
   if(claimed.count===0)return;
   await tx.order.update({where:{id:row.orderId},data:{paymentStatus:"PAID",paymentProvider:provider,paymentReference:verified.providerReference??externalId}});
   const exists=await tx.customerAccountEntry.findFirst({where:{orderId:row.orderId,direction:CustomerAccountEntryDirection.CREDIT,entryType:CustomerAccountEntryType.PAYMENT}});
   if(!exists)await tx.customerAccountEntry.create({data:{customerId:row.order.customerId,orderId:row.orderId,direction:CustomerAccountEntryDirection.CREDIT,entryType:CustomerAccountEntryType.PAYMENT,paymentMethod:CustomerAccountPaymentMethod.CREDIT_CARD,amount:row.amount,description:`${row.order.orderNumber} kredi kartı ödemesi`,referenceNo:verified.providerReference??externalId,createdByUsername:"PAYMENT_GATEWAY"}});
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
  return verified;
 }
}
