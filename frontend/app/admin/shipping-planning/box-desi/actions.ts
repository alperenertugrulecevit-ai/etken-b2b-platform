"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

const TENANT_ID="tenant_etken",COMPANY_ID="company_etken_office";
const text=(f:FormData,n:string)=>String(f.get(n)??"").trim().toUpperCase();

export async function saveBoxDefinitionAction(formData:FormData){
 await AuthorizationService.requirePermission("SHIPPING_EXECUTE");
 const id=String(formData.get("id")??"").trim();
 const code=text(formData,"code"),boxType=text(formData,"boxType"),dimensions=text(formData,"dimensions");
 const desi=Number(formData.get("desi"));
 const warehouseIds=Array.from(new Set(formData.getAll("warehouseId").map(Number).filter(Number.isInteger)));
 if(!code||!boxType||!dimensions||!Number.isFinite(desi)||desi<=0) throw new Error("Koli kodu, koli tipi, ölçü ve pozitif desi zorunludur.");
 if(!warehouseIds.length) throw new Error("En az bir depo seçin.");
 const data={code,boxType,dimensions,desi,warehouses:{create:warehouseIds.map(warehouseId=>({warehouseId}))}};
 if(id){
  const row=await prisma.shippingBoxDefinition.findFirst({where:{id,tenantId:TENANT_ID,companyId:COMPANY_ID},select:{id:true}});
  if(!row) throw new Error("Koli tanımı bulunamadı.");
  await prisma.$transaction(async tx=>{await tx.shippingBoxDefinitionWarehouse.deleteMany({where:{boxDefinitionId:id}});await tx.shippingBoxDefinition.update({where:{id},data});});
 }else await prisma.shippingBoxDefinition.create({data:{tenantId:TENANT_ID,companyId:COMPANY_ID,...data}});
 revalidatePath("/admin/shipping-planning/box-desi");
}
