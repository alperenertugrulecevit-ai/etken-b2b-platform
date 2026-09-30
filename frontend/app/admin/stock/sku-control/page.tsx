import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
import SkuStockTable from "@/components/admin/SkuStockTable";

type Props={searchParams:Promise<{warehouseId?:string|string[];productCodes?:string|string[];addCode?:string}>};
const arr=(v:string|string[]|undefined)=>Array.isArray(v)?v:v?[v]:[];
export default async function SkuStockControlPage({searchParams}:Props){
 await AuthorizationService.requirePermission("INVENTORY_VIEW");
 const q=await searchParams; const warehouseIds=arr(q.warehouseId).map(Number).filter(Number.isInteger);
 const codes=Array.from(new Set([...arr(q.productCodes).flatMap(x=>x.split(",")),...arr(q.addCode)].map(x=>x.trim().toUpperCase()).filter(Boolean)));
 const [warehouses,products]=await Promise.all([
  prisma.warehouse.findMany({where:{isActive:true},orderBy:{code:"asc"},select:{id:true,code:true,name:true}}),
  prisma.product.findMany({where:{isActive:true},orderBy:{code:"asc"},take:500,select:{code:true,name:true}})
 ]);
 const selectedProducts=codes.length?await prisma.product.findMany({
  where:{code:{in:codes}},
  select:{id:true,code:true,barcode:true,name:true},
 }):[];
 const selectedProductIds=selectedProducts.map(p=>p.id);
 const [stockRows,locationRows]=selectedProductIds.length?await Promise.all([prisma.warehouseProductStock.findMany({
  where:{
   ...(warehouseIds.length?{warehouseId:{in:warehouseIds}}:{}),
   productId:{in:selectedProductIds},
  },
  select:{id:true,warehouseId:true,productId:true,physicalStock:true,reservedStock:true},
 }),prisma.warehouseLocationStock.findMany({
  where:{productId:{in:selectedProductIds},quantity:{gt:0},...(warehouseIds.length?{location:{warehouseId:{in:warehouseIds}}}:{})},
  select:{productId:true,quantity:true,location:{select:{warehouseId:true,code:true,aisle:true,section:true,level:true,bin:true}}},
 })]):[[],[]];
 const warehouseById=new Map(warehouses.map(w=>[w.id,w]));
 const productById=new Map(selectedProducts.map(p=>[p.id,p]));
 const locationsByStockKey=new Map<string,string[]>();
 for(const row of locationRows){
  const key=`${row.location.warehouseId}:${row.productId}`;
  const parts=[row.location.code,row.location.aisle,row.location.section,row.location.level,row.location.bin].map(v=>v.trim()).filter(Boolean);
  const address=Array.from(new Set(parts)).join(" / ");
  if(!address) continue;
  const current=locationsByStockKey.get(key)??[];
  current.push(`${address} (${row.quantity})`);
  locationsByStockKey.set(key,current);
 }
 const stocks=stockRows.flatMap(s=>{
  const warehouse=warehouseById.get(s.warehouseId);
  const product=productById.get(s.productId);
  return warehouse&&product?[{...s,warehouse,product}]:[];
 });
 stocks.sort((a,b)=>a.warehouse.code.localeCompare(b.warehouse.code,"tr")||a.product.code.localeCompare(b.product.code,"tr"));
 return <main className="p-6 lg:p-10"><h1 className="text-4xl font-bold">SKU Stok Kontrol</h1><p className="mt-2 text-slate-500">Bir veya birden fazla ürünün seçili depolardaki güncel stoklarını görüntüleyin.</p>
 <form className="mt-7 rounded-2xl bg-white p-6 shadow"><div className="grid gap-5 lg:grid-cols-2"><fieldset><legend className="font-bold">Depolar (çoklu seçim)</legend><div className="mt-2 max-h-52 overflow-auto rounded-xl border p-3">{warehouses.map(w=><label key={w.id} className="flex gap-2 py-1"><input type="checkbox" name="warehouseId" value={w.id} defaultChecked={warehouseIds.includes(w.id)}/>{w.code} - {w.name}</label>)}</div></fieldset>
 <div><label className="font-bold">Ürün Kodu</label><div className="mt-2 flex gap-2"><input name="addCode" placeholder="Ürün kodunu yazın" className="min-w-0 flex-1 rounded-xl border p-3 uppercase"/><button type="button" popoverTarget="stock-product-picker" className="rounded-xl border px-4 text-xl">⌄</button></div><p className="mt-2 text-sm text-slate-500">Liste: {codes.join(", ")||"Henüz ürün eklenmedi"}</p>{codes.map(c=><input key={c} type="hidden" name="productCodes" value={c}/>)}</div></div>
 <div className="mt-5 flex flex-wrap gap-3"><button className="rounded-xl bg-blue-900 px-6 py-3 font-bold text-white">Listeye Ekle / Sorgula</button><a href="/admin/stock/sku-control" className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-bold text-slate-700">Temizle</a></div>
 <div id="stock-product-picker" popover="auto" className="m-auto max-h-[70vh] w-[min(720px,92vw)] overflow-auto rounded-2xl border bg-white p-5 shadow-2xl"><h2 className="mb-3 text-xl font-bold">Ürün Seç</h2>{products.map(p=><button key={p.code} type="submit" name="addCode" value={p.code} className="block w-full rounded-lg border-b p-3 text-left hover:bg-slate-50"><b>{p.code}</b> · {p.name}</button>)}</div></form>
 <SkuStockTable rows={stocks.map(s=>({id:s.id,warehouse:`${s.warehouse.code} - ${s.warehouse.name}`,barcode:s.product.barcode??"-",productCode:s.product.code,productName:s.product.name,location:(locationsByStockKey.get(`${s.warehouseId}:${s.productId}`)??[]).join(", ")||"-",physical:s.physicalStock,reserved:s.reservedStock,available:s.physicalStock-s.reservedStock}))}/></main>
}