import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type ReportKind = "shipment-summary" | "shipment-detail" | "receipt-summary" | "receipt-detail";
type SearchParams = Promise<{ startDate?: string; endDate?: string; orderNumber?: string; status?: string; productCode?: string }>;

function dateStart(value:string){ if(!value)return undefined; const d=new Date(`${value}T00:00:00+03:00`); return Number.isNaN(d.getTime())?undefined:d; }
function dateEnd(value:string){ if(!value)return undefined; const d=new Date(`${value}T23:59:59.999+03:00`); return Number.isNaN(d.getTime())?undefined:d; }
function fmtDate(value:Date){return new Intl.DateTimeFormat("tr-TR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit",timeZone:"Europe/Istanbul"}).format(value)}
function n(value:number){return value.toLocaleString("tr-TR")}
function orderStatus(status:string){const m:Record<string,string>={DRAFT:"Taslak",PENDING:"Bekliyor",APPROVED:"Sevk Onaylandı",PREPARING:"Hazırlanıyor",PICKING:"Toplanıyor",PACKING:"Paketleniyor",READY_TO_SHIP:"Sevke Hazır",SHIPPED:"Sevk Edildi",DELIVERED:"Teslim Edildi",CANCELLED:"İptal"};return m[status]??status}
function receiptStatus(status:string){const m:Record<string,string>={DRAFT:"Taslak",PENDING:"Bekliyor",APPROVED:"Mal Kabul Onaylandı",PARTIALLY_RECEIVED:"Kısmi Mal Kabul",RECEIVED:"Mal Kabul Tamamlandı",CANCELLED:"İptal"};return m[status]??status}

const meta:Record<ReportKind,{title:string;subtitle:string;orderLabel:string}> = {
 "shipment-summary":{title:"Sevk Sipariş Durum Raporu",subtitle:"Sevk siparişlerinin toplama ve paketleme ilerlemesini özet olarak izleyin.",orderLabel:"Sipariş No"},
 "shipment-detail":{title:"Sevk Sipariş Detay Raporu",subtitle:"Sevk siparişlerini ürün kalemi bazında toplama ve paketleme miktarlarıyla inceleyin.",orderLabel:"Sipariş No"},
 "receipt-summary":{title:"Giriş Sipariş Durum Raporu",subtitle:"Satın alma siparişlerinin mal kabul ilerlemesini özet olarak izleyin.",orderLabel:"Satın Alma Sipariş No"},
 "receipt-detail":{title:"Giriş Sipariş Detay Raporu",subtitle:"Satın alma siparişlerini ürün kalemi bazında sipariş ve mal kabul miktarlarıyla inceleyin.",orderLabel:"Satın Alma Sipariş No"},
};

function Filters({title,orderLabel,startDate,endDate,orderNumber,status,productCode,shipment}:{title:string;orderLabel:string;startDate:string;endDate:string;orderNumber:string;status:string;productCode:string;shipment:boolean}){
 return <><div><h1 className="text-3xl font-bold text-slate-900">{title}</h1><p className="mt-2 text-slate-500">{metaTitle(title)}</p></div>
 <form className="mt-7 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
   <label><span className="mb-2 block text-sm font-semibold text-slate-700">Tarih Başlangıç</span><input name="startDate" type="date" defaultValue={startDate} className="w-full rounded-xl border border-slate-300 p-3"/></label>
   <label><span className="mb-2 block text-sm font-semibold text-slate-700">Tarih Bitiş</span><input name="endDate" type="date" defaultValue={endDate} className="w-full rounded-xl border border-slate-300 p-3"/></label>
   <label><span className="mb-2 block text-sm font-semibold text-slate-700">{orderLabel}</span><input name="orderNumber" defaultValue={orderNumber} placeholder="Sipariş no ara" className="w-full rounded-xl border border-slate-300 p-3"/></label>
   <label><span className="mb-2 block text-sm font-semibold text-slate-700">Ürün Kodu</span><input name="productCode" defaultValue={productCode} placeholder="Ürün kodu ara" className="w-full rounded-xl border border-slate-300 p-3"/></label>
   <label><span className="mb-2 block text-sm font-semibold text-slate-700">Durum</span><select name="status" defaultValue={status} className="w-full rounded-xl border border-slate-300 bg-white p-3">
    <option value="">Tüm Durumlar</option><option value="OPEN">Açık Siparişler</option>
    {shipment?<><option value="DRAFT">Taslak</option><option value="PENDING">Bekliyor</option><option value="APPROVED">Sevk Onaylandı</option><option value="PREPARING">Hazırlanıyor</option><option value="PICKING">Toplanıyor</option><option value="PACKING">Paketleniyor</option><option value="READY_TO_SHIP">Sevke Hazır</option><option value="SHIPPED">Sevk Edildi</option><option value="DELIVERED">Teslim Edildi</option><option value="CANCELLED">İptal</option></>:<><option value="DRAFT">Taslak</option><option value="PENDING">Bekliyor</option><option value="APPROVED">Mal Kabul Onaylandı</option><option value="PARTIALLY_RECEIVED">Kısmi Mal Kabul</option><option value="RECEIVED">Mal Kabul Tamamlandı</option><option value="CANCELLED">İptal</option></>}
   </select></label>
   <div className="flex items-end gap-2"><button className="rounded-xl bg-blue-900 px-6 py-3 font-bold text-white hover:bg-blue-800">Raporu Getir</button><a href="?" className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700">Temizle</a></div>
  </div>
 </form></>
}
function metaTitle(title:string){const item=Object.values(meta).find(x=>x.title===title);return item?.subtitle??""}
const th="whitespace-nowrap border-b border-slate-200 bg-slate-100 px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-700";
const td="whitespace-nowrap border-b border-slate-100 px-4 py-3 text-sm text-slate-700";

export default async function WmsOrderReport({kind,searchParams}:{kind:ReportKind;searchParams:SearchParams}){
 const q=await searchParams; const startDate=q.startDate?.trim()??""; const endDate=q.endDate?.trim()??""; const orderNumber=q.orderNumber?.trim()??""; const status=q.status?.trim()??""; const productCode=q.productCode?.trim()??"";
 const from=dateStart(startDate), to=dateEnd(endDate), m=meta[kind];
 const shipment=kind.startsWith("shipment");
 if(shipment){
  const where:Prisma.OrderWhereInput={};
  if(orderNumber)where.orderNumber={contains:orderNumber,mode:"insensitive"};
  if(productCode)where.items={some:{productCode:{contains:productCode,mode:"insensitive"}}};
  if(status==="OPEN")where.status={notIn:["SHIPPED","DELIVERED","CANCELLED"]}; else if(status)where.status=status as Prisma.EnumOrderStatusFilter;
  if(from||to)where.orderDate={...(from?{gte:from}:{}),...(to?{lte:to}:{})};
  const orders=await prisma.order.findMany({where,orderBy:{orderDate:"desc"},include:{items:{orderBy:{id:"asc"}}}});
  if(kind==="shipment-summary"){
   const rows=orders.map(o=>{const ordered=o.items.reduce((s,x)=>s+x.quantity,0),picked=o.items.reduce((s,x)=>s+x.pickedQuantity,0),packed=o.items.reduce((s,x)=>s+x.packedQuantity,0);return{o,ordered,picked,packed}});
   const totals=rows.reduce((a,r)=>({ordered:a.ordered+r.ordered,picked:a.picked+r.picked,packed:a.packed+r.packed}),{ordered:0,picked:0,packed:0});
   return <section className="p-4 sm:p-6 lg:p-10"><Filters title={m.title} orderLabel={m.orderLabel} startDate={startDate} endDate={endDate} orderNumber={orderNumber} status={status} productCode={productCode} shipment={shipment}/>
    <div className="mt-6 overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"><table className="w-full min-w-[1050px]"><thead><tr>
     {["Sipariş Oluşturma Tarihi","Sipariş No","Sipariş Miktarı","Toplama Miktarı","Toplama Farkı","Paketleme Miktarı","Paketleme Farkı","Sipariş Durumu"].map(x=><th key={x} className={th}>{x}</th>)}
    </tr></thead><tbody>{rows.map(({o,ordered,picked,packed})=><tr key={o.id} className="hover:bg-slate-50"><td className={td}>{fmtDate(o.orderDate)}</td><td className={td+" font-bold text-blue-900"}>{o.orderNumber}</td><td className={td}>{n(ordered)}</td><td className={td}>{n(picked)}</td><td className={td}>{n(Math.max(ordered-picked,0))}</td><td className={td}>{n(packed)}</td><td className={td}>{n(Math.max(picked-packed,0))}</td><td className={td}>{orderStatus(o.status)}</td></tr>)}
    {rows.length===0?<tr><td colSpan={8} className="p-10 text-center text-slate-500">Filtreye uygun sevk siparişi bulunamadı.</td></tr>:<tr className="bg-slate-100 font-bold"><td className={td}>Toplam</td><td className={td}>{n(rows.length)} sipariş</td><td className={td}>{n(totals.ordered)}</td><td className={td}>{n(totals.picked)}</td><td className={td}>{n(Math.max(totals.ordered-totals.picked,0))}</td><td className={td}>{n(totals.packed)}</td><td className={td}>{n(Math.max(totals.picked-totals.packed,0))}</td><td className={td}>-</td></tr>}</tbody></table></div></section>
  }
  const rows=orders.flatMap(o=>o.items.map((x,index)=>({o,x,line:index+1})));
  const totals=rows.reduce((a,r)=>({ordered:a.ordered+r.x.quantity,picked:a.picked+r.x.pickedQuantity,packed:a.packed+r.x.packedQuantity}),{ordered:0,picked:0,packed:0});
  return <section className="p-4 sm:p-6 lg:p-10"><Filters title={m.title} orderLabel={m.orderLabel} startDate={startDate} endDate={endDate} orderNumber={orderNumber} status={status} productCode={productCode} shipment={shipment}/>
   <div className="mt-6 overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"><table className="w-full min-w-[1500px]"><thead><tr>{["Sipariş Oluşturma Tarihi","Sipariş No","Kalem No","Ürün Kodu","Ürün Tanımı","Sipariş Miktarı","Toplama Miktarı","Toplama Farkı","Paketleme Miktarı","Paketleme Farkı","Sipariş Durumu"].map(x=><th key={x} className={th}>{x}</th>)}</tr></thead>
   <tbody>{rows.map(({o,x,line})=><tr key={x.id} className="hover:bg-slate-50"><td className={td}>{fmtDate(o.orderDate)}</td><td className={td+" font-bold text-blue-900"}>{o.orderNumber}</td><td className={td}>{line}</td><td className={td}>{x.productCode}</td><td className={td+" max-w-[360px] whitespace-normal"}>{x.productName}</td><td className={td}>{n(x.quantity)}</td><td className={td}>{n(x.pickedQuantity)}</td><td className={td}>{n(Math.max(x.quantity-x.pickedQuantity,0))}</td><td className={td}>{n(x.packedQuantity)}</td><td className={td}>{n(Math.max(x.pickedQuantity-x.packedQuantity,0))}</td><td className={td}>{orderStatus(o.status)}</td></tr>)}
   {rows.length===0?<tr><td colSpan={11} className="p-10 text-center text-slate-500">Filtreye uygun sevk sipariş detayı bulunamadı.</td></tr>:<tr className="bg-slate-100 font-bold"><td className={td}>Toplam</td><td className={td}>-</td><td className={td}>{n(rows.length)}</td><td className={td}>-</td><td className={td}>-</td><td className={td}>{n(totals.ordered)}</td><td className={td}>{n(totals.picked)}</td><td className={td}>{n(Math.max(totals.ordered-totals.picked,0))}</td><td className={td}>{n(totals.packed)}</td><td className={td}>{n(Math.max(totals.picked-totals.packed,0))}</td><td className={td}>-</td></tr>}</tbody></table></div></section>
 }
 const where:Prisma.PurchaseOrderWhereInput={};
 if(orderNumber)where.purchaseNumber={contains:orderNumber,mode:"insensitive"};
 if(productCode)where.items={some:{productCode:{contains:productCode,mode:"insensitive"}}};
 if(status==="OPEN")where.status={notIn:["RECEIVED","CANCELLED"]}; else if(status)where.status=status as Prisma.EnumPurchaseOrderStatusFilter;
 if(from||to)where.orderDate={...(from?{gte:from}:{}),...(to?{lte:to}:{})};
 const orders=await prisma.purchaseOrder.findMany({where,orderBy:{orderDate:"desc"},include:{supplier:{select:{name:true}},items:{orderBy:{id:"asc"}}}});
 if(kind==="receipt-summary"){
  const rows=orders.map(o=>{const ordered=o.items.reduce((s,x)=>s+x.orderedQuantity,0),received=o.items.reduce((s,x)=>s+x.receivedQuantity,0);return{o,ordered,received}});
  const totals=rows.reduce((a,r)=>({ordered:a.ordered+r.ordered,received:a.received+r.received}),{ordered:0,received:0});
  return <section className="p-4 sm:p-6 lg:p-10"><Filters title={m.title} orderLabel={m.orderLabel} startDate={startDate} endDate={endDate} orderNumber={orderNumber} status={status} productCode={productCode} shipment={shipment}/>
   <div className="mt-6 overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"><table className="w-full min-w-[1000px]"><thead><tr>{["Sipariş Oluşturma Tarihi","Satın Alma Sipariş No","Tedarikçi","Sipariş Miktarı","Giriş Miktarı","Giriş Farkı","Sipariş Durumu"].map(x=><th key={x} className={th}>{x}</th>)}</tr></thead>
   <tbody>{rows.map(({o,ordered,received})=><tr key={o.id} className="hover:bg-slate-50"><td className={td}>{fmtDate(o.orderDate)}</td><td className={td+" font-bold text-blue-900"}>{o.purchaseNumber}</td><td className={td}>{o.supplier.name}</td><td className={td}>{n(ordered)}</td><td className={td}>{n(received)}</td><td className={td}>{n(Math.max(ordered-received,0))}</td><td className={td}>{receiptStatus(o.status)}</td></tr>)}
   {rows.length===0?<tr><td colSpan={7} className="p-10 text-center text-slate-500">Filtreye uygun giriş siparişi bulunamadı.</td></tr>:<tr className="bg-slate-100 font-bold"><td className={td}>Toplam</td><td className={td}>{n(rows.length)} sipariş</td><td className={td}>-</td><td className={td}>{n(totals.ordered)}</td><td className={td}>{n(totals.received)}</td><td className={td}>{n(Math.max(totals.ordered-totals.received,0))}</td><td className={td}>-</td></tr>}</tbody></table></div></section>
 }
 const rows=orders.flatMap(o=>o.items.map((x,index)=>({o,x,line:index+1})));
 const totals=rows.reduce((a,r)=>({ordered:a.ordered+r.x.orderedQuantity,received:a.received+r.x.receivedQuantity}),{ordered:0,received:0});
 return <section className="p-4 sm:p-6 lg:p-10"><Filters title={m.title} orderLabel={m.orderLabel} startDate={startDate} endDate={endDate} orderNumber={orderNumber} status={status} productCode={productCode} shipment={shipment}/>
  <div className="mt-6 overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"><table className="w-full min-w-[1350px]"><thead><tr>{["Sipariş Oluşturma Tarihi","Satın Alma Sipariş No","Kalem No","Tedarikçi","Ürün Kodu","Ürün Tanımı","Sipariş Miktarı","Giriş Miktarı","Giriş Farkı","Sipariş Durumu"].map(x=><th key={x} className={th}>{x}</th>)}</tr></thead>
  <tbody>{rows.map(({o,x,line})=><tr key={x.id} className="hover:bg-slate-50"><td className={td}>{fmtDate(o.orderDate)}</td><td className={td+" font-bold text-blue-900"}>{o.purchaseNumber}</td><td className={td}>{line}</td><td className={td}>{o.supplier.name}</td><td className={td}>{x.productCode}</td><td className={td+" max-w-[360px] whitespace-normal"}>{x.productName}</td><td className={td}>{n(x.orderedQuantity)}</td><td className={td}>{n(x.receivedQuantity)}</td><td className={td}>{n(Math.max(x.orderedQuantity-x.receivedQuantity,0))}</td><td className={td}>{receiptStatus(o.status)}</td></tr>)}
  {rows.length===0?<tr><td colSpan={10} className="p-10 text-center text-slate-500">Filtreye uygun giriş sipariş detayı bulunamadı.</td></tr>:<tr className="bg-slate-100 font-bold"><td className={td}>Toplam</td><td className={td}>-</td><td className={td}>{n(rows.length)}</td><td className={td}>-</td><td className={td}>-</td><td className={td}>-</td><td className={td}>{n(totals.ordered)}</td><td className={td}>{n(totals.received)}</td><td className={td}>{n(Math.max(totals.ordered-totals.received,0))}</td><td className={td}>-</td></tr>}</tbody></table></div></section>
}