"use server";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

export async function createConsolidationPoint(formData:FormData){
 await AuthorizationService.requirePermission("WAREHOUSE_MANAGE");
 const warehouseId=Number(formData.get("warehouseId"));
 const locationId=Number(formData.get("locationId"))||null;
 const code=String(formData.get("code")??"").trim().toUpperCase();
 const name=String(formData.get("name")??"").trim();
 if(!Number.isInteger(warehouseId)||warehouseId<=0||!code||!name) throw new Error("Depo, nokta kodu ve adı zorunludur.");
 if(locationId){
  const loc=await prisma.warehouseLocation.findFirst({where:{id:locationId,warehouseId,isActive:true}});
  if(!loc) throw new Error("Seçilen lokasyon aktif değil veya farklı depoya ait.");
 }
 try{await prisma.consolidationPoint.create({data:{warehouseId,locationId,code,name}})}
 catch(e){if(e instanceof Prisma.PrismaClientKnownRequestError&&e.code==="P2002") throw new Error("Bu depoda aynı konsolidasyon kodu zaten var."); throw e;}
 revalidatePath("/admin/consolidation-points");
}
export async function toggleConsolidationPoint(id:string,current:boolean){
 await AuthorizationService.requirePermission("WAREHOUSE_MANAGE");
 if(current){
  const active=await prisma.consolidationTask.count({where:{consolidationPointId:id,status:{in:["READY","IN_PROGRESS"]}}});
  if(active) throw new Error("Aktif konsolidasyon görevi bulunan nokta pasife alınamaz.");
 }
 await prisma.consolidationPoint.update({where:{id},data:{isActive:!current}});
 revalidatePath("/admin/consolidation-points");
}
