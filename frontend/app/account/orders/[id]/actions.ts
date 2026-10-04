"use server";

import { OrderStatus, UserType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { SessionService } from "@/modules/auth/services/session.service";
import { getCustomerOrderWhere } from "@/modules/b2b/services/customer-user-access.service";
import { OrderCancellationService } from "@/modules/orders/services/order-cancellation.service";

export async function cancelCustomerOrder(orderId:number, formData:FormData){
 const user=await SessionService.getCurrentUser();
 if(!user||user.userType!==UserType.CUSTOMER||!user.customerId) throw new Error("Oturum açmanız gerekiyor.");
 const order=await prisma.order.findFirst({where:{id:orderId,...getCustomerOrderWhere(user)},select:{id:true,status:true}});
 if(!order) throw new Error("Sipariş bulunamadı.");
 if(![OrderStatus.PENDING,OrderStatus.APPROVED].includes(order.status)) throw new Error("Bu sipariş artık doğrudan iptal edilemez.");
 const reason=String(formData.get("reason")??"").trim().slice(0,500);
 await OrderCancellationService.request({orderId,reason:reason||"Müşteri hesabından iptal edildi.",actor:{userId:user.id,displayName:user.fullName??user.username}});
 revalidatePath("/account/orders");
 revalidatePath("/account/orders/"+orderId);
}
