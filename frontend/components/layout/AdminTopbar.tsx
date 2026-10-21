"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import LogoutButton from "@/components/auth/LogoutButton";

const pages=[
["Ana Sayfa","/admin"],["Dashboard","/admin/dashboard"],["3PL Şirket Yapısı","/admin/wms-structure"],["B2B Ödeme Ayarları","/admin/b2b-settings"],
["Ürün Yönetimi","/admin/products"],["Ürün Veri Zenginleştirme","/admin/products/enrichment"],["Rakip Ürün İnceleme","/admin/products/enrichment/review"],["Barkod İnceleme","/admin/products/enrichment/barcode-review"],["Ürün Görsel Yönetimi","/admin/product-images"],["Rakip Fiyat Analizi","/admin/competitor-prices"],["Kategori Yönetimi","/admin/categories"],["Marka Yönetimi","/admin/brands"],
["Tedarikçi Yönetimi","/admin/suppliers"],["Müşteri Yönetimi","/admin/customers"],["Sipariş Yönetimi","/admin/orders"],["Satın Alma","/admin/purchase-orders"],
["Stok Hareketleri","/admin/stock/movements"],["Manuel Stok İşlemi","/admin/stock/manual"],["Lokasyon Bazlı Stok","/admin/stock/locations"],["Lokasyon Stok Haritası","/admin/stock/location-map"],["Planlı Sayımlar","/admin/inventory-counts"],["Sayım Raporları","/admin/inventory-counts/reports"],
["WMS Dashboard","/admin/wms-dashboard"],["THM Sorgu","/admin/manual-wave/product-query"],["Dağıtım Performansı","/admin/manual-wave/distribution-summary"],["Wave Dağılım Özeti","/admin/manual-wave/wave-summary"],["Wave Yönetimi","/admin/waves"],["Yeni Wave Oluştur","/admin/waves/new"],["Depo Yönetimi","/admin/warehouses"],["Excel Veri Aktarımı","/admin/data-imports"],["Kullanıcı Yönetimi","/admin/users"],["Rol ve Yetki Yönetimi","/admin/roles"]
] as const;

export default function AdminTopbar({initials,fullName,roleSummary}:{initials:string;fullName:string;roleSummary:string}){
 const router=useRouter(); const [q,setQ]=useState(""); const matches=q.trim()?pages.filter(([n])=>n.toLocaleLowerCase("tr").includes(q.toLocaleLowerCase("tr"))).slice(0,7):[];
 function submit(e:FormEvent){e.preventDefault(); if(matches[0]){router.push(matches[0][1]);setQ("")}}
 function toggle(){const el=document.getElementById("admin-sidebar");if(el)el.style.display=el.style.display==="none"?"":"none"}
 return <div className="hidden h-[62px] items-center gap-5 px-5 lg:flex">
  <button type="button" onClick={toggle} aria-label="Menüyü aç/kapat" className="flex h-10 w-10 items-center justify-center rounded-lg text-2xl font-black text-slate-900 hover:bg-slate-100">☰</button>
  <form onSubmit={submit} className="relative min-w-0 max-w-[520px] flex-1">
   <div className="flex h-10 items-center gap-3 rounded-xl bg-slate-100 px-4"><span className="text-slate-500">⌕</span><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Sayfa, işlem veya rapor ara..." className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-500"/></div>
   {matches.length>0&&<div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">{matches.map(([n,h])=><button type="button" key={h} onClick={()=>{router.push(h);setQ("")}} className="flex w-full items-center justify-between border-b border-slate-100 px-4 py-3 text-left text-sm font-semibold text-slate-700 last:border-0 hover:bg-blue-50"><span>{n}</span><span className="text-blue-600">›</span></button>)}</div>}
  </form>
  <div className="ml-auto flex shrink-0 items-center gap-4"><div className="h-8 w-px bg-slate-200"/><div className="flex h-10 w-10 items-center justify-center rounded-full bg-fuchsia-950 text-sm font-black text-white">{initials}</div><div className="max-w-[180px]"><p className="truncate text-sm font-bold text-slate-900" title={fullName}>{fullName}</p><p className="truncate text-xs text-slate-500" title={roleSummary}>{roleSummary}</p></div></div>
  <LogoutButton redirectTo="/login" label="Güvenli Çıkış" className="shrink-0 whitespace-nowrap rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:bg-slate-400" />
 </div>
}