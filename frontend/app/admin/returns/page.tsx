import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
import { createReturnOrder,cancelReturnOrder } from "./actions";

export const dynamic="force-dynamic";
const fmt=(d:Date)=>new Intl.DateTimeFormat("tr-TR",{day:"2-digit",month:"2-digit",year:"numeric",timeZone:"Europe/Istanbul"}).format(d);
const status:Record<string,string>={OPEN:"Açık",PARTIALLY_RECEIVED:"Kısmi Kabul",RECEIVED:"Tamamlandı",CANCELLED:"İptal"};

export default async function ReturnsPage({searchParams}:{searchParams:Promise<{orderNumber?:string}>}){
 await AuthorizationService.requireAdminPortalAccess();
 const q=await searchParams; const orderNumber=(q.orderNumber??"").trim().toUpperCase();
 const order=orderNumber?await prisma.order.findUnique({where:{orderNumber},include:{customer:{select:{companyName:true}},items:{include:{product:{select:{barcode:true}}}}}}):null;
 let previous=new Map<number,number>();
 if(order){const rows=await prisma.returnOrderItem.findMany({where:{orderItem:{orderId:order.id},returnOrder:{status:{not:"CANCELLED"}}},select:{orderItemId:true,expectedQuantity:true}});for(const x of rows)previous.set(x.orderItemId,(previous.get(x.orderItemId)??0)+x.expectedQuantity)}
 const returns=await prisma.returnOrder.findMany({orderBy:{createdAt:"desc"},take:100,include:{originalOrder:{select:{orderNumber:true,customer:{select:{companyName:true}}}},items:true}});
 return <section className="p-4 sm:p-6 lg:p-10">
  <div><h1 className="text-3xl font-black">İade Giriş Siparişleri</h1><p className="mt-2 text-slate-500">SEVK EDİLDİ sonrası depoya dönen ürünler için yeni iade giriş siparişi oluşturun.</p></div>
  <form className="mt-6 flex gap-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><input name="orderNumber" defaultValue={orderNumber} placeholder="Referans çıkış sipariş no" className="min-w-80 flex-1 rounded-xl border p-3 font-mono uppercase"/><button className="rounded-xl bg-blue-950 px-5 py-3 font-bold text-white">Siparişi Getir</button></form>
  {orderNumber&&!order&&<div className="mt-4 rounded-xl bg-red-50 p-4 font-bold text-red-700">Çıkış siparişi bulunamadı.</div>}
  {order&&<form action={createReturnOrder} className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
    <input type="hidden" name="orderNumber" value={order.orderNumber}/>
    <div className="flex flex-wrap justify-between gap-3"><div><h2 className="text-xl font-black">{order.orderNumber}</h2><p className="text-sm text-slate-500">{order.customer.companyName} · Durum: {order.status}</p></div></div>
    {!["SHIPPED","DELIVERED"].includes(order.status)&&<div className="mt-4 rounded-xl bg-amber-50 p-4 font-bold text-amber-800">Bu sipariş henüz SEVK EDİLDİ/TESLİM EDİLDİ durumunda değil. Bu ekran post-dispatch iade içindir.</div>}
    <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <label><span className="mb-2 block text-sm font-bold">Belge Kaynağı *</span><select name="source" className="w-full rounded-xl border bg-white p-3" required><option value="ETKEN">Etken Oluşturdu</option><option value="CUSTOMER">Müşteri Belgesi</option></select></label>
      <label><span className="mb-2 block text-sm font-bold">İade Belge No *</span><input name="customerDocumentNo" className="w-full rounded-xl border p-3 uppercase" required/></label>
      <label><span className="mb-2 block text-sm font-bold">İrsaliye No *</span><input name="deliveryNoteNumber" className="w-full rounded-xl border p-3 uppercase" required/></label>
      <label><span className="mb-2 block text-sm font-bold">İrsaliye Tarihi *</span><input type="date" name="deliveryNoteDate" className="w-full rounded-xl border p-3" required/></label>
    </div>
    <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[900px]"><thead><tr className="bg-slate-100">{["Ürün Kodu","Barkod","Ürün Tanımı","Sevk Edilen","Önceki İade Talebi","İade Edilebilir","İade Miktarı"].map(x=><th key={x} className="p-3 text-left text-xs uppercase">{x}</th>)}</tr></thead><tbody>{order.items.map(i=>{const prev=previous.get(i.id)??0,max=Math.max(0,i.shippedQuantity-prev);return <tr key={i.id} className="border-b"><td className="p-3 font-mono">{i.productCode}</td><td className="p-3 font-mono">{i.product.barcode}</td><td className="p-3">{i.productName}</td><td className="p-3">{i.shippedQuantity}</td><td className="p-3">{prev}</td><td className="p-3 font-bold">{max}</td><td className="p-3"><input type="number" min="0" max={max} defaultValue="0" name={`qty_${i.id}`} className="w-28 rounded-lg border p-2"/></td></tr>})}</tbody></table></div>
    <label className="mt-4 block"><span className="mb-2 block text-sm font-bold">Açıklama</span><textarea name="note" className="w-full rounded-xl border p-3"/></label>
    <button disabled={!["SHIPPED","DELIVERED"].includes(order.status)} className="mt-5 rounded-xl bg-emerald-700 px-6 py-3 font-black text-white disabled:opacity-40">İade Giriş Siparişi Oluştur</button>
  </form>}
  <div className="mt-8 overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"><table className="w-full min-w-[1200px]"><thead><tr className="bg-slate-100">{["İade Sipariş No","Referans Çıkış","Müşteri","Kaynak","Belge No","İrsaliye No","İrsaliye Tarihi","Planlanan","Alınan","Durum","İşlem"].map(x=><th key={x} className="p-3 text-left text-xs uppercase">{x}</th>)}</tr></thead><tbody>{returns.map(r=>{const planned=r.items.reduce((s,x)=>s+x.expectedQuantity,0),received=r.items.reduce((s,x)=>s+x.receivedQuantity,0);return <tr key={r.id} className="border-b"><td className="p-3 font-mono font-bold">{r.returnNumber}</td><td className="p-3 font-mono">{r.originalOrder.orderNumber}</td><td className="p-3">{r.originalOrder.customer.companyName}</td><td className="p-3">{r.source==="CUSTOMER"?"Müşteri":"Etken"}</td><td className="p-3">{r.customerDocumentNo}</td><td className="p-3">{r.deliveryNoteNumber}</td><td className="p-3">{fmt(r.deliveryNoteDate)}</td><td className="p-3">{planned}</td><td className="p-3">{received}</td><td className="p-3 font-bold">{status[r.status]}</td><td className="p-3">{r.status==="OPEN"&&<form action={cancelReturnOrder}><input type="hidden" name="id" value={r.id}/><button className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700">İptal</button></form>}</td></tr>})}</tbody></table></div>
 </section>
}
