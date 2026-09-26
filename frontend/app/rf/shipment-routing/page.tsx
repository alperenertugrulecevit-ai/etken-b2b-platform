import RfRoutingForm from "@/components/rf/shipping/RfRoutingForm";
import { ShipmentPlanningService } from "@/modules/fulfillment/services/shipment-planning.service";
export default async function Page(){
 const rows=await ShipmentPlanningService.listActiveShipmentsForRf();
 return <RfRoutingForm shipments={rows.map(x=>({shipmentNumber:x.shipmentNumber,label:`${x.shipmentNumber} · ${x.carrier?.name??"Taşıyıcı yok"} · ${x.vehicle?.plate??"Araç yok"}`}))}/>;
}