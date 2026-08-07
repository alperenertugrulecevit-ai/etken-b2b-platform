import Link from "next/link";

import { prisma } from "@/lib/prisma";

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
    return "Henüz kontrol edilmedi";
  }

  return value.toLocaleString("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  });
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

function getStockClass(
  value:
    | "UNKNOWN"
    | "IN_STOCK"
    | "OUT_OF_STOCK"
    | "PREORDER",
): string {
  switch (value) {
    case "IN_STOCK":
      return "bg-green-100 text-green-700";

    case "OUT_OF_STOCK":
      return "bg-red-100 text-red-700";

    case "PREORDER":
      return "bg-amber-100 text-amber-700";

    default:
      return "bg-slate-100 text-slate-600";
  }
}

export default async function CompetitorPricesPage() {
  const [
    competitorSiteCount,
    activeMappingCount,
    checkedMappingCount,
    failedMappingCount,
    competitorProducts,
  ] = await Promise.all([
    prisma.competitorSite.count(),

    prisma.competitorProduct.count({
      where: {
        isActive: true,
      },
    }),

    prisma.competitorProduct.count({
      where: {
        isActive: true,
        lastCheckedAt: {
          not: null,
        },
      },
    }),

    prisma.competitorProduct.count({
      where: {
        isActive: true,
        lastError: {
          not: null,
        },
      },
    }),

    prisma.competitorProduct.findMany({
      include: {
        product: {
          select: {
            id: true,
            code: true,
            name: true,
            brand: true,
            price: true,
            vat: true,
          },
        },

        competitorSite: {
          select: {
            id: true,
            code: true,
            name: true,
            sourceType: true,
          },
        },
      },

      orderBy: [
        {
          lastCheckedAt: "desc",
        },
        {
          id: "desc",
        },
      ],

      take: 100,
    }),
  ]);

  const mappedProductCount =
    new Set(
      competitorProducts.map(
        (item) => item.productId,
      ),
    ).size;

  const pricedMappings =
    competitorProducts.filter(
      (item) =>
        item.lastPriceInclVat !== null ||
        item.lastPriceExclVat !== null,
    );

  const lowestRecordedPrice =
    pricedMappings.length > 0
      ? Math.min(
          ...pricedMappings.map(
            (item) =>
              item.lastPriceInclVat ??
              item.lastPriceExclVat ??
              Number.POSITIVE_INFINITY,
          ),
        )
      : null;

  return (
    <section className="p-10">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900">
            Rakip Fiyat Analizi
          </h1>

          <p className="mt-2 max-w-3xl text-slate-600">
            Rakip sitelerdeki ürün
            eşleştirmelerini, KDV dahil ve
            hariç fiyatları, stok durumlarını
            ve kontrol geçmişini yönetin.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/competitor-prices/sites"
            className="rounded-xl border border-blue-900 bg-white px-5 py-3 font-bold text-blue-900 transition hover:bg-blue-50"
          >
            Rakip Siteler
          </Link>

          <Link
            href="/admin/competitor-prices/mappings"
            className="rounded-xl bg-blue-900 px-5 py-3 font-bold text-white transition hover:bg-blue-800"
          >
            Ürün Eşleştirmeleri
          </Link>
        </div>
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-bold uppercase tracking-wide text-slate-500">
            Rakip Site
          </p>

          <p className="mt-3 text-4xl font-black text-blue-900">
            {competitorSiteCount.toLocaleString(
              "tr-TR",
            )}
          </p>

          <p className="mt-2 text-sm text-slate-500">
            Sistemde tanımlı kaynak
          </p>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-bold uppercase tracking-wide text-slate-500">
            Aktif Eşleştirme
          </p>

          <p className="mt-3 text-4xl font-black text-violet-700">
            {activeMappingCount.toLocaleString(
              "tr-TR",
            )}
          </p>

          <p className="mt-2 text-sm text-slate-500">
            Rakip ürün bağlantısı
          </p>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-bold uppercase tracking-wide text-slate-500">
            Eşleşen Etken Ürünü
          </p>

          <p className="mt-3 text-4xl font-black text-cyan-700">
            {mappedProductCount.toLocaleString(
              "tr-TR",
            )}
          </p>

          <p className="mt-2 text-sm text-slate-500">
            En az bir rakibi bulunan
          </p>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-bold uppercase tracking-wide text-slate-500">
            Kontrol Edilen
          </p>

          <p className="mt-3 text-4xl font-black text-green-700">
            {checkedMappingCount.toLocaleString(
              "tr-TR",
            )}
          </p>

          <p className="mt-2 text-sm text-slate-500">
            En az bir kez fiyat alınan
          </p>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-bold uppercase tracking-wide text-slate-500">
            Hatalı Kayıt
          </p>

          <p className="mt-3 text-4xl font-black text-red-600">
            {failedMappingCount.toLocaleString(
              "tr-TR",
            )}
          </p>

          <p className="mt-2 text-sm text-slate-500">
            Son kontrolde hata alan
          </p>
        </article>
      </div>

      <div className="mt-8 rounded-2xl border border-blue-100 bg-blue-50 p-6">
        <div className="grid gap-5 lg:grid-cols-3">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-blue-700">
              Kaydedilmiş Fiyat
            </p>

            <p className="mt-2 text-3xl font-black text-blue-950">
              {pricedMappings.length.toLocaleString(
                "tr-TR",
              )}
            </p>
          </div>

          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-blue-700">
              Görülen En Düşük Fiyat
            </p>

            <p className="mt-2 text-3xl font-black text-blue-950">
              {formatCurrency(
                lowestRecordedPrice,
              )}
            </p>
          </div>

          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-blue-700">
              Sistem Durumu
            </p>

            <p className="mt-2 text-lg font-black text-blue-950">
              Veri modeli hazır
            </p>

            <p className="mt-1 text-sm text-blue-800">
              Rakip eşleştirmeleri
              oluşturulduktan sonra fiyat
              toplama görevleri çalıştırılacak.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-10 overflow-x-auto rounded-2xl bg-white shadow">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b p-6">
          <div>
            <h2 className="text-2xl font-black text-slate-900">
              Son Rakip Ürün Kayıtları
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              En fazla 100 aktif veya pasif
              eşleştirme gösterilir.
            </p>
          </div>
        </div>

        <table className="w-full min-w-[1500px] text-left text-sm">
          <thead className="bg-slate-900 text-white">
            <tr>
              <th className="p-4">
                Etken SKU
              </th>

              <th className="p-4">
                Ürün
              </th>

              <th className="p-4">
                Rakip
              </th>

              <th className="p-4">
                Rakip Ürün
              </th>

              <th className="p-4">
                KDV Hariç
              </th>

              <th className="p-4">
                KDV Dahil
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
                Bağlantı
              </th>
            </tr>
          </thead>

          <tbody>
            {competitorProducts.map(
              (item) => (
                <tr
                  key={item.id}
                  className="border-b align-top transition hover:bg-slate-50"
                >
                  <td className="whitespace-nowrap p-4 font-black text-blue-900">
                    {item.product.code}
                  </td>

                  <td className="p-4">
                    <p className="font-bold text-slate-900">
                      {item.product.name}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {item.product.brand}
                    </p>
                  </td>

                  <td className="p-4">
                    <p className="font-bold">
                      {
                        item.competitorSite
                          .name
                      }
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {
                        item.competitorSite
                          .sourceType
                      }
                    </p>
                  </td>

                  <td className="p-4">
                    <p className="font-semibold">
                      {item.competitorName ??
                        "-"}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Rakip SKU:{" "}
                      {item.competitorSku ??
                        "-"}
                    </p>
                  </td>

                  <td className="whitespace-nowrap p-4 font-bold text-slate-800">
                    {formatCurrency(
                      item.lastPriceExclVat,
                    )}
                  </td>

                  <td className="whitespace-nowrap p-4 font-black text-blue-900">
                    {formatCurrency(
                      item.lastPriceInclVat,
                    )}
                  </td>

                  <td className="p-4">
                    <span
                      className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${getStockClass(
                        item.lastStockStatus,
                      )}`}
                    >
                      {getStockLabel(
                        item.lastStockStatus,
                      )}
                    </span>
                  </td>

                  <td className="whitespace-nowrap p-4 text-slate-600">
                    {formatDate(
                      item.lastCheckedAt,
                    )}
                  </td>

                  <td className="p-4">
                    {item.lastError ? (
                      <span
                        className="inline-block max-w-xs rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
                        title={item.lastError}
                      >
                        Hata
                      </span>
                    ) : item.lastSuccessAt ? (
                      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                        Başarılı
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                        Bekliyor
                      </span>
                    )}
                  </td>

                  <td className="p-4">
                    <a
                      href={item.productUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block rounded-lg bg-slate-800 px-4 py-2 font-bold text-white transition hover:bg-slate-700"
                    >
                      Rakipte Aç
                    </a>
                  </td>
                </tr>
              ),
            )}

            {competitorProducts.length ===
              0 && (
              <tr>
                <td
                  colSpan={10}
                  className="p-12 text-center"
                >
                  <p className="text-xl font-black text-slate-800">
                    Henüz rakip ürün
                    eşleştirmesi yok.
                  </p>

                  <p className="mt-2 text-slate-500">
                    Önce rakip siteleri,
                    ardından ürün
                    bağlantılarını
                    tanımlayacağız.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}