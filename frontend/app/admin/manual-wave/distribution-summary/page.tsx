import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
import { ManualWaveReportingService } from "@/modules/manual-wave/services/manual-wave-reporting.service";
import { WmsContextService } from "@/modules/wms-context/services/wms-context.service";

const day = (value: string | undefined, end = false) => {
  const date = value ?? new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Istanbul" });
  const d = new Date(`${date}T00:00:00+03:00`);
  if (end) d.setUTCDate(d.getUTCDate() + 1);
  return d;
};

const n = (value: bigint | number) => Number(value).toLocaleString("tr-TR");

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const q = await searchParams;
  const user = await AuthorizationService.requirePermission("MANUAL_WAVE_REPORT_VIEW");
  const scope = await WmsContextService.requireActiveContext(user.id, user.isAdminUser);

  const filters = {
    from: day(q.from),
    to: day(q.to ?? q.from, true),
    waveId: q.waveId || undefined,
  };

  const [summary, operators, waves] = await Promise.all([
    ManualWaveReportingService.getPerformanceSummary(scope, filters),
    ManualWaveReportingService.getOperatorPerformance(scope, filters),
    prisma.wave.findMany({
      where: {
        sortingTransactions: {
          some: {
            tenantId: scope.tenantId,
            companyId: scope.companyId,
            warehouseId: scope.warehouseId,
          },
        },
      },
      select: { id: true, waveNo: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  const maxQuantity = Math.max(1, ...operators.map((o) => Number(o.activeQuantity)));
  const exportParams = new URLSearchParams();
  if (q.from) exportParams.set("from", q.from);
  if (q.to) exportParams.set("to", q.to);
  if (q.waveId) exportParams.set("waveId", q.waveId);

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
        <form className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-[1fr_1fr_1fr_auto]">
          <label className="space-y-1 text-sm font-semibold text-slate-700">
            <span>Başlangıç Tarihi</span>
            <input name="from" type="date" defaultValue={q.from} className="w-full rounded-lg border border-slate-300 px-3 py-2.5" />
          </label>
          <label className="space-y-1 text-sm font-semibold text-slate-700">
            <span>Bitiş Tarihi</span>
            <input name="to" type="date" defaultValue={q.to} className="w-full rounded-lg border border-slate-300 px-3 py-2.5" />
          </label>
          <label className="space-y-1 text-sm font-semibold text-slate-700">
            <span>Wave</span>
            <select name="waveId" defaultValue={q.waveId} className="w-full rounded-lg border border-slate-300 px-3 py-2.5">
              <option value="">Tümü</option>
              {waves.map((w) => <option key={w.id} value={w.id}>{w.waveNo}</option>)}
            </select>
          </label>
          <button className="self-end rounded-lg bg-blue-600 px-8 py-2.5 font-bold text-white shadow hover:bg-blue-700">Raporu Getir</button>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex gap-2">
            <span className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-bold text-white">Genel Performans</span>
            <Link href={`/admin/manual-wave/performance?${exportParams.toString()}`} className="rounded-lg border border-slate-200 px-5 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">Saatlik Performans</Link>
          </div>
          <Link href={`/admin/manual-wave/performance/export?${exportParams.toString()}`} className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-700">Excel İndir</Link>
        </div>

        <section className="grid gap-4 md:grid-cols-4">
          {[
            ["Dağıtılan Ürün", n(summary.activeQuantity), "text-emerald-700"],
            ["Farklı THM", n(summary.uniqueHandlingUnits ?? 0), "text-blue-900"],
            ["Wave", n(summary.uniqueWaves), "text-blue-900"],
            ["Kullanıcı", n(summary.uniqueOperators), "text-blue-900"],
          ].map(([label, value, color]) => (
            <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">{label}</p>
              <strong className={`mt-2 block text-3xl ${color}`}>{value}</strong>
            </article>
          ))}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-slate-900">Performans Grafiği</h2>
          <p className="mb-5 text-sm text-slate-500">Kullanıcılar dağıttıkları toplam ürün adedine göre sıralanır. Çubuk uzunluğu performansı gösterir.</p>
          <div className="space-y-5">
            {operators.map((o, index) => {
              const qty = Number(o.activeQuantity);
              const width = Math.max(2, (qty / maxQuantity) * 100);
              return (
                <div key={o.operatorId}>
                  <div className="mb-1 flex items-end justify-between gap-4">
                    <div>
                      <p className="font-bold text-slate-900">{index + 1}. {o.operatorName}</p>
                      <p className="text-xs text-slate-500">{n(o.uniqueHandlingUnits ?? 0)} farklı THM</p>
                    </div>
                    <p className="text-right"><strong className="text-xl text-emerald-800">{n(qty)}</strong><span className="block text-xs text-slate-500">ürün</span></p>
                  </div>
                  <div className="h-5 overflow-hidden rounded-full bg-slate-200">
                    <div className="flex h-full items-center justify-end rounded-full bg-emerald-600 pr-2 text-[10px] font-bold text-white" style={{ width: `${width}%` }}>{n(qty)}</div>
                  </div>
                </div>
              );
            })}
            {!operators.length && <p className="py-8 text-center text-slate-500">Seçilen tarih aralığında dağıtım kaydı bulunamadı.</p>}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <h2 className="p-5 text-lg font-black text-slate-900">Kullanıcı Performansı</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>{["Kullanıcı", "Dağıtılan Ürün", "Farklı THM", "Wave", "İşlem Sayısı"].map((x) => <th key={x} className="border-t border-slate-200 px-5 py-3 text-left">{x}</th>)}</tr>
              </thead>
              <tbody>
                {operators.map((o) => (
                  <tr key={o.operatorId} className="border-t border-slate-100">
                    <td className="px-5 py-3 font-semibold">{o.operatorName}</td>
                    <td className="px-5 py-3 font-bold text-emerald-700">{n(o.activeQuantity)}</td>
                    <td className="px-5 py-3">{n(o.uniqueHandlingUnits ?? 0)}</td>
                    <td className="px-5 py-3">{n(o.uniqueWaves)}</td>
                    <td className="px-5 py-3">{n(o.activeTransactionCount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
