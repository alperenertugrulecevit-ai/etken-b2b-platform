"use client";

import { useActionState } from "react";

import {
  saveB2BCompanyProfileAction,
  type B2BCompanyProfileActionState,
} from "@/app/admin/b2b-settings/actions";

type Profile = {
  brandName: string;
  legalName: string;
  taxOffice: string | null;
  taxNumber: string | null;
  mersisNumber: string | null;
  tradeRegistryNumber: string | null;
  authorizedPerson: string | null;
  phone: string | null;
  supportEmail: string | null;
  email: string | null;
  kepAddress: string | null;
  website: string | null;
  addressLine: string | null;
  city: string | null;
  district: string | null;
  postalCode: string | null;
  country: string;
  workingHours: string | null;
  logoUrl: string | null;
};

const initialState: B2BCompanyProfileActionState = {
  success: false,
  message: "",
};

const inputClass =
  "mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100";

export default function B2BCompanyProfileForm({
  profile,
}: {
  profile: Profile;
}) {
  const [state, formAction, pending] = useActionState(
    saveB2BCompanyProfileAction,
    initialState,
  );

  return (
    <form action={formAction} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900">Şirket Bilgileri</h2>
          <p className="mt-1 text-sm text-slate-500">
            İletişim sayfası ve site alt bilgisinde gösterilecek resmî bilgileri yönetin.
          </p>
        </div>
        <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">
          Merkezi firma profili
        </span>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="text-sm font-semibold text-slate-700">
          Kısa şirket adı *
          <input name="brandName" required maxLength={100} defaultValue={profile.brandName} className={inputClass} />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Ticari unvan *
          <input name="legalName" required maxLength={200} defaultValue={profile.legalName} className={inputClass} />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Vergi dairesi
          <input name="taxOffice" maxLength={100} defaultValue={profile.taxOffice ?? ""} className={inputClass} />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Vergi numarası
          <input name="taxNumber" inputMode="numeric" maxLength={10} defaultValue={profile.taxNumber ?? ""} className={inputClass} />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          MERSİS numarası
          <input name="mersisNumber" inputMode="numeric" maxLength={16} defaultValue={profile.mersisNumber ?? ""} className={inputClass} />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Ticaret sicil numarası
          <input name="tradeRegistryNumber" maxLength={50} defaultValue={profile.tradeRegistryNumber ?? ""} className={inputClass} />
        </label>
        <label className="text-sm font-semibold text-slate-700 md:col-span-2">
          Yetkili kişi
          <input name="authorizedPerson" maxLength={120} defaultValue={profile.authorizedPerson ?? ""} className={inputClass} />
        </label>
      </div>

      <h3 className="mt-8 border-b border-slate-200 pb-2 text-base font-black text-slate-900">İletişim</h3>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="text-sm font-semibold text-slate-700">
          Telefon
          <input name="phone" type="tel" maxLength={30} defaultValue={profile.phone ?? ""} className={inputClass} />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Genel e-posta
          <input name="email" type="email" maxLength={160} defaultValue={profile.email ?? ""} className={inputClass} />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Destek e-postası
          <input name="supportEmail" type="email" maxLength={160} defaultValue={profile.supportEmail ?? ""} className={inputClass} />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          KEP adresi
          <input name="kepAddress" type="email" maxLength={160} defaultValue={profile.kepAddress ?? ""} className={inputClass} />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Web sitesi
          <input name="website" maxLength={200} placeholder="https://www.etkenofis.com" defaultValue={profile.website ?? ""} className={inputClass} />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Çalışma saatleri
          <input name="workingHours" maxLength={160} placeholder="Pazartesi-Cuma 09:00-18:00" defaultValue={profile.workingHours ?? ""} className={inputClass} />
        </label>
      </div>

      <h3 className="mt-8 border-b border-slate-200 pb-2 text-base font-black text-slate-900">Adres ve logo</h3>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="text-sm font-semibold text-slate-700 md:col-span-2">
          Açık adres
          <textarea name="addressLine" rows={3} maxLength={500} defaultValue={profile.addressLine ?? ""} className={inputClass} />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          İl
          <input name="city" maxLength={80} defaultValue={profile.city ?? ""} className={inputClass} />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          İlçe
          <input name="district" maxLength={80} defaultValue={profile.district ?? ""} className={inputClass} />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Posta kodu
          <input name="postalCode" maxLength={20} defaultValue={profile.postalCode ?? ""} className={inputClass} />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Ülke
          <input name="country" maxLength={80} defaultValue={profile.country || "Türkiye"} className={inputClass} />
        </label>
        <label className="text-sm font-semibold text-slate-700 md:col-span-2">
          Logo adresi
          <input name="logoUrl" maxLength={250} placeholder="/etken-ofis-logo.png" defaultValue={profile.logoUrl ?? ""} className={inputClass} />
          <span className="mt-1 block text-xs font-normal text-slate-500">
            Public klasöründeki logo için /etken-ofis-logo.png kullanabilirsiniz.
          </span>
        </label>
      </div>

      {state.message ? (
        <div className={
          "mt-5 rounded-xl border p-4 text-sm font-semibold " +
          (state.success
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-red-200 bg-red-50 text-red-700")
        }>
          {state.message}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-6 w-full rounded-xl bg-orange-500 px-5 py-3 font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Kaydediliyor..." : "Şirket Bilgilerini Kaydet"}
      </button>
    </form>
  );
}
