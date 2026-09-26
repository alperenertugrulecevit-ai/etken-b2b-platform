"use server";
import { revalidatePath } from "next/cache";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
import { ShipmentPlanningService } from "@/modules/fulfillment/services/shipment-planning.service";

export type RfShipmentState={ok:boolean;message:string};


async function actor(){
 const p=await AuthorizationService.requireRfAccess("SHIPPING_EXECUTE");
 return {userId:p.id,displayName:p.employee?`${p.employee.firstName} ${p.employee.lastName}`:p.username,terminalCode:null};
}
function value(fd:FormData,key:string){return String(fd.get(key)??"").trim();}
export async function routeShipmentAction(_:RfShipmentState,fd:FormData):Promise<RfShipmentState>{
 try{const r=await ShipmentPlanningService.routeUnit({shipmentNumber:value(fd,"shipmentNumber"),thmBarcode:value(fd,"thmBarcode"),routeNumber:value(fd,"routeNumber"),actor:await actor()}); revalidatePath("/rf/shipment-routing"); return {ok:true,message:`${r.thmBarcode} → ${r.routeNumber} ${r.rerouted?"yeniden rotalandı":"rotalandı"}.`};}
 catch(e){return {ok:false,message:e instanceof Error?e.message:"ROTA işlemi tamamlanamadı."};}
}
export async function completeRoutingAction(_:RfShipmentState,fd:FormData):Promise<RfShipmentState>{
 try{await AuthorizationService.requireRfAccess("SHIPPING_EXECUTE"); const n=value(fd,"shipmentNumber"); await ShipmentPlanningService.completeRouting(n); return {ok:true,message:`${n} rotalaması tamamlandı. Araç yüklemeye geçilebilir.`};}
 catch(e){return {ok:false,message:e instanceof Error?e.message:"Rotalama tamamlanamadı."};}
}
export async function loadShipmentAction(_:RfShipmentState,fd:FormData):Promise<RfShipmentState>{
 try{const r=await ShipmentPlanningService.loadUnit({shipmentNumber:value(fd,"shipmentNumber"),thmBarcode:value(fd,"thmBarcode"),actor:await actor()}); return {ok:true,message:`${r.thmBarcode} araca yüklendi.${r.completed?" Sevkiyattaki tüm THM'ler yüklendi.":""}`};}
 catch(e){return {ok:false,message:e instanceof Error?e.message:"Araç yükleme tamamlanamadı."};}
}
export async function removeShipmentAction(_:RfShipmentState,fd:FormData):Promise<RfShipmentState>{
 try{const r=await ShipmentPlanningService.removeUnit({thmBarcode:value(fd,"thmBarcode"),actor:await actor()}); return {ok:true,message:`${r.thmBarcode}, ${r.shipmentNumber} sevkiyatından çıkartıldı ve yeniden rotalanabilir.`};}
 catch(e){return {ok:false,message:e instanceof Error?e.message:"Sevkiyat bozma tamamlanamadı."};}
}


export async function preDispatchCheckAction(_:RfShipmentState,fd:FormData):Promise<RfShipmentState>{
 try{await AuthorizationService.requireRfAccess("SHIPPING_EXECUTE");const r=await ShipmentPlanningService.preDispatchCheck(value(fd,"shipmentNumber"));const summary=`${r.shipmentNumber} · Araç: ${r.vehicle} · THM: ${r.loaded}/${r.total}`;return r.ready?{ok:true,message:`${summary} · SEVKE HAZIR.`}:{ok:false,message:`${summary} · ${r.issues.join(" ")}`};}
 catch(e){return {ok:false,message:e instanceof Error?e.message:"Sevk öncesi kontrol tamamlanamadı."};}
}

export async function dispatchShipmentAction(_:RfShipmentState,fd:FormData):Promise<RfShipmentState>{
 try{const r=await ShipmentPlanningService.dispatchShipment({shipmentNumber:value(fd,"shipmentNumber"),actor:await actor()});return {ok:true,message:`${r.shipmentNumber} SEVK EDİLDİ. ${r.thmCount} THM, toplam ${r.totalQuantity} adet ürün stoktan çıkıldı.`};}
 catch(e){return {ok:false,message:e instanceof Error?e.message:"Sevk işlemi tamamlanamadı."};}
}

export async function lookupShipmentRemovalAction(_:RfShipmentState,fd:FormData):Promise<RfShipmentState & {detail?:{thmBarcode:string;shipmentNumber:string;routeNumber:string;carrier:string;vehicle:string;status:string;loadedAt:string;loadedBy:string}}>{
 try{await AuthorizationService.requireRfAccess("SHIPPING_EXECUTE");const r=await ShipmentPlanningService.lookupRemoval(value(fd,"thmBarcode"));return {ok:true,message:"THM sevkiyat bilgileri bulundu.",detail:{thmBarcode:r.shippingHandlingUnit.handlingUnit.barcode,shipmentNumber:r.shipment.shipmentNumber,routeNumber:r.route.routeNumber,carrier:r.shipment.carrier?.name??"-",vehicle:r.shipment.vehicle?.plate??"-",status:r.status==="LOADED"?"YÜKLENDİ":"ROTALANDI",loadedAt:r.loadedAt?.toLocaleString("tr-TR")??"-",loadedBy:r.loadedByName??"-"}};}
 catch(e){return {ok:false,message:e instanceof Error?e.message:"THM sevkiyat bilgisi bulunamadı."};}
}
