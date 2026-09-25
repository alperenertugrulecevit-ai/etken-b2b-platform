import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
import { WmsContextService } from "@/modules/wms-context/services/wms-context.service";
import { createRfWarehouseTransfer } from "../actions";

function loc(l: {code:string;section:string;level:string;bin:string}) {
  return [l.code,l.section,l.level,l.bin].filter(Boolean).join("-");
}

export default async function RFWarehouseThmTransferPage() {
  const profile = await AuthorizationService.requireRfAccess("TRANSFER_EXECUTE");
  const context = await WmsContextService.requireActiveContext(profile.id, profile.isAdminUser);
  const [warehouses, units] = await Promise.all([
    prisma.warehouse.findMany({ where: { isActive: true, companyId: context.companyId }, orderBy: { code: "asc" }, include: { locations: { where: { isActive: true }, orderBy: { sortOrder: "asc" } } } }),
    prisma.handlingUnit.findMany({ where: { companyId: context.companyId, purpose: "STOCK", warehouseId: { not: null }, locationId: { not: null }, status: { in: ["OPEN","CLOSED","STORED"] } }, orderBy: { barcode: "asc" }, include: { warehouse: true, location: true, items: { where: { quantity: { gt: 0 } } } } }),
  ]);

  return <section className="space-y-4">
    <div className="flex items-start justify-between gap-3">
      <div><p className="text-xs font-black uppercase tracking-wider text-blue-700">RF · Transfer İşlemleri</p><h1 className="mt-1 text-2xl font-black">Depolararası Transfer THM</h1></div>
      <Link href="/rf/operations/transfer" className="rounded-xl border bg-white px-3 py-2 font-bold">← Transfer</Link>
    </div>
    <form action={createRfWarehouseTransfer} className="rounded-2xl border bg-white p-4 shadow-sm">
      <input type="hidden" name="mode" value="FULL_HU" />
      <div className="grid gap-4">
        <label className="text-sm font-black">1. Transfer Edilecek THM
          <input name="sourceHandlingUnitBarcode" list="source-units" required autoComplete="off" placeholder="THM barkodunu okutun" className="mt-2 w-full rounded-xl border-2 border-blue-300 p-4 text-lg font-black uppercase" />
        </label>
        <datalist id="source-units">{units.map(u=><option key={u.id} value={u.barcode}>{u.warehouse?.code} / {u.location?loc(u.location):"-"} — {u.items.reduce((n,i)=>n+i.quantity,0)} adet</option>)}</datalist>
        <label className="text-sm font-black">2. Hedef Depo
          <select name="targetWarehouseId" required className="mt-2 w-full rounded-xl border p-4"><option value="">Hedef depo seçin</option>{warehouses.map(w=><option key={w.id} value={w.id}>{w.code} — {w.name}</option>)}</select>
        </label>
        <label className="text-sm font-black">3. Hedef Lokasyon
          <select name="targetLocationId" required className="mt-2 w-full rounded-xl border p-4"><option value="">Hedef lokasyon seçin</option>{warehouses.flatMap(w=>w.locations.map(l=><option key={l.id} value={l.id}>{w.code} — {loc(l)}</option>))}</select>
        </label>
        <label className="text-sm font-black">Terminal Kodu
          <input name="terminalCode" placeholder="Örn. RF-01" className="mt-2 w-full rounded-xl border p-4 uppercase" />
        </label>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">THM barkodu ve içindeki tüm ürünler korunarak yeni depoya taşınır. Aktif rezervasyonu olan THM transfer edilemez.</div>
        <button className="rounded-xl bg-cyan-800 py-4 text-lg font-black text-white">THM'Yİ KOMPLE TRANSFER ET</button>
      </div>
    </form>
  </section>;
}
