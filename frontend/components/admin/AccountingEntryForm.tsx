"use client";
import { useMemo,useState } from "react";
import { createAccountingEntry } from "@/app/admin/accounting/actions";
type Party={id:number;name:string};
const receiptTypes=new Set(["PAYMENT_RECEIPT","INCOME_RECEIPT"]);
export default function AccountingEntryForm({customers,suppliers}:{customers:Party[];suppliers:Party[]}){
 const [documentType,setDocumentType]=useState("MEAL");const [amount,setAmount]=useState("");const [vatRate,setVatRate]=useState("20");
 const isReceipt=receiptTypes.has(documentType);const net=Number(amount)||0;const effectiveRate=isReceipt?0:Number(vatRate)||0;
 const vat=useMemo(()=>Math.round((net*effectiveRate/100+Number.EPSILON)*100)/100,[net,effectiveRate]);
 const total=useMemo(()=>Math.round((net+vat+Number.EPSILON)*100)/100,[net,vat]);
 return <form action={createAccountingEntry} className="mt-6 grid gap-3 rounded-2xl bg-white p-5 shadow md:grid-cols-4">
  <input name="transactionDate" type="date" required className="rounded-xl border p-3"/>
  <select name="partyType" className="rounded-xl border p-3"><option value="OTHER">Diğer Firma</option><option value="CUSTOMER">Müşteri</option><option value="SUPPLIER">Tedarikçi</option></select>
  <select name="customerId" className="rounded-xl border p-3"><option value="">Müşteri seç</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
  <select name="supplierId" className="rounded-xl border p-3"><option value="">Tedarikçi seç</option>{suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>
  <input name="companyName" placeholder="Firma (Diğer Firma için)" className="rounded-xl border p-3"/>
  <select name="documentType" required value={documentType} onChange={e=>setDocumentType(e.target.value)} className="rounded-xl border p-3">
   <option value="MEAL">Yemek</option><option value="FUEL">Akaryakıt</option><option value="ENERGY">Enerji</option><option value="TELECOMMUNICATION">Telekomünikasyon</option><option value="CONSUMABLE">Sarf Malzeme</option><option value="WATER">Su</option><option value="OTHER_INCOME">Diğer Gelirler</option><option value="OTHER_EXPENSE">Diğer Giderler</option><option value="PAYMENT_RECEIPT">Ödeme Dekontu</option><option value="INCOME_RECEIPT">Gelir Dekontu</option>
  </select>
  <input name="documentNo" placeholder="Belge No" className="rounded-xl border p-3"/>
  <select name="paymentType" className="rounded-xl border p-3"><option value="">Ödeme türü</option><option value="CASH">Peşin Ödeme</option><option value="DEFERRED">Vadeli</option><option value="BANK_TRANSFER">Havale / EFT</option><option value="CREDIT_CARD">Kredi Kartı</option><option value="OTHER">Diğer</option></select>
  <label className="text-sm font-semibold">Tutar<input name="netAmount" type="number" min="0.01" step="0.01" required value={amount} onChange={e=>setAmount(e.target.value)} className="mt-1 w-full rounded-xl border p-3"/></label>
  <label className="text-sm font-semibold">KDV Oranı<select name="vatRate" value={isReceipt?"0":vatRate} onChange={e=>setVatRate(e.target.value)} disabled={isReceipt} className="mt-1 w-full rounded-xl border p-3 disabled:bg-slate-100 disabled:text-slate-400"><option value="0">%0</option><option value="1">%1</option><option value="10">%10</option><option value="20">%20</option></select>{isReceipt&&<input type="hidden" name="vatRate" value="0"/>}</label>
  <label className="text-sm font-semibold">KDV Tutarı<input value={vat.toFixed(2)} readOnly disabled className="mt-1 w-full rounded-xl border bg-slate-100 p-3 text-slate-600"/></label>
  <label className="text-sm font-semibold">Toplam Tutar<input value={total.toFixed(2)} readOnly disabled className="mt-1 w-full rounded-xl border bg-slate-100 p-3 font-bold"/></label>
  <input name="bankName" placeholder="Banka" className="rounded-xl border p-3"/><input name="bankReference" placeholder="Dekont / Referans No" className="rounded-xl border p-3"/>
  <input name="dueDate" type="date" className="rounded-xl border p-3"/><input name="description" maxLength={500} placeholder="Açıklama" className="rounded-xl border p-3 md:col-span-2"/>
  <button className="rounded-xl bg-blue-900 p-3 font-bold text-white">Hareketi Kaydet</button>
 </form>;
}
