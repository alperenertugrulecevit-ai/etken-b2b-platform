import RfShipmentDispatchForm from "@/components/rf/shipping/RfShipmentDispatchForm";
import { ShipmentPlanningService } from "@/modules/fulfillment/services/shipment-planning.service";
export default async function Page(){
 const rows=await ShipmentPlanningService.listActiveShipmentsForRf();
 return <RfShipmentDispatchForm shipments={rows.map(x=>({shipmentNumber:x.shipmentNumber,label:`${x.shipmentNumber} · ${x.vehicle?.plate??"Araç yok"} · ${x._count.handlingUnits} THM`}))}/>;
}