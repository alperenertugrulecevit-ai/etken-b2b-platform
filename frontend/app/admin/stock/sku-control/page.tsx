import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

type Props={searchParams:Promise<{warehouseId?:string|string[];productCodes?:string|string[];addCode?:string}>};
const arr=(v:string|string[]|undefined)=>Array.isArray(v)?v:v?[v]:[];
export default async function SkuStockControlPage({searchParams}:Props){
 await AuthorizationService.requirePermission("INVENTORY_VIEW");
 const q=await searchParams; const warehouseIds=arr(q.warehouseId).map(Number).filter(Number.isInteger);
 const codes=Array.from(new Set([...arr(q.productCodes).flatMap(x=>x.split(",")),q.addCode??""].map(x=>x.trim().toUpperCase()).filter(Boolean)));
 const [warehouses,products]=await Promise.all([
  prisma.warehouse.findMany({where:{isActive:true},orderBy:{code:"asc"},select:{id:true,code:true,name:true}}),
  prisma.product.findMany({where:{isActive:true},orderBy:{code:"asc"},take:500,select:{code:true,name:true}})
 ]);
 const stocks=codes.length?await prisma.warehouseProductStock.findMany({
  where:{...(warehouseIds.length?{warehouseId:{in:warehouseIds}}:{}),product:{code:{in:codes}}},
  include:{warehouse:true,product:true},
 }):[];
 stocks.sort((a,b)=>a.warehouse.code.localeCompare(b.warehouse.code,"tr")||a.product.code.localeCompare(b.product.code,"tr"));
 return <main className="p-6 lg:p-10"><h1 className="text-4xl font-bold">SKU Stok Kontrol</h1><p className="mt-2 text-slate-500">Bir veya birden fazla ürünün seçili depolardaki güncel stoklarını görüntüleyin.</p>
 <form className="mt-7 rounded-2xl bg-white p-6 shadow"><div className="grid gap-5 lg:grid-cols-2"><fieldset><legend className="font-bold">Depolar (çoklu seçim)</legend><div className="mt-2 max-h-52 overflow-auto rounded-xl border p-3">{warehouses.map(w=><label key={w.id} className="flex gap-2 py-1"><input type="checkbox" name="warehouseId" value={w.id} defaultChecked={warehouseIds.includes(w.id)}/>{w.code} - {w.name}</label>)}</div></fieldset>
 <div><label className="font-bold">Ürün Kodu</label><div className="mt-2 flex gap-2"><input name="addCode" placeholder="Ürün kodunu yazın" className="min-w-0 flex-1 rounded-xl border p-3 uppercase"/><button type="button" popoverTarget="stock-product-picker" className="rounded-xl border px-4 text-xl">⌄</button></div><p className="mt-2 text-sm text-slate-500">Liste: {codes.join(", ")||"Henüz ürün eklenmedi"}</p>{codes.map(c=><input key={c} type="hidden" name="productCodes" value={c}/>)}</div></div>
 <button className="mt-5 rounded-xl bg-blue-900 px-6 py-3 font-bold text-white">Listeye Ekle / Sorgula</button>
 <div id="stock-product-picker" popover="auto" className="m-auto max-h-[70vh] w-[min(720px,92vw)] overflow-auto rounded-2xl border bg-white p-5 shadow-2xl"><h2 className="mb-3 text-xl font-bold">Ürün Seç</h2>{products.map(p=><button key={p.code} type="submit" name="addCode" value={p.code} className="block w-full rounded-lg border-b p-3 text-left hover:bg-slate-50"><b>{p.code}</b> · {p.name}</button>)}</div></form>
 <div className="mt-7 overflow-x-auto rounded-2xl bg-white shadow"><table className="min-w-full text-sm"><thead className="bg-slate-100"><tr><th className="p-3 text-left">Depo</th><th className="p-3 text-left">Ürün Kodu</th><th className="p-3 text-left">Ürün Tanımı</th><th className="p-3 text-right">Fiziksel</th><th className="p-3 text-right">Rezerve</th><th className="p-3 text-right">Kullanılabilir</th></tr></thead><tbody>{stocks.map(s=><tr key={s.id} className="border-t"><td className="p-3">{s.warehouse.code} - {s.warehouse.name}</td><td className="p-3 font-bold">{s.product.code}</td><td className="p-3">{s.product.name}</td><td className="p-3 text-right">{s.physicalStock}</td><td className="p-3 text-right">{s.reservedStock}</td><td className="p-3 text-right font-bold">{s.physicalStock-s.reservedStock}</td></tr>)}</tbody></table></div></main>
}