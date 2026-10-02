import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

export const dynamic="force-dynamic";

export default async function Page({searchParams}:{searchParams:Promise<{code?:string}>}){
 await AuthorizationService.requireAdminPortalAccess();
 const params=await searchParams;
 const code=String(params.code??"").trim().toUpperCase();
 const pre=code?await prisma.ecommerceReturnPreReceipt.findFirst({
   where:{scannedCode:code},
   include:{carrier:true,originalOrder:{include:{customer:true}},ecommerceReturn:{include:{items:true}}},
 }):null;
 const recent=await prisma.ecommerceReturn.findMany({take:30,orderBy:{createdAt:"desc"},include:{originalOrder:{select:{orderNumber:true,customer:{select:{companyName:true}}}},preReceipts:{take:1,orderBy:{receivedAt:"desc"},include:{carrier:true}},items:true}});
 return <div className="p-6">
  <div className="mb-5"><p className="text-sm font-bold text-slate-500">E-Ticaret Yönetimi / İade</p><h1 className="text-3xl font-black">E-Ticaret İade Giriş</h1><p className="mt-1 text-sm text-slate-500">İade girişinden önce kargo ön kabul kaydı zorunludur.</p></div>
  <form className="rounded-2xl border bg-white p-5 shadow-sm"><label className="text-sm font-black">İade Kodu / Kargo Barkodu</label><div className="mt-2 flex gap-2"><input name="code" defaultValue={code} autoFocus className="flex-1 rounded-xl border-2 border-blue-500 px-4 py-3 text-lg font-bold uppercase" placeholder="Barkod okutun..."/><button className="rounded-xl bg-blue-700 px-6 font-black text-white">Kontrol Et</button></div></form>
  {code&&!pre&&<div className="mt-4 rounded-2xl border-2 border-red-300 bg-red-50 p-5 text-red-950"><h2 className="text-lg font-black">⚠ Ön kabul bulunamadı</h2><p className="mt-1 font-semibold">Bu gönderi E-Ticaret İade Giriş'e alınamaz. Ön kabul yapılarak kaçırılan gönderi mutabakat raporuna dahil edilmelidir.</p><Link href="/rf/ecommerce-return-pre-receipt" className="mt-3 inline-block rounded-xl bg-red-700 px-4 py-3 font-black text-white">Ön Kabule Git</Link></div>}
  {pre&&<div className="mt-4 rounded-2xl border border-emerald-300 bg-emerald-50 p-5"><div className="flex justify-between gap-4"><div><h2 className="text-lg font-black text-emerald-950">✓ Ön kabul doğrulandı</h2><p className="text-sm font-semibold">{pre.preReceiptNumber} · {pre.carrier.name} · {pre.mode==="RETURN_CODE"?"İade Kodu":"Kargo Barkodu"}</p></div><span className="rounded-lg bg-white px-3 py-2 text-sm font-black">{pre.outcome}</span></div>
   {pre.outcome==="RETURN_TO_CARRIER"||pre.outcome==="RETURNED_TO_CARRIER"?<div className="mt-4 rounded-xl bg-amber-100 p-4 font-black text-amber-950">Bu gönderi iade girişine alınamaz; kargoya geri teslim sürecindedir.</div>:
   pre.ecommerceReturn?<div className="mt-4"><p className="font-black">Sipariş: {pre.originalOrder?.orderNumber} · {pre.originalOrder?.customer.companyName}</p><table className="mt-3 w-full bg-white text-sm"><thead><tr>{["Ürün","Beklenen","Gelen","Kabul","Red","Kalite","Finans"].map(x=><th key={x} className="border p-2 text-left">{x}</th>)}</tr></thead><tbody>{pre.ecommerceReturn.items.map(i=><tr key={i.id}><td className="border p-2">{i.productCode} - {i.productName}</td><td className="border p-2">{i.expectedQuantity}</td><td className="border p-2">{i.receivedQuantity}</td><td className="border p-2">{i.acceptedQuantity}</td><td className="border p-2">{i.rejectedQuantity}</td><td className="border p-2">{i.qualityResult??"Bekliyor"}</td><td className="border p-2">{i.refundStatus}</td></tr>)}</tbody></table><div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 font-semibold text-blue-950">Ön kabul tamam. Bir sonraki operasyon adımı ürün bazlı okutma + kalite kararı + stok/karantina yönlendirmesidir.</div></div>:
   <div className="mt-4 rounded-xl bg-amber-100 p-4 font-bold text-amber-950">Kargo barkodu ön kabulü mevcut ancak iade/sipariş eşleşmesi henüz yok. Eşleştirme tamamlanmadan ürün kabulü yapılamaz.</div>}
  </div>}
  <section className="mt-6 rounded-2xl border bg-white p-5"><h2 className="mb-3 text-lg font-black">Son E-Ticaret İadeleri</h2>{recent.length?<div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr>{["İade No","Sipariş","Müşteri","Ön Kabul","Durum","Finans","Ürün"].map(x=><th key={x} className="border-b p-2 text-left">{x}</th>)}</tr></thead><tbody>{recent.map(r=><tr key={r.id}><td className="p-2 font-bold">{r.returnNumber}</td><td className="p-2">{r.originalOrder.orderNumber}</td><td className="p-2">{r.originalOrder.customer.companyName}</td><td className="p-2">{r.preReceipts[0]?.preReceiptNumber??"-"}</td><td className="p-2">{r.status}</td><td className="p-2">{r.refundStatus}</td><td className="p-2">{r.items.reduce((s,i)=>s+i.expectedQuantity,0)}</td></tr>)}</tbody></table></div>:<p className="text-slate-500">Henüz E-Ticaret iade kaydı yok.</p>}</section>
 </div>;
}
