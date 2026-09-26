import RfShipmentScanForm from "@/components/rf/shipping/RfShipmentScanForm";
import { loadShipmentAction } from "../shipment-workflow-actions";
import { ShipmentPlanningService } from "@/modules/fulfillment/services/shipment-planning.service";
export default async function Page(){
 const shipments=await ShipmentPlanningService.listActiveShipmentsForRf();
 const shipmentOptions=shipments.map(x=>({shipmentNumber:x.shipmentNumber,label:`${x.shipmentNumber} · ${x.vehicle?.plate??"Araç yok"} · ${x._count.handlingUnits} THM`}));
 return <RfShipmentScanForm title="Araç Yükleme" subtitle="Sevkiyatı listeden seçin; rotalaması tamamlanmış THM'leri araca yükleyin." action={loadShipmentAction} submitLabel="ARACA YÜKLE" shipmentOptions={shipmentOptions} fields={[{name:"shipmentNumber",label:"Sevkiyat Numarası",placeholder:"Sevkiyat seçin",autoFocus:true},{name:"thmBarcode",label:"THM Barkodu",placeholder:"THM okutun"}]}/>;
}