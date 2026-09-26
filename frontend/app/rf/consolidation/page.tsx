import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
import { completeConsolidation } from "./actions";
export const dynamic="force-dynamic";

export default async function RFConsolidationPage({searchParams}:{searchParams:Promise<{done?:string}>}) {
  await AuthorizationService.requireRfAccess("PICKING_EXECUTE");
  const sp=await searchParams;
  const tasks=await prisma.consolidationTask.findMany({
    where:{status:{in:["WAITING","READY","IN_PROGRESS"]}},
    include:{order:{select:{orderNumber:true,customer:{select:{companyName:true}}}},warehouse:{select:{code:true,name:true}},consolidationPoint:true},
    orderBy:[{status:"desc"},{createdAt:"asc"}],
  });
  return <section>
    <div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-blue-700">RF Çıkış</p><h1 className="text-2xl font-black">Konsolidasyon</h1><p className="mt-1 text-sm text-slate-600">Farklı Zone'lardan gelen sipariş parçalarını birleştirip paketlemeye aktarın.</p></div><Link href="/rf" className="rounded-xl border bg-white px-4 py-3 font-bold">← Menü</Link></div>
    {sp.done&&<div className="mb-4 rounded-xl bg-green-100 p-4 font-bold text-green-800">{sp.done} konsolidasyonu tamamlandı ve paketlemeye aktarıldı.</div>}
    <div className="grid gap-4">{tasks.map(t=>{const ready=t.status==="READY"; return <article key={t.id} className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex flex-wrap justify-between gap-3"><div><div className="text-sm font-bold text-blue-700">{t.warehouse.code} · {t.order.orderNumber}</div><h2 className="text-lg font-black">{t.order.customer.companyName}</h2></div><span className={`h-fit rounded-full px-3 py-1 text-sm font-bold ${ready?"bg-green-100 text-green-800":"bg-amber-100 text-amber-800"}`}>{ready?"Hazır":"Zone Bekleniyor"}</span></div>
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-blue-700" style={{width:`${Math.round((t.completedZoneCount/Math.max(1,t.requiredZoneCount))*100)}%`}}/></div>
      <p className="mt-2 text-sm font-semibold">{t.completedZoneCount} / {t.requiredZoneCount} Zone tamamlandı</p>
      {ready&&<form action={completeConsolidation} className="mt-4 grid gap-2 md:grid-cols-[1fr_1fr_auto]"><input type="hidden" name="taskId" value={t.id}/><input name="pointBarcode" autoFocus required placeholder="Konsolidasyon noktası barkodu (CONS-01)" className="rounded-xl border p-3 uppercase"/><input name="thmBarcode" required placeholder="Sipariş / Wave THM barkodu" className="rounded-xl border p-3 uppercase"/><button className="rounded-xl bg-blue-900 px-5 py-3 font-black text-white">Doğrula ve Tamamla</button></form>}
    </article>})}</div>
    {!tasks.length&&<div className="rounded-2xl border bg-white p-10 text-center text-slate-500">Bekleyen konsolidasyon görevi yok.</div>}
  </section>;
}
