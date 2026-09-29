import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
import { prisma } from "@/lib/prisma";

const reasonLabel:Record<string,string>={NOT_FOUND:"Ürün Bulunamadı",DAMAGED:"Hasarlı",STOCK_DIFFERENCE:"Stok Farkı",QUALITY_REJECTED:"Kalite Reddi",OTHER:"Diğer"};
const pct=(done:number,total:number)=>total>0?Math.min(100,Math.round(done/total*100)):0;

export default async function PickingOperationsPage(){
 await AuthorizationService.requirePermission("WAVE_MANAGE");
 const [waves,directTasks]=await Promise.all([
  prisma.wave.findMany({
   where:{status:{in:["RELEASED","IN_PROGRESS","PAUSED"]}},
   orderBy:{createdAt:"desc"},
   take:100,
   select:{id:true,waveNo:true,createdAt:true,status:true,assignments:{where:{operationType:"PICKING"},select:{user:{select:{username:true,employee:{select:{firstName:true,lastName:true}}}}}},
    orders:{select:{order:{select:{id:true,orderNumber:true,items:{select:{id:true,productCode:true,productName:true,quantity:true,pickedQuantity:true,pickingShortages:{where:{status:"ACTIVE"},select:{id:true,quantity:true,reason:true}}}}}}}}}
  }),
  prisma.zonePickTask.findMany({
   where:{status:{in:["OPEN","CLAIMED","IN_PROGRESS"]},waveId:null},
   orderBy:{createdAt:"desc"},take:100,
   select:{id:true,createdAt:true,status:true,zone:{select:{code:true}},claimedByUser:{select:{username:true,employee:{select:{firstName:true,lastName:true}}}},
    order:{select:{id:true,orderNumber:true,items:{select:{id:true,productCode:true,productName:true,quantity:true,pickedQuantity:true,pickingShortages:{where:{status:"ACTIVE"},select:{id:true,quantity:true,reason:true}}}}}}}
  })
 ]);
 const person=(u:any)=>u?.employee?`${u.employee.firstName} ${u.employee.lastName}`:u?.username??"-";
 const groups:any[]=[];
 for(const wave of waves){
  const items=wave.orders.flatMap(x=>x.order.items.map(i=>({...i,orderNumber:x.order.orderNumber})));
  const planned=items.reduce((s,i)=>s+i.quantity,0),picked=items.reduce((s,i)=>s+i.pickedQuantity,0),short=items.reduce((s,i)=>s+i.pickingShortages.reduce((a:any,r:any)=>a+r.quantity,0),0);
  groups.push({key:wave.id,date:wave.createdAt,type:"Wave Toplama",person:person(wave.assignments[0]?.user),waveNo:wave.waveNo,orderNo:"-",zone:"-",planned,picked,short,status:planned<=picked+short?"Tamamlandı":"Devam Ediyor",items});
 }
 for(const task of directTasks){
  const items=task.order.items.map(i=>({...i,orderNumber:task.order.orderNumber}));
  const planned=items.reduce((s,i)=>s+i.quantity,0),picked=items.reduce((s,i)=>s+i.pickedQuantity,0),short=items.reduce((s,i)=>s+i.pickingShortages.reduce((a:any,r:any)=>a+r.quantity,0),0);
  groups.push({key:task.id,date:task.createdAt,type:"Sipariş Bazlı",person:person(task.claimedByUser),waveNo:"-",orderNo:task.order.orderNumber,zone:task.zone.code,planned,picked,short,status:planned<=picked+short?"Tamamlandı":"Devam Ediyor",items});
 }
 groups.sort((a,b)=>b.date.getTime()-a.date.getTime());
 return <main className="p-6">
  <div className="mb-5"><p className="text-sm font-black uppercase tracking-widest text-blue-700">WMS Operasyonları</p><h1 className="mt-1 text-3xl font-black text-slate-950">Toplama Operasyonları İzleme</h1><p className="mt-2 text-slate-600">Wave ve sipariş bazlı toplama görevlerini tek ekrandan izleyin; eksik/kayıp işlemlerini kontrol edin ve gerekli operasyon müdahalelerini yönetin.</p></div>
  <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
   <table className="min-w-[1250px] w-full text-sm"><thead className="bg-slate-900 text-white"><tr>{["","Toplama Görev Tarihi","Toplama Tipi","Toplama Personeli","Wave No","Sipariş No","Zone","Toplanacak Miktar","Toplanan Miktar","Fark","Tamamlanma Yüzdesi","Toplama Durumu"].map(h=><th key={h} className="px-3 py-3 text-left">{h}</th>)}</tr></thead>
   <tbody>{groups.map(g=><><tr key={g.key} className="border-t border-slate-200 font-bold"><td className="px-3 py-3">+</td><td className="px-3 py-3">{g.date.toLocaleString("tr-TR")}</td><td className="px-3 py-3">{g.type}</td><td className="px-3 py-3">{g.person}</td><td className="px-3 py-3">{g.waveNo}</td><td className="px-3 py-3">{g.orderNo}</td><td className="px-3 py-3">{g.zone}</td><td className="px-3 py-3">{g.planned}</td><td className="px-3 py-3">{g.picked}</td><td className="px-3 py-3">{Math.max(0,g.planned-g.picked-g.short)}</td><td className="px-3 py-3">%{pct(g.picked+g.short,g.planned)}</td><td className="px-3 py-3">{g.status}</td></tr>
    <tr className="bg-slate-50"><td></td><td colSpan={11} className="p-0"><table className="w-full text-xs"><thead className="bg-slate-200"><tr>{["Toplama Görev Tarihi","Ürün Kodu","Ürün Tanımı","Toplanacak Miktar","Toplanan Miktar","Fark","Tamamlanma Yüzdesi","Eksik Kapatma Nedeni"].map(h=><th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead><tbody>{g.items.map((i:any)=>{const sh=i.pickingShortages.reduce((a:number,r:any)=>a+r.quantity,0);return <tr key={i.id} className="border-t border-slate-200"><td className="px-3 py-2">{g.date.toLocaleString("tr-TR")}</td><td className="px-3 py-2 font-bold">{i.productCode}</td><td className="px-3 py-2">{i.productName}</td><td className="px-3 py-2">{i.quantity}</td><td className="px-3 py-2">{i.pickedQuantity}</td><td className="px-3 py-2">{Math.max(0,i.quantity-i.pickedQuantity-sh)}</td><td className="px-3 py-2">%{pct(i.pickedQuantity+sh,i.quantity)}</td><td className="px-3 py-2">{i.pickingShortages.map((r:any)=>`${reasonLabel[r.reason]??r.reason} (${r.quantity})`).join(", ")||"-"}</td></tr>})}</tbody></table></td></tr></>)}</tbody>
   </table>
  </div>
  <section className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-950"><p className="font-black">Operasyon kuralları</p><ul className="mt-2 list-disc space-y-1 pl-5"><li>Toplama görev tarihi, siparişin veya Wave siparişinin el terminaline atıldığı tarihtir.</li><li>Wave ise Wave No; sipariş bazlı ise Sipariş No üzerinden takip edilir.</li><li>Eksik kapatılan satırlar nedeni ile birlikte detayda görünür.</li><li>Rezervasyon yenileme, görevi yeniden toplamaya açma ve görev kapatma müdahaleleri bu ekranın ikinci aşamasında kontrollü yönetici işlemi olarak eklenecektir.</li></ul></section>
 </main>
}