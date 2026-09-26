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

export async function dispatchShipmentAction(_:RfShipmentState,fd:FormData):Promise<RfShipmentState>{
 try{const r=await ShipmentPlanningService.dispatchShipment({shipmentNumber:value(fd,"shipmentNumber"),actor:await actor()});return {ok:true,message:`${r.shipmentNumber} SEVK EDİLDİ. ${r.thmCount} THM, toplam ${r.totalQuantity} adet ürün stoktan çıkıldı.`};}
 catch(e){return {ok:false,message:e instanceof Error?e.message:"Sevk işlemi tamamlanamadı."};}
}
