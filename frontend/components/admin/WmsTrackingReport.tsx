import { Prisma, WmsOperationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import ExcelTableExportButton from "@/components/admin/ExcelTableExportButton";

type Kind="receiving"|"picking";
type SearchParams=Promise<{startDate?:string;endDate?:string;productCode?:string;orderNumber?:string;personnel?:string;companyCode?:string;companyName?:string}>;
const th="whitespace-nowrap border-b border-slate-200 bg-slate-100 px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-700";
const td="whitespace-nowrap border-b border-slate-100 px-4 py-3 text-sm text-slate-700";
function start(v:string){if(!v)return undefined;const d=new Date(`${v}T00:00:00+03:00`);return Number.isNaN(d.getTime())?undefined:d}
function end(v:string){if(!v)return undefined;const d=new Date(`${v}T23:59:59.999+03:00`);return Number.isNaN(d.getTime())?undefined:d}
function fmt(v:Date){return new Intl.DateTimeFormat("tr-TR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit",timeZone:"Europe/Istanbul"}).format(v)}
function n(v:number){return v.toLocaleString("tr-TR")}

function Filters({kind,startDate,endDate,productCode,orderNumber,personnel,companyCode,companyName}:{kind:Kind;startDate:string;endDate:string;productCode:string;orderNumber:string;personnel:string;companyCode:string;companyName:string}){
 const receiving=kind==="receiving";
 return <form className="mt-7 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-8">
  <label><span className="mb-2 block text-sm font-semibold">{receiving?"Giriş Okutma Tarihi Başlangıç":"Toplama Tarihi Başlangıç"}</span><input type="date" name="startDate" defaultValue={startDate} className="w-full rounded-xl border p-3"/></label>
  <label><span className="mb-2 block text-sm font-semibold">{receiving?"Giriş Okutma Tarihi Bitiş":"Toplama Tarihi Bitiş"}</span><input type="date" name="endDate" defaultValue={endDate} className="w-full rounded-xl border p-3"/></label>
  <label><span className="mb-2 block text-sm font-semibold">Ürün Kodu</span><input name="productCode" defaultValue={productCode} className="w-full rounded-xl border p-3" placeholder="Ürün kodu"/></label>
  <label><span className="mb-2 block text-sm font-semibold">{receiving?"Giriş Sipariş No":"Sipariş No"}</span><input name="orderNumber" defaultValue={orderNumber} className="w-full rounded-xl border p-3" placeholder="Sipariş no"/></label>
  <label><span className="mb-2 block text-sm font-semibold">{receiving?"Tedarikçi Kodu":"Firma Kodu"}</span><input name="companyCode" defaultValue={companyCode} className="w-full rounded-xl border p-3" placeholder={receiving?"Tedarikçi kodu":"Firma kodu"}/></label>
  <label><span className="mb-2 block text-sm font-semibold">{receiving?"Tedarikçi Adı":"Firma İsmi"}</span><input name="companyName" defaultValue={companyName} className="w-full rounded-xl border p-3" placeholder={receiving?"Tedarikçi adı":"Firma ismi"}/></label>
  <label><span className="mb-2 block text-sm font-semibold">Personel</span><input name="personnel" defaultValue={personnel} className="w-full rounded-xl border p-3" placeholder="Personel"/></label>
  <div className="flex items-end gap-2"><button className="rounded-xl bg-blue-900 px-5 py-3 font-bold text-white">Raporu Getir</button><a href="?" className="rounded-xl border px-4 py-3 font-semibold">Temizle</a></div>
 </div></form>
}

export default async function WmsTrackingReport({kind,searchParams}:{kind:Kind;searchParams:SearchParams}){
 const q=await searchParams,startDate=q.startDate?.trim()??"",endDate=q.endDate?.trim()??"",productCode=q.productCode?.trim()??"",orderNumber=q.orderNumber?.trim()??"",personnel=q.personnel?.trim()??"",companyCode=q.companyCode?.trim()??"",companyName=q.companyName?.trim()??"";
 const from=start(startDate),to=end(endDate),receiving=kind==="receiving";
 if(receiving){
  const where:Prisma.WmsOperationLogWhereInput={operationType:WmsOperationType.RECEIVING,isSuccessful:true};
  if(from||to)where.createdAt={...(from?{gte:from}:{}),...(to?{lte:to}:{})};
  if(productCode)where.productCode={contains:productCode,mode:"insensitive"};
  if(orderNumber)where.purchaseNumber={contains:orderNumber,mode:"insensitive"};
  if(personnel)where.operatorName={contains:personnel,mode:"insensitive"};
  if(companyCode||companyName){where.purchaseOrderId={not:null}; const purchases=await prisma.purchaseOrder.findMany({where:{...(companyCode?{supplier:{taxNumber:{contains:companyCode,mode:"insensitive"}}}:{}),...(companyName?{supplier:{name:{contains:companyName,mode:"insensitive"}}}:{})},select:{id:true}});where.purchaseOrderId={in:purchases.map(x=>x.id)}}
  const rows=await prisma.wmsOperationLog.findMany({where,orderBy:{createdAt:"desc"}});
  const total=rows.reduce((s,r)=>s+(r.quantity??0),0);
  return <section className="p-4 sm:p-6 lg:p-10"><div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-3xl font-bold">Giriş Takip Raporu</h1><p className="mt-2 text-slate-500">Mal kabul giriş okutmalarını sipariş, ürün ve personel bazında takip edin.</p></div><ExcelTableExportButton tableId="wms-receiving-tracking-table" fileName="giris-takip-raporu.csv"/></div><Filters kind={kind} startDate={startDate} endDate={endDate} productCode={productCode} orderNumber={orderNumber} personnel={personnel} companyCode={companyCode} companyName={companyName}/>
   <div className="mt-6 overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"><table id="wms-receiving-tracking-table" className="w-full min-w-[1100px]"><thead><tr>{["Giriş Okutma Tarihi","Personel","Giriş Sipariş No","THM","Ürün Kodu","Ürün Tanımı","Miktar"].map(x=><th key={x} className={th}>{x}</th>)}</tr></thead><tbody>
   {rows.map(r=><tr key={r.id}><td className={td}>{fmt(r.createdAt)}</td><td className={td}>{r.operatorName??"-"}</td><td className={td}>{r.purchaseNumber??"-"}</td><td className={td}>{r.targetBarcode??r.barcode??"-"}</td><td className={td}>{r.productCode??"-"}</td><td className={td}>{r.productName??"-"}</td><td className={td}>{n(r.quantity??0)}</td></tr>)}
   {rows.length===0?<tr><td colSpan={7} className="p-10 text-center text-slate-500">Filtreye uygun giriş okutma kaydı bulunamadı.</td></tr>:<tr className="bg-slate-100 font-bold"><td className={td}>Toplam</td><td className={td}>-</td><td className={td}>{n(new Set(rows.map(r=>r.purchaseNumber).filter(Boolean)).size)}</td><td className={td}>{n(new Set(rows.map(r=>r.targetBarcode??r.barcode).filter(Boolean)).size)}</td><td className={td}>{n(new Set(rows.map(r=>r.productCode).filter(Boolean)).size)}</td><td className={td}>-</td><td className={td}>{n(total)}</td></tr>}</tbody></table></div></section>
 }
 const where:Prisma.PickingRecordWhereInput={};
 if(companyCode)where.order={customer:{customerCode:{contains:companyCode,mode:"insensitive"}}};
 if(companyName)where.order={customer:{companyName:{contains:companyName,mode:"insensitive"}}};
 if(from||to)where.createdAt={...(from?{gte:from}:{}),...(to?{lte:to}:{})};
 if(productCode)where.product={code:{contains:productCode,mode:"insensitive"}};
 if(orderNumber)where.order={orderNumber:{contains:orderNumber,mode:"insensitive"}};
 const rows=await prisma.pickingRecord.findMany({where,orderBy:{createdAt:"desc"},include:{order:{select:{orderNumber:true,customer:{select:{customerCode:true,companyName:true}}}},product:{select:{code:true,name:true}},sourceHandlingUnit:{select:{barcode:true,location:{select:{code:true,section:true,level:true,bin:true}}}},targetHandlingUnit:{select:{barcode:true}}}});
 const filtered=personnel?[]:rows;
 const total=filtered.reduce((s,r)=>s+r.quantity,0);
 return <section className="p-4 sm:p-6 lg:p-10"><div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-3xl font-bold">Yapılan Toplama Detay Raporu</h1><p className="mt-2 text-slate-500">Tamamlanan toplama hareketlerini sipariş, ürün, THM ve lokasyon bazında inceleyin.</p></div><ExcelTableExportButton tableId="wms-picking-detail-table" fileName="yapilan-toplama-detay-raporu.csv"/></div><Filters kind={kind} startDate={startDate} endDate={endDate} productCode={productCode} orderNumber={orderNumber} personnel={personnel} companyCode={companyCode} companyName={companyName}/>
  {personnel&&<div className="mt-4 rounded-xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">Mevcut toplama kaydı modelinde personel alanı bulunmadığı için personel filtresi girildiğinde sonuç gösterilmez. Personel kaydı toplama hareketine eklendiğinde bu filtre doğrudan çalışacaktır.</div>}
  <div className="mt-6 overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"><table id="wms-picking-detail-table" className="w-full min-w-[1400px]"><thead><tr>{["Toplama Tarihi","Personel","Sipariş No","Firma Kodu","Firma İsmi","Adres","Lokasyon THM","Toplama THM","Ürün Kodu","Ürün Tanımı","Miktar"].map(x=><th key={x} className={th}>{x}</th>)}</tr></thead><tbody>
  {filtered.map(r=><tr key={r.id}><td className={td}>{fmt(r.createdAt)}</td><td className={td}>-</td><td className={td}>{r.order.orderNumber}</td><td className={td}>{r.order.customer.customerCode}</td><td className={td}>{r.order.customer.companyName}</td><td className={td}>{r.sourceHandlingUnit.location?[r.sourceHandlingUnit.location.code,r.sourceHandlingUnit.location.section,r.sourceHandlingUnit.location.level,r.sourceHandlingUnit.location.bin].filter(Boolean).join("-"):"-"}</td><td className={td}>{r.sourceHandlingUnit.barcode}</td><td className={td}>{r.targetHandlingUnit.barcode}</td><td className={td}>{r.product.code}</td><td className={td}>{r.product.name}</td><td className={td}>{n(r.quantity)}</td></tr>)}
  {filtered.length===0?<tr><td colSpan={11} className="p-10 text-center text-slate-500">Filtreye uygun toplama kaydı bulunamadı.</td></tr>:<tr className="bg-slate-100 font-bold"><td className={td}>Toplam</td><td className={td}>-</td><td className={td}>{n(new Set(filtered.map(r=>r.order.orderNumber)).size)}</td><td className={td}>-</td><td className={td}>-</td><td className={td}>{n(new Set(filtered.map(r=>r.sourceHandlingUnit.location?[r.sourceHandlingUnit.location.code,r.sourceHandlingUnit.location.section,r.sourceHandlingUnit.location.level,r.sourceHandlingUnit.location.bin].filter(Boolean).join("-"):null).filter(Boolean)).size)}</td><td className={td}>{n(new Set(filtered.map(r=>r.sourceHandlingUnit.barcode)).size)}</td><td className={td}>{n(new Set(filtered.map(r=>r.targetHandlingUnit.barcode)).size)}</td><td className={td}>{n(new Set(filtered.map(r=>r.product.code)).size)}</td><td className={td}>-</td><td className={td}>{n(total)}</td></tr>}</tbody></table></div></section>
}