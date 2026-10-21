import Link from "next/link";
import { getVisibleAdminMenuGroups } from "./admin-menu";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
import type { AuthorizationProfile } from "@/modules/authorization/types/authorization.types";

function SidebarContent({profile}:{profile:AuthorizationProfile}){
 const visible=getVisibleAdminMenuGroups(profile);
 const canUseRf=Boolean(profile.isRfUser&&profile.employee?.isActive&&profile.employee.canUseRf);
 return <div className="flex min-h-[calc(100vh-3rem)] flex-col">
  <Link href="/admin" className="block rounded-xl bg-white p-2 shadow-sm"><img src="/etken-ofis-logo.svg" alt="Etken Ofis Kurumsal Tedarik" className="h-auto w-full" /></Link>
  <nav className="mt-3 space-y-1">
   <Link href="/admin" className="flex items-center gap-3 rounded-lg bg-[#0866e8] px-4 py-3 font-bold text-white shadow-lg shadow-blue-950/20"><span>🏠</span>Ana Sayfa</Link>
   {visible.map(g=><details key={g.title} className="group rounded-xl">
    <summary className="flex cursor-pointer list-none items-center gap-3 rounded-lg px-4 py-3 font-semibold text-slate-100 transition hover:bg-white/10 [&::-webkit-details-marker]:hidden">
     <span className="text-lg">{g.icon}</span><span className="flex-1">{g.title}</span><span className="text-slate-500 transition group-open:rotate-180">⌄</span>
    </summary>
    <div className="ml-5 border-l border-white/15 py-1 pl-3">{g.items.map(i=><Link key={i.href} href={i.href} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white"><span>{i.icon}</span><span>{i.label}</span></Link>)}</div>
   </details>)}
  </nav>
  <div className="mt-auto space-y-2 border-t border-white/20 pt-5">
   {canUseRf&&<Link href="/rf" className="flex items-center gap-3 rounded-lg bg-[#0866e8] px-4 py-4 font-bold text-white hover:bg-blue-600"><span>📱</span>RF Operasyon Merkezi</Link>}
   <Link href="/" className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-300 hover:bg-white/10 hover:text-white"><span>🏠</span>Siteye Dön</Link>
  </div>
 </div>
}
export default async function AdminSidebar(){const profile=await AuthorizationService.requireAdminPortalAccess();return <>
 <aside id="admin-sidebar" className="hidden h-screen w-[275px] shrink-0 bg-gradient-to-b from-[#0b2d50] via-[#123e68] to-[#082541] p-3 text-white lg:block"><div className="fixed inset-y-0 left-0 w-[275px] overflow-y-auto bg-gradient-to-b from-[#0b2d50] via-[#123e68] to-[#082541] p-3 pr-4 text-white"><SidebarContent profile={profile}/></div></aside>
 <details className="border-b border-slate-800 bg-slate-950 text-white lg:hidden"><summary className="flex cursor-pointer list-none items-center justify-between px-4 py-4 font-bold"><span>ETKEN OFİS · Yönetim</span><span className="rounded-lg bg-slate-800 px-3 py-2">☰ Menü</span></summary><div className="max-h-[80vh] overflow-y-auto border-t border-slate-800 p-4"><SidebarContent profile={profile}/></div></details>
 </>}