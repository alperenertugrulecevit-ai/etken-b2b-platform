import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

type Props={searchParams:Promise<{q?:string;startDate?:string;endDate?:string}>};

function fmt(d:Date){return new Intl.DateTimeFormat("tr-TR",{dateStyle:"short",timeStyle:"short"}).format(d)}

export default async function LostStockReport({searchParams}:Props){
 await AuthorizationService.requireAdminPortalAccess();
 const p=await searchParams; const q=(p.q??"").trim();
 const where:Prisma.LostStockRecordWhereInput={};
 if(q) where.OR=[
  {productCode:{contains:q,mode:"insensitive"}},{productName:{contains:q,mode:"insensitive"}},
  {sourceWarehouseCode:{contains:q,mode:"insensitive"}},{sourceLocationCode:{contains:q,mode:"insensitive"}},
  {sourceHandlingUnitBarcode:{contains:q,mode:"insensitive"}},{operatorName:{contains:q,mode:"insensitive"}},
 ];
 if(p.startDate||p.endDate) where.createdAt={
  ...(p.startDate?{gte:new Date(`${p.startDate}T00:00:00`)}:{}),
  ...(p.endDate?{lte:new Date(`${p.endDate}T23:59:59.999`)}:{}),
 };
 const rows=await prisma.lostStockRecord.findMany({where,orderBy:{createdAt:"desc"},take:500});
 return <section className="space-y-5 p-4 md:p-6">
  <div><p className="text-xs font-black uppercase tracking-wider text-red-700">WMS Operasyonları</p><h1 className="text-2xl font-black">Kayıp Stok Raporu</h1><p className="mt-1 text-sm text-slate-500">RF toplamada sistem tarafından KYP001 kayıp deposuna alınan ürünlerin değişmez işlem geçmişi.</p></div>
  <form className="grid gap-3 rounded-2xl bg-white p-4 shadow-sm md:grid-cols-4">
   <input name="q" defaultValue={q} placeholder="Ürün / depo / lokasyon / THM / kullanıcı" className="rounded-xl border p-3 md:col-span-2"/>
   <input name="startDate" type="date" defaultValue={p.startDate} className="rounded-xl border p-3"/>
   <input name="endDate" type="date" defaultValue={p.endDate} className="rounded-xl border p-3"/>
   <button className="rounded-xl bg-slate-900 py-3 font-black text-white">FİLTRELE</button>
   <a href="/admin/wms-reports/lost-stock" className="rounded-xl border py-3 text-center font-black">TEMİZLE</a>
  </form>
  <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
   <table className="min-w-full text-sm"><thead className="bg-slate-900 text-left text-white"><tr>
    {["Ürün Kodu","Ürün Tanımı","Kayıp Miktarı","Kayıt Tarihi","Geldiği Depo Kodu","Geldiği Depo Lokasyonu","Kaynak THM","Kayıp Depoya Atan Kullanıcı"].map(x=><th key={x} className="whitespace-nowrap px-4 py-3">{x}</th>)}
   </tr></thead><tbody>
    {rows.map(r=><tr key={r.id} className="border-b last:border-0"><td className="px-4 py-3 font-mono font-bold">{r.productCode}</td><td className="px-4 py-3">{r.productName}</td><td className="px-4 py-3 font-black">{r.quantity}</td><td className="whitespace-nowrap px-4 py-3">{fmt(r.createdAt)}</td><td className="px-4 py-3">{r.sourceWarehouseCode}</td><td className="px-4 py-3 font-mono">{r.sourceLocationCode}</td><td className="px-4 py-3 font-mono">{r.sourceHandlingUnitBarcode}</td><td className="px-4 py-3">{r.operatorName??"-"}</td></tr>)}
    {!rows.length&&<tr><td colSpan={8} className="px-4 py-12 text-center text-slate-500">Filtreye uygun kayıp stok kaydı bulunamadı.</td></tr>}
   </tbody></table>
  </div>
 </section>
}
