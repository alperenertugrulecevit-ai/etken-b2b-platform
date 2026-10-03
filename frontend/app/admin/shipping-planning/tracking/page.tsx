import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ShipmentTrackingTable from "@/components/admin/shipping/ShipmentTrackingTable";
import { ShipmentPlanningService } from "@/modules/fulfillment/services/shipment-planning.service";
import { confirmEcommerceOrderDeliveryAction, updateEcommerceCargoTrackingAction } from "../actions";

const statusLabel:Record<string,string>={CREATED:"Oluşturuldu",ROUTING:"Rotalanıyor",ROUTED:"Rotalandı",LOADING:"Yükleniyor",LOADED:"Yüklendi",SHIPPED:"Sevk Edildi"};
const orderTypeLabel:Record<string,string>={CUSTOMER:"B2B Siparişi",STOCK_TRANSFER:"Stok Transferi",INTERNAL:"İç Sipariş"};

export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const p=await searchParams;
 const one=(v:string|string[]|undefined)=>Array.isArray(v)?v[0]??"":v??"";
 const warehouseRaw=p.warehouseId; const warehouseIds=(Array.isArray(warehouseRaw)?warehouseRaw:warehouseRaw?[warehouseRaw]:[]).map(Number).filter(Number.isInteger);
 const today=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Istanbul",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
 const from=one(p.dateFrom)||today,to=one(p.dateTo);
 const [warehouses,shipments]=await Promise.all([
  prisma.warehouse.findMany({where:{isActive:true},select:{id:true,code:true,name:true},orderBy:{code:"asc"}}),
  ShipmentPlanningService.shipmentTracking({
   dateFrom:from?new Date(from+"T00:00:00"):null,
   dateTo:to?new Date(to+"T23:59:59.999"):null,
   thm:one(p.thm),company:one(p.company),shipmentNumber:one(p.shipmentNumber),warehouseIds
  })
 ]);
 const rows=shipments.map(s=>({
  id:s.id,shipmentNumber:s.shipmentNumber,date:s.shipmentDate.toLocaleDateString("tr-TR"),
  carrier:s.carrier?.name??"-",route:s.routes.map(x=>x.route.name).join(", ")||"-",vehicle:s.vehicle?.plate??"-",
  driver:s.driverName??"-",status:statusLabel[s.status]??s.status,
  details:s.handlingUnits.flatMap(hu=>hu.shippingHandlingUnit.orders.map(o=>({
   shipmentNumber:s.shipmentNumber,thm:hu.shippingHandlingUnit.handlingUnit.barcode,orderNumber:o.orderNumber,
   companyCode:hu.shippingHandlingUnit.customerCode??"-",companyName:hu.shippingHandlingUnit.customerName,
   city:hu.shippingHandlingUnit.city,district:hu.shippingHandlingUnit.district,
   orderId:o.order.id,orderStatus:o.order.status,orderSource:o.order.source,cargoTrackingNumber:o.order.cargoTrackingNumber,cargoTrackingUrl:o.order.cargoTrackingUrl,orderType:orderTypeLabel[o.order.orderType]??o.order.orderType,quantity:o.packedQuantity,
   warehouseCode:o.order.fulfillmentWarehouse?.code??"-"
  })))
 }));
 return <main className="p-4 sm:p-6">
  {one(p.delivered)==="1"&&<div className="mb-4 rounded-xl border border-green-300 bg-green-50 p-4 font-bold text-green-900">Teslimat onaylandı ve müşteri sipariş durumuna işlendi.</div>}
  {one(p.trackingUpdated)==="1"&&<div className="mb-4 rounded-xl border border-green-300 bg-green-50 p-4 font-bold text-green-900">Kargo takip bilgisi kaydedildi.</div>}
  {one(p.trackingError)&&<div className="mb-4 rounded-xl border border-red-300 bg-red-50 p-4 font-bold text-red-900">{one(p.trackingError)}</div>}
  {one(p.deliveryError)&&<div className="mb-4 rounded-xl border border-red-300 bg-red-50 p-4 font-bold text-red-900">{one(p.deliveryError)}</div>}
  <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wider text-blue-700">Sevkiyat Planlama</p><h1 className="text-2xl font-black">Sevk Takip</h1><p className="mt-1 text-sm text-slate-600">Sevkiyatları filtreleyin, satır detaylarını açın ve çoklu taşıma listesi oluşturun.</p></div><Link href="/admin/shipping-planning" className="rounded-xl border bg-white px-4 py-3 font-bold">← Sevkiyat Planlama</Link></div>
  <form className="mb-5 rounded-2xl border bg-white p-4 shadow-sm"><div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
   <label className="text-xs font-bold">Başlangıç Tarihi<input type="date" name="dateFrom" defaultValue={from} className="mt-1 w-full rounded-xl border p-3"/></label>
   <label className="text-xs font-bold">Bitiş Tarihi<input type="date" name="dateTo" defaultValue={to} className="mt-1 w-full rounded-xl border p-3"/></label>
   <label className="text-xs font-bold">THM<input name="thm" defaultValue={one(p.thm)} placeholder="SVK..." className="mt-1 w-full rounded-xl border p-3 uppercase"/></label>
   <label className="text-xs font-bold">Firma<input name="company" defaultValue={one(p.company)} placeholder="Kod / Ünvan" className="mt-1 w-full rounded-xl border p-3"/></label>
   <label className="text-xs font-bold">Sevk No<input name="shipmentNumber" defaultValue={one(p.shipmentNumber)} placeholder="SVP..." className="mt-1 w-full rounded-xl border p-3 uppercase"/></label>
   <label className="text-xs font-bold">Depo (çoklu)<select name="warehouseId" multiple defaultValue={warehouseIds.map(String)} className="mt-1 h-[76px] w-full rounded-xl border p-2">{warehouses.map(w=><option key={w.id} value={w.id}>{w.code} · {w.name}</option>)}</select></label>
  </div><div className="mt-3 flex gap-2"><button className="rounded-xl bg-blue-950 px-6 py-3 font-black text-white">FİLTRELE</button><Link href="/admin/shipping-planning/tracking" className="rounded-xl border px-6 py-3 font-bold">Bugüne Dön</Link></div></form>
  <ShipmentTrackingTable rows={rows} confirmDeliveryAction={confirmEcommerceOrderDeliveryAction} updateCargoTrackingAction={updateEcommerceCargoTrackingAction}/>
 </main>;
}
