import Link from "next/link";
import { prisma } from "@/lib/prisma";

const groups=[
 {title:"Genel Yönetim",sub:"Merkezi yönetim ve şirket ayarları",tone:"from-blue-600 to-blue-500",icon:"chart",links:[["Dashboard","/admin/dashboard"],["3PL Şirket Yapısı","/admin/wms-structure"],["B2B Ödeme Ayarları","/admin/b2b-settings"]]},
 {title:"Ürün Yönetimi",sub:"Ürün, kategori ve veri yönetimi",tone:"from-emerald-600 to-emerald-500",icon:"box",links:[["Ürün Yönetimi","/admin/products"],["Ürün Veri Zenginleştirme","/admin/products/enrichment"],["Rakip Ürün İnceleme","/admin/products/enrichment/review"],["Barkod İnceleme","/admin/products/enrichment/barcode-review"],["Ürün Görsel Yönetimi","/admin/product-images"],["Rakip Fiyat Analizi","/admin/competitor-prices"],["Kategori Yönetimi","/admin/categories"],["Marka Yönetimi","/admin/brands"]]},
 {title:"Ticari Yönetim",sub:"Tedarikçi, müşteri ve sipariş",tone:"from-orange-500 to-amber-500",icon:"users",links:[["Tedarikçi Yönetimi","/admin/suppliers"],["Müşteri Yönetimi","/admin/customers"],["Sipariş Yönetimi","/admin/orders"],["Satın Alma","/admin/purchase-orders"]]},
 {title:"Stok Yönetimi",sub:"Stok hareketleri ve sayım işlemleri",tone:"from-violet-600 to-purple-500",icon:"stock",links:[["Barkod Yazıcıları","/admin/barcode-printers"],["Stok Hareketleri","/admin/stock/movements"],["Manuel Stok İşlemi","/admin/stock/manual"],["Lokasyon Bazlı Stok","/admin/stock/locations"],["Lokasyon Stok Haritası","/admin/stock/location-map"],["Planlı Sayımlar","/admin/inventory-counts"],["Sayım Raporları","/admin/inventory-counts/reports"]]},
 {title:"Handling Unit",sub:"Koli, palet ve adresleme yönetimi",tone:"from-rose-600 to-red-500",icon:"link",links:[["Koli / Palet Yönetimi","/admin/handling-units"],["Koli / Palet Transferi","/admin/handling-units/transfers"],["Toplu Birleştirme","/admin/handling-units/merge"],["Koli-Palet Bağlama","/admin/handling-units/pallet-link"],["Tekli Adresleme","/admin/handling-units/addressing"],["Toplu Adresleme","/admin/handling-units/addressing/bulk"],["Adres Kaldırma","/admin/handling-units/unaddressing"]]},
 {title:"WMS Operasyonları",sub:"Wave ve depo operasyon yönetimi",tone:"from-cyan-600 to-sky-500",icon:"wave",links:[["WMS Dashboard","/admin/wms-dashboard"],["THM Sorgu","/admin/manual-wave/product-query"],["Dağıtım Performansı","/admin/manual-wave/distribution-summary"],["Wave Dağılım Özeti","/admin/manual-wave/wave-summary"],["Wave Yönetimi","/admin/waves"],["Yeni Wave Oluştur","/admin/waves/new"]]},
 {title:"Depo Yönetimi",sub:"Depo ve lokasyon yapısı",tone:"from-indigo-600 to-blue-500",icon:"warehouse",links:[["Depo Yönetimi","/admin/warehouses"]]},
 {title:"Sistem Yönetimi",sub:"Veri, kullanıcı ve yetkilendirme",tone:"from-amber-500 to-yellow-500",icon:"gear",links:[["Excel Veri Aktarımı","/admin/data-imports"],["Kullanıcı Yönetimi","/admin/users"],["Rol ve Yetki Yönetimi","/admin/roles"]]},
 {title:"RF Operasyon Merkezi",sub:"El terminali operasyon ekranı",tone:"from-fuchsia-700 to-violet-600",icon:"terminal",links:[["RF Operasyon Merkezi","/rf"]]},
] as const;

function Icon({name}:{name:string}){const common="h-6 w-6"; if(name==="users")return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a5 5 0 0 1 10 0v2M16 5a3 3 0 0 1 0 6M16 14a5 5 0 0 1 5 5v1"/></svg>;if(name==="box")return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m4 7 8-4 8 4-8 4-8-4Z"/><path d="M4 7v10l8 4 8-4V7M12 11v10"/></svg>;if(name==="terminal")return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M9 6h6M10 18h4"/></svg>;return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 16v-5M12 16V7M17 16v-3"/></svg>}

export default async function AdminHome(){
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

  <div className="mt-7"><h2 className="text-2xl font-black text-[#071426]">Yönetim Modülleri</h2><p className="mt-1 text-sm text-slate-500">İlgili modüle tıklayarak işlemlerinize başlayın.</p></div>
  <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">{groups.filter(g=>g.title!=="RF Operasyon Merkezi").map(g=>{
   const href=g.links[0][1];
   const tones:Record<string,string>={"Genel Yönetim":"bg-blue-50 text-blue-600","Ürün Yönetimi":"bg-emerald-50 text-emerald-600","Ticari Yönetim":"bg-orange-50 text-orange-600","Stok Yönetimi":"bg-violet-50 text-violet-600","Handling Unit":"bg-rose-50 text-rose-500","WMS Operasyonları":"bg-blue-50 text-blue-600","Depo Yönetimi":"bg-cyan-50 text-cyan-600","Sistem Yönetimi":"bg-slate-100 text-slate-800"};
   return <Link key={g.title} href={href} className="group flex min-h-[170px] items-center gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"><div className="min-w-0 flex-1"><span className={`flex h-14 w-14 items-center justify-center rounded-2xl ${tones[g.title]??"bg-blue-50 text-blue-600"}`}><Icon name={g.icon}/></span><h3 className="mt-4 text-lg font-black text-[#071426]">{g.title}</h3><p className="mt-1 text-sm leading-5 text-slate-500">{g.sub}</p></div><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-2xl text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white">›</span></Link>
  })}</div>
 </section>
}