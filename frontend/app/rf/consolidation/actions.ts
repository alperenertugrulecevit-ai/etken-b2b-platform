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
      include:{order:{select:{id:true,orderNumber:true}}},
    });
    if(!task) throw new Error("Konsolidasyon görevi bulunamadı.");
    if(!["READY","IN_PROGRESS"].includes(task.status)) throw new Error("Tüm Zone görevleri tamamlanmadan konsolidasyon başlatılamaz.");

    const point=await tx.consolidationPoint.findFirst({
      where:{code:pointBarcode,warehouseId:task.warehouseId,isActive:true},
    });
    if(!point) throw new Error("Okutulan konsolidasyon noktası aktif değil veya farklı depoya ait.");
    if(task.consolidationPointId && task.consolidationPointId!==point.id) throw new Error("Bu görev başka bir konsolidasyon noktasında başlatılmış.");

    const unit=await tx.consolidationTaskUnit.findFirst({
      where:{
        taskId:task.id,
        handlingUnit:{barcode:thmBarcode,status:{in:["OPEN","STORED","CLOSED"]}},
      },
      include:{handlingUnit:{select:{barcode:true}}},
    });
    if(!unit) throw new Error("Okutulan THM bu siparişin konsolidasyon listesinde bulunmuyor.");

    await tx.consolidationTaskUnit.update({
      where:{id:unit.id},
      data:{verifiedAt:unit.verifiedAt??new Date()},
    });
    await tx.consolidationTask.update({
      where:{id:task.id},
      data:{consolidationPointId:point.id,status:"IN_PROGRESS",startedAt:task.startedAt??new Date()},
    });

    const remaining=await tx.consolidationTaskUnit.count({where:{taskId:task.id,verifiedAt:null}});
    if(remaining===0){
      await ConsolidationService.complete(tx,task.orderId);
      await tx.order.updateMany({
        where:{id:task.orderId,status:{in:["PREPARING","PICKING"]}},
        data:{status:"PACKING"},
      });
    }
    return {orderNumber:task.order.orderNumber,remaining,barcode:unit.handlingUnit.barcode};
  });

  revalidatePath("/rf/consolidation");
  revalidatePath("/rf/packing");
  revalidatePath("/admin/orders");
  if(result.remaining>0){
    redirect(`/rf/consolidation?scanned=${encodeURIComponent(result.barcode)}&remaining=${result.remaining}`);
  }
  redirect(`/rf/consolidation?done=${encodeURIComponent(result.orderNumber)}`);
}
