"use client";
import { useActionState } from "react";
import Link from "next/link";
import { dispatchShipmentAction, preDispatchCheckAction } from "../shipment-workflow-actions";

const initial={ok:false,message:""};
export default function Page(){
 const [check,checkAction,checking]=useActionState(preDispatchCheckAction,initial);
 const [dispatch,dispatchAction,dispatching]=useActionState(dispatchShipmentAction,initial);
 return <section>
  <div className="mb-4 flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-blue-700">RF · Sevkiyat</p><h1 className="mt-1 text-2xl font-black">Sevk Et</h1><p className="mt-1 text-sm text-slate-600">Önce sevk öncesi kontrolü çalıştırın. Araç, rota ve tüm THM yüklemeleri tamamlanmadan sevk kesinleştirilemez.</p></div><Link href="/rf/operations/shipping" className="rounded-xl border bg-white px-4 py-3 font-bold">← Geri</Link></div>
  <form action={checkAction} className="space-y-4 rounded-2xl border bg-white p-4 shadow-sm">
   <label className="block"><span className="mb-1 block text-sm font-bold">Sevkiyat Numarası</span><input name="shipmentNumber" required autoFocus autoComplete="off" placeholder="SVP-..." className="w-full rounded-xl border-2 border-slate-300 px-4 py-4 text-lg font-bold uppercase outline-none focus:border-blue-600"/></label>
   {check.message&&<div className={`rounded-xl border p-4 font-bold ${check.ok?"border-green-200 bg-green-50 text-green-800":"border-red-200 bg-red-50 text-red-800"}`}>{check.message}</div>}
   <button disabled={checking} className="w-full rounded-xl bg-slate-800 px-4 py-4 text-lg font-black text-white disabled:opacity-50">{checking?"Kontrol ediliyor...":"SEVK ÖNCESİ KONTROL"}</button>
  </form>
  {check.ok&&<form action={dispatchAction} className="mt-4 space-y-4 rounded-2xl border-2 border-green-300 bg-green-50 p-4"><input type="hidden" name="shipmentNumber" value={check.message.split(" · ")[0]}/><p className="font-black text-green-900">Kontrol başarılı. Sevkiyatı kesinleştirebilirsiniz.</p>{dispatch.message&&<div className={`rounded-xl border p-4 font-bold ${dispatch.ok?"border-green-300 bg-white text-green-900":"border-red-200 bg-red-50 text-red-800"}`}>{dispatch.message}</div>}<button disabled={dispatching} className="w-full rounded-xl bg-green-800 px-4 py-4 text-lg font-black text-white disabled:opacity-50">{dispatching?"Sevk ediliyor...":"SEVK ET"}</button></form>}
 </section>;
}
