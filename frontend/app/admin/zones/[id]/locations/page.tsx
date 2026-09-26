import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
import { assignLocationsToZone, removeLocationsFromZone } from "../../actions";

export default async function ZoneLocationsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ aisle?: string; scope?: string; q?: string; updated?: string }> }) {
  await AuthorizationService.requirePermission("WAREHOUSE_VIEW");
  const { id } = await params;
  const zoneId = Number(id);
  if (!Number.isInteger(zoneId)) notFound();
  const sp = await searchParams;
  const zone = await prisma.warehouseZone.findUnique({ where: { id: zoneId }, include: { warehouse: { select: { id: true, code: true, name: true } } } });
  if (!zone) notFound();

  const aisle = (sp.aisle || "").trim();
  const q = (sp.q || "").trim();
  const scope = sp.scope || "all";
  const locations = await prisma.warehouseLocation.findMany({
    where: {
      warehouseId: zone.warehouseId,
      isActive: true,
      ...(aisle ? { aisle } : {}),
      ...(scope === "unassigned" ? { zoneId: null } : scope === "current" ? { zoneId } : {}),
      ...(q ? { OR: [{ code: { contains: q, mode: "insensitive" } }, { aisle: { contains: q, mode: "insensitive" } }, { section: { contains: q, mode: "insensitive" } }] } : {}),
    },
    include: { zone: { select: { id: true, code: true, name: true } } },
    orderBy: [{ sortOrder: "asc" }, { aisle: "asc" }, { section: "asc" }, { level: "asc" }, { bin: "asc" }],
    take: 1000,
  });
  const aisleRows = await prisma.warehouseLocation.findMany({ where: { warehouseId: zone.warehouseId, isActive: true }, distinct: ["aisle"], select: { aisle: true }, orderBy: { aisle: "asc" } });
  const currentCount = await prisma.warehouseLocation.count({ where: { warehouseId: zone.warehouseId, zoneId } });
  const unassignedCount = await prisma.warehouseLocation.count({ where: { warehouseId: zone.warehouseId, isActive: true, zoneId: null } });

  return <section className="p-6 lg:p-10">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><Link href="/admin/zones" className="text-sm font-bold text-blue-700">← Zone Yönetimi</Link><h1 className="mt-2 text-3xl font-bold">{zone.code} — {zone.name}</h1><p className="mt-1 text-slate-500">{zone.warehouse.code} - {zone.warehouse.name} · Zone adresi: {currentCount} · Atanmamış: {unassignedCount}</p></div>
      {sp.updated&&<div className="rounded-xl bg-green-100 px-4 py-3 font-semibold text-green-800">{sp.updated} lokasyon için atama işlemi tamamlandı.</div>}
    </div>

    <form method="get" className="mt-7 grid gap-3 rounded-2xl bg-white p-5 shadow md:grid-cols-4">
      <select name="aisle" defaultValue={aisle} className="rounded-xl border p-3"><option value="">Tüm Koridorlar</option>{aisleRows.filter(x=>x.aisle).map(x=><option key={x.aisle} value={x.aisle}>{x.aisle}</option>)}</select>
      <select name="scope" defaultValue={scope} className="rounded-xl border p-3"><option value="all">Tüm Aktif Adresler</option><option value="unassigned">Sadece Zone Atanmamış</option><option value="current">Sadece Bu Zone</option></select>
      <input name="q" defaultValue={q} placeholder="Adres / koridor ara" className="rounded-xl border p-3" />
      <button className="rounded-xl bg-slate-800 px-5 py-3 font-bold text-white">Filtrele</button>
    </form>

    <form action={assignLocationsToZone.bind(null,zoneId)} className="mt-6 overflow-hidden rounded-2xl bg-white shadow">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4"><p className="text-sm text-slate-600">En fazla 1000 sonuç gösterilir. Başlık kutusu ile görünen kayıtların tümünü seçebilirsiniz.</p><div className="flex gap-2"><button formAction={removeLocationsFromZone.bind(null,zoneId)} className="rounded-xl border border-red-300 px-4 py-2 font-bold text-red-700">Seçilenleri Zone&apos;dan Çıkar</button><button className="rounded-xl bg-blue-900 px-4 py-2 font-bold text-white">Seçilenleri {zone.code}&apos;e Ata</button></div></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[950px] text-left"><thead className="bg-slate-900 text-white"><tr><th className="p-4"><input type="checkbox" onChange={undefined} aria-label="Tümünü seç" /></th><th className="p-4">Adres</th><th className="p-4">Koridor</th><th className="p-4">Bölüm</th><th className="p-4">Seviye</th><th className="p-4">Göz</th><th className="p-4">Mevcut Zone</th></tr></thead>
      <tbody>{locations.map(l=><tr key={l.id} className="border-b hover:bg-slate-50"><td className="p-4"><input type="checkbox" name="locationId" value={l.id} /></td><td className="p-4 font-bold">{l.code}</td><td className="p-4">{l.aisle||"-"}</td><td className="p-4">{l.section||"-"}</td><td className="p-4">{l.level||"-"}</td><td className="p-4">{l.bin||"-"}</td><td className="p-4">{l.zone?<span className={`rounded-full px-3 py-1 text-sm font-semibold ${l.zone.id===zoneId?"bg-blue-100 text-blue-800":"bg-amber-100 text-amber-800"}`}>{l.zone.code} - {l.zone.name}</span>:<span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">Atanmamış</span>}</td></tr>)}
      {!locations.length&&<tr><td colSpan={7} className="p-12 text-center text-slate-500">Filtreye uygun lokasyon bulunamadı.</td></tr>}</tbody></table></div>
    </form>
  </section>;
}
