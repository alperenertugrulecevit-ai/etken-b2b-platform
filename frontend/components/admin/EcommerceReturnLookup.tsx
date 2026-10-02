"use client";
import { useEffect,useRef,useState } from "react";
import { useRouter } from "next/navigation";

export default function EcommerceReturnLookup({initialCode="",locked=false}:{initialCode?:string;locked?:boolean}){
 const router=useRouter(),ref=useRef<HTMLInputElement>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const [code,setCode]=useState(initialCode);
 useEffect(()=>{setCode(initialCode);if(!locked)requestAnimationFrame(()=>ref.current?.focus())},[initialCode,locked]);
 const clear=()=>{if(timer.current)clearTimeout(timer.current);setCode("");router.replace("/admin/e-ticaret/returns");requestAnimationFrame(()=>ref.current?.focus())};
 return <div className="rounded-2xl border bg-white p-5 shadow-sm">
  <form onSubmit={e=>{e.preventDefault();if(locked)return;const v=code.trim().toUpperCase();if(v)router.push(`/admin/e-ticaret/returns?code=${encodeURIComponent(v)}`)}}>
   <div className="flex items-center justify-between"><label className="text-sm font-black">İade Kodu / Kargo Barkodu</label><button type="button" onClick={clear} className="rounded-lg border border-slate-400 px-4 py-2 text-sm font-black">Temizle</button></div>
   <input ref={ref} disabled={locked} value={code} onChange={e=>{if(locked)return;const v=e.target.value.toUpperCase();setCode(v);if(timer.current)clearTimeout(timer.current);if(v.trim())timer.current=setTimeout(()=>router.push(`/admin/e-ticaret/returns?code=${encodeURIComponent(v.trim())}`),220)}} autoComplete="off" className="mt-2 w-full rounded-xl border-2 border-blue-500 px-4 py-3 text-lg font-bold uppercase outline-none disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-500" placeholder="İade kodu / kargo barkodunu okutun..."/>
  </form>
  {locked&&<div className="mt-3 rounded-xl border-2 border-emerald-400 bg-emerald-50 p-4 text-center text-lg font-black text-emerald-900">✓ İade girişi tamamlanmıştır.</div>}
 </div>;
}
