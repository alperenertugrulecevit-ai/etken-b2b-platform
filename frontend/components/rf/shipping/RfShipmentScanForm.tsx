"use client";
import { useActionState } from "react";
import Link from "next/link";
import type { RfShipmentState } from "@/app/rf/shipment-workflow-actions";
type Field={name:string;label:string;placeholder:string;autoFocus?:boolean};
export default function RfShipmentScanForm({title,subtitle,fields,action,submitLabel}:{title:string;subtitle:string;fields:Field[];action:(state:RfShipmentState,data:FormData)=>Promise<RfShipmentState>;submitLabel:string}){
 const [state,formAction,pending]=useActionState(action,{ok:false,message:""});
 return <section><div className="mb-4 flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-blue-700">RF · Sevkiyat</p><h1 className="mt-1 text-2xl font-black">{title}</h1><p className="mt-1 text-sm text-slate-600">{subtitle}</p></div><Link href="/rf/operations/shipping" className="rounded-xl border bg-white px-4 py-3 font-bold">← Geri</Link></div>
 <form action={formAction} className="space-y-4 rounded-2xl border bg-white p-4 shadow-sm">
 {fields.map(f=><label key={f.name} className="block"><span className="mb-1 block text-sm font-bold">{f.label}</span><input name={f.name} autoFocus={f.autoFocus} required autoComplete="off" placeholder={f.placeholder} className="w-full rounded-xl border-2 border-slate-300 px-4 py-4 text-lg font-bold uppercase outline-none focus:border-blue-600"/></label>)}
 {state.message&&<div className={`rounded-xl border p-4 font-bold ${state.ok?"border-green-200 bg-green-50 text-green-800":"border-red-200 bg-red-50 text-red-800"}`}>{state.message}</div>}
 <button disabled={pending} className="w-full rounded-xl bg-blue-950 px-4 py-4 text-lg font-black text-white disabled:opacity-50">{pending?"İşleniyor...":submitLabel}</button>
 </form></section>;
}
