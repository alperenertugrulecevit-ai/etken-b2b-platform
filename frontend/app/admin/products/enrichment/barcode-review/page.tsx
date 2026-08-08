import {
  BarcodeRecoveryStatus,
} from "@prisma/client";

import Link from "next/link";

import {
  prisma,
} from "@/lib/prisma";

import {
  B2B_CONSTANTS,
} from "@/modules/b2b/constants/b2b.constants";

import {
  approveBarcodeRecoveryAttempt,
  rejectBarcodeRecoveryAttempt,
} from "./actions";

type BarcodeReviewPageProps = {
  searchParams: Promise<{
    status?: string;
    message?: string;
  }>;
};

function messageClass(
  status: string | undefined,
): string {
  if (
    status ===
    "success"
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (
    status ===
    "warning"
  ) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-red-200 bg-red-50 text-red-800";
}

export default async function BarcodeReviewPage({
  searchParams,
}: BarcodeReviewPageProps) {
  const params =
    await searchParams;

  const attempts =
    await prisma.barcodeRecoveryAttempt.findMany({
      where: {
        tenantId:
          B2B_CONSTANTS.TENANT_ID,

        companyId:
          B2B_CONSTANTS.COMPANY_ID,

        status:
          BarcodeRecoveryStatus.REVIEW,
      },

      select: {
        id: true,

        sourceSite:
          true,

        candidateTitle:
          true,

        candidateUrl:
          true,

        candidateScore:
          true,

        message:
          true,

        attemptedAt:
          true,

        product: {
          select: {
            id: true,
            code: true,
            name: true,
            brand: true,

            competitorProducts: {
              where: {
                isActive:
                  true,

                competitorSite: {
                  code:
                    "OFIX",
                },
              },

              select: {
                competitorName:
                  true,

                productUrl:
                  true,

                competitorSite: {
                  select: {
                    name: true,
                  },
                },
              },

              take: 1,
            },
          },
        },
      },

      orderBy: [
        {
          candidateScore:
            "desc",
        },

        {
          attemptedAt:
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
            className="text-sm font-bold text-cyan-800 hover:underline"
          >
            ← Ürün Veri Zenginleştirmeye Dön
          </Link>

          <h1 className="mt-4 text-2xl font-black text-slate-900">
            Barkod İnceleme Kuyruğu
          </h1>

          <p className="mt-1 max-w-4xl text-sm leading-6 text-slate-600">
            Ofix eşleşmesi bulunan ancak
            barkodu olmayan ürünler için
            Avansas üzerinde bulunan
            adayları kontrol edin.
            Yalnızca doğru ürün olduğundan
            emin olduğunuz adaydan barkod
            alın.
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

      {attempts.length ===
      0 ? (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
          <h2 className="font-bold text-emerald-900">
            İncelenecek barkod adayı bulunmuyor.
          </h2>

          <p className="mt-1 text-sm text-emerald-700">
            Barkod tamamlama taraması
            sırasında manuel inceleme
            gerektiren adaylar burada
            görünecek.
          </p>
        </section>
      ) : (
        <section className="space-y-4">
          {attempts.map(
            (attempt) => {
              const ofixMapping =
                attempt.product
                  .competitorProducts[0] ??
                null;

              return (
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

                        <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-700">
                          Barkod Recovery
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

                      <div className="mt-4 grid gap-4 xl:grid-cols-3">
                        <div className="rounded-xl bg-slate-50 p-4">
                          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                            Etken Ürünü
                          </p>

                          <p className="mt-2 font-black text-slate-900">
                            {
                              attempt.product.name
                            }
                          </p>

                          <p className="mt-2 text-sm text-slate-600">
                            Marka:{" "}
                            <strong>
                              {
                                attempt.product.brand
                              }
                            </strong>
                          </p>
                        </div>

                        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                          <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                            Mevcut Ofix Eşleşmesi
                          </p>

                          <p className="mt-2 font-black text-slate-900">
                            {ofixMapping
                              ?.competitorName ??
                              "Ofix eşleşme adı bulunamadı"}
                          </p>

                          {ofixMapping?.productUrl && (
                            <a
                              href={
                                ofixMapping.productUrl
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="mt-3 inline-flex text-sm font-bold text-blue-700 hover:underline"
                            >
                              Ofix'te Aç
                            </a>
                          )}
                        </div>

                        <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4">
                          <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
                            Avansas Barkod Adayı
                          </p>

                          <p className="mt-2 font-black text-slate-900">
                            {attempt.candidateTitle ??
                              "Aday başlığı bulunamadı"}
                          </p>

                          {attempt.candidateUrl && (
                            <a
                              href={
                                attempt.candidateUrl
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="mt-3 inline-flex text-sm font-bold text-amber-800 hover:underline"
                            >
                              Avansas'ta Aç
                            </a>
                          )}
                        </div>
                      </div>

                      {attempt.message && (
                        <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                          {
                            attempt.message
                          }
                        </div>
                      )}

                      {attempt.attemptedAt && (
                        <p className="mt-3 text-xs text-slate-400">
                          Son tarama:{" "}
                          {new Intl.DateTimeFormat(
                            "tr-TR",
                            {
                              dateStyle:
                                "short",

                              timeStyle:
                                "medium",
                            },
                          ).format(
                            attempt.attemptedAt,
                          )}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2 xl:w-56 xl:flex-col">
                      {attempt.candidateUrl && (
                        <a
                          href={
                            attempt.candidateUrl
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-bold text-white hover:bg-slate-800"
                        >
                          Avansas'ta Aç
                        </a>
                      )}

                      {attempt.candidateUrl && (
                        <form
                          action={approveBarcodeRecoveryAttempt.bind(
                            null,
                            attempt.id,
                          )}
                        >
                          <button
                            type="submit"
                            className="w-full rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-800"
                          >
                            Barkodu Bu Adaydan Al
                          </button>
                        </form>
                      )}

                      <form
                        action={rejectBarcodeRecoveryAttempt.bind(
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
              );
            },
          )}
        </section>
      )}
    </main>
  );
}