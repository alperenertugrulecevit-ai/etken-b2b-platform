import { BankTransactionMatchStatus, B2BPaymentMethod, OrderSource } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
import { B2B_CONSTANTS } from "@/modules/b2b/constants/b2b.constants";
import { addManualBankTransactionAction, importBankStatementCsvAction, ignoreBankTransactionAction, matchBankTransactionAction } from "./actions";

const money=(v:number)=>v.toLocaleString("tr-TR",{minimumFractionDigits:2,maximumFractionDigits:2});

export default async function BankReconciliationPage(){
 await AuthorizationService.requirePermission("ORDER_MANAGE");
 const [transactions,orders,accounts]=await Promise.all([
  prisma.bankTransaction.findMany({where:{tenantId:B2B_CONSTANTS.TENANT_ID,companyId:B2B_CONSTANTS.COMPANY_ID},include:{bankAccount:{select:{bankName:true,iban:true}},matchedOrder:{select:{orderNumber:true}}},orderBy:{transactionDate:"desc"},take:250}),
  prisma.order.findMany({where:{source:OrderSource.ECOMMERCE,paymentMethod:B2BPaymentMethod.BANK_TRANSFER,paymentStatus:{not:"PAID"}},select:{id:true,orderNumber:true,totalAmount:true,ecommerceEmail:true},orderBy:{createdAt:"desc"},take:250}),
  prisma.b2BBankAccount.findMany({where:{tenantId:B2B_CONSTANTS.TENANT_ID,companyId:B2B_CONSTANTS.COMPANY_ID,isActive:true},orderBy:[{sortOrder:"asc"},{id:"asc"}]}),
 ]);
 return <main className="p-4 sm:p-6 lg:p-10">
  <p className="text-xs font-black uppercase tracking-wider text-[#EF4B23]">E-Ticaret Yönetimi</p>
  <h1 className="mt-2 text-3xl font-black">Banka Hareketleri ve Havale Mutabakatı</h1>
  <p className="mt-2 max-w-4xl text-sm text-slate-600">Canlı banka API/ekstre entegrasyonundan gelen hareketler burada siparişlerle eşleştirilir. Aynı banka hareketi externalId ile yalnızca bir kez içeri alınır; tutar ve ödeme yöntemi doğrulanmadan sipariş PAID yapılmaz.</p>
  <section className="mt-5 grid gap-3 md:grid-cols-3">{accounts.map(a=><article key={a.id} className="rounded-xl border bg-white p-4"><strong>{a.bankName}</strong><p className="mt-1 break-all font-mono text-xs">{a.iban}</p><p className="mt-2 text-xs font-bold">{a.apiEnabled?`API hazır: ${a.apiProvider??"Sağlayıcı tanımsız"}`:"API pasif / manuel ekstre"}</p></article>)}</section>
  <section className="mt-6 grid gap-4 lg:grid-cols-2">
   <form action={addManualBankTransactionAction} className="rounded-2xl border bg-white p-5">
    <h2 className="font-black">Manuel Banka Hareketi</h2><div className="mt-3 grid gap-3 sm:grid-cols-2">
    <select name="bankAccountId" required className="rounded-xl border p-3"><option value="">Banka hesabı seç</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.bankName} · {a.iban}</option>)}</select>
    <input name="transactionDate" type="datetime-local" required className="rounded-xl border p-3"/><input name="amount" inputMode="decimal" required placeholder="Tutar" className="rounded-xl border p-3"/>
    <input name="currency" defaultValue="TRY" maxLength={3} className="rounded-xl border p-3 uppercase"/><input name="senderName" placeholder="Gönderen" className="rounded-xl border p-3"/>
    <input name="senderIban" placeholder="Gönderen IBAN" className="rounded-xl border p-3"/><input name="bankReference" placeholder="Banka referansı" className="rounded-xl border p-3"/>
    <input name="externalId" placeholder="Harici işlem ID (opsiyonel)" className="rounded-xl border p-3"/><input name="description" placeholder="Açıklama / sipariş no" className="rounded-xl border p-3 sm:col-span-2"/>
    </div><button className="mt-3 rounded-xl bg-slate-900 px-5 py-3 font-black text-white">Hareketi Ekle</button>
   </form>
   <form action={importBankStatementCsvAction} className="rounded-2xl border bg-white p-5">
    <h2 className="font-black">CSV Ekstre İçe Aktar</h2><p className="mt-2 text-xs text-slate-500">Noktalı virgül: tarih;tutar;paraBirimi;gönderen;iban;açıklama;bankaReferansı;externalId</p>
    <select name="bankAccountId" required className="mt-4 w-full rounded-xl border p-3"><option value="">Banka hesabı seç</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.bankName} · {a.iban}</option>)}</select>
    <input name="file" type="file" accept=".csv,text/csv" required className="mt-3 w-full rounded-xl border p-3"/>
    <button className="mt-3 rounded-xl bg-blue-900 px-5 py-3 font-black text-white">Ekstreyi İçe Aktar</button>
   </form>
  </section>
  <div className="mt-6 overflow-x-auto rounded-2xl border bg-white"><table className="w-full min-w-[1150px] text-sm"><thead className="bg-slate-900 text-white"><tr><th className="p-3 text-left">Tarih</th><th className="p-3 text-left">Banka</th><th className="p-3 text-left">Gönderen / Açıklama</th><th className="p-3 text-right">Tutar</th><th className="p-3">Durum</th><th className="p-3">Eşleştirme</th></tr></thead>
  <tbody>{transactions.map(t=><tr key={t.id} className="border-t align-top"><td className="p-3 whitespace-nowrap">{t.transactionDate.toLocaleString("tr-TR",{timeZone:"Europe/Istanbul"})}</td><td className="p-3"><strong>{t.bankAccount.bankName}</strong><div className="text-xs text-slate-500">{t.bankReference??t.externalId}</div></td><td className="p-3"><strong>{t.senderName??"-"}</strong><div className="mt-1 max-w-md text-xs text-slate-500">{t.description??"-"}</div></td><td className="p-3 text-right font-black">{money(t.amount)} {t.currency}</td><td className="p-3 text-center font-bold">{t.matchStatus==="MATCHED"?`Eşleşti · ${t.matchedOrder?.orderNumber??""}`:t.matchStatus==="IGNORED"?"Yok Sayıldı":"Eşleşmemiş"}</td><td className="p-3">{t.matchStatus===BankTransactionMatchStatus.UNMATCHED?<div className="space-y-2"><form action={matchBankTransactionAction} className="flex gap-2"><input type="hidden" name="transactionId" value={t.id}/><select name="orderId" required className="min-w-[260px] rounded-lg border p-2"><option value="">Sipariş seç</option>{orders.filter(o=>Math.abs(o.totalAmount-t.amount)<=0.01).map(o=><option key={o.id} value={o.id}>{o.orderNumber} · {money(o.totalAmount)} ₺ · {o.ecommerceEmail??"-"}</option>)}</select><button className="rounded-lg bg-emerald-700 px-3 py-2 font-bold text-white">Eşleştir</button></form><form action={ignoreBankTransactionAction}><input type="hidden" name="transactionId" value={t.id}/><button className="text-xs font-bold text-slate-500 underline">Hareketi yok say</button></form></div>:null}</td></tr>)}{transactions.length===0?<tr><td colSpan={6} className="p-10 text-center text-slate-500">Henüz banka hareketi yok. Canlı banka adaptörü veya ekstre içe aktarma bu tabloyu besleyecek.</td></tr>:null}</tbody></table></div>
 </main>;
}
