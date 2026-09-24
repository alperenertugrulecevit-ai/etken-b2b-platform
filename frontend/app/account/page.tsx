import { CustomerUserRole, UserType } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import Header from "@/components/layout/Header";
import { prisma } from "@/lib/prisma";
import { SessionService } from "@/modules/auth/services/session.service";
import { customerLogoutAction } from "./actions";

export const dynamic="force-dynamic";
export const revalidate=0;
export const metadata={title:"Kurumsal Hesabım | ETKEN Ofis"};

function MenuIcon({type}:{type:string}){
 const c="h-10 w-10";
 if(type==="dashboard") return <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 20V10M10 20V4M16 20v-7M22 20V7"/></svg>;
 if(type==="products") return <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m4 7 8-4 8 4-8 4-8-4Z"/><path d="M4 7v10l8 4 8-4V7M12 11v10"/></svg>;
 if(type==="cart") return <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 4h2l2 11h10l3-8H6"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></svg>;
 if(type==="orders") return <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M7 3h10l3 3v15H7z"/><path d="M17 3v4h4M10 12h7M10 16h7"/></svg>;
 return <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M19 13.5v-3l-2-.7-.7-1.7.9-1.9-2.1-2.1-1.9.9-1.7-.7L10.5 2h-3l-.7 2-1.7.7-1.9-.9-2.1 2.1.9 1.9-.7 1.7-2 .7v3l2 .7.7 1.7-.9 1.9 2.1 2.1 1.9-.9 1.7.7.7 2h3l.7-2 1.7-.7 1.9.9 2.1-2.1-.9-1.9.7-1.7z" transform="translate(1.5 0) scale(.88)"/></svg>
}

export default async function AccountPage(){
 const user=await SessionService.getCurrentUser();
 if(!user||user.userType!==UserType.CUSTOMER||!user.customer||!user.customer.isActive||!user.customerId) redirect("/customer-login");
 const customer=await prisma.customer.findUnique({where:{id:user.customerId},select:{companyName:true,customerCode:true}});
 if(!customer) redirect("/customer-login");
 const canViewDashboard=user.customerRole===CustomerUserRole.CUSTOMER_ADMIN;
 const menu=[
  ...(canViewDashboard?[{title:"Dashboard",desc:"Hesap özetinizi ve işlemlerinizi yönetin.",href:"/account/dashboard",type:"dashboard",tone:"text-blue-600 bg-blue-50"}]:[]),
  {title:"Ürünler",desc:"Kataloğu, fiyatları ve stokları inceleyin.",href:"/products",type:"products",tone:"text-orange-600 bg-orange-50"},
  {title:"Sepetim",desc:"Sepetinizdeki ürünleri tamamlayın.",href:"/cart",type:"cart",tone:"text-emerald-600 bg-emerald-50"},
  {title:"Siparişlerim",desc:"Geçmiş siparişlerinizi ve durumlarını görün.",href:"/account/orders",type:"orders",tone:"text-violet-600 bg-violet-50"},
  {title:"Şifrem",desc:"Hesap güvenliğiniz için şifrenizi değiştirin.",href:"/change-password?returnTo=%2Faccount",type:"password",tone:"text-slate-600 bg-slate-100"},
 ];
 return <><Header/><main className="mx-auto min-h-[calc(100vh-150px)] max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
  <section className="relative min-h-[280px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
   <img src="/account-hero-products.jpg" alt="" className="absolute inset-y-0 right-0 hidden h-full w-[58%] object-cover object-center md:block" />
   <div className="absolute inset-0 hidden bg-gradient-to-r from-white via-white/95 via-45% to-white/5 md:block" />
   <div className="relative z-10 max-w-[650px] p-7 sm:p-10">
    <p className="text-sm font-black uppercase tracking-wide text-[#ef4b23]">Kurumsal Hesabım</p>
    <h1 className="mt-2 text-3xl font-black text-[#071b3b] sm:text-5xl">${customer.companyName}</h1>
    <p className="mt-3 max-w-lg text-lg leading-7 text-slate-600">Ofis, temizlik ve endüstriyel ürünler için güvenilir tedarik çözümünüz.</p>
    <p className="mt-5 inline-flex rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">Müşteri Kodu&nbsp; <span className="text-slate-900">${customer.customerCode}</span></p>
   </div>
  </section>
  <div className="mt-6 flex items-end justify-between gap-4"><div><h2 className="text-3xl font-black text-[#071b3b]">Hesap Menüsü</h2><p className="mt-1 text-base text-slate-500">Yapmak istediğiniz işlemi seçin.</p></div>
   <form action={customerLogoutAction}><button type="submit" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 shadow-sm hover:border-red-200 hover:text-red-600">Güvenli Çıkış</button></form>
  </div>
  <section className={`mt-5 grid gap-4 sm:grid-cols-2 ${menu.length===5?"xl:grid-cols-5":"xl:grid-cols-4"}`}>
   {menu.map(item=><Link key={item.href} href={item.href} className="group flex min-h-[250px] flex-col rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
    <div className={`flex h-20 w-20 items-center justify-center rounded-2xl ${item.tone}`}><MenuIcon type={item.type}/></div>
    <h3 className="mt-6 text-2xl font-black text-[#071b3b]">{item.title}</h3>
    <p className="mt-2 text-base leading-6 text-slate-500">{item.desc}</p>
    <span className={`mt-auto flex h-11 w-14 items-center justify-center rounded-full text-2xl font-bold ${item.tone}`}>→</span>
   </Link>)}
  </section>
 </main></>
}