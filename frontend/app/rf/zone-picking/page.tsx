import Link from "next/link";
import { ZonePickTaskStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
import { claimZoneTask, releaseZoneTask } from "./actions";

export const dynamic = "force-dynamic";

export default async function RFZonePickingPage() {
  const user = await AuthorizationService.requireRfAccess("PICKING_EXECUTE");
  const [zones, mine] = await Promise.all([
    prisma.warehouseZone.findMany({
      where: { isActive: true, pickTasks: { some: { status: ZonePickTaskStatus.OPEN } } },
      include: {
        warehouse: { select: { code: true, name: true } },
        pickTasks: {
          where: { status: ZonePickTaskStatus.OPEN },
          select: { id: true, plannedLineCount: true, plannedQuantity: true, order: { select: { orderNumber: true } }, wave: { select: { waveNo: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: [{ warehouseId: "asc" }, { pickSequence: "asc" }],
    }),
    prisma.zonePickTask.findMany({
      where: { claimedByUserId: user.id, status: { in: [ZonePickTaskStatus.CLAIMED, ZonePickTaskStatus.IN_PROGRESS] } },
      include: { zone: true, warehouse: { select: { code: true } }, order: { select: { orderNumber: true } }, wave: { select: { waveNo: true } } },
      orderBy: { claimedAt: "asc" },
    }),
  ]);

  return <section>
    <div className="mb-5 flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-blue-700">RF Toplama</p><h1 className="mt-1 text-2xl font-black">Zone Seç / Görev Al</h1><p className="mt-1 text-sm text-slate-600">Personel sabit Zone'a bağlı değildir. Açık görev bulunan Zone'lardan görev alabilirsiniz.</p></div><Link href="/rf" className="rounded-xl border bg-white px-4 py-3 font-bold">← Menü</Link></div>

    {mine.length>0&&<div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-4"><h2 className="font-black text-blue-950">Üzerimdeki Görevler</h2><div className="mt-3 grid gap-3">{mine.map(t=><div key={t.id} className="rounded-xl bg-white p-4 shadow-sm"><div className="font-black">{t.zone.code} · {t.zone.name}</div><div className="mt-1 text-sm text-slate-600">{t.warehouse.code} · {t.wave?.waveNo||"Sipariş Bazlı"} · {t.order.orderNumber}</div><div className="mt-3 flex gap-2"><Link href={`/rf/picking?zoneTaskId=${t.id}`} className="rounded-lg bg-blue-900 px-4 py-2 font-bold text-white">Devam Et</Link><form action={releaseZoneTask}><input type="hidden" name="taskId" value={t.id}/><button className="rounded-lg border border-red-300 px-4 py-2 font-bold text-red-700">Görevi Bırak</button></form></div></div>)}</div></div>}

    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{zones.map(z=>{const lines=z.pickTasks.reduce((a,t)=>a+t.plannedLineCount,0), qty=z.pickTasks.reduce((a,t)=>a+t.plannedQuantity,0); return <article key={z.id} className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex justify-between gap-3"><div><div className="text-sm font-bold text-blue-700">{z.warehouse.code}</div><h2 className="text-xl font-black">{z.code} · {z.name}</h2></div><span className="h-fit rounded-full bg-green-100 px-3 py-1 text-sm font-bold text-green-800">{z.pickTasks.length} görev</span></div><div className="mt-4 grid grid-cols-2 gap-3 text-center"><div className="rounded-xl bg-slate-50 p-3"><b className="text-xl">{lines}</b><div className="text-xs text-slate-500">Satır</div></div><div className="rounded-xl bg-slate-50 p-3"><b className="text-xl">{qty}</b><div className="text-xs text-slate-500">Adet</div></div></div><div className="mt-4 space-y-2">{z.pickTasks.slice(0,5).map(t=><form key={t.id} action={claimZoneTask} className="flex items-center justify-between gap-2 rounded-xl border p-3"><input type="hidden" name="taskId" value={t.id}/><div><b>{t.wave?.waveNo||t.order.orderNumber}</b><div className="text-xs text-slate-500">{t.plannedLineCount} satır · {t.plannedQuantity} adet</div></div><button className="rounded-lg bg-slate-900 px-4 py-2 font-bold text-white">Görev Al</button></form>)}</div></article>})}</div>
    {zones.length===0&&<div className="rounded-2xl border bg-white p-10 text-center text-slate-500">Şu anda alınabilir açık Zone görevi yok.</div>}
  </section>;
}
