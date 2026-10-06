"use client";

import { useActionState } from "react";
import { initialProfileState, updateCustomerProfileAction } from "@/app/account/profile/actions";

export default function CustomerProfileForm({contactName,phone}:{contactName:string;phone:string}){
 const [state,action,pending]=useActionState(updateCustomerProfileAction,initialProfileState);
 const field="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#EF4B23]";
 return <form action={action} className="space-y-4">
  <label className="block text-sm font-bold">Ad Soyad / Yetkili Kişi<input name="contactName" required maxLength={160} defaultValue={contactName} className={field}/></label>
  <label className="block text-sm font-bold">Telefon<input name="phone" required maxLength={30} defaultValue={phone} autoComplete="tel" className={field}/></label>
  {state.message?<div role="status" className={"rounded-xl p-3 text-sm font-bold "+(state.success?"bg-emerald-50 text-emerald-700":"bg-red-50 text-red-700")}>{state.message}</div>:null}
  <button disabled={pending} className="rounded-xl bg-[#EF4B23] px-6 py-3 font-black text-white disabled:bg-slate-300">{pending?"Kaydediliyor...":"Bilgileri Kaydet"}</button>
 </form>;
}
