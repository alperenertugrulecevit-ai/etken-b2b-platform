import Link from "next/link";
import { AccountingDocumentType,AccountingMovementType,AccountingPartyType,AccountingPaymentType } from "@prisma/client";
import ConfigurableDataTable from "@/components/admin/ConfigurableDataTable";
import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
import { createAccountingEntry } from "./actions";
export const dynamic="force-dynamic";export const revalidate=0;
const doc:Record<AccountingDocumentType,string>={MEAL:"Yemek",FUEL:"Akaryakıt",ENERGY:"Enerji",TELECOMMUNICATION:"Telekomünikasyon",CONSUMABLE:"Sarf Malzeme",WATER:"Su",OTHER_INCOME:"Diğer Gelirler",OTHER_EXPENSE:"Diğer Giderler",PAYMENT_RECEIPT:"Ödeme Dekontu",INCOME_RECEIPT:"Gelir Dekontu"};
const mov:Record<AccountingMovementType,string>={EXPENSE:"Gider",INCOME:"Gelir",PAYMENT_OUT:"Ödeme (-)",PAYMENT_IN:"Ödeme (+)"};
const pay:Record<AccountingPaymentType,string>={CASH:"Peşin Ödeme",DEFERRED:"Vadeli",BANK_TRANSFER:"Havale / EFT",CREDIT_CARD:"Kredi Kartı",OTHER:"Diğer"};
const money=(v:number)=>v.toLocaleString("tr-TR",{style:"currency",currency:"TRY"});
export default async function AccountingPage({searchParams}:{searchParams:Promise<{success?:string;error?:string;from?:string;to?:string;q?:string;movement?:string}>}){
 await AuthorizationService.requireAdminPortalAccess();const q=await searchParams;
 const from=q.from?new Date(q.from+"T00:00:00+03:00"):null,to=q.to?new Date(q.to+"T23:59:59+03:00"):null;
 const movement=Object.values(AccountingMovementType).includes(q.movement as AccountingMovementType)?q.movement as AccountingMovementType:undefined;
 const where={...(from||to?{transactionDate:{...(from?{gte:from}:{}),...(to?{lte:to}:{})}}:{}),...(movement?{movementType:movement}:{}),...(q.q?{OR:[{companyName:{contains:q.q,mode:"insensitive" as const}},{documentNo:{contains:q.q,mode:"insensitive" as const}},{description:{contains:q.q,mode:"insensitive" as const}},{bankReference:{contains:q.q,mode:"insensitive" as const}}]}:{})};
 const [entries,customers,suppliers]=await Promise.all([prisma.accountingEntry.findMany({where,orderBy:[{transactionDate:"desc"},{createdAt:"desc"}],take:1000}),prisma.customer.findMany({where:{isActive:true},select:{id:true,companyName:true},orderBy:{companyName:"asc"}}),prisma.supplier.findMany({where:{isActive:true},select:{id:true,name:true},orderBy:{name:"asc"}})]);
 const columns=[{key:"date",label:"Tarih"},{key:"company",label:"Firma"},{key:"documentType",label:"Belge Türü"},{key:"movement",label:"Hareket Türü"},{key:"documentNo",label:"Belge No"},{key:"payment",label:"Ödeme Türü"},{key:"net",label:"Tutar"},{key:"vat",label:"KDV"},{key:"total",label:"Toplam Tutar"},{key:"description",label:"Açıklama"},{key:"bank",label:"Banka / Referans"}];
 const rows=entries.map(e=>({key:e.id,cells:{date:e.transactionDate.toLocaleDateString("tr-TR",{timeZone:"Europe/Istanbul"}),company:e.companyName,documentType:doc[e.documentType],movement:mov[e.movementType],documentNo:e.documentNo??"-",payment:e.paymentType?pay[e.paymentType]:"-",net:money(e.netAmount),vat:money(e.vatAmount),total:<strong key={e.id}>{money(e.totalAmount)}</strong>,description:e.description??"-",bank:[e.bankName,e.bankReference].filter(Boolean).join(" · ")||"-"}}));
 return <section className="p-4 sm:p-6 lg:p-10"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-bold uppercase text-blue-700">Finans</p><h1 className="text-3xl font-black">Muhasebeleştirme</h1><p className="mt-2 text-slate-500">Etken dışı gider, gelir, fiş, fatura ve banka dekontlarını kaydedin.</p></div><Link href="/admin/accounting/reconciliation" className="rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white">Cari Hesap Mutabakatı</Link></div>
 {q.success?<div className="mt-5 rounded-xl bg-green-100 p-4 font-bold text-green-800">Muhasebe hareketi kaydedildi.</div>:null}{q.error?<div className="mt-5 rounded-xl bg-red-100 p-4 font-bold text-red-800">{q.error}</div>:null}
 <form action={createAccountingEntry} className="mt-6 grid gap-3 rounded-2xl bg-white p-5 shadow md:grid-cols-4">
  <input name="transactionDate" type="date" required className="rounded-xl border p-3"/>
  <select name="partyType" className="rounded-xl border p-3"><option value="OTHER">Diğer Firma</option><option value="CUSTOMER">Müşteri</option><option value="SUPPLIER">Tedarikçi</option></select>
  <select name="customerId" className="rounded-xl border p-3"><option value="">Müşteri seç</option>{customers.map(c=><option key={c.id} value={c.id}>{c.companyName}</option>)}</select>
  <select name="supplierId" className="rounded-xl border p-3"><option value="">Tedarikçi seç</option>{suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>
  <input name="companyName" placeholder="Firma (Diğer Firma için)" className="rounded-xl border p-3"/>
  <select name="documentType" required className="rounded-xl border p-3">{Object.entries(doc).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select>
  <input name="documentNo" placeholder="Belge No" className="rounded-xl border p-3"/>
  <select name="paymentType" className="rounded-xl border p-3"><option value="">Ödeme türü</option>{Object.entries(pay).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select>
  <input name="netAmount" type="number" min="0" step="0.01" required placeholder="Tutar (KDV hariç)" className="rounded-xl border p-3"/>
  <input name="vatAmount" type="number" min="0" step="0.01" defaultValue="0" placeholder="KDV" className="rounded-xl border p-3"/>
  <input name="bankName" placeholder="Banka" className="rounded-xl border p-3"/><input name="bankReference" placeholder="Dekont / Referans No" className="rounded-xl border p-3"/>
  <input name="dueDate" type="date" className="rounded-xl border p-3"/><input name="description" maxLength={500} placeholder="Açıklama" className="rounded-xl border p-3 md:col-span-2"/>
  <button className="rounded-xl bg-blue-900 p-3 font-bold text-white">Hareketi Kaydet</button>
 </form>
 <form className="mt-6 grid gap-3 rounded-2xl bg-slate-100 p-4 md:grid-cols-5"><input name="from" type="date" defaultValue={q.from} className="rounded-xl border p-3"/><input name="to" type="date" defaultValue={q.to} className="rounded-xl border p-3"/><select name="movement" defaultValue={q.movement??""} className="rounded-xl border p-3"><option value="">Tüm hareketler</option>{Object.entries(mov).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select><input name="q" defaultValue={q.q} placeholder="Firma / belge / açıklama / referans" className="rounded-xl border p-3"/><button className="rounded-xl bg-slate-900 font-bold text-white">Filtrele</button></form>
 <div className="mt-5"><ConfigurableDataTable storageKey="admin-accounting-ledger-v1" columns={columns} rows={rows} minWidth="1500px"/></div></section>;
}
