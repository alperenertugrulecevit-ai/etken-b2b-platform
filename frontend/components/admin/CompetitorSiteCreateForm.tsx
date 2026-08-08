"use client";

import {
  useActionState,
  useEffect,
  useRef,
} from "react";
import { useFormStatus } from "react-dom";

import {
  createCompetitorSite,
} from "@/app/admin/competitor-prices/sites/actions";

import {
  INITIAL_COMPETITOR_SITE_ACTION_STATE,
} from "@/app/admin/competitor-prices/sites/types";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-blue-900 px-6 py-3 font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
    >
      {pending
        ? "Kaydediliyor..."
        : "Rakip Siteyi Kaydet"}
    </button>
  );
}

export default function CompetitorSiteCreateForm() {
  const formRef =
    useRef<HTMLFormElement>(null);

  const [state, formAction] =
    useActionState(
      createCompetitorSite,
      INITIAL_COMPETITOR_SITE_ACTION_STATE,
    );

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state.status]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="rounded-2xl bg-white p-6 shadow"
    >
      <div>
        <h2 className="text-2xl font-black text-slate-900">
          Yeni Rakip Site
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Fiyat alınacak web sitesi,
          API veya Excel kaynağını
          tanımlayın.
        </p>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-bold text-slate-700">
            Site Adı
          </span>

          <input
            name="name"
            required
            maxLength={100}
            placeholder="Örnek: Ofix"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-700"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-bold text-slate-700">
            Site Kodu
          </span>

          <input
            name="code"
            required
            maxLength={30}
            placeholder="Örnek: OFIX"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 uppercase outline-none transition focus:border-blue-700"
          />

          <span className="block text-xs text-slate-500">
            Büyük harfe çevrilir ve
            boşluklar alt çizgi olur.
          </span>
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-bold text-slate-700">
            Ana Site Adresi
          </span>

          <input
            name="baseUrl"
            type="url"
            required
            placeholder="https://www.ofix.com"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-700"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-bold text-slate-700">
            Kaynak Tipi
          </span>

          <select
            name="sourceType"
            defaultValue="MANUAL"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-700"
          >
            <option value="MANUAL">
              Manuel
            </option>

            <option value="HTML">
              Web Sayfası / HTML
            </option>

            <option value="API">
              API
            </option>

            <option value="EXCEL">
              Excel Dosyası
            </option>
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-bold text-slate-700">
            Varsayılan KDV Oranı
          </span>

          <input
            name="defaultVatRate"
            type="number"
            min={0}
            max={100}
            step={1}
            placeholder="Örnek: 20"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-700"
          />

          <span className="block text-xs text-slate-500">
            Ürün bazında farklı KDV varsa
            eşleştirmede değiştirilebilir.
          </span>
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-bold text-slate-700">
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 md:col-span-2">
  <label className="flex items-center gap-3">
    <input
      name="searchEnabled"
      type="checkbox"
      className="h-5 w-5 rounded border-slate-300"
    />

    <span className="font-black text-blue-950">
      Otomatik ürün aramasını etkinleştir
    </span>
  </label>

  <p className="mt-2 text-sm text-blue-800">
    Etken ürün adı ve markası kullanılarak
    rakip sitede aday ürün bağlantıları
    aranır.
  </p>
</div>

<label className="space-y-2 md:col-span-2">
  <span className="text-sm font-bold text-slate-700">
    Arama URL Şablonu
  </span>

  <input
    name="searchUrlTemplate"
    maxLength={2000}
    placeholder="https://site.com/arama?q={query}"
    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-700"
  />

  <span className="block text-xs text-slate-500">
    Ürün arama metninin yazılacağı yerde
    mutlaka {"{query}"} bulunmalıdır.
  </span>
</label>

<div className="grid gap-5 md:col-span-2 md:grid-cols-2">
  <label className="space-y-2">
    <span className="text-sm font-bold text-slate-700">
      Ürün Bağlantı Deseni
    </span>

    <input
      name="productUrlPattern"
      maxLength={200}
      placeholder="Örnek: -p- veya /urun/"
      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-700"
    />

    <span className="block text-xs text-slate-500">
      Arama sonuçlarında yalnızca gerçek
      ürün sayfalarını seçmek için kullanılır.
    </span>
  </label>

  <label className="space-y-2">
    <span className="text-sm font-bold text-slate-700">
      Aday Sonuç Limiti
    </span>

    <input
      name="searchResultLimit"
      type="number"
      min={1}
      max={50}
      step={1}
      defaultValue={10}
      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-700"
    />
  </label>
</div>
            Notlar
          </span>

          <textarea
            name="notes"
            rows={3}
            maxLength={1000}
            placeholder="Erişim yöntemi, kullanım şartları veya özel notlar..."
            className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-700"
          />
        </label>
      </div>

      {state.message && (
        <div
          className={`mt-5 rounded-xl border p-4 text-sm font-semibold ${
            state.status === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {state.message}
        </div>
      )}

      <div className="mt-6">
        <SubmitButton />
      </div>
    </form>
  );
}