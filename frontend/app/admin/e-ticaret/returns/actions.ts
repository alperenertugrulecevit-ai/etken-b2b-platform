"use server";

import {
  EcommerceReturnPreReceiptMatchStatus,
  EcommerceReturnPreReceiptOutcome,
  EcommerceReturnQualityResult,
  EcommerceReturnRefundStatus,
  EcommerceReturnStatus,
  HandlingUnitPurpose,
  HandlingUnitStatus,
  OrderType,
  Prisma,
  StockMovementType,
  WmsOperationType,
} from "@prisma/client";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { createStockMovementWithTransaction } from "@/lib/stock/stock-service";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

const norm=(v:FormDataEntryValue|null)=>String(v??"").trim().toUpperCase();
const locationScanCode=(x:{code:string;section:string;level:string;bin:string})=>[x.code,x.section,x.level,x.bin].map(v=>v.trim().toUpperCase()).filter(Boolean).join("-");

function refresh(){
  for(const p of ["/admin/e-ticaret/returns","/admin/e-ticaret/return-reconciliation","/admin/stock/movements","/admin/stock/general","/admin/wms-reports/receiving-tracking","/admin/wms-reports/receipt-summary","/admin/wms-reports/receipt-detail"]) revalidatePath(p);
}

export async function matchEcommercePreReceiptToOrder(formData:FormData){
  await AuthorizationService.requireAdminPortalAccess();
  const preReceiptId=String(formData.get("preReceiptId")??"");
  const orderNumber=norm(formData.get("orderNumber"));
  if(!preReceiptId||!orderNumber) throw new Error("Ön kabul ve sipariş numarası zorunludur.");

  await prisma.$transaction(async tx=>{
    const pre=await tx.ecommerceReturnPreReceipt.findUnique({where:{id:preReceiptId}});
    if(!pre) throw new Error("Ön kabul bulunamadı.");
    if(pre.outcome==="RETURNED_TO_CARRIER"||pre.outcome==="RETURN_TO_CARRIER") throw new Error("Kargoya geri teslim sürecindeki gönderi eşleştirilemez.");

    const order=await tx.order.findUnique({where:{orderNumber},include:{items:{include:{product:{select:{barcode:true}}}}}});
    if(!order||order.orderType!==OrderType.ECOMMERCE) throw new Error("E-Ticaret siparişi bulunamadı.");
    if(!["SHIPPED","DELIVERED","READY_TO_SHIP"].includes(order.status)) throw new Error("Sipariş kargoya/sevke çıkmış bir E-Ticaret siparişi değil.");

    let er=await tx.ecommerceReturn.findFirst({where:pre.mode==="RETURN_CODE"?{originalOrderId:order.id,externalReturnCode:pre.scannedCode}:{originalOrderId:order.id,status:{in:[EcommerceReturnStatus.PRE_RECEIVED,EcommerceReturnStatus.RECEIVING]}}});
    if(!er){
      const returnNumber=`ETI-${new Date().toISOString().slice(0,10).replaceAll("-","")}-${randomUUID().replaceAll("-","").slice(0,8).toUpperCase()}`;
      er=await tx.ecommerceReturn.create({data:{
        returnNumber,originalOrderId:order.id,externalReturnCode:pre.mode==="RETURN_CODE"?pre.scannedCode:null,status:EcommerceReturnStatus.PRE_RECEIVED,refundStatus:EcommerceReturnRefundStatus.WAITING,
        items:{create:order.items.filter(i=>Math.max(i.shippedQuantity,i.packedQuantity)>0).map(i=>({
          orderItemId:i.id,productId:i.productId,productCode:i.productCode,productBarcode:i.product.barcode,productName:i.productName,
          expectedQuantity:Math.max(i.shippedQuantity,i.packedQuantity),
        }))},
      }});
    }
    await tx.ecommerceReturnPreReceipt.update({where:{id:pre.id},data:{
      originalOrderId:order.id,ecommerceReturnId:er.id,matchStatus:EcommerceReturnPreReceiptMatchStatus.MATCHED,
      outcome:pre.mode==="RETURN_CODE"?EcommerceReturnPreReceiptOutcome.RETURN_ENTRY_PENDING:EcommerceReturnPreReceiptOutcome.UNDELIVERED_RETURN,
    }});
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,maxWait:10000,timeout:30000});
  refresh();
}

export async function processEcommerceReturnItem(formData:FormData){
  const profile=await AuthorizationService.requireAdminPortalAccess();
  const preReceiptId=String(formData.get("preReceiptId")??"");
  const productBarcode=norm(formData.get("productBarcode"));
  const qualityRaw=norm(formData.get("qualityResult"));
  const targetBarcode=norm(formData.get("targetHandlingUnitBarcode"));
  const targetLocationCode=norm(formData.get("targetLocationCode"));
  const customerReason=String(formData.get("customerReason")??"").trim();
  const qualityNote=String(formData.get("qualityNote")??"").trim();
  if(!preReceiptId||!productBarcode||!qualityRaw||!targetBarcode||!targetLocationCode) throw new Error("Ürün, kalite sonucu, hedef THM ve hedef adres zorunludur.");
  if(!Object.values(EcommerceReturnQualityResult).includes(qualityRaw as EcommerceReturnQualityResult)) throw new Error("Geçerli kalite sonucu seçilmedi.");
  const quality=qualityRaw as EcommerceReturnQualityResult;

  await prisma.$transaction(async tx=>{
    const pre=await tx.ecommerceReturnPreReceipt.findUnique({where:{id:preReceiptId},include:{
      ecommerceReturn:{include:{items:{include:{orderItem:true}}}},originalOrder:true,
    }});
    if(!pre) throw new Error("Ön kabul bulunamadı.");
    if(!pre.ecommerceReturn||!pre.originalOrder) throw new Error("Gönderi sipariş/iade ile eşleşmeden ürün kabulü yapılamaz.");
    if(pre.outcome!==EcommerceReturnPreReceiptOutcome.RETURN_ENTRY_PENDING&&pre.outcome!==EcommerceReturnPreReceiptOutcome.UNDELIVERED_RETURN) throw new Error("Bu ön kabul iade girişine uygun değil.");
    if(pre.ecommerceReturn.status===EcommerceReturnStatus.COMPLETED||pre.ecommerceReturn.status===EcommerceReturnStatus.CANCELLED) throw new Error("İade dosyası işleme kapalı.");

    const item=pre.ecommerceReturn.items.find(i=>i.productBarcode.trim().toUpperCase()===productBarcode||i.productCode.trim().toUpperCase()===productBarcode);
    if(!item) throw new Error(`${productBarcode} bu iade dosyasında beklenen ürün değil.`);
    if(item.receivedQuantity>=item.expectedQuantity) throw new Error(`${item.productCode} için beklenen iade miktarı tamamlandı.`);

    const hu=await tx.handlingUnit.findUnique({where:{barcode:targetBarcode},select:{id:true,barcode:true,warehouseId:true,status:true,purpose:true}});
    if(!hu) throw new Error(`${targetBarcode} hedef THM bulunamadı.`);
    if(hu.warehouseId!==pre.warehouseId) throw new Error("Hedef THM ön kabul deposunda değil.");
    if(hu.status!==HandlingUnitStatus.OPEN&&hu.status!==HandlingUnitStatus.EMPTY&&hu.status!==HandlingUnitStatus.STORED) throw new Error("Hedef THM iade girişine uygun durumda değil.");

    const locations=await tx.warehouseLocation.findMany({where:{warehouseId:pre.warehouseId,isActive:true},select:{id:true,code:true,section:true,level:true,bin:true,locationType:true}});
    const matches=locations.filter(l=>locationScanCode(l)===targetLocationCode||l.code.trim().toUpperCase()===targetLocationCode);
    if(matches.length!==1) throw new Error(matches.length?"Hedef adres barkodu birden fazla adresle eşleşiyor. Tam adres barkodunu okutun.":"Hedef adres bu depoda bulunamadı veya pasif.");
    const location=matches[0];

    const sellable=quality===EcommerceReturnQualityResult.SELLABLE;
    if(sellable){
      if(hu.purpose!==HandlingUnitPurpose.STOCK) throw new Error("Satılabilir iade yalnız STOCK amaçlı THM'e alınabilir.");
      if(["QUALITY","QUARANTINE","RETURN","RECEIVING"].includes(location.locationType)) throw new Error("Satılabilir ürün kalite/karantina/iade adresine alınamaz.");
    }else{
      if(hu.purpose!==HandlingUnitPurpose.RECEIVING) throw new Error("Kalite inceleme/hasarlı iade RECEIVING amaçlı THM'e alınmalıdır.");
      if(!["QUALITY","QUARANTINE","RETURN"].includes(location.locationType)) throw new Error("Satılabilir olmayan iade QUALITY, QUARANTINE veya RETURN adresine alınmalıdır.");
    }

    const grossUnit=item.orderItem.quantity>0?item.orderItem.lineTotal/item.orderItem.quantity:item.orderItem.unitPrice;
    const refundStatus=sellable?EcommerceReturnRefundStatus.ELIGIBLE:EcommerceReturnRefundStatus.REVIEW_REQUIRED;
    const refundAmount=sellable?grossUnit:0;

    await createStockMovementWithTransaction(tx,{
      warehouseId:pre.warehouseId,productId:item.productId,orderId:pre.originalOrder.id,movementType:StockMovementType.SALE_RETURN,
      physicalChange:1,reservedChange:0,documentNumber:pre.ecommerceReturn.returnNumber,
      description:`E-Ticaret İade Girişi; ön kabul ${pre.preReceiptNumber}; ${item.productCode}; kalite ${quality}; hedef THM ${hu.barcode}; hedef adres ${targetLocationCode}.`,
    });
    await tx.handlingUnitItem.upsert({where:{handling_unit_product_unique:{handlingUnitId:hu.id,productId:item.productId}},update:{quantity:{increment:1}},create:{handlingUnitId:hu.id,productId:item.productId,quantity:1,reservedStock:0}});
    await tx.handlingUnit.update({where:{id:hu.id},data:{warehouseId:pre.warehouseId,locationId:location.id,status:HandlingUnitStatus.STORED}});

    await tx.ecommerceReturnInspection.create({data:{
      ecommerceReturnId:pre.ecommerceReturn.id,ecommerceReturnItemId:item.id,productId:item.productId,qualityResult:quality,refundStatus,refundAmount,
      targetHandlingUnitId:hu.id,targetHandlingUnitBarcode:hu.barcode,targetLocationId:location.id,targetLocationCode,
      customerReason:customerReason||null,qualityNote:qualityNote||null,inspectedByUserId:profile.id,
      inspectedByName:profile.employee?`${profile.employee.firstName} ${profile.employee.lastName}`:profile.username,
    }});

    await tx.ecommerceReturnItem.update({where:{id:item.id},data:{
      receivedQuantity:{increment:1},acceptedQuantity:sellable?{increment:1}:undefined,
      rejectedQuantity:quality===EcommerceReturnQualityResult.WRONG_PRODUCT?{increment:1}:undefined,
      refundAmount:{increment:refundAmount},refundStatus,qualityResult:quality,customerReason:customerReason||item.customerReason,qualityNote:qualityNote||item.qualityNote,
    }});

    const all=await tx.ecommerceReturnItem.findMany({where:{ecommerceReturnId:pre.ecommerceReturn.id},select:{expectedQuantity:true,receivedQuantity:true,refundStatus:true,refundAmount:true}});
    const complete=all.every(x=>x.receivedQuantity>=x.expectedQuantity);
    const anyReceived=all.some(x=>x.receivedQuantity>0);
    const hasReview=all.some(x=>x.refundStatus===EcommerceReturnRefundStatus.REVIEW_REQUIRED);
    const eligibleAmount=all.reduce((s,x)=>s+x.refundAmount,0);
    const aggregateRefund=hasReview?EcommerceReturnRefundStatus.REVIEW_REQUIRED:eligibleAmount>0?EcommerceReturnRefundStatus.ELIGIBLE:EcommerceReturnRefundStatus.WAITING;
    await tx.ecommerceReturn.update({where:{id:pre.ecommerceReturn.id},data:{
      status:complete?EcommerceReturnStatus.WAREHOUSE_COMPLETED:anyReceived?EcommerceReturnStatus.RECEIVING:EcommerceReturnStatus.PRE_RECEIVED,
      refundStatus:aggregateRefund,receivedAt:pre.ecommerceReturn.receivedAt??new Date(),warehouseCompletedAt:complete?new Date():null,
    }});
    await tx.wmsOperationLog.create({data:{
      operationType:WmsOperationType.RECEIVING,module:"ECOMMERCE_RETURN",entityType:"HANDLING_UNIT",entityId:hu.id,barcode:pre.preReceiptNumber,targetBarcode:hu.barcode,
      orderId:pre.originalOrder.id,orderNumber:pre.originalOrder.orderNumber,productId:item.productId,productCode:item.productCode,productName:item.productName,
      quantity:1,warehouseId:pre.warehouseId,description:`E-Ticaret iade girişinde ${item.productCode} 1 adet kabul edildi. Kalite: ${quality}.`,
      metadata:{ecommerceReturnId:pre.ecommerceReturn.id,returnNumber:pre.ecommerceReturn.returnNumber,preReceiptId:pre.id,qualityResult:quality,refundStatus,targetLocationCode},
    }});
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,maxWait:10000,timeout:30000});
  refresh();
}

export async function createRefundApprovalRecord(formData:FormData){
  const profile=await AuthorizationService.requireAdminPortalAccess();
  const ecommerceReturnId=String(formData.get("ecommerceReturnId")??"");
  if(!ecommerceReturnId) throw new Error("İade dosyası bulunamadı.");
  await prisma.$transaction(async tx=>{
    const er=await tx.ecommerceReturn.findUnique({where:{id:ecommerceReturnId},include:{items:true,refunds:true}});
    if(!er) throw new Error("E-Ticaret iade dosyası bulunamadı.");
    if(er.status!==EcommerceReturnStatus.WAREHOUSE_COMPLETED&&er.status!==EcommerceReturnStatus.FINANCE_PENDING) throw new Error("Depo iade kontrolü tamamlanmadan finans kaydı oluşturulamaz.");
    if(er.refundStatus===EcommerceReturnRefundStatus.REVIEW_REQUIRED) throw new Error("Kalite/finans incelemesi bekleyen ürünler var.");
    const amount=er.items.reduce((s,i)=>s+i.refundAmount,0);
    if(amount<=0) throw new Error("Para iadesine uygun tutar bulunamadı.");
    if(er.refunds.some(r=>r.status===EcommerceReturnRefundStatus.REQUESTED||r.status===EcommerceReturnRefundStatus.REFUNDED)) throw new Error("Bu iade için aktif/tamamlanmış finans kaydı zaten var.");
    await tx.ecommerceReturnRefund.create({data:{
      ecommerceReturnId:er.id,amount,status:EcommerceReturnRefundStatus.REQUESTED,provider:"MANUAL_PENDING_INTEGRATION",
      requestedByUserId:profile.id,requestedByName:profile.employee?`${profile.employee.firstName} ${profile.employee.lastName}`:profile.username,requestedAt:new Date(),
    }});
    await tx.ecommerceReturn.update({where:{id:er.id},data:{status:EcommerceReturnStatus.FINANCE_PENDING,refundStatus:EcommerceReturnRefundStatus.REQUESTED}});
  });
  refresh();
}


export type EcommerceReturnProcessState={success:boolean;message:string};
export async function processEcommerceReturnItemState(_prev:EcommerceReturnProcessState,formData:FormData):Promise<EcommerceReturnProcessState>{
  try{
    await processEcommerceReturnItem(formData);
    return {success:true,message:"Ürün kabul edildi. Stok, kalite ve finans uygunluk kayıtları güncellendi."};
  }catch(error){
    return {success:false,message:error instanceof Error?error.message:"E-Ticaret iade girişi tamamlanamadı."};
  }
}


export async function resolveEcommerceReturnInspectionRefund(formData:FormData){
  await AuthorizationService.requireAdminPortalAccess();
  const inspectionId=String(formData.get("inspectionId")??"");
  const decision=norm(formData.get("decision"));
  if(!inspectionId||!["APPROVE","REJECT"].includes(decision)) throw new Error("Geçerli finans inceleme kararı gereklidir.");
  await prisma.$transaction(async tx=>{
    const inspection=await tx.ecommerceReturnInspection.findUnique({where:{id:inspectionId},include:{ecommerceReturnItem:{include:{orderItem:true}}}});
    if(!inspection) throw new Error("Kalite inceleme kaydı bulunamadı.");
    if(inspection.refundStatus!==EcommerceReturnRefundStatus.REVIEW_REQUIRED) throw new Error("Bu kayıt finans incelemesi beklemiyor.");
    const grossUnit=inspection.ecommerceReturnItem.orderItem.quantity>0?inspection.ecommerceReturnItem.orderItem.lineTotal/inspection.ecommerceReturnItem.orderItem.quantity:inspection.ecommerceReturnItem.orderItem.unitPrice;
    await tx.ecommerceReturnInspection.update({where:{id:inspection.id},data:{
      refundStatus:decision==="APPROVE"?EcommerceReturnRefundStatus.ELIGIBLE:EcommerceReturnRefundStatus.REJECTED,
      refundAmount:decision==="APPROVE"?grossUnit:0,
    }});
    const inspections=await tx.ecommerceReturnInspection.findMany({where:{ecommerceReturnItemId:inspection.ecommerceReturnItemId},select:{refundStatus:true,refundAmount:true}});
    const itemReview=inspections.some(x=>x.refundStatus===EcommerceReturnRefundStatus.REVIEW_REQUIRED);
    const itemEligible=inspections.some(x=>x.refundStatus===EcommerceReturnRefundStatus.ELIGIBLE);
    const itemAmount=inspections.reduce((s,x)=>s+x.refundAmount,0);
    await tx.ecommerceReturnItem.update({where:{id:inspection.ecommerceReturnItemId},data:{
      refundAmount:itemAmount,
      refundStatus:itemReview?EcommerceReturnRefundStatus.REVIEW_REQUIRED:itemEligible?EcommerceReturnRefundStatus.ELIGIBLE:EcommerceReturnRefundStatus.REJECTED,
    }});
    const allItems=await tx.ecommerceReturnItem.findMany({where:{ecommerceReturnId:inspection.ecommerceReturnId},select:{refundStatus:true,refundAmount:true}});
    const hasReview=allItems.some(x=>x.refundStatus===EcommerceReturnRefundStatus.REVIEW_REQUIRED);
    const hasEligible=allItems.some(x=>x.refundStatus===EcommerceReturnRefundStatus.ELIGIBLE);
    await tx.ecommerceReturn.update({where:{id:inspection.ecommerceReturnId},data:{refundStatus:hasReview?EcommerceReturnRefundStatus.REVIEW_REQUIRED:hasEligible?EcommerceReturnRefundStatus.ELIGIBLE:EcommerceReturnRefundStatus.REJECTED}});
  });
  refresh();
}

export async function markEcommerceRefundCompleted(formData:FormData){
  const profile=await AuthorizationService.requireAdminPortalAccess();
  const refundId=String(formData.get("refundId")??"");
  const providerReference=String(formData.get("providerReference")??"").trim();
  if(!refundId||!providerReference) throw new Error("Finans kaydı ve ödeme/iade referansı zorunludur.");
  await prisma.$transaction(async tx=>{
    const refund=await tx.ecommerceReturnRefund.findUnique({where:{id:refundId},include:{ecommerceReturn:true}});
    if(!refund) throw new Error("Finans iade kaydı bulunamadı.");
    if(refund.status!==EcommerceReturnRefundStatus.REQUESTED) throw new Error("Finans kaydı tamamlanmaya uygun değil.");
    await tx.ecommerceReturnRefund.update({where:{id:refund.id},data:{status:EcommerceReturnRefundStatus.REFUNDED,providerReference,completedAt:new Date(),requestedByUserId:refund.requestedByUserId??profile.id}});
    await tx.ecommerceReturn.update({where:{id:refund.ecommerceReturnId},data:{status:EcommerceReturnStatus.COMPLETED,refundStatus:EcommerceReturnRefundStatus.REFUNDED,financeCompletedAt:new Date()}});
  });
  refresh();
}


export async function closeEcommerceReturnWithoutRefund(formData:FormData){
  await AuthorizationService.requireAdminPortalAccess();
  const ecommerceReturnId=String(formData.get("ecommerceReturnId")??"");
  const er=await prisma.ecommerceReturn.findUnique({where:{id:ecommerceReturnId}});
  if(!er) throw new Error("E-Ticaret iade dosyası bulunamadı.");
  if(er.status!==EcommerceReturnStatus.WAREHOUSE_COMPLETED||er.refundStatus!==EcommerceReturnRefundStatus.REJECTED) throw new Error("İade dosyası para iadesiz kapatmaya uygun değil.");
  await prisma.ecommerceReturn.update({where:{id:er.id},data:{status:EcommerceReturnStatus.COMPLETED,financeCompletedAt:new Date()}});
  refresh();
}
