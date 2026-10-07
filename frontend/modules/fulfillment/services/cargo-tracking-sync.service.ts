import "server-only";
import {CargoTrackingEventStatus,OrderStatus,Prisma} from "@prisma/client";
import {prisma} from "@/lib/prisma";
import type {CargoProviderAdapter,CargoStatusResult} from "./cargo-provider-adapter";

function statusOf(value:string):CargoTrackingEventStatus{const v=value.toUpperCase().replace(/[ -]+/g,"_");return (Object.values(CargoTrackingEventStatus) as string[]).includes(v)?v as CargoTrackingEventStatus:CargoTrackingEventStatus.UNKNOWN;}
export class CargoTrackingSyncService{
 static async record(orderId:number,provider:string,result:CargoStatusResult){
  const order=await prisma.order.findUnique({where:{id:orderId},select:{id:true,cargoTrackingNumber:true,status:true}});
  if(!order||!order.cargoTrackingNumber)throw new Error("Kargo takipli sipariş bulunamadı.");
  const eventAt=result.deliveredAt??new Date(); const status=statusOf(result.status);
  const externalEventId=`${status}:${eventAt.toISOString()}`;
  await prisma.cargoTrackingEvent.upsert({where:{provider_trackingNumber_externalEventId:{provider,trackingNumber:result.trackingNumber,externalEventId}},update:{description:result.status,rawPayload:result.raw as Prisma.InputJsonValue},create:{orderId,provider,trackingNumber:result.trackingNumber,externalEventId,status,description:result.status,eventAt,rawPayload:result.raw as Prisma.InputJsonValue}});
  if(status===CargoTrackingEventStatus.DELIVERED&&order.status===OrderStatus.SHIPPED)await prisma.order.update({where:{id:orderId},data:{status:OrderStatus.DELIVERED}});
  return {status,eventAt};
 }
 static async sync(adapter:CargoProviderAdapter,orderId:number,trackingNumber:string){return this.record(orderId,adapter.provider,await adapter.getStatus(trackingNumber));}
}
