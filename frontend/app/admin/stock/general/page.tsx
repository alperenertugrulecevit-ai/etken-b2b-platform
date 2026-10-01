import { HandlingUnitPurpose, HandlingUnitStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
import GeneralStockReportTable, { type GeneralStockReportRow } from "./GeneralStockReportTable";

export const dynamic = "force-dynamic";
export const revalidate = 0;
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const param = (v: string | string[] | undefined) => typeof v === "string" ? v.trim() : "";

export default async function GeneralStockReportPage({ searchParams }: Props) {
  await AuthorizationService.requirePermission("INVENTORY_VIEW");
  const q = await searchParams;
  const productCode = param(q.productCode).toUpperCase();
  const mainCategoryId = Number(param(q.mainCategoryId));
  const warehouseId = Number(param(q.warehouseId));
  const selectedMain = Number.isInteger(mainCategoryId) && mainCategoryId > 0 ? mainCategoryId : null;

  const [warehouses, categories] = await Promise.all([
    prisma.warehouse.findMany({ where: { isActive: true }, orderBy: { code: "asc" }, select: { id: true, code: true, name: true } }),
    prisma.category.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, parentId: true, parent: { select: { id: true, name: true, parentId: true, parent: { select: { id: true, name: true } } } } } }),
  ]);
  const mainCategories = categories.filter(c => c.parentId === null);
  const categoryIds = selectedMain ? categories.filter(c => c.id === selectedMain || c.parentId === selectedMain || c.parent?.parentId === selectedMain).map(c => c.id) : [];

  const stocks = await prisma.warehouseProductStock.findMany({
    where: {
      ...(Number.isInteger(warehouseId) && warehouseId > 0 ? { warehouseId } : {}),
      product: {
        ...(productCode ? { code: { contains: productCode, mode: "insensitive" } } : {}),
        ...(selectedMain ? { categoryId: { in: categoryIds } } : {}),
      },
    },
    orderBy: [{ warehouse: { code: "asc" } }, { product: { code: "asc" } }],
    select: {
      id: true, warehouseId: true, productId: true, physicalStock: true,
      warehouse: { select: { code: true } },
      product: { select: {
        code: true, barcode: true, name: true, brand: true, category: true, supplier: true,
        categoryRef: { select: { id: true, name: true, parentId: true, parent: { select: { id: true, name: true, parentId: true, parent: { select: { id: true, name: true } } } } } },
      } },
    },
  });

  const productIds = [...new Set(stocks.map(s => s.productId))];
  const warehouseIds = [...new Set(stocks.map(s => s.warehouseId))];
  const huRows = productIds.length && warehouseIds.length ? await prisma.handlingUnitItem.findMany({
    where: {
      productId: { in: productIds }, quantity: { gt: 0 },
      handlingUnit: {
        purpose: HandlingUnitPurpose.STOCK, assignedOrderId: null, assignedWaveId: null,
        warehouseId: { in: warehouseIds },
        status: { in: [HandlingUnitStatus.OPEN, HandlingUnitStatus.CLOSED, HandlingUnitStatus.STORED] },
        warehouse: { isActive: true, code: { not: "KYP001" } },
        location: { is: { isActive: true } },
      },
    },
    select: { productId: true, quantity: true, reservedStock: true, handlingUnit: { select: { warehouseId: true } } },
  }) : [];

  const addressed = new Map<string, { quantity: number; reserved: number }>();
  for (const row of huRows) {
    if (row.handlingUnit.warehouseId === null) continue;
    const key = `${row.handlingUnit.warehouseId}:${row.productId}`;
    const x = addressed.get(key) ?? { quantity: 0, reserved: 0 };
    x.quantity += row.quantity; x.reserved += Math.max(0, row.reservedStock); addressed.set(key, x);
  }
  const parts = (c: typeof stocks[number]["product"]["categoryRef"]) => {
    if (!c) return { category: "-", mainCategory: "-", subCategory: "-" };
    if (!c.parent) return { category: c.name, mainCategory: c.name, subCategory: "-" };
    if (!c.parent.parent) return { category: c.name, mainCategory: c.parent.name, subCategory: c.name };
    return { category: c.name, mainCategory: c.parent.parent.name, subCategory: c.name };
  };
  const rows: GeneralStockReportRow[] = stocks.map(s => {
    const source = addressed.get(`${s.warehouseId}:${s.productId}`) ?? { quantity: 0, reserved: 0 };
    const cat = parts(s.product.categoryRef);
    return {
      id: s.id, warehouseCode: s.warehouse.code, productCode: s.product.code, barcode: s.product.barcode ?? "-",
      productName: s.product.name, brand: s.product.brand || "-", category: cat.category !== "-" ? cat.category : (s.product.category || "-"),
      mainCategory: cat.mainCategory, subCategory: cat.subCategory, supplierName: s.product.supplier || "-",
      blockedStock: Math.max(0, s.physicalStock - source.quantity),
      planableStock: Math.max(0, source.quantity - source.reserved),
      reservedStock: source.reserved,
    };
  });

  return <main className="p-6 lg:p-10">
    <h1 className="text-4xl font-black text-slate-950">Genel Stok Raporu</h1>
    <p className="mt-2 text-slate-500">Depo ve ürün bazında güncel WMS stok görünümü. Planlanabilir stok aktif lokasyona adreslenmiş STOCK THM kaynaklarından hesaplanır.</p>
    <form className="mt-7 grid gap-4 rounded-2xl bg-white p-6 shadow md:grid-cols-4">
      <label className="text-sm font-bold text-slate-700">Ürün Kodu<input name="productCode" defaultValue={productCode} placeholder="Ürün kodu..." className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 uppercase" /></label>
      <label className="text-sm font-bold text-slate-700">Ana Kategori<select name="mainCategoryId" defaultValue={selectedMain ? String(selectedMain) : ""} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3"><option value="">Tüm Ana Kategoriler</option>{mainCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label className="text-sm font-bold text-slate-700">Depo<select name="warehouseId" defaultValue={Number.isInteger(warehouseId) && warehouseId > 0 ? String(warehouseId) : ""} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3"><option value="">Tüm Depolar</option>{warehouses.map(w => <option key={w.id} value={w.id}>{w.code} - {w.name}</option>)}</select></label>
      <div className="flex items-end gap-2"><button className="flex-1 rounded-xl bg-slate-900 px-5 py-3 font-black text-white">Listele</button><a href="/admin/stock/general" className="rounded-xl border border-slate-300 px-5 py-3 font-bold text-slate-700">Temizle</a></div>
    </form>
    <GeneralStockReportTable rows={rows} />
  </main>;
}
