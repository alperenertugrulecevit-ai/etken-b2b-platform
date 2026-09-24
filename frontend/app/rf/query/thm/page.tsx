import Link from "next/link";
import { HandlingUnitStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

function fullLocation(l: { code: string; section: string; level: string; bin: string }) {
  return [l.code, l.section, l.level, l.bin].filter(Boolean).join("-");
}

export default async function RFThmQueryPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await AuthorizationService.requireRfAccess("INVENTORY_VIEW");
  const { q = "" } = await searchParams;
  const barcode = q.trim();
  const unit = barcode ? await prisma.handlingUnit.findFirst({
    where: { barcode, status: { not: HandlingUnitStatus.CANCELLED } },
    select: {
      barcode: true,
      warehouse: { select: { code: true, name: true } },
      location: { select: { code: true, section: true, level: true, bin: true } },
      items: { where: { quantity: { gt: 0 } }, orderBy: { product: { code: "asc" } }, select: {
        quantity: true, product: { select: { code: true, name: true } }
      }}
    }
  }) : null;

  return <section>
    <div className="mb-4 flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-blue-700">RF Sorgu</p><h1 className="mt-1 text-2xl font-black">THM Sorgula</h1></div><Link href="/rf" className="rounded-xl border bg-white px-4 py-3 font-bold">← Menü</Link></div>
    <form className="rounded-2xl border border-blue-200 bg-white p-4 shadow-sm">
      <label className="text-sm font-black">THM Okut</label>
      <div className="mt-2 flex gap-2"><input autoFocus name="q" defaultValue={barcode} placeholder="THM barkodu okutun" className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-4 text-lg font-bold outline-none focus:border-blue-600"/><button className="rounded-xl bg-blue-900 px-5 py-3 font-black text-white">Sorgula</button></div>
    </form>
    {barcode && !unit && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 font-bold text-red-800">THM bulunamadı.</div>}
    {unit && <><div className="mt-4 grid gap-3 sm:grid-cols-3">
      <div className="rounded-xl border bg-white p-4"><p className="text-xs font-bold text-slate-500">DEPO</p><p className="mt-1 font-black">{unit.warehouse ? unit.warehouse.code+" · "+unit.warehouse.name : "-"}</p></div>
      <div className="rounded-xl border bg-white p-4"><p className="text-xs font-bold text-slate-500">THM</p><p className="mt-1 font-black">{unit.barcode}</p></div>
      <div className="rounded-xl border bg-white p-4"><p className="text-xs font-bold text-slate-500">LOKASYON</p><p className="mt-1 font-black">{unit.location ? fullLocation(unit.location) : "-"}</p></div>
    </div>
    <div className="mt-4 overflow-x-auto rounded-2xl border bg-white"><table className="w-full text-sm"><thead className="bg-slate-100"><tr><th className="p-3 text-left">SKU</th><th className="p-3 text-left">Ürün Tanımı</th><th className="p-3 text-right">Miktar</th></tr></thead><tbody>{unit.items.map((i)=><tr key={i.product.code} className="border-t"><td className="p-3 font-bold">{i.product.code}</td><td className="p-3">{i.product.name}</td><td className="p-3 text-right font-black">{i.quantity.toLocaleString("tr-TR")}</td></tr>)}</tbody></table></div></>}
  </section>;
}
