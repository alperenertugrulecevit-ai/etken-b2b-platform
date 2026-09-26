import "server-only";

import {
  Prisma,
  ShipmentHandlingUnitEventType,
  ShipmentHandlingUnitStatus,
  ShipmentStatus,
  ShippingHandlingUnitStatus,
  ShippingVehicleOwnershipType,
  WmsOperationType,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

const TENANT_ID = "tenant_etken";
const COMPANY_ID = "company_etken_office";

export type ShipmentActor = { userId: string; displayName: string; terminalCode?: string | null };
export type CreateShipmentInput = {
  shipmentDate: Date; carrierId?: string | null; vehicleId?: string | null; routeIds: string[];
  driverName?: string | null; driverPhone?: string | null; driverIdentityNo?: string | null; notes?: string | null; actor: ShipmentActor;
};

function clean(v?: string | null) { const x=v?.trim(); return x || null; }
function barcode(v:string){ return v.trim().toUpperCase(); }
function istanbulDatePart(d:Date){ return new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Istanbul",year:"numeric",month:"2-digit",day:"2-digit"}).format(d).replaceAll("-",""); }
function uniqueError(e:unknown){ return e instanceof Prisma.PrismaClientKnownRequestError && e.code==="P2002"; }

async function nextNumber(tx:Prisma.TransactionClient,date:Date){
  const prefix=`SVP-${istanbulDatePart(date)}-`;
  const last=await tx.shipment.findFirst({where:{tenantId:TENANT_ID,companyId:COMPANY_ID,shipmentNumber:{startsWith:prefix}},orderBy:{shipmentNumber:"desc"},select:{shipmentNumber:true}});
  const n=last ? Number(last.shipmentNumber.slice(prefix.length))+1 : 1;
  return prefix+String(Number.isFinite(n)?n:1).padStart(4,"0");
}

async function recalc(tx:Prisma.TransactionClient,shipmentId:string){
  const shipment=await tx.shipment.findUnique({where:{id:shipmentId},select:{status:true}});
  if(!shipment || shipment.status===ShipmentStatus.SHIPPED) return;
  const rows=await tx.shipmentHandlingUnit.findMany({where:{shipmentId},select:{status:true}});
  let status: ShipmentStatus = ShipmentStatus.CREATED;
  if(rows.length){
    const loaded=rows.filter(x=>x.status===ShipmentHandlingUnitStatus.LOADED).length;
    if(loaded===rows.length) status=ShipmentStatus.LOADED;
    else if(loaded>0) status=ShipmentStatus.LOADING;
    else status=ShipmentStatus.ROUTING;
  }
  await tx.shipment.update({where:{id:shipmentId},data:{
    status,
    routingStartedAt: rows.length ? new Date() : null,
    routingCompletedAt: status===ShipmentStatus.ROUTED || status===ShipmentStatus.LOADING || status===ShipmentStatus.LOADED ? undefined : null,
    loadingStartedAt: status===ShipmentStatus.LOADING || status===ShipmentStatus.LOADED ? new Date() : null,
    loadingCompletedAt: status===ShipmentStatus.LOADED ? new Date() : null,
  }});
}

export class ShipmentPlanningService {
  static listCarriers(){ return prisma.shippingCarrier.findMany({where:{tenantId:TENANT_ID,companyId:COMPANY_ID},orderBy:[{isActive:"desc"},{name:"asc"}]}); }
  static listVehicles(){ return prisma.shippingVehicle.findMany({where:{tenantId:TENANT_ID,companyId:COMPANY_ID},include:{carrier:true},orderBy:[{isActive:"desc"},{plate:"asc"}]}); }
  static listRoutes(){ return prisma.shippingRoute.findMany({where:{tenantId:TENANT_ID,companyId:COMPANY_ID},orderBy:[{isActive:"desc"},{routeNumber:"asc"}]}); }
  static listShipments(){ return prisma.shipment.findMany({where:{tenantId:TENANT_ID,companyId:COMPANY_ID},include:{carrier:true,vehicle:true,routes:{include:{route:true}},_count:{select:{handlingUnits:true}}},orderBy:[{shipmentDate:"desc"},{createdAt:"desc"}],take:200}); }

  static createCarrier(input:{code:string;name:string;taxNumber?:string;phone?:string;email?:string;address?:string;contactName?:string;notes?:string}){
    return prisma.shippingCarrier.create({data:{tenantId:TENANT_ID,companyId:COMPANY_ID,code:input.code.trim().toUpperCase(),name:input.name.trim(),taxNumber:clean(input.taxNumber),phone:clean(input.phone),email:clean(input.email),address:clean(input.address),contactName:clean(input.contactName),notes:clean(input.notes)}});
  }
  static createVehicle(input:{code:string;plate:string;vehicleType:string;ownershipType:ShippingVehicleOwnershipType;carrierId?:string;registrationNo?:string;driverName?:string;driverPhone?:string;driverIdentityNo?:string;notes?:string}){
    return prisma.shippingVehicle.create({data:{tenantId:TENANT_ID,companyId:COMPANY_ID,code:input.code.trim().toUpperCase(),plate:input.plate.trim().toUpperCase(),vehicleType:input.vehicleType.trim(),ownershipType:input.ownershipType,carrierId:clean(input.carrierId),registrationNo:clean(input.registrationNo),driverName:clean(input.driverName),driverPhone:clean(input.driverPhone),driverIdentityNo:clean(input.driverIdentityNo),notes:clean(input.notes)}});
  }
  static createRoute(input:{routeNumber:string;name:string;description?:string}){
    return prisma.shippingRoute.create({data:{tenantId:TENANT_ID,companyId:COMPANY_ID,routeNumber:input.routeNumber.trim().toUpperCase(),name:input.name.trim(),description:clean(input.description)}});
  }

  static async createShipment(input:CreateShipmentInput){
    const routeIds=[...new Set(input.routeIds.map(x=>x.trim()).filter(Boolean))];
    if(!routeIds.length) throw new Error("Sevkiyat için en az bir rota seçilmelidir.");
    for(let attempt=0;attempt<5;attempt++){
      try{
        return await prisma.$transaction(async tx=>{
          const routes=await tx.shippingRoute.findMany({where:{id:{in:routeIds},tenantId:TENANT_ID,companyId:COMPANY_ID,isActive:true},select:{id:true}});
          if(routes.length!==routeIds.length) throw new Error("Seçilen rotalardan biri bulunamadı veya pasif.");
          const shipmentNumber=await nextNumber(tx,input.shipmentDate);
          return tx.shipment.create({data:{tenantId:TENANT_ID,companyId:COMPANY_ID,shipmentNumber,shipmentDate:input.shipmentDate,status:ShipmentStatus.CREATED,carrierId:clean(input.carrierId),vehicleId:clean(input.vehicleId),driverName:clean(input.driverName),driverPhone:clean(input.driverPhone),driverIdentityNo:clean(input.driverIdentityNo),notes:clean(input.notes),createdById:input.actor.userId,createdByName:input.actor.displayName,routes:{create:routeIds.map(routeId=>({routeId}))}},include:{carrier:true,vehicle:true,routes:{include:{route:true}}}});
        },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
      }catch(e){ if(uniqueError(e)&&attempt<4) continue; throw e; }
    }
    throw new Error("Sevkiyat numarası oluşturulamadı. İşlemi tekrar deneyin.");
  }

  static async routeUnit(input:{shipmentNumber:string;thmBarcode:string;routeNumber:string;actor:ShipmentActor}){
    const thmBarcode=barcode(input.thmBarcode), routeNumber=barcode(input.routeNumber);
    return prisma.$transaction(async tx=>{
      const shipment=await tx.shipment.findFirst({where:{tenantId:TENANT_ID,companyId:COMPANY_ID,shipmentNumber:input.shipmentNumber},include:{routes:{include:{route:true}}}});
      if(!shipment) throw new Error("Sevkiyat numarası bulunamadı.");
      if(shipment.status===ShipmentStatus.SHIPPED) throw new Error("Sevk edilmiş sevkiyata ROTA işlemi yapılamaz.");
      const route=shipment.routes.find(x=>x.route.routeNumber.toUpperCase()===routeNumber)?.route;
      if(!route) throw new Error("Okutulan rota bu sevkiyat planına bağlı değil.");
      const unit=await tx.shippingHandlingUnit.findFirst({where:{handlingUnit:{barcode:thmBarcode}},include:{handlingUnit:{select:{id:true,barcode:true}},shipmentHandlingUnit:true}});
      if(!unit) throw new Error(`${thmBarcode} barkodlu THM bulunamadı.`);
      if(unit.status!==ShippingHandlingUnitStatus.READY_TO_SHIP || !unit.packingListPrintedAt) throw new Error("THM sevke hazır ve çeki listesi basılmış olmalıdır.");
      const active=unit.shipmentHandlingUnit;
      if(active?.status===ShipmentHandlingUnitStatus.LOADED) throw new Error("THM araca yüklenmiş. Önce Sevkiyat Bozma işlemi yapın.");
      if(active && active.shipmentId!==shipment.id) throw new Error("THM başka bir sevkiyata bağlı. Önce Sevkiyat Bozma işlemi yapın.");
      if(active && active.routeId===route.id) throw new Error("THM zaten bu rotaya atanmış.");
      const now=new Date();
      if(active){
        await tx.shipmentHandlingUnit.update({where:{id:active.id},data:{routeId:route.id,routedAt:now,routedById:input.actor.userId,routedByName:input.actor.displayName,routedTerminalCode:clean(input.actor.terminalCode)}});
        await tx.shipmentHandlingUnitEvent.create({data:{shipmentId:shipment.id,shippingHandlingUnitId:unit.id,eventType:ShipmentHandlingUnitEventType.REROUTED,previousRouteId:active.routeId,newRouteId:route.id,operatorId:input.actor.userId,operatorName:input.actor.displayName,terminalCode:clean(input.actor.terminalCode),metadata:{shipmentNumber:shipment.shipmentNumber,routeNumber}}});
      }else{
        await tx.shipmentHandlingUnit.create({data:{shipmentId:shipment.id,shippingHandlingUnitId:unit.id,routeId:route.id,status:ShipmentHandlingUnitStatus.ROUTED,routedAt:now,routedById:input.actor.userId,routedByName:input.actor.displayName,routedTerminalCode:clean(input.actor.terminalCode)}});
        await tx.shipmentHandlingUnitEvent.create({data:{shipmentId:shipment.id,shippingHandlingUnitId:unit.id,eventType:ShipmentHandlingUnitEventType.ROUTED,newRouteId:route.id,operatorId:input.actor.userId,operatorName:input.actor.displayName,terminalCode:clean(input.actor.terminalCode),metadata:{shipmentNumber:shipment.shipmentNumber,routeNumber}}});
      }
      await tx.shipment.update({where:{id:shipment.id},data:{status:ShipmentStatus.ROUTING,routingStartedAt:shipment.routingStartedAt??now,routingCompletedAt:null}});
      await tx.wmsOperationLog.create({data:{operationType:WmsOperationType.OTHER,module:"RF_SHIPMENT_ROUTING",entityType:"HANDLING_UNIT",entityId:unit.handlingUnit.id,operatorId:input.actor.userId,operatorName:input.actor.displayName,terminalCode:clean(input.actor.terminalCode),barcode:thmBarcode,previousStatus:active?"ROUTED":null,newStatus:"ROUTED",description:`${thmBarcode} THM ${shipment.shipmentNumber} sevkiyatında ${route.routeNumber} rotasına atandı.`,metadata:{shipmentId:shipment.id,shipmentNumber:shipment.shipmentNumber,routeId:route.id,routeNumber:route.routeNumber}}});
      return {shipmentNumber:shipment.shipmentNumber,thmBarcode,routeNumber:route.routeNumber,rerouted:Boolean(active)};
    },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
  }

  static async completeRouting(shipmentNumber:string){
    const shipment=await prisma.shipment.findFirst({where:{tenantId:TENANT_ID,companyId:COMPANY_ID,shipmentNumber},include:{_count:{select:{handlingUnits:true}}}});
    if(!shipment) throw new Error("Sevkiyat bulunamadı.");
    if(!shipment._count.handlingUnits) throw new Error("Rotalanmış THM bulunmuyor.");
    if(shipment.status===ShipmentStatus.SHIPPED) throw new Error("Sevkiyat daha önce sevk edilmiş.");
    return prisma.shipment.update({where:{id:shipment.id},data:{status:ShipmentStatus.ROUTED,routingCompletedAt:new Date()}});
  }

  static async loadUnit(input:{shipmentNumber:string;thmBarcode:string;actor:ShipmentActor}){
    const thmBarcode=barcode(input.thmBarcode);
    return prisma.$transaction(async tx=>{
      const shipment=await tx.shipment.findFirst({where:{tenantId:TENANT_ID,companyId:COMPANY_ID,shipmentNumber:input.shipmentNumber}});
      if(!shipment) throw new Error("Sevkiyat bulunamadı.");
      if(shipment.status!==ShipmentStatus.ROUTED && shipment.status!==ShipmentStatus.LOADING) throw new Error("Araç yükleme için önce rotalamayı tamamlayın.");
      const row=await tx.shipmentHandlingUnit.findFirst({where:{shipmentId:shipment.id,shippingHandlingUnit:{handlingUnit:{barcode:thmBarcode}}},include:{shippingHandlingUnit:{include:{handlingUnit:{select:{id:true,barcode:true}}}}}});
      if(!row) throw new Error("THM seçilen sevkiyata rotalanmamış.");
      if(row.status===ShipmentHandlingUnitStatus.LOADED) throw new Error("THM daha önce araca yüklenmiş.");
      const now=new Date();
      await tx.shipmentHandlingUnit.update({where:{id:row.id},data:{status:ShipmentHandlingUnitStatus.LOADED,loadedAt:now,loadedById:input.actor.userId,loadedByName:input.actor.displayName,loadedTerminalCode:clean(input.actor.terminalCode)}});
      await tx.shipmentHandlingUnitEvent.create({data:{shipmentId:shipment.id,shippingHandlingUnitId:row.shippingHandlingUnitId,eventType:ShipmentHandlingUnitEventType.LOADED,operatorId:input.actor.userId,operatorName:input.actor.displayName,terminalCode:clean(input.actor.terminalCode),metadata:{shipmentNumber:shipment.shipmentNumber}}});
      const remaining=await tx.shipmentHandlingUnit.count({where:{shipmentId:shipment.id,status:ShipmentHandlingUnitStatus.ROUTED}});
      await tx.shipment.update({where:{id:shipment.id},data:{status:remaining===0?ShipmentStatus.LOADED:ShipmentStatus.LOADING,loadingStartedAt:shipment.loadingStartedAt??now,loadingCompletedAt:remaining===0?now:null}});
      await tx.wmsOperationLog.create({data:{operationType:WmsOperationType.OTHER,module:"RF_SHIPMENT_LOADING",entityType:"HANDLING_UNIT",entityId:row.shippingHandlingUnit.handlingUnit.id,operatorId:input.actor.userId,operatorName:input.actor.displayName,terminalCode:clean(input.actor.terminalCode),barcode:thmBarcode,previousStatus:"ROUTED",newStatus:"LOADED",description:`${thmBarcode} THM ${shipment.shipmentNumber} sevkiyatına araç yüklemesi yapıldı.`,metadata:{shipmentId:shipment.id,shipmentNumber:shipment.shipmentNumber}}});
      return {shipmentNumber:shipment.shipmentNumber,thmBarcode,completed:remaining===0};
    },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
  }

  static async lookupRemoval(thmBarcode:string){
    const code=barcode(thmBarcode);
    const row=await prisma.shipmentHandlingUnit.findFirst({where:{shippingHandlingUnit:{handlingUnit:{barcode:code}}},include:{shipment:{include:{carrier:true,vehicle:true}},route:true,shippingHandlingUnit:{include:{handlingUnit:true}}}});
    if(!row) throw new Error("THM aktif bir sevkiyata bağlı değil.");
    return row;
  }

  static async removeUnit(input:{thmBarcode:string;actor:ShipmentActor}){
    const code=barcode(input.thmBarcode);
    return prisma.$transaction(async tx=>{
      const row=await tx.shipmentHandlingUnit.findFirst({where:{shippingHandlingUnit:{handlingUnit:{barcode:code}}},include:{shipment:true,route:true,shippingHandlingUnit:{include:{handlingUnit:{select:{id:true}}}}}});
      if(!row) throw new Error("THM aktif bir sevkiyata bağlı değil.");
      if(row.shipment.status===ShipmentStatus.SHIPPED || row.shippingHandlingUnit.status===ShippingHandlingUnitStatus.SHIPPED) throw new Error("Sevk edilmiş THM normal Sevkiyat Bozma ile geri alınamaz.");
      await tx.shipmentHandlingUnitEvent.create({data:{shipmentId:row.shipmentId,shippingHandlingUnitId:row.shippingHandlingUnitId,eventType:ShipmentHandlingUnitEventType.SHIPMENT_REMOVED,previousRouteId:row.routeId,operatorId:input.actor.userId,operatorName:input.actor.displayName,terminalCode:clean(input.actor.terminalCode),metadata:{shipmentNumber:row.shipment.shipmentNumber,routeNumber:row.route.routeNumber,previousStatus:row.status}}});
      await tx.shipmentHandlingUnit.delete({where:{id:row.id}});
      await recalc(tx,row.shipmentId);
      await tx.wmsOperationLog.create({data:{operationType:WmsOperationType.OTHER,module:"RF_SHIPMENT_REMOVAL",entityType:"HANDLING_UNIT",entityId:row.shippingHandlingUnit.handlingUnit.id,operatorId:input.actor.userId,operatorName:input.actor.displayName,terminalCode:clean(input.actor.terminalCode),barcode:code,previousStatus:row.status,newStatus:"READY_TO_ROUTE",description:`${code} THM ${row.shipment.shipmentNumber} sevkiyatından çıkartıldı.`,metadata:{shipmentId:row.shipmentId,shipmentNumber:row.shipment.shipmentNumber,routeNumber:row.route.routeNumber}}});
      return {shipmentNumber:row.shipment.shipmentNumber,thmBarcode:code};
    },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
  }
  static async shippingControlReport(){
    return prisma.shipmentHandlingUnit.findMany({where:{status:ShipmentHandlingUnitStatus.ROUTED},include:{shipment:{include:{carrier:true,vehicle:true}},route:true,shippingHandlingUnit:{include:{handlingUnit:true}}},orderBy:{routedAt:"desc"},take:1000});
  }
  static async shippingLoadingReport(){
    return prisma.shipmentHandlingUnit.findMany({include:{shipment:{include:{carrier:true,vehicle:true}},route:true,shippingHandlingUnit:{include:{handlingUnit:true}}},orderBy:{updatedAt:"desc"},take:1000});
  }
  static async readyWaitingReport(){
    return prisma.shippingHandlingUnit.findMany({where:{status:ShippingHandlingUnitStatus.READY_TO_SHIP,packingListPrintedAt:{not:null},shipmentHandlingUnit:null},include:{handlingUnit:true,customer:true},orderBy:{readyAt:"asc"},take:1000});
  }

}
