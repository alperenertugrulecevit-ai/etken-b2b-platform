import Link from "next/link";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
import type { AuthorizationProfile } from "@/modules/authorization/types/authorization.types";

type MenuItem={href:string;icon:string;label:string;permissionCodes?:string[]};
type MenuGroup={title:string;icon:string;items:MenuItem[]};

const groups:MenuGroup[]=[
 {title:"Genel Yönetim",icon:"📊",items:[
  {href:"/admin",icon:"📊",label:"Dashboard",permissionCodes:["DASHBOARD_VIEW"]},
  {href:"/admin/wms-structure",icon:"🏢",label:"3PL Şirket Yapısı",permissionCodes:["WMS_COMPANY_VIEW","WMS_COMPANY_MANAGE","WMS_ACCESS_MANAGE"]},
  {href:"/admin/b2b-settings",icon:"🏦",label:"B2B Ödeme Ayarları",permissionCodes:["ORDER_MANAGE"]},
 ]},
 {title:"Ürün Yönetimi",icon:"📦",items:[
  {href:"/admin/products",icon:"📦",label:"Ürün Yönetimi",permissionCodes:["INVENTORY_VIEW","INVENTORY_ADJUST"]},
  {href:"/admin/products/enrichment",icon:"✨",label:"Ürün Veri Zenginleştirme",permissionCodes:["INVENTORY_VIEW","INVENTORY_ADJUST"]},
  {href:"/admin/products/enrichment/review",icon:"🔎",label:"Rakip Ürün İnceleme",permissionCodes:["INVENTORY_VIEW","INVENTORY_ADJUST"]},
  {href:"/admin/products/enrichment/barcode-review",icon:"🏷️",label:"Barkod İnceleme",permissionCodes:["INVENTORY_VIEW","INVENTORY_ADJUST"]},
  {href:"/admin/product-images",icon:"🖼️",label:"Ürün Görsel Yönetimi",permissionCodes:["INVENTORY_VIEW","INVENTORY_ADJUST"]},
  {href:"/admin/competitor-prices",icon:"📈",label:"Rakip Fiyat Analizi",permissionCodes:["INVENTORY_VIEW","INVENTORY_ADJUST"]},
  {href:"/admin/categories",icon:"📁",label:"Kategori Yönetimi",permissionCodes:["INVENTORY_VIEW","INVENTORY_ADJUST"]},
  {href:"/admin/brands",icon:"🏷️",label:"Marka Yönetimi",permissionCodes:["INVENTORY_VIEW","INVENTORY_ADJUST"]},
 ]},
 {title:"Ticari Yönetim",icon:"👥",items:[
  {href:"/admin/suppliers",icon:"🏭",label:"Tedarikçi Yönetimi",permissionCodes:["RECEIVING_VIEW","RECEIVING_EXECUTE"]},
  {href:"/admin/customers",icon:"👥",label:"Müşteri Yönetimi",permissionCodes:["CUSTOMER_VIEW","CUSTOMER_MANAGE"]},
  {href:"/admin/orders",icon:"🛒",label:"Sipariş Yönetimi",permissionCodes:["ORDER_VIEW","ORDER_MANAGE"]},
  {href:"/admin/purchase-orders",icon:"🧾",label:"Satın Alma",permissionCodes:["RECEIVING_VIEW","RECEIVING_EXECUTE"]},
 ]},
 {title:"Stok Yönetimi",icon:"🗄️",items:[
  {href:"/admin/barcode-printers",icon:"🖨️",label:"Barkod Yazıcıları",permissionCodes:["HANDLING_UNIT_MANAGE"]},
  {href:"/admin/stock/movements",icon:"📋",label:"Stok Hareketleri",permissionCodes:["INVENTORY_VIEW"]},
  {href:"/admin/stock/manual",icon:"📥",label:"Manuel Stok İşlemi",permissionCodes:["INVENTORY_ADJUST"]},
  {href:"/admin/stock/locations",icon:"📍",label:"Lokasyon Bazlı Stok",permissionCodes:["INVENTORY_VIEW"]},
  {href:"/admin/stock/location-map",icon:"🗺️",label:"Lokasyon Stok Haritası",permissionCodes:["INVENTORY_VIEW","LOCATION_VIEW"]},
  {href:"/admin/inventory-counts",icon:"🧮",label:"Planlı Sayımlar",permissionCodes:["INVENTORY_COUNT_VIEW","INVENTORY_COUNT_MANAGE","INVENTORY_COUNT_APPROVE"]},
  {href:"/admin/inventory-counts/reports",icon:"📊",label:"Sayım Raporları",permissionCodes:["INVENTORY_COUNT_VIEW","INVENTORY_COUNT_APPROVE"]},
 ]},
 {title:"Handling Unit",icon:"🔗",items:[
  {href:"/admin/handling-units",icon:"🧱",label:"Koli / Palet Yönetimi",permissionCodes:["HANDLING_UNIT_VIEW","HANDLING_UNIT_MANAGE"]},
  {href:"/admin/handling-units/transfers",icon:"🔄",label:"Koli / Palet Transferi",permissionCodes:["TRANSFER_EXECUTE"]},
  {href:"/admin/handling-units/merge",icon:"🔗",label:"Toplu Birleştirme",permissionCodes:["HANDLING_UNIT_MANAGE"]},
  {href:"/admin/handling-units/pallet-link",icon:"🔗",label:"Koli-Palet Bağlama",permissionCodes:["HANDLING_UNIT_MANAGE"]},
  {href:"/admin/handling-units/addressing",icon:"📌",label:"Tekli Adresleme",permissionCodes:["PUTAWAY_EXECUTE","HANDLING_UNIT_MANAGE"]},
  {href:"/admin/handling-units/addressing/bulk",icon:"📌",label:"Toplu Adresleme",permissionCodes:["PUTAWAY_EXECUTE","HANDLING_UNIT_MANAGE"]},
  {href:"/admin/handling-units/unaddressing",icon:"📤",label:"Adres Kaldırma",permissionCodes:["LOCATION_MANAGE","HANDLING_UNIT_MANAGE"]},
 ]},
 {title:"WMS Operasyonları",icon:"〽️",items:[
  {href:"/admin/wms-dashboard",icon:"📊",label:"WMS Dashboard",permissionCodes:["DASHBOARD_VIEW"]},
  {href:"/admin/manual-wave/product-query",icon:"🔎",label:"THM Sorgu",permissionCodes:["MANUAL_WAVE_REPORT_VIEW"]},
  {href:"/admin/manual-wave/distribution-summary",icon:"📊",label:"Dağıtım Performansı",permissionCodes:["MANUAL_WAVE_REPORT_VIEW"]},
  {href:"/admin/manual-wave/wave-summary",icon:"🌊",label:"Wave Dağılım Özeti",permissionCodes:["MANUAL_WAVE_REPORT_VIEW"]},
  {href:"/admin/waves",icon:"🌊",label:"Wave Yönetimi",permissionCodes:["WAVE_VIEW","WAVE_MANAGE"]},
  {href:"/admin/waves/new",icon:"➕",label:"Yeni Wave Oluştur",permissionCodes:["WAVE_MANAGE"]},
 ]},
 {title:"Depo Yönetimi",icon:"🏬",items:[
  {href:"/admin/warehouses",icon:"🏬",label:"Depo Yönetimi",permissionCodes:["WAREHOUSE_VIEW","WAREHOUSE_MANAGE"]},
 ]},
 {title:"Sistem Yönetimi",icon:"⚙️",items:[
  {href:"/admin/data-imports",icon:"📥",label:"Excel Veri Aktarımı",permissionCodes:["DATA_IMPORT_VIEW","DATA_IMPORT_MANAGE"]},
  {href:"/admin/users",icon:"👤",label:"Kullanıcı Yönetimi",permissionCodes:["USER_VIEW","USER_MANAGE"]},
  {href:"/admin/roles",icon:"🛡️",label:"Rol ve Yetki Yönetimi",permissionCodes:["ROLE_VIEW","ROLE_MANAGE"]},
 ]},
];

function canShow(p:AuthorizationProfile,i:MenuItem){return !i.permissionCodes?.length||AuthorizationService.hasAnyPermission(p,i.permissionCodes)}
function SidebarContent({profile}:{profile:AuthorizationProfile}){
 const visible=groups.map(g=>({...g,items:g.items.filter(i=>canShow(profile,i))})).filter(g=>g.items.length);
 const canUseRf=Boolean(profile.isRfUser&&profile.employee?.isActive&&profile.employee.canUseRf);
 return <div className="flex min-h-[calc(100vh-3rem)] flex-col">
  <Link href="/admin" className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
   <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-slate-900 bg-white text-2xl font-black italic text-slate-900"><span>E</span><span className="-ml-2 mt-3 text-red-500">➤</span></div>
   <div className="leading-none"><div className="text-xl font-black tracking-tight text-slate-950">ETKEN <span className="text-red-500">OFİS</span></div><div className="mt-1 text-[9px] font-bold tracking-[.24em] text-slate-500">KURUMSAL TEDARİK</div></div>
  </Link>
  <nav className="mt-5 space-y-1">
   <Link href="/admin" className="flex items-center gap-3 rounded-xl bg-blue-700 px-4 py-3 font-bold text-white"><span>🏠</span>Ana Sayfa</Link>
   {visible.map(g=><details key={g.title} className="group rounded-xl">
    <summary className="flex cursor-pointer list-none items-center gap-3 rounded-xl px-4 py-3 font-bold text-slate-200 transition hover:bg-slate-800 [&::-webkit-details-marker]:hidden">
     <span className="text-lg">{g.icon}</span><span className="flex-1">{g.title}</span><span className="text-slate-500 transition group-open:rotate-180">⌄</span>
    </summary>
    <div className="ml-5 border-l border-slate-700 py-1 pl-3">{g.items.map(i=><Link key={i.href} href={i.href} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white"><span>{i.icon}</span><span>{i.label}</span></Link>)}</div>
   </details>)}
  </nav>
  <div className="mt-auto space-y-2 border-t border-slate-700 pt-5">
   {canUseRf&&<Link href="/rf" className="flex items-center gap-3 rounded-xl bg-blue-700 px-4 py-3 font-bold text-white hover:bg-blue-600"><span>📱</span>RF Operasyon Merkezi</Link>}
   <Link href="/" className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-300 hover:bg-slate-800 hover:text-white"><span>🏠</span>Siteye Dön</Link>
  </div>
 </div>
}
export default async function AdminSidebar(){const profile=await AuthorizationService.requireAdminPortalAccess();return <>
 <aside className="hidden min-h-screen w-72 shrink-0 bg-slate-950 p-4 text-white lg:block"><div className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto pr-1"><SidebarContent profile={profile}/></div></aside>
 <details className="border-b border-slate-800 bg-slate-950 text-white lg:hidden"><summary className="flex cursor-pointer list-none items-center justify-between px-4 py-4 font-bold"><span>ETKEN OFİS · Yönetim</span><span className="rounded-lg bg-slate-800 px-3 py-2">☰ Menü</span></summary><div className="max-h-[80vh] overflow-y-auto border-t border-slate-800 p-4"><SidebarContent profile={profile}/></div></details>
 </>}