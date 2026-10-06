import { CustomerType, UserType } from "@prisma/client";
import { redirect } from "next/navigation";
import { getCities, getDistrictsOfEachCity } from "turkey-neighbourhoods";
import Header from "@/components/layout/Header";
import CityDistrictSelect from "@/components/admin/CityDistrictSelect";
import { prisma } from "@/lib/prisma";
import { SessionService } from "@/modules/auth/services/session.service";
import { createCustomerAddress, setDefaultCustomerAddress } from "./actions";

export default async function CustomerAddressesPage(){
 const user=await SessionService.getCurrentUser();
 if(!user||user.userType!==UserType.CUSTOMER||!user.customerId||!user.customer?.isActive) redirect("/customer-login");
 const isCorporate=user.customer.customerType===CustomerType.CORPORATE;
 const addresses=await prisma.customerAddress.findMany({where:{customerId:user.customerId,isActive:true},orderBy:[{isDefault:"desc"},{createdAt:"desc"}]});
 const cities=getCities(), districtsByCityCode=getDistrictsOfEachCity();
 return <><Header/><main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#EF4B23]">{isCorporate?"Kurumsal Hesap":"Bireysel Hesap"}</p><h1 className="mt-2 text-3xl font-black">Adreslerim</h1><p className="mt-2 text-slate-500">{isCorporate?"Firma merkez/fatura adresinizi görüntüleyin ve teslimat adreslerinizi yönetin.":"Teslimat adreslerinizi yönetin."}</p>
  <div className="mt-6 grid gap-6 lg:grid-cols-[380px_1fr]">
   <form action={createCustomerAddress} className="h-fit rounded-2xl bg-white p-5 shadow-sm">
    <h2 className="text-xl font-black">Yeni Adres</h2>
    <div className="mt-4 space-y-4">
     <label className="block text-sm font-bold">Adres Başlığı<input name="title" required maxLength={80} placeholder="Ev, İş..." className="mt-2 w-full rounded-xl border p-3"/></label>
     <label className="block text-sm font-bold">Açık Adres<textarea name="address" required maxLength={500} rows={3} className="mt-2 w-full rounded-xl border p-3"/></label>
     <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1"><CityDistrictSelect cities={cities} districtsByCityCode={districtsByCityCode}/></div>
     <label className="block text-sm font-bold">Posta Kodu<input name="postalCode" maxLength={20} className="mt-2 w-full rounded-xl border p-3"/></label>
    </div>
    <button className="mt-5 w-full rounded-xl bg-[#EF4B23] py-3 font-black text-white">Adresi Kaydet</button>
   </form>
   <section className="space-y-3">{addresses.length?addresses.map(a=><article key={a.id} className="rounded-2xl bg-white p-5 shadow-sm">
    <div className="flex items-center gap-2"><h2 className="text-lg font-black">{a.title}</h2>{a.isDefault?<span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">Varsayılan</span>:null}{a.addressType==="BOTH"?<span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">Fatura / Teslimat</span>:null}</div>
    <p className="mt-3 text-slate-700">{a.address}</p><p className="mt-1 font-bold">{a.district} / {a.city}</p>{a.postalCode?<p className="mt-1 text-sm text-slate-500">Posta Kodu: {a.postalCode}</p>:null}
    {!a.isDefault?<form action={setDefaultCustomerAddress} className="mt-4"><input type="hidden" name="addressId" value={a.id}/><button className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50">Varsayılan Yap</button></form>:null}
   </article>):<div className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow-sm">Henüz kayıtlı adresiniz yok.</div>}</section>
  </div>
 </main></>;
}
