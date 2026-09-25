import { prisma } from "@/lib/prisma";
import { createWarehouseTransfer } from "./actions";

function loc(l: {code:string;section:string;level:string;bin:string}) {
  return [l.code,l.section,l.level,l.bin].filter(Boolean).join("-");
}

export default async function WarehouseTransferPage() {
  const [warehouses, units] = await Promise.all([
    prisma.warehouse.findMany({
      where: { isActive: true },
      orderBy: { code: "asc" },
      include: { locations: { where: { isActive: true }, orderBy: { sortOrder: "asc" } } },
    }),
    prisma.handlingUnit.findMany({
      where: { purpose: "STOCK", warehouseId: { not: null }, locationId: { not: null }, status: { in: ["OPEN","CLOSED","STORED"] } },
      orderBy: { barcode: "asc" },
      include: { warehouse: true, location: true, items: { where: { quantity: { gt: 0 } }, include: { product: true } } },
    }),
  ]);

  return <section className="space-y-6">
    <div>
      <p className="text-xs font-black uppercase tracking-wider text-blue-700">Stok Yönetimi</p>
      <h1 className="mt-1 text-2xl font-black">Depolar Arası Transfer</h1>
      <p className="mt-2 text-sm text-slate-600">Ürün bazlı veya aynı THM kimliğini koruyarak komple THM transferi yapın.</p>
    </div>

    <div className="grid gap-6 xl:grid-cols-2">
      <form action={createWarehouseTransfer} className="rounded-2xl border bg-white p-6 shadow-sm">
        <input type="hidden" name="mode" value="PRODUCT" />
        <h2 className="text-xl font-black text-blue-950">ÜRÜN BAZLI TRANSFER</h2>
        <p className="mt-2 text-sm text-slate-500">Yalnız seçilen SKU ve miktar taşınır. Diğer THM ürünleri değişmez.</p>
        <div className="mt-5 grid gap-4">
          <select name="sourceHandlingUnitBarcode" required className="rounded-xl border p-3">
            <option value="">Kaynak THM seçin</option>
            {units.map(u=><option key={u.id} value={u.barcode}>{u.barcode} — {u.warehouse?.code} / {u.location?loc(u.location):"-"}</option>)}
          </select>
          <select name="productId" required className="rounded-xl border p-3">
            <option value="">Ürün seçin</option>
            {units.flatMap(u=>u.items.map(i=><option key={`${u.id}-${i.productId}`} value={i.productId}>{i.product.code} — {i.product.name} — {u.barcode}: {i.quantity-i.reservedStock} kullanılabilir</option>))}
          </select>
          <input name="quantity" type="number" min="1" step="1" required placeholder="Transfer miktarı" className="rounded-xl border p-3" />
          <select name="targetWarehouseId" required className="rounded-xl border p-3">
            <option value="">Hedef depo seçin</option>{warehouses.map(w=><option key={w.id} value={w.id}>{w.code} — {w.name}</option>)}
          </select>
          <select name="targetLocationId" required className="rounded-xl border p-3">
            <option value="">Hedef lokasyon seçin</option>{warehouses.flatMap(w=>w.locations.map(l=><option key={l.id} value={l.id}>{w.code} — {loc(l)}</option>))}
          </select>
          <select name="targetHandlingUnitBarcode" required className="rounded-xl border p-3">
            <option value="">Hedef THM seçin</option>{units.map(u=><option key={u.id} value={u.barcode}>{u.barcode} — {u.warehouse?.code} / {u.location?loc(u.location):"-"}</option>)}
          </select>
          <button className="rounded-xl bg-blue-900 py-4 font-black text-white">ÜRÜN TRANSFERİNİ TAMAMLA</button>
        </div>
      </form>

      <form action={createWarehouseTransfer} className="rounded-2xl border bg-white p-6 shadow-sm">
        <input type="hidden" name="mode" value="FULL_HU" />
        <h2 className="text-xl font-black text-cyan-950">KOMPLE THM TRANSFER</h2>
        <p className="mt-2 text-sm text-slate-500">THM barkodu ve tüm ürünleri korunur; THM yeni depo/lokasyona taşınır.</p>
        <div className="mt-5 grid gap-4">
          <select name="sourceHandlingUnitBarcode" required className="rounded-xl border p-3">
            <option value="">Taşınacak THM seçin</option>{units.map(u=><option key={u.id} value={u.barcode}>{u.barcode} — {u.warehouse?.code} / {u.location?loc(u.location):"-"} — {u.items.reduce((n,i)=>n+i.quantity,0)} adet</option>)}
          </select>
          <select name="targetWarehouseId" required className="rounded-xl border p-3">
            <option value="">Hedef depo seçin</option>{warehouses.map(w=><option key={w.id} value={w.id}>{w.code} — {w.name}</option>)}
          </select>
          <select name="targetLocationId" required className="rounded-xl border p-3">
            <option value="">Hedef lokasyon seçin</option>{warehouses.flatMap(w=>w.locations.map(l=><option key={l.id} value={l.id}>{w.code} — {loc(l)}</option>))}
          </select>
          <button className="rounded-xl bg-cyan-800 py-4 font-black text-white">THM'Yİ KOMPLE TRANSFER ET</button>
        </div>
      </form>
    </div>
  </section>;
}
