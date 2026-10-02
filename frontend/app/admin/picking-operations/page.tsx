import PickingOperationsTable from "@/components/admin/PickingOperationsTable";
import { reopenPickingShortageAction, refreshPickingReservationAction, closePickingTaskAction } from "./actions";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
import { prisma } from "@/lib/prisma";

const reasonLabel:Record<string,string>={NOT_FOUND:"Ürün Bulunamadı",DAMAGED:"Hasarlı",STOCK_DIFFERENCE:"Stok Farkı",QUALITY_REJECTED:"Kalite Reddi",OTHER:"Diğer"};
const pct=(done:number,total:number)=>total>0?Math.min(100,Math.round(done/total*100)):0;

export default async function PickingOperationsPage({searchParams}:{searchParams:Promise<{warehouseId?:string}>}){
 const query=await searchParams;
 const warehouseId=Number(query.warehouseId??"");
 const selectedWarehouseId=Number.isInteger(warehouseId)&&warehouseId>0?warehouseId:null;
 await AuthorizationService.requirePermission("WAVE_MANAGE");
 const [waves,directTasks,warehouses]=await Promise.all([
  prisma.wave.findMany({
   where:{status:{in:["RELEASED","IN_PROGRESS","PAUSED"]},...(selectedWarehouseId?{warehouseId:selectedWarehouseId}:{})},
   orderBy:{createdAt:"desc"},
   take:100,
   select:{id:true,waveNo:true,createdAt:true,status:true,warehouse:{select:{code:true}},assignments:{where:{operationType:"PICKING"},select:{user:{select:{username:true,employee:{select:{firstName:true,lastName:true}}}}}},
    orders:{where:{order:{status:{not:"CANCELLED"}}},select:{order:{select:{id:true,orderNumber:true,orderType:true,items:{select:{id:true,productCode:true,productName:true,quantity:true,cancelledQuantity:true,pickedQuantity:true,product:{select:{barcode:true}},pickingShortages:{where:{status:"ACTIVE"},select:{id:true,quantity:true,reason:true}}}}}}}}}
  }),
  prisma.zonePickTask.findMany({
   where:{status:{in:["OPEN","CLAIMED","IN_PROGRESS"]},waveId:null,...(selectedWarehouseId?{warehouseId:selectedWarehouseId}:{})},
   orderBy:{createdAt:"desc"},take:100,
   select:{id:true,createdAt:true,status:true,warehouse:{select:{code:true}},zone:{select:{code:true}},claimedBy:{select:{username:true,employee:{select:{firstName:true,lastName:true}}}},
    order:{select:{id:true,orderNumber:true,orderType:true,items:{select:{id:true,productCode:true,productName:true,quantity:true,pickedQuantity:true,product:{select:{barcode:true}},pickingShortages:{where:{status:"ACTIVE"},select:{id:true,quantity:true,reason:true}}}}}}}
  }),
  prisma.warehouse.findMany({where:{isActive:true,code:{not:"KYP001"}},orderBy:{code:"asc"},select:{id:true,code:true,name:true}})
 ]);
 const typeLabel:Record<string,string>={ECOMMERCE:"E-Ticaret",STORE:"Mağaza",CUSTOMER:"Müşteri",OTHER:"Diğer"};
 const person=(u:any)=>u?.employee?`${u.employee.firstName} ${u.employee.lastName}`:u?.username??"-";
 const groups:any[]=[];
 for(const wave of waves){
  const items=wave.orders.flatMap(x=>x.order.items.map(i=>({...i,orderId:x.order.id,orderNumber:x.order.orderNumber,orderType:x.order.orderType})));
  const planned=items.reduce((s,i)=>s+Math.max(0,i.quantity-(i.cancelledQuantity??0)),0),picked=items.reduce((s,i)=>s+Math.min(i.pickedQuantity,Math.max(0,i.quantity-(i.cancelledQuantity??0))),0),short=items.reduce((s,i)=>s+i.pickingShortages.reduce((a:any,r:any)=>a+r.quantity,0),0);
  // Bu ekran yalnızca aktif veya müdahale gerektiren toplama operasyonlarını gösterir.
  // Toplama + geçerli eksik kapatma planlanan miktarı karşıladığında görev tamamlanmıştır
  // ve Wave durum kaydı henüz kapanmamış olsa bile aktif izleme listesinden çıkar.
  if(planned<=picked+short) continue;
  groups.push({key:wave.id,date:wave.createdAt,warehouseCode:wave.warehouse?.code??"-",type:"Wave Toplama",orderType:Array.from(new Set(items.map(i=>typeLabel[i.orderType]??i.orderType))).join(", ")||"-",person:person(wave.assignments[0]?.user),waveNo:wave.waveNo,orderNo:"-",zone:"-",planned,picked,short,status:"Devam Ediyor",items});
 }
 for(const task of directTasks){
  const items=task.order.items.map(i=>({...i,orderId:task.order.id,orderNumber:task.order.orderNumber,orderType:task.order.orderType}));
  const planned=items.reduce((s,i)=>s+i.quantity,0),picked=items.reduce((s,i)=>s+i.pickedQuantity,0),short=items.reduce((s,i)=>s+i.pickingShortages.reduce((a:any,r:any)=>a+r.quantity,0),0);
  if(planned<=picked+short) continue;
  groups.push({key:task.id,date:task.createdAt,warehouseCode:task.warehouse?.code??"-",type:"Sipariş Bazlı",orderType:typeLabel[task.order.orderType]??task.order.orderType,person:person(task.claimedBy),waveNo:"-",orderNo:task.order.orderNumber,zone:task.zone.code,planned,picked,short,status:"Devam Ediyor",items});
 }
 groups.sort((a,b)=>b.date.getTime()-a.date.getTime());
 const clientGroups=groups.map(g=>({...g,dateText:g.date.toLocaleString("tr-TR"),date:undefined,items:g.items.map((i:any)=>({...i,product:undefined,barcode:i.product?.barcode??null}))}));
 return <main className="p-6">
  <div className="mb-5"><p className="text-sm font-black uppercase tracking-widest text-blue-700">WMS Operasyonları</p><h1 className="mt-1 text-3xl font-black text-slate-950">Toplama Operasyonları İzleme</h1><p className="mt-2 text-slate-600">Wave ve sipariş bazlı toplama görevlerini tek ekrandan izleyin; eksik/kayıp işlemlerini kontrol edin ve gerekli operasyon müdahalelerini yönetin.</p></div>
  <form className="mb-4 flex flex-wrap items-end justify-end gap-3"><label className="text-sm font-bold text-slate-700"><span className="mb-1 block">Depo Kodu</span><select name="warehouseId" defaultValue={selectedWarehouseId??""} className="rounded-xl border border-slate-300 bg-white px-4 py-3"><option value="">Tüm Depolar</option>{warehouses.map(w=><option key={w.id} value={w.id}>{w.code} - {w.name}</option>)}</select></label><button className="rounded-xl bg-blue-900 px-6 py-3 font-black text-white hover:bg-blue-800">Listele</button></form>
  <PickingOperationsTable groups={clientGroups}/>
  <section className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5"><h2 className="font-black text-amber-950">Sistem Operatörü Müdahaleleri</h2><div className="mt-3 grid gap-3 md:grid-cols-2">{groups.filter(g=>g.type==="Sipariş Bazlı").map(g=><form key={g.key} action={closePickingTaskAction} className="rounded-xl border border-amber-200 bg-white p-3"><input type="hidden" name="orderId" value={g.items[0]?.orderNumber?directTasks.find(t=>t.order.orderNumber===g.items[0].orderNumber)?.order.id:""}/><input type="hidden" name="note" value="Toplama Operasyonları İzleme ekranından kapatıldı."/><p className="font-bold">{g.orderNo}</p><p className="mt-1 text-xs text-slate-500">Açık ihtiyaç 0 ise görev kontrollü olarak kapatılabilir.</p><button className="mt-2 rounded-lg bg-slate-800 px-3 py-2 text-xs font-black text-white">Toplama Görevini Kapat</button></form>)}</div></section>
  <section className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-950"><p className="font-black">Operasyon kuralları</p><ul className="mt-2 list-disc space-y-1 pl-5"><li>Toplama görev tarihi, siparişin veya Wave siparişinin el terminaline atıldığı tarihtir.</li><li>Wave ise Wave No; sipariş bazlı ise Sipariş No üzerinden takip edilir.</li><li>Eksik kapatılan satırlar nedeni ile birlikte detayda görünür.</li><li>Eksik kapatma yanlış yapıldıysa ilgili ürün satırındaki Yeniden Toplamaya Aç işlemi kullanılır. Görevde açık ihtiyaç kalmadığında Toplama Görevini Kapat kullanılabilir. Açık miktar için Rezervasyon Yenile kullanıldığında sistem stok uygunluğunu yeniden kontrol eder ve siparişi toplama ekranına yeniden planlar.</li></ul></section>
 </main>
}