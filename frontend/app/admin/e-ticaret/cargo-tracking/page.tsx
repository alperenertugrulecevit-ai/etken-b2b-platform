import Link from "next/link";
import { OrderStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
import { updateEcommerceCargoTrackingAction, confirmEcommerceOrderDeliveryAction } from "@/app/admin/shipping-planning/actions";

export const dynamic = "force-dynamic";

const statusLabel:Record<string,string>={PENDING:"Onay Bekliyor",APPROVED:"Onaylandı",PREPARING:"Hazırlanıyor",PICKING:"Toplanıyor",PACKING:"Paketleniyor",READY_TO_SHIP:"Sevke Hazır",SHIPPED:"Sevk Edildi",DELIVERED:"Teslim Edildi",CANCELLED:"İptal"};

export default async function EcommerceCargoTrackingPage({searchParams}:{searchParams:Promise<{q?:string;status?:string}>}) {
  await AuthorizationService.requireAnyPermission(["ORDER_VIEW","SHIPPING_EXECUTE"]);
  const query=await searchParams;
  const q=String(query.q??"").trim().slice(0,100);
  const status=String(query.status??"").trim();
  const validStatus=Object.values(OrderStatus).includes(status as OrderStatus)?status as OrderStatus:undefined;
  const orders=await prisma.order.findMany({
    where:{source:"ECOMMERCE",...(validStatus?{status:validStatus}:{}),...(q?{OR:[{orderNumber:{contains:q,mode:"insensitive"}},{cargoTrackingNumber:{contains:q,mode:"insensitive"}},{customer:{companyName:{contains:q,mode:"insensitive"}}}]}:{})},
    orderBy:{createdAt:"desc"},take:250,
    select:{id:true,orderNumber:true,status:true,createdAt:true,cargoTrackingNumber:true,cargoTrackingUrl:true,cargoTrackingUpdatedAt:true,carrierId:true,carrier:{select:{name:true,trackingUrlTemplate:true,integrationProvider:true,integrationEnabled:true}},customer:{select:{companyName:true}}},
  });
  return <main className="p-4 sm:p-6 lg:p-10">
    <p className="text-xs font-black uppercase tracking-wider text-[#EF4B23]">E-Ticaret Yönetimi</p>
    <h1 className="mt-2 text-3xl font-black">Kargo Takibi</h1>
    <p className="mt-2 text-sm text-slate-500">Kargo takip numarası, taşıyıcı bağlantısı ve teslimat durumunu tek ekrandan yönetin.</p>
    <form className="mt-6 grid gap-3 rounded-2xl bg-white p-4 shadow sm:grid-cols-3"><input name="q" defaultValue={q} placeholder="Sipariş, müşteri veya takip no" className="rounded-xl border p-3"/><select name="status" defaultValue={validStatus??""} className="rounded-xl border bg-white p-3"><option value="">Tüm Durumlar</option>{Object.values(OrderStatus).map(x=><option key={x} value={x}>{statusLabel[x]??x}</option>)}</select><button className="rounded-xl bg-slate-900 px-5 py-3 font-black text-white">Filtrele</button></form>
    <div className="mt-6 overflow-x-auto rounded-2xl bg-white shadow"><table className="w-full min-w-[1200px] text-sm"><thead className="bg-slate-900 text-white"><tr><th className="p-3 text-left">Sipariş</th><th className="p-3 text-left">Müşteri</th><th className="p-3 text-left">Taşıyıcı</th><th className="p-3 text-left">Takip</th><th className="p-3">Durum</th><th className="p-3 text-left">İşlem</th></tr></thead>
      <tbody>{orders.map(o=><tr key={o.id} className="border-b align-top"><td className="p-3"><Link href={"/admin/orders/"+o.id} className="font-black text-blue-900">{o.orderNumber}</Link><div className="text-xs text-slate-500">{o.createdAt.toLocaleString("tr-TR",{timeZone:"Europe/Istanbul"})}</div></td><td className="p-3 font-bold">{o.customer.companyName}</td><td className="p-3">{o.carrier?.name??"-"}<div className="text-xs text-slate-500">{o.carrier?.integrationProvider??"Manuel"} · {o.carrier?.integrationEnabled?"API aktif":"API bağlı değil"}</div></td><td className="p-3">{o.cargoTrackingNumber?<><strong>{o.cargoTrackingNumber}</strong>{o.cargoTrackingUrl?<div><a href={o.cargoTrackingUrl} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">Takibi Aç</a></div>:null}</>:"-"}</td><td className="p-3 text-center font-bold">{statusLabel[o.status]??o.status}</td><td className="p-3"><form action={updateEcommerceCargoTrackingAction} className="flex min-w-[420px] gap-2"><input type="hidden" name="orderId" value={o.id}/><input name="trackingNumber" required defaultValue={o.cargoTrackingNumber??""} placeholder="Takip numarası" className="min-w-0 flex-1 rounded-lg border px-3 py-2"/><input name="trackingUrl" defaultValue={o.cargoTrackingUrl??""} placeholder={o.carrier?.trackingUrlTemplate?"Boşsa otomatik üretilir":"Takip URL"} className="min-w-0 flex-1 rounded-lg border px-3 py-2"/><button className="rounded-lg bg-blue-900 px-3 py-2 font-bold text-white">Kaydet</button></form>{o.status===OrderStatus.SHIPPED?<form action={confirmEcommerceOrderDeliveryAction} className="mt-2"><input type="hidden" name="orderId" value={o.id}/><button className="rounded-lg bg-emerald-700 px-3 py-2 font-bold text-white">Teslim Edildi</button></form>:null}</td></tr>)}</tbody>
    </table></div>
  </main>;
}
