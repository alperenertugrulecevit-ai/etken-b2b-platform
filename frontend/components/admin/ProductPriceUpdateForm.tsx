"use client";

import {
  useActionState,
  useEffect,
  useRef,
} from "react";

import {
  useFormStatus,
} from "react-dom";

import {
  updateProductPricesFromExcel,
} from "@/app/admin/products/price-update/actions";

import type {
  ProductPriceUpdateState,
} from "@/app/admin/products/price-update/actions";

const INITIAL_PRODUCT_PRICE_UPDATE_STATE: ProductPriceUpdateState = {
  status: "idle",
  message: "",
  totalRows: 0,
  updatedCount: 0,
  unchangedCount: 0,
  skippedCount: 0,
  errors: [],
};

function SubmitButton() {
  const { pending } =
    useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-amber-600 px-6 py-3 font-bold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-slate-400"
    >
      {pending
        ? "Fiyatlar güncelleniyor..."
        : "Fiyatları Güncelle"}
    </button>
  );
}

export default function ProductPriceUpdateForm() {
  const formRef =
    useRef<HTMLFormElement>(
      null,
    );

  const [
    state,
    formAction,
  ] =
    useActionState(
      updateProductPricesFromExcel,
      INITIAL_PRODUCT_PRICE_UPDATE_STATE,
    );

  useEffect(() => {
    if (
      state.status ===
      "success"
    ) {
      formRef.current?.reset();
    }
  }, [state.status]);

  return (
    <div className="space-y-8">
      <form
        ref={formRef}
        action={formAction}
        className="rounded-2xl bg-white p-6 shadow"
      >
        <label
          htmlFor="priceFile"
          className="block text-lg font-bold text-slate-900"
        >
          Fiyat güncelleme
          Excel dosyası
        </label>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Excel dosyasında en az
          <strong>
            {" "}
            ETKEN SKU{" "}
          </strong>
          ve
          <strong>
            {" "}
            Satış Fiyatı{" "}
          </strong>
          sütunları bulunmalıdır.
          Ürün Yönetimi
          ekranındaki
          <strong>
            {" "}
            Excel’e Aktar{" "}
          </strong>
          dosyasını doğrudan
          kullanabilirsiniz.
        </p>

        <input
          id="priceFile"
          name="priceFile"
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          required
          className="mt-5 block w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-sm"
        />

        <div className="mt-6">
          <SubmitButton />
        </div>
      </form>

      {state.message && (
        <section
          className={`rounded-2xl border p-6 ${
            state.status ===
            "success"
              ? "border-green-200 bg-green-50"
              : "border-red-200 bg-red-50"
          }`}
        >
          <h2
            className={`text-xl font-bold ${
              state.status ===
              "success"
                ? "text-green-800"
                : "text-red-800"
            }`}
          >
            {state.message}
          </h2>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-xl bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">
                Toplam satır
              </p>

              <p className="mt-1 text-3xl font-bold">
                {state.totalRows}
              </p>
            </article>

            <article className="rounded-xl bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">
                Güncellenen
              </p>

              <p className="mt-1 text-3xl font-bold text-green-700">
                {state.updatedCount}
              </p>
            </article>

            <article className="rounded-xl bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">
                Değişmeyen
              </p>

              <p className="mt-1 text-3xl font-bold text-blue-700">
                {state.unchangedCount}
              </p>
            </article>

            <article className="rounded-xl bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">
                Atlanan
              </p>

              <p className="mt-1 text-3xl font-bold text-red-700">
                {state.skippedCount}
              </p>
            </article>
          </div>

          {state.errors.length >
            0 && (
            <div className="mt-8 overflow-x-auto rounded-xl bg-white shadow-sm">
              <table className="w-full min-w-[700px] text-left">
                <thead className="bg-red-700 text-white">
                  <tr>
                    <th className="p-3">
                      Excel satırı
                    </th>

                    <th className="p-3">
                      ETKEN SKU
                    </th>

                    <th className="p-3">
                      Hata
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {state.errors.map(
                    (
                      error,
                      index,
                    ) => (
                      <tr
                        key={`${error.rowNumber}-${error.code}-${index}`}
                        className="border-b"
                      >
                        <td className="p-3 font-semibold">
                          {
                            error.rowNumber
                          }
                        </td>

                        <td className="p-3 font-mono">
                          {error.code ||
                            "-"}
                        </td>

                        <td className="p-3 text-red-700">
                          {
                            error.message
                          }
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}