"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
import { ConsolidationService } from "@/lib/wms/consolidation-service";

export async function completeConsolidation(formData: FormData) {
  await AuthorizationService.requireRfAccess("PICKING_EXECUTE");
  const taskId=String(formData.get("taskId")??"").trim();
  const pointBarcode=String(formData.get("pointBarcode")??"").trim().toUpperCase();
  const thmBarcode=String(formData.get("thmBarcode")??"").trim().toUpperCase();
  if(!taskId || !pointBarcode || !thmBarcode) throw new Error("Konsolidasyon görevi, nokta ve THM barkodu zorunludur.");

  const result=await prisma.$transaction(async tx=>{
    const task=await tx.consolidationTask.findUnique({
      where:{id:taskId},
      include:{order:{select:{id:true,orderNumber:true}},consolidationPoint:true},
    });
    if(!task) throw new Error("Konsolidasyon görevi bulunamadı.");
    if(task.status!=="READY") throw new Error("Tüm Zone görevleri tamamlanmadan konsolidasyon kapatılamaz.");

    const point=await tx.consolidationPoint.findFirst({
      where:{code:pointBarcode,warehouseId:task.warehouseId,isActive:true},
    });
    if(!point) throw new Error("Okutulan konsolidasyon noktası aktif değil veya farklı depoya ait.");

    const hu=await tx.handlingUnit.findFirst({
      where:{
        barcode:thmBarcode,
        status:{in:["OPEN","STORED","CLOSED"]},
        ...(task.waveId ? {assignedWaveId:task.waveId} : {assignedOrderId:task.orderId}),
        targetPickingRecords:{some:{orderId:task.orderId}},
      },
      select:{id:true,barcode:true},
    });
    if(!hu) throw new Error("Okutulan THM bu siparişin toplanmış ürünlerini içermiyor veya farklı sipariş/Wave'e ait.");

    await tx.consolidationTask.update({
      where:{id:task.id},
      data:{consolidationPointId:point.id,status:"IN_PROGRESS",startedAt:new Date()},
    });
    await ConsolidationService.complete(tx,task.orderId);
    await tx.order.updateMany({
      where:{id:task.orderId,status:{in:["PREPARING","PICKING"]}},
      data:{status:"PACKING"},
    });
    return {orderNumber:task.order.orderNumber};
  });

  revalidatePath("/rf/consolidation");
  revalidatePath("/rf/packing");
  revalidatePath("/admin/orders");
  redirect(`/rf/consolidation?done=${encodeURIComponent(result.orderNumber)}`);
}
