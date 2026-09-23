import Link from "next/link";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
import { ManualWaveReportingService, formatIstanbul } from "@/modules/manual-wave/services/manual-wave-reporting.service";
import { WmsContextService } from "@/modules/wms-context/services/wms-context.service";
import { prisma } from "@/lib/prisma";

const istanbulToday = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Istanbul" });
const day = (value: string | undefined, end = false) => {
  const date = value ?? istanbulToday();
  const d = new Date(`${date}T00:00:00+03:00`);
  if (end) d.setUTCDate(d.getUTCDate() + 1);
  return d;
};
const n = (value: bigint | number) => Number(value).toLocaleString("tr-TR");

export default async function Page({ searchParams }: { searchParams: Promise<Record<string,string|undefined>> }) {
  const q = await searchParams;
  const user = await AuthorizationService.requirePermission("MANUAL_WAVE_REPORT_VIEW");
  const scope = await WmsContextService.requireActiveContext(user.id, user.isAdminUser);
  const fromValue = q.from ?? istanbulToday();
  const toValue = q.to ?? q.from ?? istanbulToday();
  const filters = { from: day(q.from), to: day(q.to ?? q.from, true), waveId: q.waveId || undefined, operatorId: q.operatorId || undefined };
  const [summary,hourly,operators,waves,users] = await Promise.all([
    ManualWaveReportingService.getPerformanceSummary(scope,filters),
    ManualWaveReportingService.getHourlyPerformance(scope,filters),
    ManualWaveReportingService.getOperatorPerformance(scope,filters),
    prisma.wave.findMany({where:{sortingTransactions:{some:{tenantId:scope.tenantId,companyId:scope.companyId,warehouseId:scope.warehouseId}}},select:{id:true,waveNo:true},orderBy:{createdAt:"desc"},take:200}),
    prisma.user.findMany({where:{manualSortingTransactions:{some:{tenantId:scope.tenantId,companyId:scope.companyId,warehouseId:scope.warehouseId}}},select:{id:true,fullName:true,username:true},orderBy:{username:"asc"}})
  ]);

  const maxQuantity = Math.max(1, ...operators.map((o) => Number(o.activeQuantity)));
  const params = new URLSearchParams();
  params.set("from", fromValue);
  params.set("to", toValue);
  if (q.waveId) params.set("waveId", q.waveId);
  if (q.operatorId) params.set("operatorId", q.operatorId);

  const generalParams = new URLSearchParams();
  generalParams.set("from", fromValue);
  generalParams.set("to", toValue);
  if (q.waveId) generalParams.set("waveId", q.waveId);

  return (
    <main className="min-h-screen bg-slate-100">
      <section className="border-b border-slate-200 bg-slate-900 px-6 py-5 text-white">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-2xl font-black">Manual Wave Sorting</h1>
          <p className="mt-1 text-sm text-slate-300">Manuel wave dağıtım, THM ve saatlik performans</p>
        </div>
      </section>

      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap gap-2 px-6 py-3">
          <Link href="/admin" className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Operasyon Paneli</Link>
          <Link href="/admin/waves" className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Wave Yönetimi</Link>
          <Link href="/admin/manual-wave/product-query?mode=thm" className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">THM Sorgu</Link>
          <span className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow">Dağıtım Performansı</span>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl space-y-5 p-6">
        <form className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-[1fr_1fr_1fr_1fr_auto]">
          <label className="space-y-1 text-sm font-semibold text-slate-700"><span>Başlangıç Tarihi</span><input name="from" type="date" defaultValue={fromValue} className="w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
          <label className="space-y-1 text-sm font-semibold text-slate-700"><span>Bitiş Tarihi</span><input name="to" type="date" defaultValue={toValue} className="w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
          <label className="space-y-1 text-sm font-semibold text-slate-700"><span>Wave</span><select name="waveId" defaultValue={q.waveId} className="w-full rounded-lg border border-slate-300 px-3 py-2.5"><option value="">Tümü</option>{waves.map(w=><option key={w.id} value={w.id}>{w.waveNo}</option>)}</select></label>
          <label className="space-y-1 text-sm font-semibold text-slate-700"><span>Operatör</span><select name="operatorId" defaultValue={q.operatorId} className="w-full rounded-lg border border-slate-300 px-3 py-2.5"><option value="">Tümü</option>{users.map(u=><option key={u.id} value={u.id}>{u.fullName||u.username}</option>)}</select></label>
          <button className="self-end rounded-lg bg-blue-600 px-8 py-2.5 font-bold text-white shadow hover:bg-blue-700">Raporu Getir</button>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex gap-2">
            <Link href={`/admin/manual-wave/distribution-summary?${generalParams.toString()}`} className="rounded-lg border border-slate-200 px-5 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">Genel Performans</Link>
            <span className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-bold text-white">Saatlik Performans</span>
          </div>
          <Link href={`/admin/manual-wave/distribution-summary/performance-export?${generalParams.toString()}`} className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-700">Excel İndir</Link>
        </div>

        <section className="grid gap-4 md:grid-cols-4">
          {[
            ["Dağıtılan Ürün", n(summary.activeQuantity), "text-emerald-700"],
            ["Farklı THM", n(summary.uniqueHandlingUnits ?? 0), "text-blue-900"],
            ["Wave", n(summary.uniqueWaves), "text-blue-900"],
            ["Kullanıcı", n(summary.uniqueOperators), "text-blue-900"],
          ].map(([label,value,color])=><article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-medium text-slate-500">{label}</p><strong className={`mt-2 block text-3xl ${color}`}>{value}</strong></article>)}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-slate-900">Operatör Performansı</h2>
          <p className="mb-5 text-sm text-slate-500">Kullanıcıların seçilen tarih aralığındaki aktif dağıtım miktarı ve farklı THM sayısı.</p>
          <div className="space-y-5">
            {operators.map((o,index)=>{
              const qty=Number(o.activeQuantity);
              const width=Math.max(2,(qty/maxQuantity)*100);
              return <div key={o.operatorId}><div className="mb-1 flex items-end justify-between gap-4"><div><p className="font-bold text-slate-900">{index+1}. {o.operatorName}</p><p className="text-xs text-slate-500">{n(o.uniqueHandlingUnits ?? 0)} farklı THM · {n(o.activeTransactionCount)} işlem</p></div><p className="text-right"><strong className="text-xl text-emerald-800">{n(qty)}</strong><span className="block text-xs text-slate-500">ürün</span></p></div><div className="h-5 overflow-hidden rounded-full bg-slate-200"><div className="flex h-full items-center justify-end rounded-full bg-emerald-600 pr-2 text-[10px] font-bold text-white" style={{width:`${width}%`}}>{n(qty)}</div></div></div>;
            })}
            {!operators.length&&<p className="py-8 text-center text-slate-500">Seçilen tarih aralığında operatör kaydı bulunamadı.</p>}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5"><h2 className="text-lg font-black text-slate-900">Saatlik Rapor</h2><p className="mt-1 text-sm text-slate-500">Saatler Europe/Istanbul yerel saatidir. Üretken toplamlar yalnızca AKTİF işlemleri içerir.</p></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm"><thead className="bg-slate-50 text-slate-600"><tr>{["Yerel Saat","Dağıtılan Ürün","Ters Miktar","Aktif İşlem","Kullanıcı","Wave","Ürün"].map(x=><th className="px-5 py-3 text-left" key={x}>{x}</th>)}</tr></thead><tbody>{hourly.map((h,i)=><tr className="border-t border-slate-100 hover:bg-slate-50" key={i}><td className="px-5 py-3 font-semibold">{new Intl.DateTimeFormat("tr-TR",{dateStyle:"short",hour:"2-digit",timeZone:"UTC"}).format(h.localHour)}</td><td className="px-5 py-3 font-bold text-emerald-700">{n(h.activeQuantity)}</td><td className="px-5 py-3 text-rose-700">{n(h.reversedQuantity)}</td><td className="px-5 py-3">{n(h.activeTransactionCount)}</td><td className="px-5 py-3">{n(h.uniqueOperators)}</td><td className="px-5 py-3">{n(h.uniqueWaves)}</td><td className="px-5 py-3">{n(h.uniqueProducts)}</td></tr>)}</tbody></table>
          </div>
          {!hourly.length&&<p className="p-8 text-center text-slate-500">Seçilen tarih aralığında saatlik dağıtım kaydı bulunamadı.</p>}
        </section>
      </div>
    </main>
  );
}
