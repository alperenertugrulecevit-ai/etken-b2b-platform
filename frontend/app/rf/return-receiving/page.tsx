import Link from "next/link";
import { ReturnOrderStatus,HandlingUnitPurpose,HandlingUnitStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
import RFReturnReceivingForm from "@/components/rf/RFReturnReceivingForm";
export const dynamic="force-dynamic";
export default async function Page(){
 await AuthorizationService.requireRfAccess("RECEIVING_EXECUTE");
 const [returns,hus]=await Promise.all([
  prisma.returnOrder.findMany({where:{status:{in:[ReturnOrderStatus.OPEN,ReturnOrderStatus.PARTIALLY_RECEIVED]}},orderBy:{createdAt:"desc"},include:{originalOrder:{select:{orderNumber:true,customer:{select:{companyName:true}}}},items:true}}),
  prisma.handlingUnit.findMany({where:{purpose:{in:[HandlingUnitPurpose.STOCK,HandlingUnitPurpose.RECEIVING]},status:{in:[HandlingUnitStatus.OPEN,HandlingUnitStatus.EMPTY,HandlingUnitStatus.STORED]},warehouseId:{not:null}},orderBy:{barcode:"asc"},select:{id:true,barcode:true,warehouse:{select:{code:true}},location:{select:{code:true}}}})
 ]);
 return <section><div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-blue-700">Mal Kabul</p><h1 className="text-2xl font-black">İade Giriş</h1></div><Link href="/rf" className="rounded-xl border px-4 py-2 font-bold">RF Menü</Link></div>
 <RFReturnReceivingForm returns={returns.map(r=>({returnNumber:r.returnNumber,orderNumber:r.originalOrder.orderNumber,customerName:r.originalOrder.customer.companyName,deliveryNoteNumber:r.deliveryNoteNumber,deliveryNoteDate:r.deliveryNoteDate.toISOString().slice(0,10),status:r.status,items:r.items.map(i=>({id:i.id,productCode:i.productCode,productBarcode:i.productBarcode,productName:i.productName,expectedQuantity:i.expectedQuantity,receivedQuantity:i.receivedQuantity}))}))} handlingUnits={hus.map(h=>({id:h.id,barcode:h.barcode,warehouseCode:h.warehouse?.code??"-",locationCode:h.location?.code??"-"}))}/>
 </section>
}
