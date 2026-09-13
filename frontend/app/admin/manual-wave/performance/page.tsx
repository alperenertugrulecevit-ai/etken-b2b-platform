import Link from "next/link";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
import { ManualWaveReportingService, formatIstanbul } from "@/modules/manual-wave/services/manual-wave-reporting.service";
import { WmsContextService } from "@/modules/wms-context/services/wms-context.service";
import { prisma } from "@/lib/prisma";

const day = (value: string | undefined, end = false) => {
  const date = value ?? new Date().toISOString().slice(0, 10);
  const d = new Date(`${date}T00:00:00+03:00`);
  if (end) d.setUTCDate(d.getUTCDate() + 1);
  return d;
};
const n = (value: bigint | number) => Number(value).toLocaleString("tr-TR");

export default async function Page({ searchParams }: { searchParams: Promise<Record<string,string|undefined>> }) {
  const q = await searchParams;
  const user = await AuthorizationService.requirePermission("MANUAL_WAVE_REPORT_VIEW");
  const scope = await WmsContextService.requireActiveContext(user.id, user.isAdminUser);
  const filters = { from: day(q.from), to: day(q.to ?? q.from, true), waveId: q.waveId || undefined, operatorId: q.operatorId || undefined };
  const [summary,hourly,operators,waves,users] = await Promise.all([
    ManualWaveReportingService.getPerformanceSummary(scope,filters), ManualWaveReportingService.getHourlyPerformance(scope,filters), ManualWaveReportingService.getOperatorPerformance(scope,filters),
    prisma.wave.findMany({where:{sortingTransactions:{some:{tenantId:scope.tenantId,companyId:scope.companyId,warehouseId:scope.warehouseId}}},select:{id:true,waveNo:true},orderBy:{createdAt:"desc"},take:200}),
    prisma.user.findMany({where:{manualSortingTransactions:{some:{tenantId:scope.tenantId,companyId:scope.companyId,warehouseId:scope.warehouseId}}},select:{id:true,fullName:true,username:true},orderBy:{username:"asc"}})
  ]);
  return <main className="p-6 space-y-6"><div><Link href="/admin" className="text-blue-600">← Yönetime dön</Link><h1 className="text-2xl font-bold">Manuel Dalga Performans Raporu</h1><p className="text-sm text-slate-500">Saatler Europe/Istanbul yerel saatidir. Üretken toplamlar yalnızca AKTİF işlemleri içerir.</p></div>
    <form className="flex flex-wrap gap-3 rounded-xl border p-4"><input name="from" type="date" defaultValue={q.from}/><input name="to" type="date" defaultValue={q.to}/><select name="waveId" defaultValue={q.waveId}><option value="">Tüm dalgalar</option>{waves.map(w=><option key={w.id} value={w.id}>{w.waveNo}</option>)}</select><select name="operatorId" defaultValue={q.operatorId}><option value="">Tüm operatörler</option>{users.map(u=><option key={u.id} value={u.id}>{u.fullName||u.username}</option>)}</select><button className="rounded bg-slate-900 px-4 py-2 text-white">Uygula</button></form>
    <section className="grid gap-3 md:grid-cols-4">{[["Aktif miktar",summary.activeQuantity],["Aktif işlem",summary.activeTransactionCount],["Dalga",summary.uniqueWaves],["Operatör",summary.uniqueOperators],["Ürün",summary.uniqueProducts],["Hedef",summary.uniqueDistributions],["Ort. birim/işlem",summary.averageUnitsPerTransaction.toFixed(2)],["İlk / son",`${formatIstanbul(summary.firstOperation)} / ${formatIstanbul(summary.lastOperation)}`]].map(([k,v])=><article key={k as string} className="rounded-xl border p-4"><div className="text-sm text-slate-500">{k}</div><strong>{v}</strong></article>)}</section>
    <section><h2 className="text-lg font-bold">Operatör performansı</h2><p className="text-xs text-amber-700">Hız, kanıtlanmış aktif çalışma değil, ilk-son işlem arasındaki geçen süreye dayanır.</p><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr>{["Operatör","Miktar","İşlem","Dalga","Ürün","İlk","Son","İlk-son süre","Birim/saat*"].map(x=><th className="p-2 text-left" key={x}>{x}</th>)}</tr></thead><tbody>{operators.map(o=><tr className="border-t" key={o.operatorId}><td className="p-2">{o.operatorName}</td><td>{n(o.activeQuantity)}</td><td>{n(o.activeTransactionCount)}</td><td>{n(o.uniqueWaves)}</td><td>{n(o.uniqueProducts)}</td><td>{formatIstanbul(o.firstOperation)}</td><td>{formatIstanbul(o.lastOperation)}</td><td>{o.elapsedSeconds>0?`${(o.elapsedSeconds/3600).toFixed(2)} sa` : "-"}</td><td>{o.elapsedSeconds>0?(Number(o.activeQuantity)/(o.elapsedSeconds/3600)).toFixed(2):"-"}</td></tr>)}</tbody></table></div></section>
    <section><h2 className="text-lg font-bold">Saatlik rapor</h2><table className="w-full text-sm"><thead><tr>{["Yerel saat","Aktif miktar","Ters miktar","Aktif işlem","Operatör","Dalga","Ürün"].map(x=><th className="p-2 text-left" key={x}>{x}</th>)}</tr></thead><tbody>{hourly.map((h,i)=><tr className="border-t" key={i}><td className="p-2">{new Intl.DateTimeFormat("tr-TR",{dateStyle:"short",hour:"2-digit",timeZone:"UTC"}).format(h.localHour)}</td><td>{n(h.activeQuantity)}</td><td>{n(h.reversedQuantity)}</td><td>{n(h.activeTransactionCount)}</td><td>{n(h.uniqueOperators)}</td><td>{n(h.uniqueWaves)}</td><td>{n(h.uniqueProducts)}</td></tr>)}</tbody></table>{!hourly.length&&<p className="p-4 text-slate-500">Kayıt bulunamadı.</p>}</section>
  </main>;
}
