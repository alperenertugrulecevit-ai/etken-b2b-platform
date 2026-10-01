"use server";

import { HandlingUnitPurpose, HandlingUnitStatus, Prisma, ReturnOrderStatus, StockMovementType, WmsOperationType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createStockMovementWithTransaction } from "@/lib/stock/stock-service";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

export type ReturnReceiveState={success:boolean;message:string;returnNumber:string;productCode:string;productName:string;receivedQuantity:number;remainingQuantity:number;status:string;handlingUnitBarcode:string};
const emptyReturnReceiveState=():ReturnReceiveState=>({success:false,message:"",returnNumber:"",productCode:"",productName:"",receivedQuantity:0,remainingQuantity:0,status:"",handlingUnitBarcode:""});
const norm=(v:FormDataEntryValue|null)=>String(v??"").trim().toUpperCase();

export async function rfReceiveReturnItem(_prev:ReturnReceiveState,formData:FormData):Promise<ReturnReceiveState>{
 await AuthorizationService.requireRfAccess("RECEIVING_EXECUTE");
 const returnNumber=norm(formData.get("returnNumber")),deliveryNoteNumber=norm(formData.get("deliveryNoteNumber")),deliveryNoteDate=String(formData.get("deliveryNoteDate")??"").trim(),handlingUnitBarcode=norm(formData.get("handlingUnitBarcode")),productBarcode=norm(formData.get("productBarcode"));
 if(!returnNumber||!deliveryNoteNumber||!deliveryNoteDate||!handlingUnitBarcode||!productBarcode)return {...emptyReturnReceiveState(),message:"İade siparişi, irsaliye no, irsaliye tarihi, hedef THM ve ürün barkodu zorunludur."};
 try{
  const result=await prisma.$transaction(async tx=>{
   const ro=await tx.returnOrder.findUnique({where:{returnNumber},include:{originalOrder:{select:{id:true,orderNumber:true,fulfillmentWarehouseId:true}},items:true}});
   if(!ro)throw new Error(`${returnNumber} iade giriş siparişi bulunamadı.`);
   if(ro.status===ReturnOrderStatus.CANCELLED||ro.status===ReturnOrderStatus.RECEIVED)throw new Error("İade giriş siparişi mal kabule açık değil.");
   if(ro.deliveryNoteNumber.trim().toUpperCase()!==deliveryNoteNumber)throw new Error(`İrsaliye No eşleşmiyor. Beklenen: ${ro.deliveryNoteNumber}.`);
   if(ro.deliveryNoteDate.toISOString().slice(0,10)!==deliveryNoteDate)throw new Error(`İrsaliye Tarihi eşleşmiyor. Beklenen: ${ro.deliveryNoteDate.toISOString().slice(0,10)}.`);
   const item=ro.items.find(x=>x.productBarcode.trim().toUpperCase()===productBarcode||x.productCode.trim().toUpperCase()===productBarcode);
   if(!item)throw new Error(`${productBarcode} ürünü bu iade siparişinde bulunmuyor.`);
   if(item.receivedQuantity>=item.expectedQuantity)throw new Error(`${item.productCode} iade miktarı daha önce tamamlandı.`);
   const hu=await tx.handlingUnit.findUnique({where:{barcode:handlingUnitBarcode},select:{id:true,barcode:true,status:true,purpose:true,warehouseId:true,locationId:true}});
   if(!hu)throw new Error(`${handlingUnitBarcode} THM bulunamadı.`);
   if(!hu.warehouseId)throw new Error(`${handlingUnitBarcode} THM depo bilgisi bulunmuyor.`);
   if(hu.status!==HandlingUnitStatus.OPEN&&hu.status!==HandlingUnitStatus.EMPTY&&hu.status!==HandlingUnitStatus.STORED)throw new Error("Hedef THM stok girişine uygun durumda değil.");
   if(hu.purpose!==HandlingUnitPurpose.STOCK&&hu.purpose!==HandlingUnitPurpose.RECEIVING)throw new Error("Hedef THM STOCK veya RECEIVING amaçlı olmalıdır.");
   const qty=1;
   await createStockMovementWithTransaction(tx,{warehouseId:hu.warehouseId,productId:item.productId,orderId:ro.originalOrderId,movementType:StockMovementType.SALE_RETURN,physicalChange:qty,reservedChange:0,documentNumber:ro.deliveryNoteNumber,description:`İade giriş ${ro.returnNumber}; referans çıkış ${ro.originalOrder.orderNumber}; irsaliye ${ro.deliveryNoteNumber} / ${deliveryNoteDate}; hedef THM ${hu.barcode}.`});
   await tx.handlingUnitItem.upsert({where:{handling_unit_product_unique:{handlingUnitId:hu.id,productId:item.productId}},update:{quantity:{increment:qty}},create:{handlingUnitId:hu.id,productId:item.productId,quantity:qty,reservedStock:0}});
   if(hu.status===HandlingUnitStatus.EMPTY)await tx.handlingUnit.update({where:{id:hu.id},data:{status:hu.locationId?HandlingUnitStatus.STORED:HandlingUnitStatus.OPEN}});
   const updated=await tx.returnOrderItem.update({where:{id:item.id},data:{receivedQuantity:{increment:qty}}});
   const all=await tx.returnOrderItem.findMany({where:{returnOrderId:ro.id},select:{expectedQuantity:true,receivedQuantity:true}});
   const complete=all.every(x=>x.receivedQuantity>=x.expectedQuantity),any=all.some(x=>x.receivedQuantity>0);
   const nextStatus=complete?ReturnOrderStatus.RECEIVED:any?ReturnOrderStatus.PARTIALLY_RECEIVED:ReturnOrderStatus.OPEN;
   await tx.returnOrder.update({where:{id:ro.id},data:{status:nextStatus,receivedAt:complete?new Date():null}});
   await tx.wmsOperationLog.create({data:{operationType:WmsOperationType.RECEIVING,module:"RF_RETURN_RECEIVING",entityType:"HANDLING_UNIT",entityId:hu.id,barcode:ro.returnNumber,targetBarcode:hu.barcode,orderId:ro.originalOrderId,orderNumber:ro.originalOrder.orderNumber,productId:item.productId,productCode:item.productCode,productName:item.productName,quantity:qty,warehouseId:hu.warehouseId,description:`${ro.returnNumber} iade girişinde ${item.productCode} 1 adet kabul edildi.`,metadata:{returnOrderId:ro.id,returnNumber:ro.returnNumber,deliveryNoteNumber:ro.deliveryNoteNumber,deliveryNoteDate:ro.deliveryNoteDate.toISOString(),handlingUnitBarcode:hu.barcode}}});
   return {productCode:item.productCode,productName:item.productName,receivedQuantity:updated.receivedQuantity,remainingQuantity:Math.max(0,updated.expectedQuantity-updated.receivedQuantity),status:nextStatus};
  },{maxWait:10000,timeout:30000,isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
  revalidatePath("/rf/return-receiving");revalidatePath("/admin/returns");revalidatePath("/admin/stock/movements");revalidatePath("/admin/stock/general");
  return {success:true,message:`${result.productCode} - ${result.productName}: 1 adet iade stoğa alındı.`,returnNumber,productCode:result.productCode,productName:result.productName,receivedQuantity:result.receivedQuantity,remainingQuantity:result.remainingQuantity,status:result.status,handlingUnitBarcode};
 }catch(e){console.error("RF iade giriş hatası:",e);return {...emptyReturnReceiveState(),message:e instanceof Error?e.message:"İade giriş işlemi tamamlanamadı."}}
}
