import Link from "next/link";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
const items=[
 {title:"THM Sorgula",desc:"THM içeriği, depo ve lokasyon",icon:"📦",href:"/rf/query/thm"},
 {title:"Ürün Sorgula",desc:"Ürünün lokasyon, THM ve miktar bilgisi",icon:"🔎",href:"/rf/query/product"},
 {title:"Adres Sorgula",desc:"Adresteki THM ve THM içi miktar",icon:"📍",href:"/rf/query/address"},
];
export default async function RFQueryMenu(){const p=await AuthorizationService.requireRfAccess("INVENTORY_VIEW"); void p; return <section>
 <div className="mb-4 flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-blue-700">RF Operasyon Merkezi</p><h1 className="mt-1 text-2xl font-black">Sorgulama İşlemleri</h1><p className="mt-1 text-sm text-slate-500">Sorgu türünü seçiniz</p></div><Link href="/rf" className="rounded-xl border bg-white px-4 py-3 font-bold">← Ana Menü</Link></div>
 <div className="grid gap-3">{items.map(i=><Link key={i.href} href={i.href} className="flex min-h-24 items-center gap-4 rounded-2xl border border-blue-200 bg-white p-4 shadow-sm active:scale-[0.99]"><span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-950 text-2xl text-white">{i.icon}</span><div className="min-w-0 flex-1"><h2 className="text-lg font-black">{i.title}</h2><p className="mt-1 text-sm text-slate-500">{i.desc}</p></div><span className="text-2xl font-black text-blue-900">›</span></Link>)}</div>
 </section>}