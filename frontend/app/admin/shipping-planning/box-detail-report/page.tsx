import Link from "next/link";
import { ShippingHandlingUnitStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import ShippingBoxDetailTable from "@/components/admin/shipping/ShippingBoxDetailTable";

const statusLabel:Record<string,string>={OPEN:"Açık",CLOSED:"Kapalı",READY_TO_SHIP:"Sevke Hazır",SHIPPED:"Sevk Edildi",CANCELLED:"İptal"};
const orderTypeLabel:Record<string,string>={CUSTOMER:"B2B Siparişi",STOCK_TRANSFER:"Stok Transferi",INTERNAL:"İç Sipariş"};
const today=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Istanbul",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const p=await searchParams; const one=(v:string|string[]|undefined)=>Array.isArray(v)?v[0]??"":v??"";
 const from=one(p.dateFrom)||today(),to=one(p.dateTo),thm=one(p.thm),company=one(p.company),status=one(p.status);
 const units=await prisma.shippingHandlingUnit.findMany({where:{
  createdAt:{gte:new Date(from+"T00:00:00+03:00"),...(to?{lte:new Date(to+"T23:59:59.999+03:00")}:{})},
  ...(status&&Object.values(ShippingHandlingUnitStatus).includes(status as ShippingHandlingUnitStatus)?{status:status as ShippingHandlingUnitStatus}:{}),
  ...(thm?{handlingUnit:{barcode:{contains:thm,mode:"insensitive"}}}:{}),
  ...(company?{OR:[{customerCode:{contains:company,mode:"insensitive"}},{customerName:{contains:company,mode:"insensitive"}}]}:{}),
 },include:{
  handlingUnit:{select:{barcode:true}},
  packingRecords:{select:{operatorName:true,createdAt:true},orderBy:{createdAt:"desc"},take:1},
  orders:{include:{order:{select:{orderType:true,fulfillmentWarehouse:{select:{code:true}}}}}},
 },orderBy:{createdAt:"desc"},take:1000});
 const rows=units.map(u=>({id:u.id,warehouseCode:[...new Set(u.orders.map(o=>o.order.fulfillmentWarehouse?.code).filter((x):x is string=>Boolean(x)))].join(", ")||"-",date:(u.shippedAt??u.readyAt??u.closedAt??u.createdAt).toLocaleDateString("tr-TR",{timeZone:"Europe/Istanbul"}),thm:u.handlingUnit.barcode,quantity:u.orders.reduce((n,o)=>n+o.packedQuantity,0),status:statusLabel[u.status]??u.status,details:u.orders.map(o=>({thm:u.handlingUnit.barcode,orderNumber:o.orderNumber,companyCode:u.customerCode??"-",companyName:u.customerName,city:u.city,district:u.district,orderType:orderTypeLabel[o.order.orderType]??o.order.orderType,quantity:o.packedQuantity,packer:u.closedByName??u.packingRecords[0]?.operatorName??"-"}))}));
 return <main className="p-4 sm:p-6"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wider text-blue-700">Sevkiyat Planlama</p><h1 className="text-2xl font-black">Sevk Koli Detay Raporu</h1><p className="mt-1 text-sm text-slate-600">Sevk kolilerini sipariş ve kolileyen personel detaylarıyla takip edin.</p></div><Link href="/admin/shipping-planning" className="rounded-xl border bg-white px-4 py-3 font-bold">← Sevkiyat Planlama</Link></div>
 <form className="mb-5 rounded-2xl border bg-white p-4 shadow-sm"><div className="grid gap-3 md:grid-cols-5"><label className="text-xs font-bold">Başlangıç Tarihi<input type="date" name="dateFrom" defaultValue={from} className="mt-1 w-full rounded-xl border p-3"/></label><label className="text-xs font-bold">Bitiş Tarihi<input type="date" name="dateTo" defaultValue={to} className="mt-1 w-full rounded-xl border p-3"/></label><label className="text-xs font-bold">THM<input name="thm" defaultValue={thm} placeholder="SVK..." className="mt-1 w-full rounded-xl border p-3 uppercase"/></label><label className="text-xs font-bold">Durum<select name="status" defaultValue={status} className="mt-1 w-full rounded-xl border bg-white p-3"><option value="">Tümü</option>{Object.values(ShippingHandlingUnitStatus).map(x=><option key={x} value={x}>{statusLabel[x]??x}</option>)}</select></label><label className="text-xs font-bold">Firma<input name="company" defaultValue={company} placeholder="Kod / Ünvan" className="mt-1 w-full rounded-xl border p-3"/></label></div><div className="mt-3 flex gap-2"><button className="rounded-xl bg-blue-950 px-6 py-3 font-black text-white">FİLTRELE</button><Link href="/admin/shipping-planning/box-detail-report" className="rounded-xl border px-6 py-3 font-bold">Bugüne Dön</Link></div></form><ShippingBoxDetailTable rows={rows}/></main>;
}
