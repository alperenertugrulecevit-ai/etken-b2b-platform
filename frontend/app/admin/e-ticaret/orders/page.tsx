import Link from "next/link";
import { CustomerAccountEntryDirection, CustomerAccountEntryType, OrderStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
import { confirmEcommerceBankTransferPayment, updateOrderStatus } from "@/app/admin/orders/[id]/actions";
import { refundCancelledEcommerceOrder, repairEcommerceAccountLedger } from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const STATUS: Record<string,string> = {
  PENDING:"Onay Bekliyor", APPROVED:"Onaylandı", PREPARING:"Hazırlanıyor", PICKING:"Toplanıyor",
  PACKING:"Paketleniyor", READY_TO_SHIP:"Sevke Hazır", SHIPPED:"Sevk Edildi",
  DELIVERED:"Teslim Edildi", CANCELLED:"İptal Edildi", DRAFT:"Taslak",
};
const PAYMENT: Record<string,string> = { PENDING:"Ödeme Bekleniyor", PAID:"Ödendi", REFUNDED:"İade Edildi" };
function money(v:number){return v.toLocaleString("tr-TR",{minimumFractionDigits:2,maximumFractionDigits:2});}

export default async function EcommerceOrdersPage({searchParams}:{searchParams:Promise<{status?:string;payment?:string;q?:string;refunded?:string;ledgerRepaired?:string;scanned?:string;orders?:string;entries?:string}>}) {
  const profile = await AuthorizationService.requireAnyPermission(["ORDER_VIEW","ORDER_MANAGE"]);
  const canManage = AuthorizationService.hasPermission(profile, "ORDER_MANAGE");
  const query=await searchParams;
  const status=String(query.status??"").trim();
  const payment=String(query.payment??"").trim().toUpperCase();
  const q=String(query.q??"").trim().slice(0,100);
  const validStatus=Object.values(OrderStatus).includes(status as OrderStatus)?status as OrderStatus:undefined;

  const orders=await prisma.order.findMany({
    where:{
      source:"ECOMMERCE",
      ...(validStatus?{status:validStatus}:{}),
      ...(payment?{paymentStatus:payment}:{}),
      ...(q?{OR:[
        {orderNumber:{contains:q,mode:"insensitive"}},
        {ecommerceEmail:{contains:q,mode:"insensitive"}},
        {customer:{companyName:{contains:q,mode:"insensitive"}}},
      ]}:{}),
    },
    orderBy:{createdAt:"desc"},
    take:250,
    select:{
      id:true,orderNumber:true,createdAt:true,status:true,totalAmount:true,paymentStatus:true,paymentReference:true,
      ecommerceEmail:true,customer:{select:{companyName:true}},
      accountEntries:{
        where:{direction:CustomerAccountEntryDirection.DEBIT,entryType:CustomerAccountEntryType.REFUND},
        select:{amount:true},
      },
    },
  });

  return <section className="p-4 sm:p-6 lg:p-10">
    <div>
      <p className="text-xs font-black uppercase tracking-wider text-[#EF4B23]">E-Ticaret Yönetimi</p>
      <h1 className="mt-2 text-3xl font-black">E-Ticaret Siparişleri</h1>
      <p className="mt-2 text-sm text-slate-500">Ödeme, operasyon onayı, iptal ve iade durumlarını tek ekrandan takip edin.</p>
    </div>
    {canManage?<form action={repairEcommerceAccountLedger} className="mt-4">
      <button className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-black text-blue-900">E-Ticaret Cari Bütünlüğünü Onar</button>
      <p className="mt-1 text-xs text-slate-500">Yalnız kanıtlanmış ödenmiş siparişler ve tamamlanmış iadelerde eksik cari çiftlerini idempotent tamamlar.</p>
    </form>:null}
    {query.ledgerRepaired==="1"?<div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 font-bold text-blue-900">Cari bütünlük kontrolü tamamlandı. {query.scanned??"0"} sipariş tarandı; {query.orders??"0"} siparişte {query.entries??"0"} eksik cari hareket oluşturuldu.</div>:null}
    {query.refunded==="1"?<div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 font-bold text-emerald-800">Ödeme iadesi cari hesaba işlendi.</div>:null}

    <form className="mt-6 grid gap-3 rounded-2xl bg-white p-4 shadow sm:grid-cols-4">
      <input name="q" defaultValue={q} placeholder="Sipariş no, müşteri, e-posta" className="rounded-xl border p-3"/>
      <select name="status" defaultValue={validStatus??""} className="rounded-xl border bg-white p-3">
        <option value="">Tüm Operasyon Durumları</option>
        {Object.entries(STATUS).map(([v,l])=><option key={v} value={v}>{l}</option>)}
      </select>
      <select name="payment" defaultValue={payment} className="rounded-xl border bg-white p-3">
        <option value="">Tüm Ödeme Durumları</option><option value="PENDING">Ödeme Bekleniyor</option><option value="PAID">Ödendi</option><option value="REFUNDED">İade Edildi</option>
      </select>
      <button className="rounded-xl bg-slate-900 px-5 py-3 font-black text-white">Filtrele</button>
    </form>

    <div className="mt-6 overflow-x-auto rounded-2xl bg-white shadow">
      <table className="w-full min-w-[1250px] text-left text-sm">
        <thead className="bg-slate-900 text-white"><tr>
          <th className="p-4">Sipariş</th><th className="p-4">Müşteri</th><th className="p-4">Tarih</th>
          <th className="p-4">Tutar</th><th className="p-4">Ödeme</th><th className="p-4">Operasyon</th><th className="p-4">Aksiyon</th>
        </tr></thead>
        <tbody>{orders.map(o=>{
          const paid=o.paymentStatus?.toUpperCase()==="PAID";
          const refunded=o.paymentStatus?.toUpperCase()==="REFUNDED";
          const refundAmount=o.accountEntries.reduce((sum,entry)=>sum+entry.amount,0);
          const hasPartialRefund=refundAmount>0&&!refunded;
          const netCollected=Math.max(0,o.totalAmount-refundAmount);
          return <tr key={o.id} className="border-b align-top">
            <td className="p-4"><Link href={"/admin/orders/"+o.id} className="font-black text-blue-900">{o.orderNumber}</Link></td>
            <td className="p-4"><strong>{o.customer.companyName}</strong><div className="mt-1 text-xs text-slate-500">{o.ecommerceEmail??"-"}</div></td>
            <td className="p-4 whitespace-nowrap">{o.createdAt.toLocaleString("tr-TR",{timeZone:"Europe/Istanbul"})}</td>
            <td className="p-4 whitespace-nowrap font-black">{money(o.totalAmount)} ₺</td>
            <td className="p-4">
              <span className={"rounded-full px-3 py-1 font-bold "+(refunded?"bg-violet-100 text-violet-800":hasPartialRefund?"bg-amber-100 text-amber-900":paid?"bg-emerald-100 text-emerald-800":"bg-orange-100 text-orange-800")}>
                {refunded?"Tam İade":hasPartialRefund?"Kısmi İade":PAYMENT[o.paymentStatus??"PENDING"]??o.paymentStatus??"Ödeme Bekleniyor"}
              </span>
              {refundAmount>0?<div className="mt-2 rounded-lg bg-violet-50 p-2 text-xs font-bold text-violet-900">
                <div>İade: {money(refundAmount)} ₺</div>
                <div className="mt-1">Net kalan: {money(netCollected)} ₺</div>
              </div>:null}
              {o.paymentReference?<div className="mt-2 text-xs text-slate-500">{o.paymentReference}</div>:null}
            </td>
            <td className="p-4 font-bold">{STATUS[o.status]??o.status}</td>
            <td className="p-4">
              <div className="min-w-[260px] space-y-2">
                {canManage&&!paid&&!refunded&&o.status!==OrderStatus.CANCELLED?<form action={confirmEcommerceBankTransferPayment.bind(null,o.id)} className="flex gap-2">
                  <input name="paymentReference" required maxLength={120} placeholder="Dekont / banka ref." className="min-w-0 flex-1 rounded-lg border px-3 py-2"/>
                  <button className="rounded-lg bg-emerald-700 px-3 py-2 font-bold text-white">Ödeme Onayla</button>
                </form>:null}
                {canManage&&paid&&o.status===OrderStatus.PENDING?<form action={updateOrderStatus.bind(null,o.id)}>
                  <input type="hidden" name="status" value="APPROVED"/><input type="hidden" name="statusNote" value="Ödeme onaylandı; sipariş WMS operasyonuna aktarıldı."/>
                  <button className="w-full rounded-lg bg-blue-900 px-3 py-2 font-bold text-white">Siparişi Onayla ve WMS'e Aktar</button>
                </form>:null}
                {canManage&&o.status===OrderStatus.CANCELLED&&paid?<form action={refundCancelledEcommerceOrder.bind(null,o.id)} className="flex gap-2">
                  <input name="refundReference" required maxLength={120} placeholder="İade banka ref." className="min-w-0 flex-1 rounded-lg border px-3 py-2"/>
                  <button className="rounded-lg bg-violet-700 px-3 py-2 font-bold text-white">İadeyi Kaydet</button>
                </form>:null}
                {canManage&&paid&&o.status!==OrderStatus.CANCELLED?<Link href={"/admin/orders/"+o.id} className="block rounded-lg border border-red-200 px-3 py-2 text-center font-bold text-red-700">İptal için sipariş detayına git</Link>:null}
              </div>
            </td>
          </tr>;
        })}{orders.length===0?<tr><td colSpan={7} className="p-10 text-center text-slate-500">Filtreye uygun e-ticaret siparişi bulunamadı.</td></tr>:null}</tbody>
      </table>
    </div>
  </section>;
}
