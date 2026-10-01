import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
import SkuStockTable from "@/components/admin/SkuStockTable";

type Props={searchParams:Promise<{warehouseId?:string|string[];productCodes?:string|string[];addCode?:string;thm?:string|string[];run?:string}>};
const arr=(v:string|string[]|undefined)=>Array.isArray(v)?v:v?[v]:[];

export default async function SkuStockControlPage({searchParams}:Props){
 await AuthorizationService.requirePermission("INVENTORY_VIEW");
 const q=await searchParams;
 const warehouseIds=arr(q.warehouseId).map(Number).filter(Number.isInteger);
 const thm=arr(q.thm)[0]?.trim().toUpperCase()??"";
 const hasRun=q.run==="1"||Boolean(q.addCode);
 const codes=Array.from(new Set([...arr(q.productCodes).flatMap(x=>x.split(",")),...arr(q.addCode)].map(x=>x.trim().toUpperCase()).filter(Boolean)));

 const [warehouses,products]=await Promise.all([
  prisma.warehouse.findMany({where:{isActive:true},orderBy:{code:"asc"},select:{id:true,code:true,name:true}}),
  prisma.product.findMany({where:{isActive:true},orderBy:{code:"asc"},take:500,select:{code:true,name:true}})
 ]);

 const selectedProducts=hasRun?await prisma.product.findMany({
  where:codes.length?{code:{in:codes}}:{},
  orderBy:{code:"asc"},
  select:{id:true,code:true,barcode:true,name:true},
 }):[];
 const selectedProductIds=selectedProducts.map(p=>p.id);

 const [stockRows,thmRows]=selectedProductIds.length?await Promise.all([
  prisma.warehouseProductStock.findMany({
   where:{...(warehouseIds.length?{warehouseId:{in:warehouseIds}}:{}),productId:{in:selectedProductIds}},
   select:{id:true,warehouseId:true,productId:true,physicalStock:true,reservedStock:true},
  }),
  prisma.handlingUnitItem.findMany({
   where:{
    productId:{in:selectedProductIds},
    quantity:{gt:0},
    handlingUnit:{
     warehouseId:{not:null},
     ...(warehouseIds.length?{warehouseId:{in:warehouseIds}}:{}),
     ...(thm?{barcode:{contains:thm,mode:"insensitive"}}:{}),
    },
   },
   select:{
    id:true,productId:true,quantity:true,reservedStock:true,
    handlingUnit:{select:{
     warehouseId:true,barcode:true,
     location:{select:{code:true,aisle:true,section:true,level:true,bin:true}},
    }},
   },
  }),
 ]):[[],[]];

 const warehouseById=new Map(warehouses.map(w=>[w.id,w]));
 const productById=new Map(selectedProducts.map(p=>[p.id,p]));
 const stockByKey=new Map(stockRows.map(s=>[`${s.warehouseId}:${s.productId}`,s]));

 const rows=thmRows.flatMap(item=>{
  const warehouseId=item.handlingUnit.warehouseId;
  if(warehouseId===null) return [];
  const warehouse=warehouseById.get(warehouseId);
  const product=productById.get(item.productId);
  if(!warehouse||!product) return [];
  const location=item.handlingUnit.location;
  const locationParts=location?[location.code,location.aisle,location.section,location.level,location.bin].map(v=>v.trim()).filter(Boolean):[];
  return [{
   id:`thm-${item.id}`,
   warehouse:`${warehouse.code} - ${warehouse.name}`,
   barcode:product.barcode??"-",
   productCode:product.code,
   productName:product.name,
   thm:item.handlingUnit.barcode,
   location:Array.from(new Set(locationParts)).join(" / ")||"-",
   physical:item.quantity,
   reserved:item.reservedStock,
   available:Math.max(0,item.quantity-item.reservedStock),
  }];
 });

 if(!thm){
  const thmTotals=new Map<string,{physical:number;reserved:number}>();
  for(const item of thmRows){
   const warehouseId=item.handlingUnit.warehouseId;
   if(warehouseId===null) continue;
   const key=`${warehouseId}:${item.productId}`;
   const current=thmTotals.get(key)??{physical:0,reserved:0};
   current.physical+=item.quantity;
   current.reserved+=item.reservedStock;
   thmTotals.set(key,current);
  }
  for(const [key,stock] of stockByKey){
   const represented=thmTotals.get(key)??{physical:0,reserved:0};
   const remainingPhysical=Math.max(0,stock.physicalStock-represented.physical);
   const remainingReserved=Math.max(0,stock.reservedStock-represented.reserved);
   if(remainingPhysical===0&&remainingReserved===0) continue;
   const warehouse=warehouseById.get(stock.warehouseId);
   const product=productById.get(stock.productId);
   if(!warehouse||!product) continue;
   rows.push({
    id:`stock-${stock.id}`,
    warehouse:`${warehouse.code} - ${warehouse.name}`,
    barcode:product.barcode??"-",
    productCode:product.code,
    productName:product.name,
    thm:"-",
    location:"-",
    physical:remainingPhysical,
    reserved:remainingReserved,
    available:Math.max(0,remainingPhysical-remainingReserved),
   });
  }
 }

 rows.sort((a,b)=>a.warehouse.localeCompare(b.warehouse,"tr")||a.productCode.localeCompare(b.productCode,"tr")||a.thm.localeCompare(b.thm,"tr"));

 return <main className="p-6 lg:p-10">
  <h1 className="text-4xl font-bold">SKU Stok Kontrol</h1>
  <p className="mt-2 text-slate-500">Sorgulama sonrası stoklar THM bazında ayrı satırlarda gösterilir. Ürün kodu boş bırakılırsa seçili depolardaki tüm stoklar listelenir.</p>
  <form className="mt-7 rounded-2xl bg-white p-6 shadow">
   <div className="grid gap-5 lg:grid-cols-2">
    <fieldset>
     <legend className="font-bold">Depolar (çoklu seçim)</legend>
     <div className="mt-2 max-h-52 overflow-auto rounded-xl border p-3">{warehouses.map(w=><label key={w.id} className="flex gap-2 py-1"><input type="checkbox" name="warehouseId" value={w.id} defaultChecked={warehouseIds.includes(w.id)}/>{w.code} - {w.name}</label>)}</div>
    </fieldset>
    <div>
     <label className="font-bold">Ürün Kodu</label>
     <div className="mt-2 flex gap-2"><input name="addCode" placeholder="Boş bırakılırsa tüm ürünler" className="min-w-0 flex-1 rounded-xl border p-3 uppercase"/><button type="button" popoverTarget="stock-product-picker" className="rounded-xl border px-4 text-xl">⌄</button></div>
     <p className="mt-2 text-sm text-slate-500">Liste: {codes.join(", ")||"Tüm ürünler"}</p>
     {codes.map(code=><input key={code} type="hidden" name="productCodes" value={code}/>)}
     <label className="mt-5 block font-bold">THM</label>
     <input name="thm" defaultValue={thm} placeholder="THM barkodunu yazın / okutun" className="mt-2 w-full rounded-xl border p-3 uppercase"/>
    </div>
   </div>
   <input type="hidden" name="run" value="1"/>
   <div className="mt-5 flex flex-wrap gap-3"><button className="rounded-xl bg-blue-900 px-6 py-3 font-bold text-white">Listele / Sorgula</button><a href="/admin/stock/sku-control" className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-bold text-slate-700">Temizle</a></div>
   <div id="stock-product-picker" popover="auto" className="m-auto max-h-[70vh] w-[min(720px,92vw)] overflow-auto rounded-2xl border bg-white p-5 shadow-2xl"><h2 className="mb-3 text-xl font-bold">Ürün Seç</h2>{products.map(p=><button key={p.code} type="submit" name="addCode" value={p.code} className="block w-full rounded-lg border-b p-3 text-left hover:bg-slate-50"><b>{p.code}</b> · {p.name}</button>)}</div>
  </form>
  <SkuStockTable rows={rows}/>
 </main>
}
