"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  createCustomerUserAction,
  type CustomerUserActionState,
} from "@/app/admin/customers/[id]/users/actions";

const INITIAL_STATE: CustomerUserActionState = { success: false, message: "" };

const CUSTOMER_ROLES = {
  CUSTOMER_ADMIN: "CUSTOMER_ADMIN",
  BUYER: "BUYER",
  ADDRESS_USER: "ADDRESS_USER",
} as const;
type CustomerRole = typeof CUSTOMER_ROLES[keyof typeof CUSTOMER_ROLES];

type AddressOption = { id: number; addressCode: string; title: string; city: string; district: string };
type Props = { customerId: number; addresses: AddressOption[] };

export default function CustomerUserCreateForm({ customerId, addresses }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [role, setRole] = useState<CustomerRole>(CUSTOMER_ROLES.BUYER);
  const [state, formAction, pending] = useActionState(
    createCustomerUserAction.bind(null, customerId), INITIAL_STATE
  );
  useEffect(() => { if (state.success) { formRef.current?.reset(); setRole(CUSTOMER_ROLES.BUYER); } }, [state]);

  return (
    <form ref={formRef} action={formAction} className="rounded-2xl bg-white p-6 shadow">
      <h2 className="text-xl font-bold text-slate-900">Yeni Kurumsal Kullanıcı</h2>
      <p className="mt-2 text-sm text-slate-500">Rol ve teslimat adresi erişimlerini belirleyin. Kullanıcı ilk girişinde geçici şifresini değiştirecektir.</p>
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <label className="text-sm font-semibold text-slate-700">Ad Soyad
          <input name="fullName" required className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" />
        </label>
        <label className="text-sm font-semibold text-slate-700">Kullanıcı Adı
          <input name="username" required autoCapitalize="none" spellCheck={false} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" />
        </label>
        <label className="text-sm font-semibold text-slate-700">E-posta
          <input name="email" type="email" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" />
        </label>
        <label className="text-sm font-semibold text-slate-700">Geçici Şifre
          <input name="password" type="text" required minLength={8} autoComplete="new-password" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" />
        </label>
        <label className="text-sm font-semibold text-slate-700 md:col-span-2">Kullanıcı Rolü
          <select name="customerRole" value={role} onChange={(event) => setRole(event.target.value as CustomerRole)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3">
            <option value={CUSTOMER_ROLES.CUSTOMER_ADMIN}>Müşteri Yetkilisi — dashboard ve tüm siparişler</option>
            <option value={CUSTOMER_ROLES.BUYER}>Satın Almacı — yalnızca kendi siparişleri</option>
            <option value={CUSTOMER_ROLES.ADDRESS_USER}>Adres Kullanıcısı — atanmış adreslerin siparişleri</option>
          </select>
        </label>
      </div>
      {role === CUSTOMER_ROLES.ADDRESS_USER ? (
        <fieldset className="mt-5 rounded-xl border border-slate-200 p-4">
          <legend className="px-2 font-bold text-slate-800">Yetkili Teslimat Adresleri</legend>
          {addresses.length ? <div className="grid gap-3 md:grid-cols-2">
            {addresses.map((address) => (
              <label key={address.id} className="flex items-start gap-3 rounded-lg bg-slate-50 p-3">
                <input type="checkbox" name="addressIds" value={address.id} className="mt-1" />
                <span><strong>{address.addressCode} — {address.title}</strong><small className="block text-slate-500">{address.city} / {address.district}</small></span>
              </label>
            ))}
          </div> : <p className="text-sm text-orange-700">Önce müşteriye aktif bir adres ekleyin.</p>}
        </fieldset>
      ) : null}
      {state.message ? <div className={(state.success ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700") + " mt-5 rounded-xl border px-4 py-3 text-sm font-semibold"}>{state.message}</div> : null}
      <button type="submit" disabled={pending} className="mt-6 w-full rounded-xl bg-[#EF4B23] px-5 py-3 font-bold text-white hover:bg-[#D83D18] disabled:bg-slate-400">{pending ? "Kaydediliyor..." : "Kurumsal Kullanıcı Oluştur"}</button>
    </form>
  );
}
