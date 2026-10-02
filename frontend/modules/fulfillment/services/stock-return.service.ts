import "server-only";

import {
  HandlingUnitPurpose,
  HandlingUnitStatus,
  OrderFulfillmentFlow,
  OrderStatus,
  Prisma,
  ShipmentHandlingUnitStatus,
  ShipmentStatus,
  ShippingHandlingUnitStatus,
  StockReturnReason,
  StockReturnStage,
  WarehouseLocationType,
  WmsOperationType,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createStockMovementWithTransaction } from "@/lib/stock/stock-service";
import { FulfillmentService } from "@/modules/fulfillment/services/fulfillment.service";

type Actor={userId:string;displayName:string;terminalCode?:string|null};
type Input={orderNumber:string;sourceBarcode:string;productBarcode:string;targetBarcode:string;targetLocationCode:string;reason:StockReturnReason;actor:Actor};
const n=(v:string)=>v.trim().toUpperCase();
const locationBarcode=(x:{code:string;aisle:string;section:string;level:string;bin:string})=>[x.code,x.aisle,x.section,x.level,x.bin].map(n).filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).join("-");
const CUSTOMER_REASONS:StockReturnReason[]=[StockReturnReason.CUSTOMER_PARTIAL_CANCEL,StockReturnReason.CUSTOMER_FULL_CANCEL];

async function recalcShipment(tx:Prisma.TransactionClient,shipmentId:string){
 const shipment=await tx.shipment.findUnique({where:{id:shipmentId},select:{status:true}});
 if(!shipment||shipment.status===ShipmentStatus.SHIPPED)return;
 const rows=await tx.shipmentHandlingUnit.findMany({where:{shipmentId},select:{status:true}});
 let status:ShipmentStatus=ShipmentStatus.CREATED;
 if(rows.length){
  const loaded=rows.filter(x=>x.status===ShipmentHandlingUnitStatus.LOADED).length;
  status=loaded===rows.length?ShipmentStatus.LOADED:loaded>0?ShipmentStatus.LOADING:ShipmentStatus.ROUTING;
 }
 await tx.shipment.update({where:{id:shipmentId},data:{status,loadingCompletedAt:status===ShipmentStatus.LOADED?undefined:null}});
}

export class StockReturnService{
 static async lookupOrder(orderNumberValue:string){
  const orderNumber=n(orderNumberValue);
  if(!orderNumber)throw new Error("Çıkış sipariş numarasını okutun.");
  const order=await prisma.order.findUnique({where:{orderNumber},select:{
   id:true,orderNumber:true,status:true,customer:{select:{companyName:true}},
   items:{select:{id:true,productId:true,productCode:true,productName:true,quantity:true,cancelledQuantity:true,pickedQuantity:true,packedQuantity:true,shippedQuantity:true,product:{select:{barcode:true}}}}
  }});
  if(!order)throw new Error("Çıkış siparişi bulunamadı.");
  if(order.status===OrderStatus.SHIPPED||order.status===OrderStatus.DELIVERED)throw new Error("Bu sipariş SEVK EDİLDİ. Stok Geri Alma kullanılamaz; İade Giriş sürecini kullanın.");
  if(order.status===OrderStatus.CANCELLED)throw new Error("İptal edilmiş sipariş Stok Geri Alma işlemine açık değildir.");
  const [shipping,picking]=await Promise.all([
   prisma.shippingHandlingUnitItem.findMany({where:{orderId:order.id,quantity:{gt:0}},select:{quantity:true,productId:true,productCode:true,productBarcode:true,orderItemId:true,shippingHandlingUnit:{select:{status:true,handlingUnit:{select:{barcode:true}},shipmentHandlingUnit:{select:{status:true,shipment:{select:{status:true}}}}}}}}),
   prisma.pickingRecord.findMany({where:{orderId:order.id},select:{orderItemId:true,productId:true,targetHandlingUnit:{select:{barcode:true,items:{select:{productId:true,quantity:true}}}}},orderBy:{createdAt:"desc"}})
  ]);
  const sources=new Map<string,{barcode:string;stage:string}>();
  for(const x of shipping){
   const sh=x.shippingHandlingUnit.shipmentHandlingUnit;
   if(sh?.shipment.status===ShipmentStatus.SHIPPED||x.shippingHandlingUnit.status===ShippingHandlingUnitStatus.SHIPPED)continue;
   const stage=sh?.status===ShipmentHandlingUnitStatus.LOADED?"LOADED":sh?"ROUTED":"PACKING";
   sources.set(x.shippingHandlingUnit.handlingUnit.barcode,{barcode:x.shippingHandlingUnit.handlingUnit.barcode,stage});
  }
  for(const x of picking){
   const q=x.targetHandlingUnit.items.find(i=>i.productId===x.productId)?.quantity??0;
   if(q>0&&!sources.has(x.targetHandlingUnit.barcode))sources.set(x.targetHandlingUnit.barcode,{barcode:x.targetHandlingUnit.barcode,stage:"PICKING"});
  }
  return {...order,items:order.items.map(i=>({...i,productBarcode:i.product.barcode,remainingDemand:Math.max(0,i.quantity-i.cancelledQuantity)})),sources:[...sources.values()]};
 }

 static async returnOne(input:Input){
  const orderNumber=n(input.orderNumber),sourceBarcode=n(input.sourceBarcode),productBarcode=n(input.productBarcode),targetBarcode=n(input.targetBarcode),targetLocationCode=n(input.targetLocationCode);
  if(!orderNumber||!sourceBarcode||!productBarcode||!targetBarcode||!targetLocationCode)throw new Error("Sipariş, kaynak THM/SVK, ürün, hedef stok THM ve hedef adres zorunludur.");
  if(sourceBarcode===targetBarcode)throw new Error("Kaynak ve hedef THM aynı olamaz.");
  return prisma.$transaction(async tx=>{
   const order=await tx.order.findUnique({where:{orderNumber},select:{id:true,orderNumber:true,status:true,fulfillment:{select:{flowType:true,waveId:true}},items:{where:{OR:[{product:{barcode:productBarcode}},{productCode:productBarcode}]},select:{id:true,productId:true,productCode:true,productName:true,quantity:true,cancelledQuantity:true,pickedQuantity:true,packedQuantity:true,shippedQuantity:true,product:{select:{barcode:true}}}}}});
   if(!order)throw new Error("Çıkış siparişi bulunamadı.");
   if(order.status===OrderStatus.SHIPPED||order.status===OrderStatus.DELIVERED)throw new Error("Sipariş SEVK EDİLDİ. Bu işlem yerine İade Giriş kullanılmalıdır.");
   if(order.status===OrderStatus.CANCELLED)throw new Error("İptal edilmiş sipariş geri alma işlemine açık değildir.");
   const item=order.items[0]; if(!item)throw new Error("Okutulan ürün bu siparişte bulunmuyor.");
   if(item.shippedQuantity>0)throw new Error("Bu ürünün sevk edilmiş miktarı var. Sevk sonrası miktar İade Giriş ile alınmalıdır.");
   if(item.pickedQuantity<=0)throw new Error("Bu ürün için geri alınabilecek toplanmış miktar bulunmuyor.");
   if(CUSTOMER_REASONS.includes(input.reason)&&item.cancelledQuantity>=item.quantity)throw new Error("Bu sipariş kalemi tamamen iptal edilmiş.");

   const source=await tx.handlingUnit.findUnique({where:{barcode:sourceBarcode},select:{id:true,barcode:true,purpose:true,warehouseId:true,items:{where:{productId:item.productId},select:{id:true,quantity:true}}}});
   if(!source||!source.warehouseId)throw new Error("Kaynak THM/SVK bulunamadı veya depo bilgisi yok.");
   const sourceItem=source.items[0]; if(!sourceItem||sourceItem.quantity<=0)throw new Error("Kaynak THM/SVK içinde okutulan ürün bulunmuyor.");

   const target=await tx.handlingUnit.findUnique({where:{barcode:targetBarcode},select:{id:true,barcode:true,purpose:true,status:true,warehouseId:true,parentUnitId:true,locationId:true,items:{select:{quantity:true}}}});
   if(!target)throw new Error("Hedef stok THM bulunamadı.");
   if(target.parentUnitId!==null)throw new Error("Hedef THM başka bir THM'ye bağlıdır.");
   if(target.status!==HandlingUnitStatus.OPEN&&target.status!==HandlingUnitStatus.EMPTY&&target.status!==HandlingUnitStatus.STORED)throw new Error("Hedef THM stok geri almaya uygun değil.");
   if(target.warehouseId!==source.warehouseId)throw new Error("Kaynak ve hedef THM aynı depoda olmalıdır.");
   const locationCandidates=await tx.warehouseLocation.findMany({where:{warehouseId:source.warehouseId,isActive:true},select:{id:true,code:true,aisle:true,section:true,level:true,bin:true,locationType:true}});
   const location=locationCandidates.find(x=>n(x.code)===targetLocationCode||locationBarcode(x)===targetLocationCode);
   if(!location)throw new Error("Hedef adres bu depoda bulunamadı veya pasif.");
   const targetHasStock=target.items.some(x=>x.quantity>0);
   if(targetHasStock&&target.locationId!==null&&target.locationId!==location.id)throw new Error("Hedef THM içinde stok bulunduğu için mevcut adresinden farklı bir adrese taşınamaz.");
   if(input.reason===StockReturnReason.DAMAGED){
    const damagedLocationTypes: WarehouseLocationType[] = [WarehouseLocationType.QUALITY, WarehouseLocationType.QUARANTINE, WarehouseLocationType.RETURN];
    if(!damagedLocationTypes.includes(location.locationType))throw new Error("Hasarlı ürün QUALITY, QUARANTINE veya RETURN tipindeki bir adrese alınmalıdır.");
    if(target.purpose!==HandlingUnitPurpose.RECEIVING)throw new Error("Hasarlı ürün için RECEIVING amaçlı karantina/iade THM kullanın.");
   }else if(target.purpose!==HandlingUnitPurpose.STOCK)throw new Error("Hedef THM STOCK amaçlı olmalıdır.");

   const shippingItem=await tx.shippingHandlingUnitItem.findUnique({where:{shipping_handling_unit_item_unique:{shippingHandlingUnitId:(await tx.shippingHandlingUnit.findUnique({where:{handlingUnitId:source.id},select:{id:true}}))?.id??"",orderItemId:item.id}},include:{shippingHandlingUnit:{include:{shipmentHandlingUnit:true,dispatchDocument:{select:{id:true,status:true}}}},shippingHandlingUnitOrder:true,dispatchLine:true}});
   let stage:StockReturnStage=StockReturnStage.PICKING;
   if(shippingItem&&shippingItem.quantity>0){
    const sh=shippingItem.shippingHandlingUnit.shipmentHandlingUnit;
    if(sh?.shipmentId){
     const shipment=await tx.shipment.findUnique({where:{id:sh.shipmentId},select:{status:true}});
     if(shipment?.status===ShipmentStatus.SHIPPED)throw new Error("Bu SVK sevk edilmiştir. İade Giriş kullanılmalıdır.");
    }
    stage=sh?.status===ShipmentHandlingUnitStatus.LOADED?StockReturnStage.LOADED:sh?StockReturnStage.ROUTED:StockReturnStage.PACKING;
    await tx.shippingHandlingUnitItem.update({where:{id:shippingItem.id},data:{quantity:{decrement:1}}});
    await tx.shippingHandlingUnitOrder.update({where:{id:shippingItem.shippingHandlingUnitOrderId},data:{plannedQuantity:{decrement:1},packedQuantity:{decrement:1}}});
    if(shippingItem.dispatchLine)await tx.dispatchDocumentLine.update({where:{id:shippingItem.dispatchLine.id},data:{quantity:{decrement:1}}});
    if(shippingItem.shippingHandlingUnit.waveDistributionId){
     const line=await tx.waveDistributionLine.findUnique({where:{wave_distribution_line_unique:{distributionId:shippingItem.shippingHandlingUnit.waveDistributionId,orderItemId:item.id}},select:{id:true,distributionOrderId:true}});
     if(line){
      await tx.waveDistributionLine.update({where:{id:line.id},data:{packedQuantity:{decrement:1}}});
      await tx.waveDistributionOrder.update({where:{id:line.distributionOrderId},data:{packedQuantity:{decrement:1}}});
      await tx.waveDistribution.update({where:{id:shippingItem.shippingHandlingUnit.waveDistributionId},data:{packedQuantity:{decrement:1}}});
     }
    }
   }else{
    const pickedHere=await tx.pickingRecord.findFirst({where:{orderId:order.id,orderItemId:item.id,targetHandlingUnitId:source.id},select:{id:true}});
    if(!pickedHere)throw new Error("Kaynak THM/SVK bu sipariş ürünüyle eşleşmiyor.");
   }

   await tx.handlingUnitItem.update({where:{id:sourceItem.id},data:{quantity:{decrement:1}}});
   await tx.handlingUnitItem.upsert({where:{handling_unit_product_unique:{handlingUnitId:target.id,productId:item.productId}},update:{quantity:{increment:1}},create:{handlingUnitId:target.id,productId:item.productId,quantity:1,reservedStock:0}});
   await tx.handlingUnit.update({where:{id:target.id},data:{locationId:location.id,status:HandlingUnitStatus.STORED}});
   await tx.orderItem.update({where:{id:item.id},data:{pickedQuantity:{decrement:1},...(shippingItem?{packedQuantity:{decrement:1}}:{}),...(CUSTOMER_REASONS.includes(input.reason)?{cancelledQuantity:{increment:1}}:{})}});

   const sourceRemaining=await tx.handlingUnitItem.aggregate({where:{handlingUnitId:source.id},_sum:{quantity:true}});
   if((sourceRemaining._sum.quantity??0)<=0){
    await tx.handlingUnit.update({where:{id:source.id},data:{status:HandlingUnitStatus.EMPTY}});
    if(shippingItem?.shippingHandlingUnit.shipmentHandlingUnit){
     const sh=shippingItem.shippingHandlingUnit.shipmentHandlingUnit;
     await tx.shipmentHandlingUnit.delete({where:{id:sh.id}});
     await recalcShipment(tx,sh.shipmentId);
    }
   }

   await tx.stockReturnEvent.create({data:{orderId:order.id,orderItemId:item.id,productId:item.productId,reason:input.reason,stage,quantity:1,sourceHandlingUnitId:source.id,targetHandlingUnitId:target.id,targetLocationId:location.id,productCode:item.productCode,productBarcode:item.product.barcode,productName:item.productName,sourceBarcode:source.barcode,targetBarcode:target.barcode,targetLocationCode:location.code,operatorId:input.actor.userId,operatorName:input.actor.displayName,terminalCode:input.actor.terminalCode??null}});
   await createStockMovementWithTransaction(tx,{warehouseId:source.warehouseId,productId:item.productId,orderId:order.id,movementType:StockMovementType.STOCK_RETURN,physicalChange:0,reservedChange:0,documentNumber:order.orderNumber,description:`Sevk öncesi stoğa geri alma; neden ${input.reason}; aşama ${stage}; kaynak ${source.barcode}; hedef ${target.barcode}; adres ${locationBarcode(location)}.`});
   await tx.wmsOperationLog.create({data:{operationType:WmsOperationType.ITEM_TRANSFER,module:"RF_STOCK_RETURN",entityType:"ORDER",entityId:order.id,operatorId:input.actor.userId,operatorName:input.actor.displayName,terminalCode:input.actor.terminalCode??null,barcode:order.orderNumber,sourceBarcode:source.barcode,targetBarcode:target.barcode,orderId:order.id,orderNumber:order.orderNumber,productId:item.productId,productCode:item.productCode,productName:item.productName,quantity:1,warehouseId:source.warehouseId,targetLocationId:location.id,targetLocationCode:location.code,previousStatus:stage,newStatus:"STOCK",description:`${item.productCode} 1 adet sevk öncesi stoğa geri alındı.`,metadata:{reason:input.reason,stage}}});

   const flow=order.fulfillment?.flowType??OrderFulfillmentFlow.DIRECT_ORDER;
   const progress=await FulfillmentService.refreshOrderProgress(tx,{orderId:order.id,flowType:flow,waveId:order.fulfillment?.waveId??null});
   if(CUSTOMER_REASONS.includes(input.reason)&&progress.planned===0)await tx.order.update({where:{id:order.id},data:{status:OrderStatus.CANCELLED,stockReserved:false}});
   return {orderNumber:order.orderNumber,productCode:item.productCode,productName:item.productName,stage,reason:input.reason,targetBarcode:target.barcode,targetLocationCode:location.code,remainingDemand:Math.max(0,item.quantity-item.cancelledQuantity-(CUSTOMER_REASONS.includes(input.reason)?1:0)-(item.pickedQuantity-1))};
  },{maxWait:10000,timeout:30000,isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
 }
}
