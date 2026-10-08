import "server-only";
import {CargoTrackingEventStatus,OrderStatus,Prisma} from "@prisma/client";
import {prisma} from "@/lib/prisma";
import type {CargoProviderAdapter,CargoStatusResult} from "./cargo-provider-adapter";

function statusOf(value:string):CargoTrackingEventStatus{const v=value.toUpperCase().replace(/[ -]+/g,"_");return (Object.values(CargoTrackingEventStatus) as string[]).includes(v)?v as CargoTrackingEventStatus:CargoTrackingEventStatus.UNKNOWN;}
export class CargoTrackingSyncService{
 static async record(orderId:number,provider:string,result:CargoStatusResult){
  const order=await prisma.order.findUnique({where:{id:orderId},select:{id:true,cargoTrackingNumber:true,status:true}});
  if(!order||!order.cargoTrackingNumber)throw new Error("Kargo takipli sipariş bulunamadı.");
  if(order.cargoTrackingNumber.trim()!==result.trackingNumber.trim())throw new Error("Kargo takip numarası siparişle eşleşmiyor.");
  const eventAt=result.eventAt??result.deliveredAt??new Date(); const status=statusOf(result.status);
  const externalEventId=result.externalEventId?.trim()||`${status}:${eventAt.toISOString()}`;
  const existing=await prisma.cargoTrackingEvent.findFirst({where:{provider,trackingNumber:result.trackingNumber,externalEventId},select:{id:true}});
  if(!existing){
   try{await prisma.cargoTrackingEvent.create({data:{orderId,provider,trackingNumber:result.trackingNumber,externalEventId,status,description:result.description??result.status,location:result.location??null,eventAt,rawPayload:result.raw as Prisma.InputJsonValue}});}
   catch(error){if(!(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==="P2002"))throw error;}
  }
  if(status===CargoTrackingEventStatus.DELIVERED&&order.status===OrderStatus.SHIPPED)await prisma.order.update({where:{id:orderId},data:{status:OrderStatus.DELIVERED}});
  return {status,eventAt};
 }
 static async sync(adapter:CargoProviderAdapter,orderId:number,trackingNumber:string){
  if(adapter.getEvents){const events=await adapter.getEvents(trackingNumber);for(const event of events)await this.record(orderId,adapter.provider,event);return {events:events.length};}
  return this.record(orderId,adapter.provider,await adapter.getStatus(trackingNumber));
 }
}
