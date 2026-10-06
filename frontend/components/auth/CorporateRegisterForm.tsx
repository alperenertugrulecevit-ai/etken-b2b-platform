"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerCorporateCustomerAction, type RegisterResult } from "@/app/register/actions";

const initialState: RegisterResult = { success:false, message:"" };
const field="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#EF4B23]";

export default function CorporateRegisterForm() {
  const [state, action, pending] = useActionState(registerCorporateCustomerAction, initialState);

  if (state.success) {
    return <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-bold text-emerald-800">
      {state.message}
      <Link href="/customer-login" className="mt-4 block rounded-xl bg-[#202B38] px-5 py-3 text-center text-white">Giriş Yap</Link>
    </div>;
  }

  return <form action={action} className="space-y-4">
    <label className="block text-sm font-bold">Firma Unvanı<input name="companyName" required maxLength={180} autoComplete="organization" className={field}/></label>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-bold">Vergi Dairesi<input name="taxOffice" required maxLength={120} className={field}/></label>
      <label className="text-sm font-bold">VKN / TCKN<input name="taxNumber" required inputMode="numeric" maxLength={11} className={field}/></label>
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-bold">Yetkili Adı<input name="firstName" required maxLength={80} autoComplete="given-name" className={field}/></label>
      <label className="text-sm font-bold">Yetkili Soyadı<input name="lastName" required maxLength={80} autoComplete="family-name" className={field}/></label>
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-bold">E-posta<input name="email" type="email" required maxLength={160} autoComplete="email" className={field}/></label>
      <label className="text-sm font-bold">Telefon<input name="phone" type="tel" required maxLength={30} autoComplete="tel" className={field}/></label>
    </div>
    <label className="block text-sm font-bold">Firma / Fatura Adresi<textarea name="address" required maxLength={500} rows={3} autoComplete="street-address" className={field}/></label>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-bold">İl<input name="city" required maxLength={80} autoComplete="address-level1" className={field}/></label>
      <label className="text-sm font-bold">İlçe<input name="district" required maxLength={80} autoComplete="address-level2" className={field}/></label>
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-bold">Şifre<input name="password" type="password" required minLength={8} autoComplete="new-password" className={field}/></label>
      <label className="text-sm font-bold">Şifre Tekrar<input name="passwordConfirm" type="password" required minLength={8} autoComplete="new-password" className={field}/></label>
    </div>
    {state.message?<div role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{state.message}</div>:null}
    <button disabled={pending} className="w-full rounded-xl bg-[#EF4B23] py-4 font-black text-white disabled:bg-slate-300">{pending?"Kurumsal hesap oluşturuluyor...":"Kurumsal Üyeliği Oluştur"}</button>
  </form>;
}
