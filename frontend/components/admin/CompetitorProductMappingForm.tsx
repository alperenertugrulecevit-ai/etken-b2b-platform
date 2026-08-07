"use client";

import {
  useActionState,
  useEffect,
  useRef,
} from "react";
import { useFormStatus } from "react-dom";

import {
  createCompetitorMapping,
} from "@/app/admin/competitor-prices/mappings/actions";

import {
  INITIAL_COMPETITOR_MAPPING_ACTION_STATE,
} from "@/app/admin/competitor-prices/mappings/types";

type ProductOption = {
  id: number;
  code: string;
  name: string;
  brand: string;
};

type CompetitorSiteOption = {
  id: number;
  code: string;
  name: string;
  baseUrl: string;
  defaultVatRate: number | null;
};

type CompetitorProductMappingFormProps = {
  products: ProductOption[];
  competitorSites: CompetitorSiteOption[];
};

function SubmitButton({
  disabled,
}: {
  disabled: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={
        disabled ||
        pending
      }
      className="rounded-xl bg-blue-900 px-6 py-3 font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
    >
      {pending
        ? "Eşleştiriliyor..."
        : "Rakip Ürünü Eşleştir"}
    </button>
  );
}

export default function CompetitorProductMappingForm({
  products,
  competitorSites,
}: CompetitorProductMappingFormProps) {
  const formRef =
    useRef<HTMLFormElement>(null);

  const [state, formAction] =
    useActionState(
      createCompetitorMapping,
      INITIAL_COMPETITOR_MAPPING_ACTION_STATE,
    );

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state.status]);

  const formDisabled =
    products.length === 0 ||
    competitorSites.length === 0;

  return (
    <form
      ref={formRef}
      action={formAction}
      className="rounded-2xl bg-white p-6 shadow"
    >
      <div>
        <h2 className="text-2xl font-black text-slate-900">
          Yeni Ürün Eşleştirmesi
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Etken ürününü rakip sitedeki
          karşılık gelen ürün sayfasıyla
          bağlayın.
        </p>
      </div>

      <div className="mt-6 grid gap-5">
        <label className="space-y-2">
          <span className="text-sm font-bold text-slate-700">
            Etken Ürünü
          </span>

          <select
            name="productId"
            required
            defaultValue=""
            disabled={products.length === 0}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-700 disabled:bg-slate-100"
          >
            <option value="" disabled>
              Ürün seçin
            </option>

            {products.map(
              (product) => (
                <option
                  key={product.id}
                  value={product.id}
                >
                  {product.code} —{" "}
                  {product.brand} —{" "}
                  {product.name}
                </option>
              ),
            )}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-bold text-slate-700">
            Rakip Site
          </span>

          <select
            name="competitorSiteId"
            required
            defaultValue=""
            disabled={
              competitorSites.length === 0
            }
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-700 disabled:bg-slate-100"
          >
            <option value="" disabled>
              Rakip site seçin
            </option>

            {competitorSites.map(
              (site) => (
                <option
                  key={site.id}
                  value={site.id}
                >
                  {site.name} —{" "}
                  {site.baseUrl}
                </option>
              ),
            )}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-bold text-slate-700">
            Rakip Ürün Bağlantısı
          </span>

          <input
            name="productUrl"
            type="url"
            required
            maxLength={2000}
            placeholder="https://www.ofix.com/urun/..."
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-700"
          />

          <span className="block text-xs text-slate-500">
            Bağlantının alan adı seçilen
            rakip siteyle aynı olmalıdır.
          </span>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-bold text-slate-700">
            Rakip Ürün Adı
          </span>

          <input
            name="competitorName"
            maxLength={300}
            placeholder="Örnek: Navigator Universal A3 Fotokopi Kağıdı"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-700"
          />
        </label>

        <div className="grid gap-5 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-bold text-slate-700">
              Rakip Ürün Kodu
            </span>

            <input
              name="competitorSku"
              maxLength={100}
              placeholder="Varsa rakip SKU"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-700"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-bold text-slate-700">
              Ürüne Özel KDV
            </span>

            <input
              name="vatRate"
              type="number"
              min={0}
              max={100}
              step={1}
              placeholder="Boşsa site KDV oranı"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-700"
            />
          </label>
        </div>
      </div>

      {formDisabled && (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
          Eşleştirme yapabilmek için en
          az bir Etken ürünü ve aktif bir
          rakip site bulunmalıdır.
        </div>
      )}

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
        <SubmitButton
          disabled={formDisabled}
        />
      </div>
    </form>
  );
}