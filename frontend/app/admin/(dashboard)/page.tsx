import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getVisibleAdminMenuGroups } from "@/components/layout/admin-menu";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

const moduleStyles: Record<string, { description: string; tone: string; icon: string }> = {
 "Genel Yönetim": { description: "Merkezi yönetim ve şirket ayarları", tone: "bg-blue-50 text-blue-600", icon: "chart" },
 "Ürün Yönetimi": { description: "Ürün, kategori ve veri yönetimi", tone: "bg-emerald-50 text-emerald-600", icon: "box" },
 "Ticari Yönetim": { description: "Tedarikçi, müşteri ve sipariş", tone: "bg-orange-50 text-orange-600", icon: "users" },
 "Stok Yönetimi": { description: "Stok hareketleri ve sayım işlemleri", tone: "bg-violet-50 text-violet-600", icon: "stock" },
 "Handling Unit": { description: "Koli, palet ve adresleme yönetimi", tone: "bg-rose-50 text-rose-500", icon: "link" },
 "WMS Operasyonları": { description: "Wave ve depo operasyon yönetimi", tone: "bg-blue-50 text-blue-600", icon: "wave" },
 "E-Ticaret Yönetimi": { description: "Sipariş, ödeme, kargo ve iade işlemleri", tone: "bg-fuchsia-50 text-fuchsia-600", icon: "cart" },
 "Sevkiyat Planlama": { description: "Sevkiyat, rota, araç ve sevke hazır THM yönetimi", tone: "bg-sky-50 text-sky-600", icon: "shipping" },
 "Depo Yönetimi": { description: "Depo ve lokasyon yapısı", tone: "bg-cyan-50 text-cyan-600", icon: "warehouse" },
 "Sistem Yönetimi": { description: "Veri, kullanıcı ve yetkilendirme", tone: "bg-slate-100 text-slate-800", icon: "gear" },
};

function Icon({name}:{name:string}){const common="h-6 w-6"; if(name==="cart")return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3h2l3 12h10l3-9H6"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></svg>; if(name==="users")return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a5 5 0 0 1 10 0v2M16 5a3 3 0 0 1 0 6M16 14a5 5 0 0 1 5 5v1"/></svg>;if(name==="box")return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m4 7 8-4 8 4-8 4-8-4Z"/><path d="M4 7v10l8 4 8-4V7M12 11v10"/></svg>;if(name==="shipping")return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h11v10H3z"/><path d="M14 9h4l3 3v4h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></svg>;if(name==="terminal")return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M9 6h6M10 18h4"/></svg>;return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 16v-5M12 16V7M17 16v-3"/></svg>}

export default async function AdminHome(){
 const profile = await AuthorizationService.requireAdminPortalAccess();
 const groups = getVisibleAdminMenuGroups(profile);
 const [products,customers,orders,stock,recent]=await Promise.all([
  prisma.product.count({where:{isActive:true}}),prisma.customer.count({where:{isActive:true}}),
  prisma.order.count({where:{status:{in:["APPROVED","PREPARING","PICKING","PACKING","READY_TO_SHIP"]}}}),
  prisma.product.aggregate({_sum:{stock:true}}),
  prisma.wmsOperationLog.findMany({take:4,orderBy:{createdAt:"desc"},select:{id:true,operationType:true,description:true,operatorName:true,isSuccessful:true,createdAt:true}})
 ]);
 const fmt=(n:number)=>n.toLocaleString("tr-TR");
 return <section className="p-4 sm:p-5 lg:p-6">
  <section className="relative min-h-[215px] overflow-hidden rounded-2xl bg-[#08223f] shadow-sm">
   <img src="/admin-wms-hero-terminal.jpg" alt="" className="absolute inset-0 h-full w-full object-cover object-right opacity-90" />
   <div className="absolute inset-0 bg-gradient-to-r from-[#071f3b] via-[#0b3157]/95 to-[#0b3157]/10"/>
   <div className="relative z-10 max-w-2xl p-8 text-white"><p className="text-sm font-black tracking-[.25em]">ETKEN OFİS</p><h1 className="mt-3 text-3xl font-black sm:text-4xl">Yönetim ve WMS Merkezi</h1><p className="mt-4 max-w-lg text-base font-medium text-slate-100">Depo, ürün, sipariş ve iş ortakları yönetimi için merkezi kontrol paneli.</p></div>
  </section>

  <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
   ["box","Toplam Ürün",fmt(products),"bg-blue-50 text-blue-600"],["chart","Aktif Sipariş",fmt(orders),"bg-emerald-50 text-emerald-600"],["users","Aktif Müşteri",fmt(customers),"bg-orange-50 text-orange-600"],["stock","Depo Stok",fmt(stock._sum.stock??0),"bg-violet-50 text-violet-600"]
  ].map(([i,l,v,t])=><article key={l} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><span className={`flex h-14 w-14 items-center justify-center rounded-2xl ${t}`}><Icon name={i}/></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-500">{l}</p><p className="text-2xl font-black text-[#071426]">{v}</p></div><span className="text-2xl text-blue-500">›</span></article>)}</div>

  <div className="mt-7"><h2 className="text-2xl font-black text-[#071426]">Yönetim Modülleri</h2><p className="mt-1 text-sm text-slate-500">İlgili karta tıklayın, açılan listeden yapmak istediğiniz işlemi seçin.</p></div>
  <div className="mt-4 grid items-start gap-4 md:grid-cols-2 xl:grid-cols-4">
   {groups.map(group => {
    const style = moduleStyles[group.title];
    return <details key={group.title} className="group rounded-2xl border border-slate-200 bg-white shadow-sm transition open:border-blue-300 open:shadow-md hover:border-blue-200">
     <summary className="flex min-h-[170px] cursor-pointer list-none items-center gap-4 rounded-2xl p-6 outline-none focus-visible:ring-2 focus-visible:ring-blue-600 [&::-webkit-details-marker]:hidden">
      <div className="min-w-0 flex-1">
       <span aria-hidden="true" className={`flex h-14 w-14 items-center justify-center rounded-2xl ${style?.tone ?? "bg-blue-50 text-blue-600"}`}><Icon name={style?.icon ?? "chart"}/></span>
       <h3 className="mt-4 text-lg font-black text-[#071426]">{group.title}</h3>
       <p className="mt-1 text-sm leading-5 text-slate-500">{style?.description}</p>
      </div>
      <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-2xl text-blue-600 transition group-open:rotate-90 group-hover:bg-blue-600 group-hover:text-white">›</span>
     </summary>
     <nav aria-label={`${group.title} alt menüleri`} className="border-t border-slate-100 px-3 py-2">
      <ul>{group.items.map(item => <li key={item.href}>
       <Link href={item.href} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-600">
        <span aria-hidden="true">{item.icon}</span><span className="min-w-0 flex-1">{item.label}</span><span aria-hidden="true" className="text-blue-500">›</span>
       </Link>
      </li>)}</ul>
     </nav>
    </details>;
   })}
  </div>
 </section>
}