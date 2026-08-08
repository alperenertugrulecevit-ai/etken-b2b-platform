import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { B2B_CONSTANTS } from "@/modules/b2b/constants/b2b.constants";
import { CompetitorProductSearchService } from "@/modules/competitor-prices/competitor-product-search.service";

import type {
  CompetitorProductSearchConfidence,
} from "@/modules/competitor-prices/competitor-product-search.types";

type CompetitorProductSearchPageProps = {
  searchParams: Promise<{
    productId?: string;
    competitorSiteId?: string;
  }>;
};

function parseOptionalPositiveInteger(
  value: string | undefined,
): number | null {
  if (!value) {
    return null;
  }

  const parsedValue =
    Number(value);

  if (
    !Number.isInteger(parsedValue) ||
    parsedValue <= 0
  ) {
    return null;
  }

  return parsedValue;
}

function scoreClass(
  score: number,
): string {
  if (score >= 85) {
    return "bg-green-100 text-green-700";
  }

  if (score >= 65) {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-slate-100 text-slate-700";
}

function confidenceClass(
  confidence: CompetitorProductSearchConfidence,
): string {
  if (confidence === "HIGH") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (confidence === "REVIEW") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-red-200 bg-red-50 text-red-700";
}

function confidenceLabel(
  confidence: CompetitorProductSearchConfidence,
): string {
  if (confidence === "HIGH") {
    return "Yüksek Güven";
  }

  if (confidence === "REVIEW") {
    return "İnceleme Gerekli";
  }

  return "Reddedildi";
}

function confidenceCardClass(
  confidence: CompetitorProductSearchConfidence,
): string {
  if (confidence === "HIGH") {
    return "border-emerald-200";
  }

  if (confidence === "REVIEW") {
    return "border-amber-200";
  }

  return "border-red-200 opacity-80";
}

export default async function CompetitorProductSearchPage({
  searchParams,
}: CompetitorProductSearchPageProps) {
  const resolvedSearchParams =
    await searchParams;

  const selectedProductId =
    parseOptionalPositiveInteger(
      resolvedSearchParams.productId,
    );

  const selectedCompetitorSiteId =
    parseOptionalPositiveInteger(
      resolvedSearchParams.competitorSiteId,
    );

  const [
    products,
    competitorSites,
  ] =
    await Promise.all([
      prisma.product.findMany({
        where: {
          tenantId:
            B2B_CONSTANTS.TENANT_ID,

          companyId:
            B2B_CONSTANTS.COMPANY_ID,

          isActive: true,
        },

        select: {
          id: true,
          code: true,
          barcode: true,
          name: true,
          brand: true,
        },

        orderBy: {
          code: "asc",
        },
      }),

      prisma.competitorSite.findMany({
        where: {
          tenantId:
            B2B_CONSTANTS.TENANT_ID,

          companyId:
            B2B_CONSTANTS.COMPANY_ID,

          isActive: true,
          searchEnabled: true,

          searchUrlTemplate: {
            not: null,
          },
        },

        select: {
          id: true,
          code: true,
          name: true,
          baseUrl: true,
          searchUrlTemplate: true,
          productUrlPattern: true,
          searchResultLimit: true,
        },

        orderBy: {
          name: "asc",
        },
      }),
    ]);

  const selectedProduct =
    selectedProductId
      ? products.find(
          (product) =>
            product.id ===
            selectedProductId,
        ) ?? null
      : null;

  const selectedCompetitorSite =
    selectedCompetitorSiteId
      ? competitorSites.find(
          (site) =>
            site.id ===
            selectedCompetitorSiteId,
        ) ?? null
      : null;

  const searchResult =
    selectedProduct &&
    selectedCompetitorSite &&
    selectedCompetitorSite.searchUrlTemplate
      ? await CompetitorProductSearchService.search(
          {
            productCode:
              selectedProduct.code,

            productName:
              selectedProduct.name,

            productBrand:
              selectedProduct.brand,

            productBarcode:
              selectedProduct.barcode,

            competitorBaseUrl:
              selectedCompetitorSite.baseUrl,

            searchUrlTemplate:
              selectedCompetitorSite.searchUrlTemplate,

            productUrlPattern:
              selectedCompetitorSite.productUrlPattern,

            resultLimit:
              selectedCompetitorSite.searchResultLimit,
          },
        )
      : null;

  const highConfidenceCount =
    searchResult?.candidates.filter(
      (candidate) =>
        candidate.confidence ===
        "HIGH",
    ).length ?? 0;

  const reviewCount =
    searchResult?.candidates.filter(
      (candidate) =>
        candidate.confidence ===
        "REVIEW",
    ).length ?? 0;

  const rejectedCount =
    searchResult?.candidates.filter(
      (candidate) =>
        candidate.confidence ===
        "REJECTED",
    ).length ?? 0;

  return (
    <section className="p-4 sm:p-6 lg:p-10">
      <Link
        href="/admin/competitor-prices/mappings"
        className="font-bold text-blue-900 hover:underline"
      >
        ← Ürün Eşleştirmelerine Dön
      </Link>

      <div className="mt-6">
        <h1 className="text-3xl font-black text-slate-900 sm:text-4xl">
          Rakip Ürün Adaylarını Bul
        </h1>

        <p className="mt-2 max-w-3xl text-slate-600">
          Etken ürününü ve rakip siteyi
          seçin. Sistem aday ürünleri bulur,
          ürün adı ve varyant bilgilerini
          karşılaştırır ve güven seviyesine
          göre sınıflandırır.
        </p>
      </div>

      <form
        method="get"
        className="mt-8 rounded-2xl bg-white p-6 shadow"
      >
        <div className="grid gap-5 lg:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-bold text-slate-700">
              Etken Ürünü
            </span>

            <select
              name="productId"
              required
              defaultValue={
                selectedProductId ??
                ""
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-700"
            >
              <option
                value=""
                disabled
              >
                Ürün seçin
              </option>

              {products.map(
                (product) => (
                  <option
                    key={
                      product.id
                    }
                    value={
                      product.id
                    }
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
              defaultValue={
                selectedCompetitorSiteId ??
                ""
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-700"
            >
              <option
                value=""
                disabled
              >
                Rakip site seçin
              </option>

              {competitorSites.map(
                (site) => (
                  <option
                    key={
                      site.id
                    }
                    value={
                      site.id
                    }
                  >
                    {site.name}
                  </option>
                ),
              )}
            </select>
          </label>
        </div>

        {competitorSites.length ===
          0 && (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
            Otomatik araması
            etkinleştirilmiş aktif bir
            rakip site bulunmuyor.
          </div>
        )}

        <button
          type="submit"
          disabled={
            competitorSites.length ===
            0
          }
          className="mt-6 rounded-xl bg-blue-900 px-6 py-3 font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          Adayları Bul
        </button>
      </form>

      {searchResult && (
        <section className="mt-8">
          <div
            className={`rounded-xl border p-4 font-semibold ${
              searchResult.success
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {searchResult.message}
          </div>

          {searchResult.searchUrl && (
            <a
              href={
                searchResult.searchUrl
              }
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-block font-bold text-blue-700 hover:underline"
            >
              Rakip arama sayfasını aç
            </a>
          )}

          {searchResult.candidates
            .length > 0 && (
            <>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                    Yüksek Güven
                  </p>

                  <p className="mt-1 text-3xl font-black text-emerald-800">
                    {
                      highConfidenceCount
                    }
                  </p>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
                    İnceleme Gerekli
                  </p>

                  <p className="mt-1 text-3xl font-black text-amber-800">
                    {
                      reviewCount
                    }
                  </p>
                </div>

                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-red-700">
                    Reddedildi
                  </p>

                  <p className="mt-1 text-3xl font-black text-red-800">
                    {
                      rejectedCount
                    }
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-5">
                {searchResult.candidates.map(
                  (
                    candidate,
                    index,
                  ) => (
                    <article
                      key={
                        candidate.productUrl
                      }
                      className={`rounded-2xl border bg-white p-6 shadow ${confidenceCardClass(
                        candidate.confidence,
                      )}`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-5">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-bold text-slate-500">
                              Aday{" "}
                              {index +
                                1}
                            </p>

                            <span
                              className={`rounded-full border px-3 py-1 text-xs font-black ${confidenceClass(
                                candidate.confidence,
                              )}`}
                            >
                              {confidenceLabel(
                                candidate.confidence,
                              )}
                            </span>

                            {candidate.variantMatched && (
                              <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                                Varyant Uyumlu
                              </span>
                            )}
                          </div>

                          <h2 className="mt-2 text-xl font-black text-slate-900">
                            {
                              candidate.title
                            }
                          </h2>

                          <p className="mt-3 break-all text-sm text-slate-500">
                            {
                              candidate.productUrl
                            }
                          </p>

                          {candidate
                            .matchedTerms
                            .length >
                            0 && (
                            <p className="mt-3 text-sm text-slate-600">
                              Eşleşen
                              ifadeler:{" "}
                              {candidate.matchedTerms.join(
                                ", ",
                              )}
                            </p>
                          )}

                          {candidate
                            .rejectionReasons
                            .length >
                            0 && (
                            <div
                              className={`mt-4 rounded-xl border p-4 text-sm ${
                                candidate.confidence ===
                                "REJECTED"
                                  ? "border-red-200 bg-red-50 text-red-700"
                                  : "border-amber-200 bg-amber-50 text-amber-800"
                              }`}
                            >
                              <p className="font-bold">
                                {candidate.confidence ===
                                "REJECTED"
                                  ? "Otomatik eşleştirme reddedildi:"
                                  : "Kontrol edilmesi gereken noktalar:"}
                              </p>

                              <ul className="mt-2 space-y-1">
                                {candidate.rejectionReasons.map(
                                  (
                                    reason,
                                  ) => (
                                    <li
                                      key={
                                        reason
                                      }
                                    >
                                      •{" "}
                                      {
                                        reason
                                      }
                                    </li>
                                  ),
                                )}
                              </ul>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <span
                            className={`rounded-full px-4 py-2 text-lg font-black ${scoreClass(
                              candidate.score,
                            )}`}
                          >
                            %
                            {
                              candidate.score
                            }
                          </span>

                          <span className="text-xs font-semibold text-slate-400">
                            Güven puanı
                          </span>
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap gap-3">
                        <a
                          href={
                            candidate.productUrl
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg bg-slate-800 px-4 py-2 font-bold text-white hover:bg-slate-700"
                        >
                          Rakipte Aç
                        </a>

                        {candidate.confidence !==
                          "REJECTED" && (
                          <Link
                            href={{
                              pathname:
                                "/admin/competitor-prices/mappings",

                              query: {
                                productId:
                                  selectedProduct?.id,

                                competitorSiteId:
                                  selectedCompetitorSite?.id,

                                productUrl:
                                  candidate.productUrl,

                                competitorName:
                                  candidate.title,
                              },
                            }}
                            className={`rounded-lg px-4 py-2 font-bold text-white ${
                              candidate.confidence ===
                              "HIGH"
                                ? "bg-emerald-700 hover:bg-emerald-800"
                                : "bg-amber-600 hover:bg-amber-700"
                            }`}
                          >
                            {candidate.confidence ===
                            "HIGH"
                              ? "Bu Adayı Kullan"
                              : "İnceleyip Kullan"}
                          </Link>
                        )}

                        {candidate.confidence ===
                          "REJECTED" && (
                          <span className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700">
                            Bu aday
                            kullanılamaz
                          </span>
                        )}
                      </div>
                    </article>
                  ),
                )}
              </div>
            </>
          )}
        </section>
      )}
    </section>
  );
}