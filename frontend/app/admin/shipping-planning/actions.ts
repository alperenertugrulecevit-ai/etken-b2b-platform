"use server";
import { ShippingVehicleOwnershipType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
import { ShipmentPlanningService } from "@/modules/fulfillment/services/shipment-planning.service";
export type ShippingAdminState={success:boolean;message:string}; 
const v=(f:FormData,k:string)=>String(f.get(k)??"").trim();
async function auth(){const p=await AuthorizationService.requirePermission("SHIPPING_EXECUTE");return {userId:p.id,displayName:p.employee?`${p.employee.firstName} ${p.employee.lastName}`:p.username};}
function fail(e:unknown):ShippingAdminState{return {success:false,message:e instanceof Error?e.message:"İşlem tamamlanamadı."}}
export async function createCarrierAction(_:ShippingAdminState,f:FormData):Promise<ShippingAdminState>{try{await auth();await ShipmentPlanningService.createCarrier({code:v(f,"code"),name:v(f,"name"),taxNumber:v(f,"taxNumber"),phone:v(f,"phone"),email:v(f,"email"),address:v(f,"address"),contactName:v(f,"contactName"),notes:v(f,"notes")});revalidatePath("/admin/shipping-planning/carriers");return {success:true,message:"Taşıyıcı kaydedildi."}}catch(e){return fail(e)}}
export async function createVehicleAction(_:ShippingAdminState,f:FormData):Promise<ShippingAdminState>{try{await auth();await ShipmentPlanningService.createVehicle({code:v(f,"code"),plate:v(f,"plate"),vehicleType:v(f,"vehicleType"),ownershipType:v(f,"ownershipType")==="RENTED"?ShippingVehicleOwnershipType.RENTED:ShippingVehicleOwnershipType.OWNED,carrierId:v(f,"carrierId"),registrationNo:v(f,"registrationNo"),driverName:v(f,"driverName"),driverPhone:v(f,"driverPhone"),driverIdentityNo:v(f,"driverIdentityNo"),notes:v(f,"notes")});revalidatePath("/admin/shipping-planning/vehicles");return {success:true,message:"Araç kaydedildi."}}catch(e){return fail(e)}}
export async function createRouteAction(_:ShippingAdminState,f:FormData):Promise<ShippingAdminState>{try{await auth();await ShipmentPlanningService.createRoute({routeNumber:v(f,"routeNumber"),name:v(f,"name"),description:v(f,"description")});revalidatePath("/admin/shipping-planning/routes");return {success:true,message:"Rota kaydedildi."}}catch(e){return fail(e)}}
export async function createShipmentAction(_:ShippingAdminState,f:FormData):Promise<ShippingAdminState>{try{const a=await auth();const d=new Date(v(f,"shipmentDate")+"T12:00:00");const r=await ShipmentPlanningService.createShipment({shipmentDate:d,carrierId:v(f,"carrierId"),vehicleId:v(f,"vehicleId"),routeIds:f.getAll("routeIds").map(String),driverName:v(f,"driverName"),driverPhone:v(f,"driverPhone"),driverIdentityNo:v(f,"driverIdentityNo"),notes:v(f,"notes"),actor:a});revalidatePath("/admin/shipping-planning");return {success:true,message:`${r.shipmentNumber} sevkiyat numarası oluşturuldu.`}}catch(e){return fail(e)}}

export async function setCarrierActiveAction(f:FormData){await auth();await ShipmentPlanningService.setCarrierActive(v(f,"id"),v(f,"active")==="true");revalidatePath("/admin/shipping-planning/carriers");}
export async function setVehicleActiveAction(f:FormData){await auth();await ShipmentPlanningService.setVehicleActive(v(f,"id"),v(f,"active")==="true");revalidatePath("/admin/shipping-planning/vehicles");}
export async function setRouteActiveAction(f:FormData){await auth();await ShipmentPlanningService.setRouteActive(v(f,"id"),v(f,"active")==="true");revalidatePath("/admin/shipping-planning/routes");}

export async function bulkPlanShipmentAction(f:FormData){
 const a=await auth();
 const shipmentId=v(f,"shipmentId"),routeId=v(f,"routeId"),shippingHandlingUnitIds=f.getAll("shippingHandlingUnitIds").map(String);
 await ShipmentPlanningService.bulkRouteUnits({shipmentId,routeId,shippingHandlingUnitIds,actor:a});
 revalidatePath("/admin/shipping-planning");
 revalidatePath("/admin/shipping-reports/ready");
}
