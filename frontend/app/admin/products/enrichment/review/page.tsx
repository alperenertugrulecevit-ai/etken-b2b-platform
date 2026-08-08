import Link from "next/link";

import {
  ProductCompetitorMatchStatus,
} from "@prisma/client";

import {
  prisma,
} from "@/lib/prisma";

import {
  B2B_CONSTANTS,
} from "@/modules/b2b/constants/b2b.constants";

import {
  approveReviewAttempt,
  rejectReviewAttempt,
} from "./actions";

type ReviewPageProps = {
  searchParams: Promise<{
    status?: string;
    message?: string;
  }>;
};

function messageClass(
  status: string | undefined,
): string {
  if (status === "success") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "warning") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-red-200 bg-red-50 text-red-700";
}

export default async function ProductEnrichmentReviewPage({
  searchParams,
}: ReviewPageProps) {
  const params =
    await searchParams;

  const attempts =
    await prisma.productCompetitorMatchAttempt.findMany({
      where: {
        tenantId:
          B2B_CONSTANTS.TENANT_ID,

        companyId:
          B2B_CONSTANTS.COMPANY_ID,

        status:
          ProductCompetitorMatchStatus.REVIEW,
      },

      select: {
        id: true,

        candidateTitle:
          true,

        candidateUrl:
          true,

        candidateScore:
          true,

        highConfidenceCount:
          true,

        reviewCount:
          true,

        rejectedCount:
          true,

        message:
          true,

        searchedAt:
          true,

        product: {
          select: {
            id: true,
            code: true,
            name: true,
            brand: true,

            productBarcodes: {
              where: {
                isPrimary:
                  true,
              },

              take: 1,

              select: {
                barcode: true,
              },
            },
          },
        },

        competitorSite: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },

      orderBy: [
        {
          candidateScore:
            "desc",
        },

        {
          searchedAt:
            "asc",
        },
      ],
    });

  return (
    <main className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <Link
            href="/admin/products/enrichment"
            className="text-sm font-bold text-blue-800 hover:underline"
          >
            ← Ürün Veri Zenginleştirmeye Dön
          </Link>

          <h1 className="mt-4 text-2xl font-black text-slate-900">
            Rakip Ürün İnceleme Kuyruğu
          </h1>

          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Otomatik eşleştirme için
            yeterince kesin olmayan
            adayları manuel olarak
            kontrol edin. Onaylanan ürün
            aynı anda rakip eşleştirmesine
            ve master zenginleştirmesine
            gönderilir.
          </p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-center">
          <p className="text-xs font-bold uppercase text-amber-700">
            Bekleyen İnceleme
          </p>

          <p className="mt-1 text-3xl font-black text-amber-900">
            {attempts.length}
          </p>
        </div>
      </div>

      {params.message && (
        <div
          className={`rounded-xl border p-4 text-sm font-semibold ${messageClass(
            params.status,
          )}`}
        >
          {params.message}
        </div>
      )}

      {attempts.length === 0 ? (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
          <h2 className="font-bold text-emerald-800">
            İncelenecek aday bulunmuyor.
          </h2>

          <p className="mt-1 text-sm text-emerald-700">
            Otomatik tarama sırasında
            inceleme gerektiren yeni
            ürünler burada görünecek.
          </p>
        </section>
      ) : (
        <section className="space-y-4">
          {attempts.map(
            (attempt) => (
              <article
                key={
                  attempt.id
                }
                className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white">
                        {
                          attempt.product.code
                        }
                      </span>

                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                        {
                          attempt.competitorSite.name
                        }
                      </span>

                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                        İnceleme Gerekli
                      </span>

                      {attempt.candidateScore !==
                        null && (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                          %
                          {
                            attempt.candidateScore
                          }
                        </span>
                      )}
                    </div>

                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
                      <div className="rounded-xl bg-slate-50 p-4">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                          Etken Ürünü
                        </p>

                        <p className="mt-2 font-black text-slate-900">
                          {
                            attempt.product.name
                          }
                        </p>

                        <p className="mt-1 text-sm text-slate-600">
                          Marka:{" "}
                          <strong>
                            {
                              attempt.product.brand
                            }
                          </strong>
                        </p>

                        {attempt.product
                          .productBarcodes[0]
                          ?.barcode && (
                          <p className="mt-1 text-sm text-slate-600">
                            Barkod:{" "}
                            <strong>
                              {
                                attempt.product
                                  .productBarcodes[0]
                                  .barcode
                              }
                            </strong>
                          </p>
                        )}
                      </div>

                      <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4">
                        <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
                          Bulunan Rakip Aday
                        </p>

                        <p className="mt-2 font-black text-slate-900">
                          {attempt.candidateTitle ??
                            "Aday başlığı bulunamadı"}
                        </p>

                        {attempt.candidateUrl && (
                          <p className="mt-2 break-all text-xs text-slate-500">
                            {
                              attempt.candidateUrl
                            }
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <MiniStat
                        label="Yüksek Güven"
                        value={
                          attempt.highConfidenceCount
                        }
                      />

                      <MiniStat
                        label="İnceleme"
                        value={
                          attempt.reviewCount
                        }
                      />

                      <MiniStat
                        label="Reddedilen"
                        value={
                          attempt.rejectedCount
                        }
                      />
                    </div>

                    {attempt.message && (
                      <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                        {
                          attempt.message
                        }
                      </div>
                    )}

                    {attempt.searchedAt && (
                      <p className="mt-3 text-xs text-slate-400">
                        Son arama:{" "}
                        {new Intl.DateTimeFormat(
                          "tr-TR",
                          {
                            dateStyle:
                              "short",

                            timeStyle:
                              "medium",
                          },
                        ).format(
                          attempt.searchedAt,
                        )}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2 xl:w-52 xl:flex-col">
                    {attempt.candidateUrl && (
                      <a
                        href={
                          attempt.candidateUrl
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-bold text-white hover:bg-slate-800"
                      >
                        Rakipte Aç
                      </a>
                    )}

                    {attempt.candidateUrl &&
                      attempt.candidateTitle && (
                      <form
                        action={approveReviewAttempt.bind(
                          null,
                          attempt.id,
                        )}
                      >
                        <button
                          type="submit"
                          className="w-full rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-800"
                        >
                          Eşleşmeyi Onayla
                        </button>
                      </form>
                    )}

                    <form
                      action={rejectReviewAttempt.bind(
                        null,
                        attempt.id,
                      )}
                    >
                      <button
                        type="submit"
                        className="w-full rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-700"
                      >
                        Adayı Reddet
                      </button>
                    </form>

                    <Link
                      href={`/admin/products/${attempt.product.id}`}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-center text-sm font-bold text-slate-700 hover:bg-slate-50"
                    >
                      Ürün Detayı
                    </Link>
                  </div>
                </div>
              </article>
            ),
          )}
        </section>
      )}
    </main>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-xs font-semibold text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-xl font-black text-slate-900">
        {value}
      </p>
    </div>
  );
}