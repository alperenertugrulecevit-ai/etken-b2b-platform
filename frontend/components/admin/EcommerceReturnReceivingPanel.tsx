"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { processEcommerceReturnItemState, type EcommerceReturnProcessState } from "@/app/admin/e-ticaret/returns/actions";

const initial:EcommerceReturnProcessState={success:false,message:""};

export default function EcommerceReturnReceivingPanel({preReceiptId,returnNumber,orderNumber,customerName,items}:{preReceiptId:string;returnNumber:string;orderNumber:string;customerName:string;items:Array<{id:string;productCode:string;productBarcode:string;productName:string;expectedQuantity:number;receivedQuantity:number;acceptedQuantity:number;rejectedQuantity:number;refundStatus:string;refundAmount:number}>;}){
 const [state,action,pending]=useActionState(processEcommerceReturnItemState,initial);
 const [quality,setQuality]=useState("SELLABLE");
 const [product,setProduct]=useState("");
 const [thm,setThm]=useState("");
 const [location,setLocation]=useState("");
 const productRef=useRef<HTMLInputElement>(null);
 const formRef=useRef<HTMLFormElement>(null);
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>{if(state.success){setProduct("");requestAnimationFrame(()=>productRef.current?.focus())}},[state]);
 const complete=items.reduce((s,i)=>s+i.receivedQuantity,0), total=items.reduce((s,i)=>s+i.expectedQuantity,0);
 return <div className="space-y-4">
  <div className="grid grid-cols-3 gap-4">
   <section className="rounded-2xl border bg-white p-5 shadow-sm"><p className="text-xs font-bold text-slate-500">İADE DOSYASI</p><h2 className="mt-1 text-xl font-black">{returnNumber}</h2><dl className="mt-4 space-y-2 text-sm"><div><b>Sipariş:</b> {orderNumber}</div><div><b>Müşteri:</b> {customerName}</div><div><b>İlerleme:</b> {complete}/{total}</div></dl></section>
   <section className="col-span-2 rounded-2xl border bg-white p-5 shadow-sm"><h2 className="text-lg font-black">Kalite ve Ürün Kabul</h2><p className="mt-1 text-sm text-slate-500">Kalite sonucu, hedef THM ve adresi belirleyin; ürün barkodu okutulduğunda işlem otomatik gönderilir.</p>
    <form ref={formRef} action={action} className="mt-4 grid grid-cols-2 gap-3">
     <input type="hidden" name="preReceiptId" value={preReceiptId}/>
     <label className="text-sm font-bold">Kalite Sonucu<select name="qualityResult" value={quality} onChange={e=>setQuality(e.target.value)} className="mt-1 w-full rounded-xl border p-3"><option value="SELLABLE">Satılabilir</option><option value="PACKAGING_DAMAGED">Ambalaj Hasarlı</option><option value="PRODUCT_DAMAGED">Ürün Hasarlı</option><option value="MISSING_PART">Eksik Parça</option><option value="USED">Kullanılmış</option><option value="WRONG_PRODUCT">Yanlış Ürün</option><option value="REVIEW_REQUIRED">İnceleme Bekliyor</option></select></label>
     <label className="text-sm font-bold">Müşteri İade Nedeni<input name="customerReason" className="mt-1 w-full rounded-xl border p-3" placeholder="Varsa iade nedeni"/></label>
     <label className="text-sm font-bold">Hedef THM<input name="targetHandlingUnitBarcode" value={thm} onChange={e=>setThm(e.target.value.toUpperCase())} required className="mt-1 w-full rounded-xl border p-3 font-mono font-bold uppercase" placeholder={quality==="SELLABLE"?"STOCK THM":"RECEIVING THM"}/></label>
     <label className="text-sm font-bold">Hedef Adres<input name="targetLocationCode" value={location} onChange={e=>setLocation(e.target.value.toUpperCase())} required className="mt-1 w-full rounded-xl border p-3 font-mono font-bold uppercase" placeholder="Adres barkodu"/></label>
     <label className="col-span-2 text-sm font-bold">Kalite Notu<input name="qualityNote" className="mt-1 w-full rounded-xl border p-3" placeholder="Opsiyonel açıklama"/></label>
     <label className="col-span-2 text-sm font-black text-blue-800">Ürün Barkodu
      <input ref={productRef} name="productBarcode" value={product} onChange={e=>{const v=e.target.value.toUpperCase();setProduct(v);if(timer.current)clearTimeout(timer.current);if(v.trim()&&thm.trim()&&location.trim())timer.current=setTimeout(()=>formRef.current?.requestSubmit(),220)}} autoFocus autoComplete="off" required className="mt-1 w-full rounded-xl border-2 border-blue-500 p-4 text-xl font-black uppercase outline-none" placeholder="Ürünü okutun..."/>
     </label>
     <button disabled={pending} className="col-span-2 rounded-xl bg-blue-700 p-4 text-lg font-black text-white disabled:bg-slate-400">{pending?"İşleniyor...":"Ürünü Kabul Et"}</button>
    </form>
    {state.message&&<div className={`mt-3 rounded-xl border p-3 font-bold ${state.success?"border-emerald-300 bg-emerald-50 text-emerald-900":"border-red-300 bg-red-50 text-red-900"}`}>{state.message}</div>}
    <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs font-semibold text-slate-600">{quality==="SELLABLE"?"Satılabilir: STOCK THM + normal stok adresi zorunlu. Para iadesine uygun tutar oluşur.":"Kalite/hasar: RECEIVING THM + QUALITY / QUARANTINE / RETURN adresi zorunlu. Finans incelemesi gerekir."}</div>
   </section>
  </div>
  <section className="rounded-2xl border bg-white p-4 shadow-sm"><h2 className="mb-3 text-lg font-black">İade Ürünleri</h2><table className="w-full text-sm"><thead className="bg-slate-100"><tr>{["Ürün","Barkod","Beklenen","Gelen","Satılabilir","Red","Finans","Tutar"].map(x=><th key={x} className="border p-2 text-left">{x}</th>)}</tr></thead><tbody>{items.map(i=><tr key={i.id}><td className="border p-2"><b>{i.productCode}</b><br/>{i.productName}</td><td className="border p-2 font-mono">{i.productBarcode}</td><td className="border p-2">{i.expectedQuantity}</td><td className="border p-2 font-bold">{i.receivedQuantity}</td><td className="border p-2 text-emerald-700">{i.acceptedQuantity}</td><td className="border p-2 text-red-700">{i.rejectedQuantity}</td><td className="border p-2">{i.refundStatus}</td><td className="border p-2">{i.refundAmount.toFixed(2)} TL</td></tr>)}</tbody></table></section>
 </div>;
}
