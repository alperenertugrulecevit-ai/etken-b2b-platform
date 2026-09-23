import Link from "next/link";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
import { ManualWaveReportingService, formatIstanbul } from "@/modules/manual-wave/services/manual-wave-reporting.service";
import { WmsContextService } from "@/modules/wms-context/services/wms-context.service";

const modeLabels = {
  code: "Ürün kodu",
  primaryBarcode: "Ana barkod",
  additionalBarcode: "Ek barkod",
  thm: "THM barkodu (ST-...)",
} as const;

export default async function Page({ searchParams }: { searchParams: Promise<Record<string,string|undefined>> }) {
  const q = await searchParams;
  const user = await AuthorizationService.requirePermission("MANUAL_WAVE_REPORT_VIEW");
  const scope = await WmsContextService.requireActiveContext(user.id,user.isAdminUser);
  const mode = (q.mode || "code") as keyof typeof modeLabels;
  const result = q.value ? await ManualWaveReportingService.queryProductOperations(scope,{
    mode,
    value:q.value,
    page:Number(q.page)||1,
    pageSize:Number(q.pageSize)||50,
    includeReversed:q.includeReversed==="1"
  }) : null;
  const query = new URLSearchParams(Object.entries(q).filter((x):x is [string,string]=>Boolean(x[1])));

  return (
    <main className="min-h-screen bg-slate-100">
      <section className="border-b border-slate-200 bg-slate-900 px-6 py-5 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black">Manuel Dalga Ürün / THM Sorgu</h1>
            <p className="mt-1 text-sm text-slate-300">Ürün kodu, barkod veya THM barkodu ile manuel dalga hareketlerini sorgulayın.</p>
          </div>
          <Link href="/admin" className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">← Yönetime dön</Link>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-5 p-6">
        <form className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-[220px_minmax(260px,1fr)_140px_auto_auto]">
          <label className="space-y-1 text-sm font-semibold text-slate-700">
            <span>Arama Tipi</span>
            <select name="mode" defaultValue={mode} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5">
              {Object.entries(modeLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-sm font-semibold text-slate-700">
            <span>Arama Metni</span>
            <input name="value" required defaultValue={q.value} placeholder={mode==="thm" ? "THM barkodunu girin..." : "Tam değeri girin..."} className="w-full rounded-lg border border-slate-300 px-3 py-2.5" />
          </label>
          <label className="space-y-1 text-sm font-semibold text-slate-700">
            <span>Sonuç Sayısı</span>
            <select name="pageSize" defaultValue={q.pageSize||"50"} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5">{[25,50,100].map(x=><option key={x}>{x}</option>)}</select>
          </label>
          <label className="flex items-end gap-2 pb-2.5 text-sm font-medium text-slate-700"><input type="checkbox" name="includeReversed" value="1" defaultChecked={q.includeReversed==="1"} className="h-4 w-4" /> Ters kayıtları göster</label>
          <button className="self-end rounded-lg bg-blue-600 px-7 py-2.5 font-bold text-white shadow hover:bg-blue-700">🔎 Sorgula</button>
        </form>

        {!result && (
          <section className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-3xl">🔎</div>
            <h2 className="text-xl font-black text-slate-900">Arama yaparak başlayın</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">Ürün kodu, ana barkod, ek barkod veya THM barkodu ile sorgulama yaparak sonuçları burada görüntüleyebilirsiniz.</p>
            <div className="mt-6 w-full max-w-2xl rounded-xl border border-blue-200 bg-blue-50 p-5 text-left">
              <h3 className="font-bold text-blue-800">ⓘ Arama örnekleri</h3>
              <ul className="mt-3 space-y-1 text-sm text-slate-600">
                <li>• Ürün kodu: SAP ürün kodunun tam değeri</li>
                <li>• Ana barkod: ürünün ana barkodunun tam değeri</li>
                <li>• Ek barkod: ürüne tanımlı ek barkodun tam değeri</li>
                <li>• THM: ST-... formatındaki THM barkodu</li>
              </ul>
            </div>
          </section>
        )}

        {result?.thmSummary && <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-sm"><h2 className="font-black text-blue-900">THM Özeti</h2><pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-sm text-slate-700">{JSON.stringify(result.thmSummary,(_,v)=>typeof v==="bigint"?Number(v):v,2)}</pre></section>}

        {result && (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
              <div><h2 className="text-lg font-black text-slate-900">Sorgu Sonuçları</h2><p className="text-sm text-slate-500">{result.total} kayıt bulundu</p></div>
              <a className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700" href={`/admin/manual-wave/product-query/export?${query}`}>Excel İndir</a>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600"><tr>{["Ürün","Barkod","Dalga","Hedef","THM / Orijinal","Durum","Miktar","Operatör","Tarih","Geri alma"].map(x=><th className="whitespace-nowrap px-4 py-3 text-left" key={x}>{x}</th>)}</tr></thead>
                <tbody>{result.rows.map(r=><tr key={String(r.id)} className="border-t border-slate-100 hover:bg-slate-50"><td className="px-4 py-3 font-semibold">{String(r.productCode)} — {String(r.productName)}</td><td className="px-4 py-3">{String(r.barcode)}</td><td className="px-4 py-3">{String(r.waveNo)}</td><td className="px-4 py-3">{String(r.customerCode||r.distributionCode)} — {String(r.customerName)}</td><td className="px-4 py-3">{String(r.thmBarcode)} / {String(r.originalThmBarcode)}</td><td className="px-4 py-3">{String(r.status)}</td><td className="px-4 py-3 font-bold">{String(r.quantity)}</td><td className="px-4 py-3">{String(r.operator)}</td><td className="px-4 py-3">{formatIstanbul(r.createdAt as Date)}</td><td className="px-4 py-3">{r.reversedAt?`${formatIstanbul(r.reversedAt as Date)} / ${String(r.reversedBy||"")} / ${String(r.reversalReason||"")}`:"-"}</td></tr>)}</tbody>
              </table>
            </div>
            {!result.rows.length && <p className="p-8 text-center text-slate-500">Tam eşleşen kayıt bulunamadı.</p>}
            <nav className="flex gap-4 border-t border-slate-200 p-4 text-sm font-semibold text-blue-700">
              {result.page>1&&<Link href={`?${new URLSearchParams({...Object.fromEntries(query),page:String(result.page-1)})}`}>← Önceki</Link>}
              {result.page*result.pageSize<result.total&&<Link href={`?${new URLSearchParams({...Object.fromEntries(query),page:String(result.page+1)})}`}>Sonraki →</Link>}
            </nav>
          </section>
        )}
      </div>
    </main>
  );
}
