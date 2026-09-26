"use client";
import { useActionState } from "react";
import Link from "next/link";
import { completeRoutingAction, routeShipmentAction, type RfShipmentState } from "@/app/rf/shipment-workflow-actions";

export default function RfRoutingForm(){
 const [routeState,routeAction,routePending]=useActionState(routeShipmentAction,{ok:false,message:""} as RfShipmentState);
 const [completeState,completeAction,completePending]=useActionState(completeRoutingAction,{ok:false,message:""} as RfShipmentState);
 return <section>
  <div className="mb-4 flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-blue-700">RF · Sevkiyat</p><h1 className="mt-1 text-2xl font-black">ROTA</h1><p className="mt-1 text-sm text-slate-600">Sevkiyat numarası, THM ve rota barkodunu okutun.</p></div><Link href="/rf/operations/shipping" className="rounded-xl border bg-white px-4 py-3 font-bold">← Geri</Link></div>
  <form action={routeAction} className="space-y-4 rounded-2xl border bg-white p-4 shadow-sm">
   {[["shipmentNumber","Sevkiyat Numarası","SVP-..."],["thmBarcode","THM Barkodu","THM okutun"],["routeNumber","Rota Numarası","Rota barkodunu okutun"]].map(([name,label,placeholder],i)=><label key={name} className="block"><span className="mb-1 block text-sm font-bold">{label}</span><input name={name} autoFocus={i===0} required autoComplete="off" placeholder={placeholder} className="w-full rounded-xl border-2 border-slate-300 px-4 py-4 text-lg font-bold uppercase outline-none focus:border-blue-600"/></label>)}
   {routeState.message&&<div className={`rounded-xl border p-4 font-bold ${routeState.ok?"border-green-200 bg-green-50 text-green-800":"border-red-200 bg-red-50 text-red-800"}`}>{routeState.message}</div>}
   <button disabled={routePending} className="w-full rounded-xl bg-blue-950 px-4 py-4 text-lg font-black text-white disabled:opacity-50">{routePending?"İşleniyor...":"ROTALA"}</button>
  </form>
  <form action={completeAction} className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
   <label className="block"><span className="mb-1 block text-sm font-bold">Rotalaması tamamlanacak Sevkiyat Numarası</span><input name="shipmentNumber" required autoComplete="off" placeholder="SVP-..." className="w-full rounded-xl border-2 border-amber-300 bg-white px-4 py-4 text-lg font-bold uppercase"/></label>
   {completeState.message&&<div className={`mt-3 rounded-xl border p-3 font-bold ${completeState.ok?"border-green-200 bg-green-50 text-green-800":"border-red-200 bg-red-50 text-red-800"}`}>{completeState.message}</div>}
   <button disabled={completePending} className="mt-3 w-full rounded-xl bg-amber-600 px-4 py-4 text-lg font-black text-white disabled:opacity-50">{completePending?"İşleniyor...":"ROTALAMAYI TAMAMLA"}</button>
  </form>
 </section>;
}
