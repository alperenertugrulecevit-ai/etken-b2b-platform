"use server";

import { revalidatePath } from "next/cache";
import { FulfillmentProgressStatus, OrderStatus, PickingShortageStatus, Prisma, StockMovementType, WaveStatus, WmsOperationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
import { ZonePickingService } from "@/lib/wms/zone-picking-service";
import { createStockMovementWithTransaction } from "@/lib/stock/stock-service";

function n(fd:FormData,key:string){const v=Number(fd.get(key));if(!Number.isInteger(v)||v<=0)throw new Error("Geçersiz kayıt.");return v;}
function s(fd:FormData,key:string){return String(fd.get(key)??"").trim();}

export async function reopenPickingShortageAction(fd:FormData){
 const user=await AuthorizationService.requirePermission("WAVE_MANAGE");
 const shortageId=n(fd,"shortageId"), note=s(fd,"note");
 const actorName=user.employee?`${user.employee.firstName} ${user.employee.lastName}`:user.username;
 await prisma.$transaction(async tx=>{
  const sh=await tx.pickingShortage.findUnique({where:{id:shortageId},select:{
   id:true,status:true,quantity:true,orderId:true,orderItemId:true,productId:true,
   order:{select:{orderNumber:true,status:true,fulfillmentWarehouseId:true,dispatchLines:{take:1,select:{id:true}},waveOrders:{where:{wave:{status:{in:[WaveStatus.RELEASED,WaveStatus.IN_PROGRESS,WaveStatus.PAUSED]}}},select:{waveId:true,wave:{select:{warehouseId:true}}}}}},
   orderItem:{select:{productCode:true,productName:true}}
  }});
  if(!sh||sh.status!==PickingShortageStatus.ACTIVE)throw new Error("Aktif eksik kapatma kaydı bulunamadı.");
  if(["PACKING","READY_TO_SHIP","SHIPPED","DELIVERED","CANCELLED"].includes(sh.order.status))throw new Error("Sipariş paketleme/sevk aşamasına geçtiği için basit yeniden toplama açılamaz.");
  if(sh.order.dispatchLines.length>0)throw new Error("Sipariş için irsaliye/dispatch kaydı bulunduğundan yeniden toplama açılamaz.");

  await tx.pickingShortage.update({where:{id:sh.id},data:{status:PickingShortageStatus.REOPENED,reopenedAt:new Date(),reopenedByUserId:user.id,reopenedByName:actorName,reopenNote:note||"Sistem operatörü tarafından yeniden toplamaya açıldı."}});

  const waveId=sh.order.waveOrders[0]?.waveId??null;
  const reservationWarehouseId=sh.order.fulfillmentWarehouseId??sh.order.waveOrders[0]?.wave.warehouseId??null;
  if(!reservationWarehouseId)throw new Error("Yeniden açılacak miktarın rezervasyon deposu bulunamadı.");
  await createStockMovementWithTransaction(tx,{productId:sh.productId,warehouseId:reservationWarehouseId,orderId:sh.orderId,movementType:StockMovementType.RESERVATION_CREATE,physicalChange:0,reservedChange:sh.quantity,documentNumber:sh.order.orderNumber,description:"Yanlış eksik kapatma geri alındı; miktar yeniden rezerve edildi."});
  if(waveId){
   await tx.wave.update({where:{id:waveId},data:{status:WaveStatus.IN_PROGRESS,completedAt:null}});
   await tx.waveOrder.update({where:{wave_order_unique:{waveId,orderId:sh.orderId}},data:{isCompleted:false,completedAt:null}});
  } else {
   if(!sh.order.fulfillmentWarehouseId)throw new Error("Siparişin toplama deposu bulunamadı.");
   await ZonePickingService.releaseOrderPlan(tx,sh.orderId);
   await ZonePickingService.buildTasksForOrders(tx,{orderIds:[sh.orderId],warehouseId:sh.order.fulfillmentWarehouseId});
  }
  const active=await tx.pickingShortage.aggregate({where:{orderId:sh.orderId,status:PickingShortageStatus.ACTIVE},_sum:{quantity:true}});
  const items=await tx.orderItem.aggregate({where:{orderId:sh.orderId},_sum:{quantity:true,pickedQuantity:true}});
  const planned=items._sum.quantity??0,picked=items._sum.pickedQuantity??0,closed=picked+(active._sum.quantity??0);
  await tx.orderFulfillment.updateMany({where:{orderId:sh.orderId},data:{pickingStatus:closed>=planned?FulfillmentProgressStatus.COMPLETED:FulfillmentProgressStatus.IN_PROGRESS,pickedQuantity:picked,pickingCompletedAt:closed>=planned?new Date():null}});
  await tx.order.update({where:{id:sh.orderId},data:{status:OrderStatus.PICKING,statusHistory:{create:{status:OrderStatus.PICKING,note:`Eksik toplama geri alındı; ${sh.quantity} adet yeniden toplamaya açıldı. ${note}`.trim(),changedByUserId:user.id,changedByUsername:actorName,visibleToCustomer:false}}}});
  await tx.wmsOperationLog.create({data:{operationType:WmsOperationType.PICKING,module:"PICKING_OPERATIONS_MONITOR",entityType:"PICKING_SHORTAGE_REOPEN",entityId:sh.id,operatorId:user.id,operatorName:actorName,orderId:sh.orderId,orderNumber:sh.order.orderNumber,productId:sh.productId,productCode:sh.orderItem.productCode,productName:sh.orderItem.productName,quantity:sh.quantity,description:"Eksik kapatma sistem operatörü tarafından geri alındı ve yeniden toplamaya açıldı.",metadata:{shortageId:sh.id,waveId,note}}});
 },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
 revalidatePath("/admin/picking-operations");revalidatePath("/rf/picking");revalidatePath("/rf/wave-picking");
}

export async function refreshPickingReservationAction(fd:FormData){
 const user=await AuthorizationService.requirePermission("WAVE_MANAGE");
 const orderId=n(fd,"orderId"), note=s(fd,"note");
 const actorName=user.employee?`${user.employee.firstName} ${user.employee.lastName}`:user.username;
 const result=await prisma.$transaction(async tx=>{
  const order=await tx.order.findUnique({where:{id:orderId},select:{
   id:true,orderNumber:true,status:true,fulfillmentWarehouseId:true,
   items:{select:{id:true,quantity:true,pickedQuantity:true,pickingShortages:{where:{status:PickingShortageStatus.ACTIVE},select:{id:true,quantity:true}}}},
   waveOrders:{where:{wave:{status:{in:[WaveStatus.RELEASED,WaveStatus.IN_PROGRESS,WaveStatus.PAUSED]}}},select:{waveId:true}}
  }});
  if(!order)throw new Error("Sipariş bulunamadı.");
  if(["PACKING","READY_TO_SHIP","SHIPPED","DELIVERED","CANCELLED"].includes(order.status))throw new Error("Sipariş paketleme/sevk aşamasına geçtiği için rezervasyon yenilenemez.");
  const open=order.items.reduce((sum,item)=>sum+Math.max(0,item.quantity-item.pickedQuantity-item.pickingShortages.reduce((a,r)=>a+r.quantity,0)),0);
  if(open<=0)throw new Error("Siparişte yeniden rezerve edilecek açık toplama ihtiyacı yok.");

  const waveId=order.waveOrders[0]?.waveId??null;
  if(waveId){
   const wave=await tx.wave.findUnique({where:{id:waveId},select:{warehouseId:true,orders:{select:{orderId:true}}}});
   if(!wave)throw new Error("Wave bulunamadı.");
   if(!wave.warehouseId)throw new Error("Wave'in toplama deposu bulunamadı.");
   // Wave rezervasyon yenileme tüm Wave'i atomik olarak yeniden planlar.
   // Böylece daha önce stoksuz olduğu için RF'de görünmeyen ürün, stok geldiyse
   // kaynak THM + adres planı oluştuğu anda RF görev havuzuna girer.
   await ZonePickingService.releaseWavePlan(tx,waveId);
   await ZonePickingService.buildTasksForOrders(tx,{
    orderIds:wave.orders.map(row=>row.orderId),
    warehouseId:wave.warehouseId,
    waveId,
    allowPartialStock:true,
   });
   await tx.wave.update({where:{id:waveId},data:{status:WaveStatus.IN_PROGRESS,completedAt:null}});
   await tx.waveOrder.updateMany({where:{waveId},data:{isCompleted:false,completedAt:null}});
  }else{
   if(!order.fulfillmentWarehouseId)throw new Error("Siparişin toplama deposu bulunamadı.");
   await ZonePickingService.releaseOrderPlan(tx,orderId);
   await ZonePickingService.buildTasksForOrders(tx,{orderIds:[orderId],warehouseId:order.fulfillmentWarehouseId});
  }
  await tx.order.update({where:{id:orderId},data:{status:OrderStatus.PICKING,statusHistory:{create:{status:OrderStatus.PICKING,note:`Toplama rezervasyonu ${actorName} tarafından yenilendi. ${note}`.trim(),changedByUserId:user.id,changedByUsername:actorName,visibleToCustomer:false}}}});
  await tx.wmsOperationLog.create({data:{operationType:WmsOperationType.PICKING,module:"PICKING_OPERATIONS_MONITOR",entityType:"PICKING_RESERVATION_REFRESH",entityId:orderId,operatorId:user.id,operatorName:actorName,orderId,orderNumber:order.orderNumber,quantity:open,description:`Açık ${open} adet için toplama rezervasyonu/görevi yenilendi. ${note}`.trim(),metadata:{waveId,openQuantity:open}}});
  return {open,waveId};
 },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
 revalidatePath("/admin/picking-operations");revalidatePath("/rf/picking");revalidatePath("/rf/wave-picking");
 return;
}

export async function closePickingTaskAction(fd:FormData){
 const user=await AuthorizationService.requirePermission("WAVE_MANAGE");
 const orderId=n(fd,"orderId"),note=s(fd,"note");
 const actorName=user.employee?`${user.employee.firstName} ${user.employee.lastName}`:user.username;
 const order=await prisma.order.findUnique({where:{id:orderId},select:{orderNumber:true,items:{select:{quantity:true,pickedQuantity:true,pickingShortages:{where:{status:PickingShortageStatus.ACTIVE},select:{quantity:true}}}}}});
 if(!order)throw new Error("Sipariş bulunamadı.");
 const open=order.items.reduce((sum,i)=>sum+Math.max(0,i.quantity-i.pickedQuantity-i.pickingShortages.reduce((a,r)=>a+r.quantity,0)),0);
 if(open>0)throw new Error(`Görevde ${open} adet açık ihtiyaç var. Önce eksik kapatma yapılmalıdır.`);
 await prisma.zonePickTask.updateMany({where:{orderId,status:{in:["OPEN","CLAIMED","IN_PROGRESS"]}},data:{status:"COMPLETED",completedAt:new Date()}});
 await prisma.wmsOperationLog.create({data:{operationType:WmsOperationType.PICKING,module:"PICKING_OPERATIONS_MONITOR",entityType:"PICKING_TASK_CLOSE",entityId:orderId,operatorId:user.id,operatorName:actorName,orderId,orderNumber:order.orderNumber,description:`Toplama görevi sistem operatörü tarafından kapatıldı. ${note}`.trim()}});
 revalidatePath("/admin/picking-operations");revalidatePath("/rf/picking");
}
