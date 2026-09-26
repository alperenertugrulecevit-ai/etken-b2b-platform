"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
import { ConsolidationService } from "@/lib/wms/consolidation-service";

export async function completeConsolidation(formData: FormData) {
  await AuthorizationService.requireRfAccess("PICKING_EXECUTE");
  const taskId=String(formData.get("taskId")??"");
  const pointBarcode=String(formData.get("pointBarcode")??"").trim().toUpperCase();
  const thmBarcode=String(formData.get("thmBarcode")??"").trim().toUpperCase();
  if(!taskId || !pointBarcode || !thmBarcode) throw new Error("Konsolidasyon görevi ve noktası zorunludur.");

  const task=await prisma.consolidationTask.findUnique({where:{id:taskId},include:{order:{select:{id:true,orderNumber:true}},consolidationPoint:true}});
  if(!task) throw new Error("Konsolidasyon görevi bulunamadı.");
  if(task.status!=="READY") throw new Error("Tüm Zone görevleri tamamlanmadan konsolidasyon kapatılamaz.");

  const point=await prisma.consolidationPoint.findFirst({where:{code:pointBarcode,warehouseId:task.warehouseId,isActive:true}});
  if(!point) throw new Error("Okutulan konsolidasyon noktası aktif değil veya farklı depoya ait.");
  const hu=await prisma.handlingUnit.findFirst({where:{barcode:thmBarcode,OR:[{assignedOrderId:task.orderId},{assignedWaveId:task.waveId??undefined}],status:{in:["OPEN","STORED","CLOSED"]}}});
  if(!hu) throw new Error("Okutulan THM bu sipariş/Wave ile ilişkili değil veya kullanılamaz durumda.");

  await prisma.$transaction(async tx=>{
    await tx.consolidationTask.update({where:{id:task.id},data:{consolidationPointId:point.id,status:"IN_PROGRESS",startedAt:new Date()}});
    await ConsolidationService.complete(tx,task.orderId);
    await tx.order.updateMany({where:{id:task.orderId,status:"PICKING"},data:{status:"PACKING"}});
  });
  revalidatePath("/rf/consolidation");
  revalidatePath("/rf/packing");
  redirect(`/rf/consolidation?done=${encodeURIComponent(task.order.orderNumber)}`);
}
