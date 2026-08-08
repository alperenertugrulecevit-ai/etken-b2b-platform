import Link from "next/link";



import { prisma } from "@/lib/prisma";
import { B2B_CONSTANTS } from "@/modules/b2b/constants/b2b.constants";

import CompetitorProductMappingForm from "@/components/admin/CompetitorProductMappingForm";
import DeleteCompetitorMappingButton from "@/components/admin/DeleteCompetitorMappingButton";

import {
  checkCompetitorPrice,
  toggleCompetitorMappingStatus,
} from "./actions";

type CompetitorMappingsPageProps = {
  searchParams: Promise<{
    priceCheck?: string;
    message?: string;
  }>;
};

function formatCurrency(
  value: number | null,
): string {
  if (value === null) {
    return "-";
  }

  return `${value.toLocaleString(
    "tr-TR",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  )} ₺`;
}

function formatDate(
  value: Date | null,
): string {
  if (!value) {
    return "Kontrol edilmedi";
  }

  return value.toLocaleString(
    "tr-TR",
    {
      dateStyle: "short",
      timeStyle: "short",
      timeZone:
        "Europe/Istanbul",
    },
  );
}

function getStockLabel(
  value:
    | "UNKNOWN"
    | "IN_STOCK"
    | "OUT_OF_STOCK"
    | "PREORDER",
): string {
  switch (value) {
    case "IN_STOCK":
      return "Stokta";

    case "OUT_OF_STOCK":
      return "Stokta Yok";

    case "PREORDER":
      return "Ön Sipariş";

    default:
      return "Bilinmiyor";
  }
}

export default async function CompetitorMappingsPage({
  searchParams,
}: CompetitorMappingsPageProps) {
  const resolvedSearchParams =
    await searchParams;

  const [
    products,
    competitorSites,
    mappings,
  ] = await Promise.all([
    prisma.product.findMany({
      where: {
        tenantId:
          B2B_CONSTANTS.TENANT_ID,

        companyId:
          B2B_CONSTANTS.COMPANY_ID,
      },

      select: {
        id: true,
        code: true,
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
      },

      select: {
        id: true,
        code: true,
        name: true,
        baseUrl: true,
        defaultVatRate: true,
      },

      orderBy: {
        name: "asc",
      },
    }),

    prisma.competitorProduct.findMany({
      where: {
        tenantId:
          B2B_CONSTANTS.TENANT_ID,

        companyId:
          B2B_CONSTANTS.COMPANY_ID,
      },

      include: {
        product: {
          select: {
            code: true,
            name: true,
            brand: true,
          },
        },

        competitorSite: {
          select: {
            name: true,
            code: true,
          },
        },
      },

      orderBy: [
        {
          isActive: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
    }),
  ]);

  const priceCheckMessage =
    resolvedSearchParams.message?.trim();

  const priceCheckStatus =
    resolvedSearchParams.priceCheck;

  return (
    <section className="p-10">
      <Link
        href="/admin/competitor-prices"
        className="font-bold text-blue-900 hover:underline"
      >
        ← Rakip Fiyat Analizine Dön
      </Link>

      <div className="mt-6">
        <h1 className="text-4xl font-black text-slate-900">
          Rakip Ürün Eşleştirmeleri
        </h1>

        <p className="mt-2 max-w-3xl text-slate-600">
          Etken ürünlerini rakip
          sitelerdeki gerçek ürün
          sayfalarıyla eşleştirin ve
          fiyatlarını kontrol edin.
        </p>
      </div>

      <div className="mt-5">
  <Link
    href="/admin/competitor-prices/mappings/search"
    className="inline-flex items-center gap-2 rounded-xl bg-violet-700 px-5 py-3 font-bold text-white transition hover:bg-violet-800"
  >
    <span aria-hidden="true">🔍</span>
    Rakip Ürün Adaylarını Bul
  </Link>
</div>

      {priceCheckMessage && (
        <div
          className={`mt-6 rounded-xl border p-4 font-semibold ${
            priceCheckStatus ===
            "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {priceCheckMessage}
        </div>
      )}

      <div className="mt-10 grid gap-8 xl:grid-cols-[460px_minmax(0,1fr)]">
        <CompetitorProductMappingForm
          products={products}
          competitorSites={
            competitorSites
          }
        />

        <div className="overflow-hidden rounded-2xl bg-white shadow">
          <div className="border-b p-6">
            <h2 className="text-2xl font-black text-slate-900">
              Tanımlı Eşleştirmeler
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Toplam{" "}
              {mappings.length.toLocaleString(
                "tr-TR",
              )}{" "}
              rakip ürün bağlantısı
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1650px] text-left text-sm">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="p-4">
                    Etken SKU
                  </th>

                  <th className="p-4">
                    Etken Ürünü
                  </th>

                  <th className="p-4">
                    Rakip
                  </th>

                  <th className="p-4">
                    Rakip Ürün
                  </th>

                  <th className="p-4">
                    KDV
                  </th>

                  <th className="p-4">
                    Son Fiyat
                  </th>

                  <th className="p-4">
                    Stok
                  </th>

                  <th className="p-4">
                    Son Kontrol
                  </th>

                  <th className="p-4">
                    Durum
                  </th>

                  <th className="p-4">
                    İşlemler
                  </th>
                </tr>
              </thead>

              <tbody>
                {mappings.map(
                  (mapping) => (
                    <tr
                      key={mapping.id}
                      className={`border-b align-top hover:bg-slate-50 ${
                        mapping.isActive
                          ? ""
                          : "opacity-60"
                      }`}
                    >
                      <td className="whitespace-nowrap p-4 font-black text-blue-900">
                        {
                          mapping.product
                            .code
                        }
                      </td>

                      <td className="p-4">
                        <p className="font-bold text-slate-900">
                          {
                            mapping.product
                              .name
                          }
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {
                            mapping.product
                              .brand
                          }
                        </p>
                      </td>

                      <td className="p-4">
                        <p className="font-bold">
                          {
                            mapping
                              .competitorSite
                              .name
                          }
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {
                            mapping
                              .competitorSite
                              .code
                          }
                        </p>
                      </td>

                      <td className="p-4">
                        <p className="max-w-sm font-semibold">
                          {mapping.competitorName ??
                            "-"}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          SKU:{" "}
                          {mapping.competitorSku ??
                            "-"}
                        </p>

                        <a
                          href={
                            mapping.productUrl
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-block font-bold text-blue-700 hover:underline"
                        >
                          Ürünü Aç
                        </a>
                      </td>

                      <td className="whitespace-nowrap p-4">
                        {mapping.vatRate ===
                        null
                          ? "-"
                          : `%${mapping.vatRate}`}
                      </td>

                      <td className="whitespace-nowrap p-4">
                        <p className="font-black text-blue-900">
                          {formatCurrency(
                            mapping.lastPriceInclVat,
                          )}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Hariç:{" "}
                          {formatCurrency(
                            mapping.lastPriceExclVat,
                          )}
                        </p>
                      </td>

                      <td className="whitespace-nowrap p-4">
                        {getStockLabel(
                          mapping.lastStockStatus,
                        )}
                      </td>

                      <td className="whitespace-nowrap p-4 text-slate-600">
                        {formatDate(
                          mapping.lastCheckedAt,
                        )}

                        {mapping.lastError && (
                          <p
                            className="mt-2 max-w-xs text-xs font-semibold text-red-600"
                            title={
                              mapping.lastError
                            }
                          >
                            {
                              mapping.lastError
                            }
                          </p>
                        )}
                      </td>

                      <td className="p-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            mapping.isActive
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {mapping.isActive
                            ? "Aktif"
                            : "Pasif"}
                        </span>
                      </td>

                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          <form
                            action={checkCompetitorPrice.bind(
                              null,
                              mapping.id,
                            )}
                          >
                            <button
                              type="submit"
                              disabled={
                                !mapping.isActive
                              }
                              className="rounded-lg bg-blue-700 px-4 py-2 font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                            >
                              Fiyatı Kontrol Et
                            </button>
                          </form>

                          <form
                            action={toggleCompetitorMappingStatus.bind(
                              null,
                              mapping.id,
                              mapping.isActive,
                            )}
                          >
                            <button
                              type="submit"
                              className={`rounded-lg px-4 py-2 font-bold text-white ${
                                mapping.isActive
                                  ? "bg-red-600 hover:bg-red-700"
                                  : "bg-green-600 hover:bg-green-700"
                              }`}
                            >
                              {mapping.isActive
                                ? "Pasif Yap"
                                : "Aktifleştir"}
                            </button>
                          </form>
<DeleteCompetitorMappingButton
  mappingId={mapping.id}
/>

                        </div>
                      </td>
                    </tr>
                  ),
                )}

                {mappings.length ===
                  0 && (
                  <tr>
                    <td
                      colSpan={10}
                      className="p-12 text-center text-slate-500"
                    >
                      Henüz rakip ürün
                      eşleştirmesi
                      oluşturulmamış.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}