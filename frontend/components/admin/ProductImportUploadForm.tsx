"use client";

import {
  useActionState,
  useEffect,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  previewProductImportAction,
  type ProductImportActionState,
} from "@/app/admin/data-imports/actions";

const initialState:
  ProductImportActionState = {
  success: false,
  message: "",
  jobId: null,
  completed: false,
};


export default function ProductImportUploadForm() {
  const router = useRouter();

  const [
    state,
    formAction,
    isPending,
  ] = useActionState(
    previewProductImportAction,
    initialState
  );

  useEffect(() => {
    if (
      state.success &&
      state.jobId
    ) {
      router.push(
        `/admin/data-imports/${state.jobId}`
      );
    }
  }, [
    router,
    state.jobId,
    state.success,
  ]);

  return (
    <form
      action={formAction}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-950">
            Ürün Excel Aktarımı
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Şablonu indirip ürün
            satırlarını doldurun. Dosya
            doğrudan işlenmez; önce
            kontrol ekranı açılır.
          </p>
        </div>

        <a
          href="/admin/data-imports/templates/product"
          className="rounded-xl border border-blue-300 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800 transition hover:bg-blue-100"
        >
          Excel Şablonunu İndir
        </a>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-bold text-slate-700">
            Aktarım Yöntemi
          </span>

          <select
            name="mode"
            defaultValue="CREATE_ONLY"
            disabled={isPending}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900"
          >
            <option value="CREATE_ONLY">
              Yalnızca Yeni Ürünleri
              Ekle
            </option>

            <option value="UPSERT">
              Yeni Ekle / Mevcut Ürünü
              Güncelle
            </option>
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-bold text-slate-700">
            Excel Dosyası
          </span>

          <input
            name="file"
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            required
            disabled={isPending}
            className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
          />
        </label>
      </div>

      <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
        En fazla 5 MB ve 5.000 veri
        satırı kabul edilir. Ürün stok
        miktarı Excel’den
        değiştirilmez. Yeni ürünler
        sıfır stokla oluşturulur.
      </div>

      {state.message &&
      !state.success ? (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
        >
          {state.message}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="mt-6 w-full rounded-xl bg-blue-900 px-5 py-4 font-black text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {isPending
          ? "Excel Kontrol Ediliyor..."
          : "Excel Dosyasını Ön İzle"}
      </button>
    </form>
  );
}
