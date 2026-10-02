"use client";
import { useEffect,useRef,useState } from "react";
import { useRouter } from "next/navigation";

export default function EcommerceReturnLookup({initialCode=""}:{initialCode?:string}){
 const router=useRouter(), ref=useRef<HTMLInputElement>(null), timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const [code,setCode]=useState(initialCode);
 useEffect(()=>{setCode(initialCode);requestAnimationFrame(()=>ref.current?.focus())},[initialCode]);
 return <form onSubmit={e=>{e.preventDefault();const v=code.trim().toUpperCase();if(v)router.push(`/admin/e-ticaret/returns?code=${encodeURIComponent(v)}`)}} className="rounded-2xl border bg-white p-5 shadow-sm">
  <label className="text-sm font-black">İade Kodu / Kargo Barkodu</label>
  <input ref={ref} value={code} onChange={e=>{const v=e.target.value.toUpperCase();setCode(v);if(timer.current)clearTimeout(timer.current);if(v.trim())timer.current=setTimeout(()=>router.push(`/admin/e-ticaret/returns?code=${encodeURIComponent(v.trim())}`),220)}} autoComplete="off" className="mt-2 w-full rounded-xl border-2 border-blue-500 px-4 py-3 text-lg font-bold uppercase outline-none" placeholder="İade kodu / kargo barkodunu okutun..."/>
 </form>;
}
