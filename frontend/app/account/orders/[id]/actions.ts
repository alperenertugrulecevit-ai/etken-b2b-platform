"use server";

import { EcommerceReturnRefundStatus, EcommerceReturnStatus, OrderStatus, OrderType, UserType } from "@prisma/client";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { SessionService } from "@/modules/auth/services/session.service";
import { getCustomerOrderWhere } from "@/modules/b2b/services/customer-user-access.service";
import { OrderCancellationService } from "@/modules/orders/services/order-cancellation.service";

export async function cancelCustomerOrder(orderId:number, formData:FormData){
 const user=await SessionService.getCurrentUser();
 if(!user||user.userType!==UserType.CUSTOMER||!user.customerId||!user.customer?.isActive) throw new Error("Oturum açmanız gerekiyor.");
 const order=await prisma.order.findFirst({where:{id:orderId,...getCustomerOrderWhere(user)},select:{id:true,status:true}});
 if(!order) throw new Error("Sipariş bulunamadı.");
 if(order.status !== OrderStatus.PENDING && order.status !== OrderStatus.APPROVED) throw new Error("Bu sipariş artık doğrudan iptal edilemez.");
 const reason=String(formData.get("reason")??"").trim().slice(0,500);
 await OrderCancellationService.request({orderId,reason:reason||"Müşteri hesabından iptal edildi.",actor:{userId:user.id,displayName:user.fullName??user.username}});
 revalidatePath("/account/orders");
 revalidatePath("/account/orders/"+orderId);
}


export async function requestCustomerEcommerceReturn(orderId:number, formData:FormData){
 const user=await SessionService.getCurrentUser();
 if(!user||user.userType!==UserType.CUSTOMER||!user.customerId||!user.customer?.isActive) throw new Error("Oturum açmanız gerekiyor.");

 const order=await prisma.order.findFirst({
  where:{id:orderId,...getCustomerOrderWhere(user)},
  include:{items:{select:{id:true,productId:true,productCode:true,productName:true,shippedQuantity:true,product:{select:{barcode:true}}}}},
 });
 if(!order) throw new Error("Sipariş bulunamadı.");
 if(order.orderType!==OrderType.ECOMMERCE) throw new Error("Online iade talebi yalnızca e-ticaret siparişleri için kullanılabilir.");
 if(order.status!==OrderStatus.SHIPPED&&order.status!==OrderStatus.DELIVERED) throw new Error("İade talebi için siparişin sevk edilmiş veya teslim edilmiş olması gerekir.");

 const reason=String(formData.get("reason")??"").trim().slice(0,500);
 if(reason.length<5) throw new Error("İade nedenini en az 5 karakter olarak yazın.");

 await prisma.$transaction(async tx=>{
  const active=await tx.ecommerceReturn.findFirst({
   where:{originalOrderId:order.id,status:{notIn:[EcommerceReturnStatus.COMPLETED,EcommerceReturnStatus.REJECTED,EcommerceReturnStatus.CANCELLED]}},
   select:{id:true},
  });
  if(active) throw new Error("Bu sipariş için devam eden bir iade süreci zaten var.");

  const prior=await tx.ecommerceReturnItem.groupBy({
   by:["orderItemId"],where:{ecommerceReturn:{originalOrderId:order.id,status:{not:EcommerceReturnStatus.CANCELLED}}},
   _sum:{expectedQuantity:true},
  });
  const priorByItem=new Map(prior.map(row=>[row.orderItemId,row._sum.expectedQuantity??0]));
  const returnable=order.items.map(item=>{
   const maxQuantity=Math.max(0,item.shippedQuantity-(priorByItem.get(item.id)??0));
   const raw=Number(formData.get(`returnQty_${item.id}`)??0);
   const requestedQuantity=Number.isFinite(raw)?Math.max(0,Math.floor(raw)):0;
   if(requestedQuantity>maxQuantity) throw new Error(`${item.productCode} için en fazla ${maxQuantity} adet iade talebi oluşturabilirsiniz.`);
   return {item,quantity:requestedQuantity,maxQuantity};
  }).filter(row=>row.quantity>0);
  if(!returnable.length) throw new Error("İade etmek istediğiniz en az bir ürün ve adet seçin.");

  const returnNumber=`ETI-${new Date().toISOString().slice(0,10).replaceAll("-","")}-${randomUUID().replaceAll("-","").slice(0,8).toUpperCase()}`;
  await tx.ecommerceReturn.create({data:{
   returnNumber,externalReturnCode:returnNumber,originalOrderId:order.id,status:EcommerceReturnStatus.REQUESTED,refundStatus:EcommerceReturnRefundStatus.WAITING,note:reason,
   items:{create:returnable.map(({item,quantity})=>({
    orderItemId:item.id,productId:item.productId,productCode:item.productCode,productBarcode:item.product.barcode,
    productName:item.productName,expectedQuantity:quantity,customerReason:reason,
   }))},
  }});
  await tx.orderStatusHistory.create({data:{
   orderId:order.id,status:order.status,note:"İade talebiniz alındı. Kargo/depo kabul süreci bekleniyor.",
   changedByUserId:user.id,changedByUsername:user.fullName??user.username,visibleToCustomer:true,
  }});
 },{maxWait:10000,timeout:30000});

 revalidatePath("/account/orders");
 revalidatePath("/account/orders/"+orderId);
}
