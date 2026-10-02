"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createEcommerceReturnPreReceipt, type PreReceiptState } from "@/app/rf/ecommerce-return-pre-receipt/actions";

const initial:PreReceiptState={success:false,message:""};

export default function RFEcommerceReturnPreReceiptForm({warehouses,carriers,recent,lateDetected}:{warehouses:Array<{id:number;code:string;name:string}>;carriers:Array<{id:string;code:string;name:string}>;recent:Array<{preReceiptNumber:string;scannedCode:string;mode:string;matchStatus:string;outcome:string;receivedAt:string;carrier:{name:string}}>;
 lateDetected:boolean;
}){
 const [state,action,pending]=useActionState(createEcommerceReturnPreReceipt,initial);
 const [mode,setMode]=useState<"RETURN_CODE"|"CARGO_BARCODE">("RETURN_CODE");
 const scanRef=useRef<HTMLInputElement>(null);
 useEffect(()=>{scanRef.current?.focus()},[state]);
 return <div className="space-y-4">
  <form action={action} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
   <div className="grid grid-cols-2 gap-3">
    <button type="button" onClick={()=>{setMode("RETURN_CODE");requestAnimationFrame(()=>scanRef.current?.focus())}} className={`rounded-2xl border-2 p-4 text-left font-black ${mode==="RETURN_CODE"?"border-blue-600 bg-blue-50 text-blue-950":"border-slate-200"}`}><span className="block text-xl">↩️ İade Kodu</span><span className="mt-1 block text-xs font-semibold">Müşteri iade kodunu okut</span></button>
    <button type="button" onClick={()=>{setMode("CARGO_BARCODE");requestAnimationFrame(()=>scanRef.current?.focus())}} className={`rounded-2xl border-2 p-4 text-left font-black ${mode==="CARGO_BARCODE"?"border-amber-500 bg-amber-50 text-amber-950":"border-slate-200"}`}><span className="block text-xl">🚚 Kargo Barkodu</span><span className="mt-1 block text-xs font-semibold">Teslim edilemeyen gönderiyi okut</span></button>
   </div>
   <input type="hidden" name="mode" value={mode}/><input type="hidden" name="lateDetected" value={lateDetected?"1":"0"}/>{lateDetected&&<div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 font-bold text-amber-950">⚠ İade girişinde ön kabul eksikliği tespit edildi. Bu kayıt Geç Ön Kabul olarak mutabakat raporuna işlenecek.</div>}
   <div className="mt-4 grid gap-3">
    <label className="text-sm font-bold">Depo<select name="warehouseId" required className="mt-1 w-full rounded-xl border p-3 text-base"><option value="">Depo seçin</option>{warehouses.map(x=><option key={x.id} value={x.id}>{x.code} - {x.name}</option>)}</select></label>
    <label className="text-sm font-bold">Kargo Firması<select name="carrierId" required className="mt-1 w-full rounded-xl border p-3 text-base"><option value="">Kargo firması seçin</option>{carriers.map(x=><option key={x.id} value={x.id}>{x.code} - {x.name}</option>)}</select></label>
    <label className="text-sm font-bold">{mode==="RETURN_CODE"?"İade Kodu":"Kargo Barkodu"}<input ref={scanRef} name="scannedCode" autoComplete="off" required className="mt-1 w-full rounded-xl border-2 border-blue-500 p-4 text-xl font-black uppercase outline-none" placeholder="Barkodu okutun..."/></label>
    <input type="hidden" name="terminalCode" value="RF"/>
    <button disabled={pending} className="rounded-xl bg-blue-700 p-4 text-lg font-black text-white disabled:bg-slate-400">{pending?"Kaydediliyor...":"Ön Kabul Yap"}</button>
   </div>
   {state.message&&<div className={`mt-4 rounded-xl border p-4 font-bold ${state.success?"border-emerald-200 bg-emerald-50 text-emerald-900":"border-red-200 bg-red-50 text-red-900"}`}>{state.message}</div>}
  </form>
  <section className="rounded-2xl border bg-white p-4"><h2 className="mb-3 font-black">Son Ön Kabuller</h2><div className="space-y-2">{recent.map(x=><div key={x.preReceiptNumber} className="rounded-xl bg-slate-50 p-3 text-sm"><b>{x.scannedCode}</b> · {x.carrier.name}<br/><span className="text-xs text-slate-500">{x.preReceiptNumber} · {x.mode==="RETURN_CODE"?"İade Kodu":"Kargo Barkodu"} · {x.matchStatus}</span></div>)}</div></section>
 </div>;
}
