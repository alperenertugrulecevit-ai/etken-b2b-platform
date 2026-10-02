"use server";

import {
  EcommerceReturnPreReceiptMatchStatus,
  EcommerceReturnPreReceiptMode,
  EcommerceReturnPreReceiptOutcome,
  EcommerceReturnRefundStatus,
  EcommerceReturnStatus,
  OrderType,
} from "@prisma/client";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

export type PreReceiptState = {
  success: boolean;
  message: string;
  preReceiptNumber?: string;
  orderNumber?: string;
  matchStatus?: string;
  outcome?: string;
};

const norm=(v:FormDataEntryValue|null)=>String(v??"").trim().toUpperCase();

export async function createEcommerceReturnPreReceipt(_prev:PreReceiptState,formData:FormData):Promise<PreReceiptState>{
  const profile=await AuthorizationService.requireRfAccess("RECEIVING_EXECUTE");
  const carrierId=String(formData.get("carrierId")??"").trim();
  const warehouseId=Number(formData.get("warehouseId"));
  const modeRaw=norm(formData.get("mode"));
  const scannedCode=norm(formData.get("scannedCode"));
  const terminalCode=norm(formData.get("terminalCode"))||null;
  const lateDetected=String(formData.get("lateDetected")??"")==="1";
  if(!carrierId||!Number.isInteger(warehouseId)||warehouseId<=0||!scannedCode) return {success:false,message:"Depo, kargo firması ve barkod zorunludur."};
  const mode=modeRaw==="CARGO_BARCODE"?EcommerceReturnPreReceiptMode.CARGO_BARCODE:EcommerceReturnPreReceiptMode.RETURN_CODE;

  try{
    const result=await prisma.$transaction(async tx=>{
      const [warehouse,carrier]=await Promise.all([
        tx.warehouse.findFirst({where:{id:warehouseId,isActive:true},select:{id:true,code:true}}),
        tx.shippingCarrier.findFirst({where:{id:carrierId,isActive:true},select:{id:true,name:true}}),
      ]);
      if(!warehouse) throw new Error("Aktif depo bulunamadı.");
      if(!carrier) throw new Error("Aktif kargo firması bulunamadı.");

      const duplicate=await tx.ecommerceReturnPreReceipt.findUnique({
        where:{carrierId_mode_scannedCode:{carrierId,mode,scannedCode}},
        select:{preReceiptNumber:true,receivedAt:true},
      });
      if(duplicate) throw new Error(`${scannedCode} daha önce ${duplicate.preReceiptNumber} ile ön kabule alınmış.`);

      let originalOrderId:number|null=null;
      let orderNumber:string|undefined;
      let ecommerceReturnId:string|null=null;
      let matchStatus=EcommerceReturnPreReceiptMatchStatus.UNMATCHED;
      let outcome=mode===EcommerceReturnPreReceiptMode.RETURN_CODE
        ? EcommerceReturnPreReceiptOutcome.CARRIER_STATUS_UNVERIFIED
        : EcommerceReturnPreReceiptOutcome.UNDELIVERED_RETURN;

      if(mode===EcommerceReturnPreReceiptMode.RETURN_CODE){
        const ro=await tx.returnOrder.findFirst({
          where:{OR:[{customerDocumentNo:{equals:scannedCode,mode:"insensitive"}},{returnNumber:{equals:scannedCode,mode:"insensitive"}}]},
          include:{
            originalOrder:{select:{id:true,orderNumber:true,orderType:true}},
            items:true,
          },
        });
        if(ro&&ro.originalOrder.orderType===OrderType.ECOMMERCE){
          originalOrderId=ro.originalOrder.id;
          orderNumber=ro.originalOrder.orderNumber;
          matchStatus=EcommerceReturnPreReceiptMatchStatus.MATCHED;
          outcome=EcommerceReturnPreReceiptOutcome.RETURN_ENTRY_PENDING;
          let er=await tx.ecommerceReturn.findFirst({where:{originalOrderId,externalReturnCode:scannedCode}});
          if(!er){
            const returnNumber=`ETI-${new Date().toISOString().slice(0,10).replaceAll("-","")}-${randomUUID().replaceAll("-","").slice(0,8).toUpperCase()}`;
            er=await tx.ecommerceReturn.create({data:{
              returnNumber,originalOrderId,externalReturnCode:scannedCode,status:EcommerceReturnStatus.PRE_RECEIVED,refundStatus:EcommerceReturnRefundStatus.WAITING,
              items:{create:ro.items.map(i=>({orderItemId:i.orderItemId,productId:i.productId,productCode:i.productCode,productBarcode:i.productBarcode,productName:i.productName,expectedQuantity:i.expectedQuantity}))},
            }});
          }
          ecommerceReturnId=er.id;
        }
      }

      const date=new Date().toISOString().slice(0,10).replaceAll("-","");
      const preReceiptNumber=`EOK-${date}-${randomUUID().replaceAll("-","").slice(0,8).toUpperCase()}`;
      await tx.ecommerceReturnPreReceipt.create({data:{
        preReceiptNumber,warehouseId,carrierId,mode,scannedCode,
        returnCode:mode===EcommerceReturnPreReceiptMode.RETURN_CODE?scannedCode:null,
        cargoBarcode:mode===EcommerceReturnPreReceiptMode.CARGO_BARCODE?scannedCode:null,
        originalOrderId,ecommerceReturnId,matchStatus,outcome,
        carrierStatus:"ENTEGRASYON_BEKLIYOR",
        lateDetected,
        receivedByUserId:profile.id,
        receivedByName:profile.employee?`${profile.employee.firstName} ${profile.employee.lastName}`:profile.username,
        terminalCode,
      }});
      return {preReceiptNumber,orderNumber,matchStatus,outcome,carrierName:carrier.name};
    });
    revalidatePath("/rf/ecommerce-return-pre-receipt");
    revalidatePath("/admin/e-ticaret/returns");
    revalidatePath("/admin/e-ticaret/return-reconciliation");
    return {success:true,message:result.orderNumber?`${result.preReceiptNumber}: ${result.orderNumber} ile eşleşti. İade girişine hazır.`:`${result.preReceiptNumber}: Ön kabul kaydedildi. Gönderi eşleştirme/kargo kontrolü bekliyor.`,...result};
  }catch(e){
    return {success:false,message:e instanceof Error?e.message:"Ön kabul oluşturulamadı."};
  }
}
