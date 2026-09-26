import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
import { createZone, toggleZoneStatus } from "./actions";

export default async function ZonesPage({ searchParams }: { searchParams: Promise<{ warehouseId?: string; status?: string; q?: string }> }) {
  await AuthorizationService.requirePermission("WAREHOUSE_VIEW");
  const params = await searchParams;
  const warehouseId = Number(params.warehouseId || 0);
  const q = (params.q || "").trim();
  const status = params.status || "active";

  const [warehouses, zones] = await Promise.all([
    prisma.warehouse.findMany({ where: { isActive: true }, orderBy: { code: "asc" }, select: { id: true, code: true, name: true } }),
    prisma.warehouseZone.findMany({
      where: {
        ...(warehouseId ? { warehouseId } : {}),
        ...(status === "active" ? { isActive: true } : status === "inactive" ? { isActive: false } : {}),
        ...(q ? { OR: [{ code: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }] } : {}),
      },
      include: { warehouse: { select: { code: true, name: true } }, _count: { select: { locations: true } } },
      orderBy: [{ warehouseId: "asc" }, { pickSequence: "asc" }, { code: "asc" }],
    }),
  ]);

  const unassigned = await prisma.warehouseLocation.count({ where: { isActive: true, zoneId: null } });

  return <section className="p-6 lg:p-10">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><h1 className="text-4xl font-bold text-slate-950">Zone Yönetimi</h1><p className="mt-2 text-slate-500">Depo toplama bölgelerini oluşturun ve lokasyonları Zone&apos;lara atayın.</p></div>
      <div className="rounded-2xl bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-900">Zone atanmamış aktif lokasyon: <b>{unassigned}</b></div>
    </div>

    <form method="get" className="mt-8 grid gap-3 rounded-2xl bg-white p-5 shadow md:grid-cols-4">
      <select name="warehouseId" defaultValue={params.warehouseId || ""} className="rounded-xl border p-3"><option value="">Tüm Depolar</option>{warehouses.map(w=><option key={w.id} value={w.id}>{w.code} - {w.name}</option>)}</select>
      <select name="status" defaultValue={status} className="rounded-xl border p-3"><option value="active">Aktif</option><option value="inactive">Pasif</option><option value="all">Tümü</option></select>
      <input name="q" defaultValue={q} placeholder="Zone kodu / adı ara" className="rounded-xl border p-3" />
      <button className="rounded-xl bg-slate-800 px-5 py-3 font-bold text-white">Filtrele</button>
    </form>

    <div className="mt-8 grid gap-8 2xl:grid-cols-[420px_1fr]">
      <form action={createZone} className="h-fit rounded-2xl bg-white p-6 shadow">
        <h2 className="text-xl font-bold">Yeni Zone Oluştur</h2>
        <div className="mt-5 space-y-4">
          <label className="block text-sm font-semibold">Depo *<select name="warehouseId" required className="mt-1 w-full rounded-xl border p-3"><option value="">Depo seçin</option>{warehouses.map(w=><option key={w.id} value={w.id}>{w.code} - {w.name}</option>)}</select></label>
          <label className="block text-sm font-semibold">Zone Kodu *<input name="code" required maxLength={20} placeholder="Z01" className="mt-1 w-full rounded-xl border p-3 uppercase" /></label>
          <label className="block text-sm font-semibold">Zone Adı *<input name="name" required placeholder="Kırtasiye" className="mt-1 w-full rounded-xl border p-3" /></label>
          <label className="block text-sm font-semibold">Toplama Sırası<input name="pickSequence" type="number" min="0" defaultValue="10" className="mt-1 w-full rounded-xl border p-3" /></label>
          <label className="block text-sm font-semibold">Açıklama<textarea name="description" rows={3} className="mt-1 w-full rounded-xl border p-3" /></label>
          <button className="w-full rounded-xl bg-blue-900 px-5 py-3 font-bold text-white hover:bg-blue-800">Zone Oluştur</button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-2xl bg-white shadow">
        <table className="w-full min-w-[900px] text-left"><thead className="bg-blue-900 text-white"><tr><th className="p-4">Zone</th><th className="p-4">Depo</th><th className="p-4">Adres</th><th className="p-4">Sıra</th><th className="p-4">Durum</th><th className="p-4">İşlemler</th></tr></thead>
        <tbody>{zones.map(z=><tr key={z.id} className="border-b hover:bg-slate-50"><td className="p-4"><b className="text-blue-900">{z.code}</b><div className="font-semibold">{z.name}</div><div className="text-xs text-slate-500">{z.description || "-"}</div></td><td className="p-4">{z.warehouse.code}<div className="text-sm text-slate-500">{z.warehouse.name}</div></td><td className="p-4 text-xl font-bold">{z._count.locations}</td><td className="p-4">{z.pickSequence}</td><td className="p-4"><span className={`rounded-full px-3 py-1 text-sm font-semibold ${z.isActive?"bg-green-100 text-green-700":"bg-red-100 text-red-700"}`}>{z.isActive?"Aktif":"Pasif"}</span></td><td className="p-4"><div className="flex gap-2"><Link href={`/admin/zones/${z.id}/locations`} className="rounded-lg bg-slate-800 px-4 py-2 font-semibold text-white">Adresleri Yönet</Link><form action={toggleZoneStatus.bind(null,z.id,z.isActive)}><button className={`rounded-lg px-4 py-2 font-semibold text-white ${z.isActive?"bg-red-600":"bg-green-600"}`}>{z.isActive?"Pasif Yap":"Aktifleştir"}</button></form></div></td></tr>)}
        {!zones.length&&<tr><td colSpan={6} className="p-12 text-center text-slate-500">Filtreye uygun Zone bulunamadı.</td></tr>}</tbody></table>
      </div>
    </div>
  </section>;
}
