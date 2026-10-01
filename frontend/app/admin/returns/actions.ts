"use server";

import { randomUUID } from "crypto";
import { OrderStatus, ReturnOrderSource, ReturnOrderStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

const norm=(v:FormDataEntryValue|null)=>String(v??"").trim().toUpperCase();

export async function createReturnOrder(formData:FormData){
  await AuthorizationService.requireAdminPortalAccess();
  const orderNumber=norm(formData.get("orderNumber"));
  const sourceRaw=norm(formData.get("source"));
  const customerDocumentNo=norm(formData.get("customerDocumentNo"));
  const deliveryNoteNumber=norm(formData.get("deliveryNoteNumber"));
  const deliveryNoteDateRaw=String(formData.get("deliveryNoteDate")??"").trim();
  const note=String(formData.get("note")??"").trim()||null;
  if(!orderNumber||!customerDocumentNo||!deliveryNoteNumber||!deliveryNoteDateRaw) throw new Error("Çıkış siparişi, iade belge no, irsaliye no ve irsaliye tarihi zorunludur.");
  const source=sourceRaw==="CUSTOMER"?ReturnOrderSource.CUSTOMER:ReturnOrderSource.ETKEN;
  const deliveryNoteDate=new Date(`${deliveryNoteDateRaw}T12:00:00+03:00`);
  if(Number.isNaN(deliveryNoteDate.getTime())) throw new Error("İrsaliye tarihi geçerli değil.");

  const order=await prisma.order.findUnique({where:{orderNumber},include:{items:{include:{product:{select:{barcode:true}}}},customer:{select:{companyName:true}}}});
  if(!order) throw new Error(`${orderNumber} çıkış siparişi bulunamadı.`);
  if(order.status!==OrderStatus.SHIPPED&&order.status!==OrderStatus.DELIVERED) throw new Error("İade giriş siparişi yalnızca SEVK EDİLDİ veya TESLİM EDİLDİ çıkış siparişleri için açılabilir.");

  const previous=await prisma.returnOrderItem.findMany({where:{orderItem:{orderId:order.id},returnOrder:{status:{not:ReturnOrderStatus.CANCELLED}}},select:{orderItemId:true,expectedQuantity:true}});
  const already=new Map<number,number>();
  for(const x of previous) already.set(x.orderItemId,(already.get(x.orderItemId)??0)+x.expectedQuantity);

  const selected=order.items.map(item=>{
    const qty=Number(formData.get(`qty_${item.id}`)??0);
    const max=Math.max(0,item.shippedQuantity-(already.get(item.id)??0));
    if(!Number.isInteger(qty)||qty<0) throw new Error(`${item.productCode} iade miktarı geçersiz.`);
    if(qty>max) throw new Error(`${item.productCode} için en fazla ${max} adet iade açılabilir.`);
    return {item,qty};
  }).filter(x=>x.qty>0);
  if(!selected.length) throw new Error("En az bir ürün için iade miktarı girilmelidir.");

  const date=new Date().toISOString().slice(0,10).replaceAll("-","");
  const returnNumber=`IAD${date}-${randomUUID().replaceAll("-","").slice(0,8).toUpperCase()}`;
  await prisma.returnOrder.create({data:{
    returnNumber,originalOrderId:order.id,source,customerDocumentNo,deliveryNoteNumber,deliveryNoteDate,note,
    items:{create:selected.map(({item,qty})=>({orderItemId:item.id,productId:item.productId,productCode:item.productCode,productBarcode:item.product.barcode,productName:item.productName,expectedQuantity:qty}))}
  }});
  revalidatePath("/admin/returns");
  revalidatePath("/rf/return-receiving");
}

export async function cancelReturnOrder(formData:FormData){
  await AuthorizationService.requireAdminPortalAccess();
  const id=String(formData.get("id")??"");
  const ro=await prisma.returnOrder.findUnique({where:{id},include:{items:true}});
  if(!ro) throw new Error("İade siparişi bulunamadı.");
  if(ro.items.some(x=>x.receivedQuantity>0)) throw new Error("Mal kabul başlamış iade siparişi iptal edilemez.");
  await prisma.returnOrder.update({where:{id},data:{status:ReturnOrderStatus.CANCELLED}});
  revalidatePath("/admin/returns");
  revalidatePath("/rf/return-receiving");
}
