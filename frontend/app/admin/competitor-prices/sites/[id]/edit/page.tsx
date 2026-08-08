import {
  CompetitorSourceType,
} from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { B2B_CONSTANTS } from "@/modules/b2b/constants/b2b.constants";

import {
  updateCompetitorSite,
} from "./actions";

type CompetitorSiteEditPageProps = {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    status?: string;
    message?: string;
  }>;
};

export default async function CompetitorSiteEditPage({
  params,
  searchParams,
}: CompetitorSiteEditPageProps) {
  const resolvedParams =
    await params;

  const resolvedSearchParams =
    await searchParams;

  const siteId = Number(
    resolvedParams.id,
  );

  if (
    !Number.isInteger(siteId) ||
    siteId <= 0
  ) {
    notFound();
  }

  const site =
    await prisma.competitorSite.findFirst({
      where: {
        id: siteId,

        tenantId:
          B2B_CONSTANTS.TENANT_ID,

        companyId:
          B2B_CONSTANTS.COMPANY_ID,
      },
    });

  if (!site) {
    notFound();
  }

  const message =
    resolvedSearchParams.message?.trim();

  const status =
    resolvedSearchParams.status;

  return (
    <section className="p-10">
      <Link
        href="/admin/competitor-prices/sites"
        className="font-bold text-blue-900 hover:underline"
      >
        ← Rakip Sitelere Dön
      </Link>

      <div className="mt-6">
        <h1 className="text-4xl font-black text-slate-900">
          Rakip Siteyi Düzenle
        </h1>

        <p className="mt-2 text-slate-600">
          {site.name} için fiyat ve ürün
          arama ayarlarını yönetin.
        </p>
      </div>

      {message && (
        <div
          className={`mt-6 rounded-xl border p-4 font-semibold ${
            status === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message}
        </div>
      )}

      <form
        action={updateCompetitorSite}
        className="mt-8 max-w-5xl rounded-2xl bg-white p-8 shadow"
      >
        <input
          type="hidden"
          name="siteId"
          value={site.id}
        />

        <div className="grid gap-6 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-bold text-slate-700">
              Site Adı
            </span>

            <input
              name="name"
              required
              maxLength={100}
              defaultValue={site.name}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-700"
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
              defaultValue={site.code}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 uppercase outline-none focus:border-blue-700"
            />
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-bold text-slate-700">
              Ana Site Adresi
            </span>

            <input
              name="baseUrl"
              type="url"
              required
              defaultValue={site.baseUrl}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-700"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-bold text-slate-700">
              Kaynak Tipi
            </span>

            <select
              name="sourceType"
              defaultValue={
                site.sourceType
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-700"
            >
              {Object.values(
                CompetitorSourceType,
              ).map((sourceType) => (
                <option
                  key={sourceType}
                  value={sourceType}
                >
                  {sourceType}
                </option>
              ))}
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
              defaultValue={
                site.defaultVatRate ??
                ""
              }
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-700"
            />
          </label>

          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 md:col-span-2">
            <label className="flex items-center gap-3">
              <input
                name="searchEnabled"
                type="checkbox"
                defaultChecked={
                  site.searchEnabled
                }
                className="h-5 w-5 rounded border-slate-300"
              />

              <span className="font-black text-blue-950">
                Otomatik ürün aramasını
                etkinleştir
              </span>
            </label>
          </div>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-bold text-slate-700">
              Arama URL Şablonu
            </span>

            <input
              name="searchUrlTemplate"
              maxLength={2000}
              defaultValue={
                site.searchUrlTemplate ??
                ""
              }
              placeholder="https://site.com/arama?q={query}"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-700"
            />

            <span className="block text-xs text-slate-500">
              Arama metninin yerinde{" "}
              {"{query}"} kullanılmalıdır.
            </span>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-bold text-slate-700">
              Ürün Bağlantı Deseni
            </span>

            <input
              name="productUrlPattern"
              maxLength={200}
              defaultValue={
                site.productUrlPattern ??
                ""
              }
              placeholder="-p- veya /urun/"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-700"
            />
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
              defaultValue={
                site.searchResultLimit
              }
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-700"
            />
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-bold text-slate-700">
              Notlar
            </span>

            <textarea
              name="notes"
              rows={4}
              maxLength={1000}
              defaultValue={
                site.notes ?? ""
              }
              className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-700"
            />
          </label>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="submit"
            className="rounded-xl bg-blue-900 px-6 py-3 font-bold text-white hover:bg-blue-800"
          >
            Ayarları Kaydet
          </button>

          <Link
            href="/admin/competitor-prices/sites"
            className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-bold text-slate-700 hover:bg-slate-50"
          >
            İptal
          </Link>
        </div>
      </form>
    </section>
  );
}