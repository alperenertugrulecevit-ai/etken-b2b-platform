import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { B2B_CONSTANTS } from "@/modules/b2b/constants/b2b.constants";
import { BarcodeRecoveryBulkService } from "@/modules/product-enrichment/barcode-recovery-bulk.service";
import { ProductAutoMatchBulkService } from "@/modules/product-enrichment/product-auto-match-bulk.service";
import { ProductEnrichmentBulkService } from "@/modules/product-enrichment/product-enrichment-bulk.service";

import {
  runBarcodeRecoveryBatch,
  runProductAutoMatchBatch,
  runProductEnrichmentBatch,
} from "./actions";

type ProductEnrichmentPageProps = {
  searchParams: Promise<{
    mode?: string;

    processed?: string;
    success?: string;
    partial?: string;
    noBarcode?: string;
    noImage?: string;
    errors?: string;
    remaining?: string;

    autoProcessed?: string;
    autoMatched?: string;
    autoReview?: string;
    autoNoMatch?: string;
    autoSearchError?: string;
    autoErrors?: string;
    autoRemaining?: string;

    barcodeProcessed?: string;
    barcodeSuccess?: string;
    barcodeReview?: string;
    barcodeNoCandidate?: string;
    barcodeNoBarcode?: string;
    barcodeErrors?: string;
    barcodeRemaining?: string;
  }>;
};

function readNumber(
  value: string | undefined,
): number {
  const parsed =
    Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

export default async function ProductEnrichmentPage({
  searchParams,
}: ProductEnrichmentPageProps) {
  const params =
    await searchParams;

  const [
    totalProducts,
    productsWithBarcode,
    productsWithImage,
    mappedProducts,
    pendingEnrichmentCount,
    autoMatchPendingCount,
    barcodeRecoveryPendingCount,
    barcodeReviewCount,
  ] =
    await Promise.all([
      prisma.product.count({
        where: {
          tenantId:
            B2B_CONSTANTS.TENANT_ID,

          companyId:
            B2B_CONSTANTS.COMPANY_ID,

          isActive: true,
        },
      }),

      prisma.product.count({
        where: {
          tenantId:
            B2B_CONSTANTS.TENANT_ID,

          companyId:
            B2B_CONSTANTS.COMPANY_ID,

          isActive: true,

          productBarcodes: {
            some: {},
          },
        },
      }),

      prisma.product.count({
        where: {
          tenantId:
            B2B_CONSTANTS.TENANT_ID,

          companyId:
            B2B_CONSTANTS.COMPANY_ID,

          isActive: true,

          OR: [
            {
              imageUrl: {
                not: null,
              },
            },

            {
              productImageSources: {
                some: {},
              },
            },
          ],
        },
      }),

      prisma.product.count({
        where: {
          tenantId:
            B2B_CONSTANTS.TENANT_ID,

          companyId:
            B2B_CONSTANTS.COMPANY_ID,

          isActive: true,

          competitorProducts: {
            some: {
              isActive: true,
            },
          },
        },
      }),

      ProductEnrichmentBulkService
        .getPendingCount(),

      ProductAutoMatchBulkService
        .getUnmatchedProductCount(),

      BarcodeRecoveryBulkService
        .getPendingCount(),

      prisma.barcodeRecoveryAttempt.count({
        where: {
          tenantId:
            B2B_CONSTANTS.TENANT_ID,

          companyId:
            B2B_CONSTANTS.COMPANY_ID,

          status:
            "REVIEW",
        },
      }),
    ]);

  const missingBarcode =
    Math.max(
      totalProducts -
        productsWithBarcode,
      0,
    );

  const missingImage =
    Math.max(
      totalProducts -
        productsWithImage,
      0,
    );

  const actualUnmatchedProducts =
    Math.max(
      totalProducts -
        mappedProducts,
      0,
    );

  const mode =
    params.mode ?? "";

  const processed =
    readNumber(
      params.processed,
    );

  const success =
    readNumber(
      params.success,
    );

  const partial =
    readNumber(
      params.partial,
    );

  const noBarcode =
    readNumber(
      params.noBarcode,
    );

  const noImage =
    readNumber(
      params.noImage,
    );

  const errors =
    readNumber(
      params.errors,
    );

  const autoProcessed =
    readNumber(
      params.autoProcessed,
    );

  const autoMatched =
    readNumber(
      params.autoMatched,
    );

  const autoReview =
    readNumber(
      params.autoReview,
    );

  const autoNoMatch =
    readNumber(
      params.autoNoMatch,
    );

  const autoSearchError =
    readNumber(
      params.autoSearchError,
    );

  const autoErrors =
    readNumber(
      params.autoErrors,
    );

  const barcodeProcessed =
    readNumber(
      params.barcodeProcessed,
    );

  const barcodeSuccess =
    readNumber(
      params.barcodeSuccess,
    );

  const barcodeReview =
    readNumber(
      params.barcodeReview,
    );

  const barcodeNoCandidate =
    readNumber(
      params.barcodeNoCandidate,
    );

  const barcodeNoBarcode =
    readNumber(
      params.barcodeNoBarcode,
    );

  const barcodeErrors =
    readNumber(
      params.barcodeErrors,
    );

  const hasEnrichmentResult =
    mode ===
    "enrichment";

  const hasAutoMatchResult =
    mode ===
    "automatch";

  const hasBarcodeRecoveryResult =
    mode ===
    "barcodeRecovery";

  return (
    <main className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Ürün Veri Zenginleştirme
          </h1>

          <p className="mt-1 text-sm text-slate-600">
            Rakip eşleştirmelerini,
            barkodları ve ürün
            görsellerini toplu olarak
            ürün master kayıtlarına
            aktarır.
          </p>
        </div>

        <Link
          href="/admin/products"
          className="inline-flex w-fit rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Ürünlere Dön
        </Link>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard
          title="Toplam Ürün"
          value={totalProducts}
        />

        <StatCard
          title="Rakip Eşleşmeli"
          value={mappedProducts}
        />

        <StatCard
          title="Rakip Eşleşmesi Yok"
          value={actualUnmatchedProducts}
        />

        <StatCard
          title="Barkodu Eksik"
          value={missingBarcode}
        />

        <StatCard
          title="Görseli Eksik"
          value={missingImage}
        />

        <StatCard
          title="Zenginleştirme Kuyruğu"
          value={pendingEnrichmentCount}
        />
      </section>

      {hasBarcodeRecoveryResult && (
        <section className="rounded-2xl border border-cyan-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">
            Son Barkod Tamamlama İşlemi
          </h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <ResultCard
              label="İşlenen"
              value={barcodeProcessed}
            />

            <ResultCard
              label="Barkod Bulundu"
              value={barcodeSuccess}
            />

            <ResultCard
              label="İnceleme"
              value={barcodeReview}
            />

            <ResultCard
              label="Aday Yok"
              value={barcodeNoCandidate}
            />

            <ResultCard
              label="Barkod Yok"
              value={barcodeNoBarcode}
            />

            <ResultCard
              label="Hata"
              value={barcodeErrors}
            />
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-cyan-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Barkod Tamamlama
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Ofix üzerinden
              eşleştirilmiş ancak
              barkodu bulunmayan ürünleri
              Avansas üzerinde arar.
              Yalnızca güvenli ürün
              eşleşmelerinden EAN/GTIN
              bilgisi ürün masterına
              aktarılır.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="rounded-xl bg-cyan-50 px-4 py-3 text-right">
              <p className="text-xs font-bold uppercase text-cyan-700">
                Taranacak
              </p>

              <p className="mt-1 text-3xl font-black text-cyan-900">
                {barcodeRecoveryPendingCount}
              </p>
            </div>

            <div className="rounded-xl bg-amber-50 px-4 py-3 text-right">
              <p className="text-xs font-bold uppercase text-amber-700">
                İnceleme
              </p>

              <p className="mt-1 text-3xl font-black text-amber-900">
                {barcodeReviewCount}
              </p>
            </div>
          </div>
        </div>

        {barcodeRecoveryPendingCount >
        0 ? (
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <form
              action={
                runBarcodeRecoveryBatch
              }
            >
              <input
                type="hidden"
                name="batchSize"
                value="1"
              />

              <button
                type="submit"
                className="w-full rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white hover:bg-emerald-800 sm:w-auto"
              >
                Test: 1 Ürün
              </button>
            </form>

            <form
              action={
                runBarcodeRecoveryBatch
              }
            >
              <input
                type="hidden"
                name="batchSize"
                value="5"
              />

              <button
                type="submit"
                className="w-full rounded-xl bg-cyan-700 px-5 py-3 font-bold text-white hover:bg-cyan-800 sm:w-auto"
              >
                Sonraki 5 Ürün
              </button>
            </form>

            <form
              action={
                runBarcodeRecoveryBatch
              }
            >
              <input
                type="hidden"
                name="batchSize"
                value="10"
              />

              <button
                type="submit"
                className="w-full rounded-xl bg-blue-700 px-5 py-3 font-bold text-white hover:bg-blue-800 sm:w-auto"
              >
                Sonraki 10 Ürün
              </button>
            </form>

            <form
              action={
                runBarcodeRecoveryBatch
              }
            >
              <input
                type="hidden"
                name="batchSize"
                value="25"
              />

              <button
                type="submit"
                className="w-full rounded-xl bg-indigo-700 px-5 py-3 font-bold text-white hover:bg-indigo-800 sm:w-auto"
              >
                Sonraki 25 Ürün
              </button>
            </form>
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
            Normal barkod tamamlama
            kuyruğunda bekleyen ürün
            bulunmuyor.
          </div>
        )}

        {barcodeReviewCount >
          0 && (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <strong>
              {barcodeReviewCount}
            </strong>{" "}
            ürün barkod aktarımı için
            manuel inceleme bekliyor.
            Bir sonraki adımda barkod
            inceleme kuyruğunu açacağız.
          </div>
        )}

        <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
          <strong>
            Kaynak:
          </strong>{" "}
          Barkod recovery işlemi yalnızca
          Avansas üzerinde güvenli ürün
          eşleşmesi bulduğunda otomatik
          kayıt yapar.
        </div>
      </section>

      {hasAutoMatchResult && (
        <section className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">
            Son Otomatik Eşleştirme
          </h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <ResultCard
              label="Taranan"
              value={autoProcessed}
            />

            <ResultCard
              label="Otomatik Eşleşen"
              value={autoMatched}
            />

            <ResultCard
              label="İnceleme"
              value={autoReview}
            />

            <ResultCard
              label="Eşleşme Yok"
              value={autoNoMatch}
            />

            <ResultCard
              label="Arama Hatası"
              value={autoSearchError}
            />

            <ResultCard
              label="Hata"
              value={autoErrors}
            />
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Otomatik Rakip Eşleştirme
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Rakip eşleşmesi olmayan
              ürünleri aktif rakip
              sitelerde otomatik arar.
              Yalnızca güvenli ve varyant
              uyumlu adaylar otomatik
              eşleştirilir.
            </p>
          </div>

          <div className="rounded-xl bg-blue-50 px-4 py-3 text-right">
            <p className="text-xs font-bold uppercase text-blue-700">
              Taranacak Ürün
            </p>

            <p className="mt-1 text-3xl font-black text-blue-900">
              {autoMatchPendingCount}
            </p>
          </div>
        </div>

        {autoMatchPendingCount >
        0 ? (
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <form
              action={
                runProductAutoMatchBatch
              }
            >
              <input
                type="hidden"
                name="batchSize"
                value="1"
              />

              <button
                type="submit"
                className="w-full rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white hover:bg-emerald-800 sm:w-auto"
              >
                Test: 1 Ürünü Tara
              </button>
            </form>

            <form
              action={
                runProductAutoMatchBatch
              }
            >
              <input
                type="hidden"
                name="batchSize"
                value="5"
              />

              <button
                type="submit"
                className="w-full rounded-xl bg-blue-700 px-5 py-3 font-bold text-white hover:bg-blue-800 sm:w-auto"
              >
                Sonraki 5 Ürünü Tara
              </button>
            </form>

            <form
              action={
                runProductAutoMatchBatch
              }
            >
              <input
                type="hidden"
                name="batchSize"
                value="10"
              />

              <button
                type="submit"
                className="w-full rounded-xl bg-slate-900 px-5 py-3 font-bold text-white hover:bg-slate-800 sm:w-auto"
              >
                Sonraki 10 Ürünü Tara
              </button>
            </form>

            <form
              action={
                runProductAutoMatchBatch
              }
            >
              <input
                type="hidden"
                name="batchSize"
                value="25"
              />

              <button
                type="submit"
                className="w-full rounded-xl bg-indigo-700 px-5 py-3 font-bold text-white hover:bg-indigo-800 sm:w-auto"
              >
                Sonraki 25 Ürünü Tara
              </button>
            </form>

            <Link
              href="/admin/products/enrichment/review"
              className="inline-flex rounded-xl border border-amber-300 bg-amber-50 px-5 py-3 font-bold text-amber-800 hover:bg-amber-100"
            >
              İnceleme Kuyruğunu Aç
            </Link>
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
            Otomatik rakip taraması
            tamamlandı. Taranmayı
            bekleyen ürün bulunmuyor.
          </div>
        )}
      </section>

      {hasEnrichmentResult && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">
            Son Zenginleştirme İşlemi
          </h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <ResultCard
              label="İşlenen"
              value={processed}
            />

            <ResultCard
              label="Tamamlanan"
              value={success}
            />

            <ResultCard
              label="Kısmi"
              value={partial}
            />

            <ResultCard
              label="Barkod Yok"
              value={noBarcode}
            />

            <ResultCard
              label="Görsel Yok"
              value={noImage}
            />

            <ResultCard
              label="Hata"
              value={errors}
            />
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">
          Toplu Master Tamamlama
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Rakip eşleştirmesi yapılmış
          ancak barkod veya görsel
          zenginleştirmesi henüz
          çalıştırılmamış kayıtları
          işler.
        </p>

        {pendingEnrichmentCount >
        0 ? (
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <form
              action={
                runProductEnrichmentBatch
              }
            >
              <input
                type="hidden"
                name="batchSize"
                value="1"
              />

              <button
                type="submit"
                className="w-full rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white hover:bg-emerald-800 sm:w-auto"
              >
                Test: 1 Ürünü İşle
              </button>
            </form>

            <form
              action={
                runProductEnrichmentBatch
              }
            >
              <input
                type="hidden"
                name="batchSize"
                value="10"
              />

              <button
                type="submit"
                className="w-full rounded-xl bg-violet-700 px-5 py-3 font-bold text-white hover:bg-violet-800 sm:w-auto"
              >
                Sonraki 10 Ürünü İşle
              </button>
            </form>

            <form
              action={
                runProductEnrichmentBatch
              }
            >
              <input
                type="hidden"
                name="batchSize"
                value="25"
              />

              <button
                type="submit"
                className="w-full rounded-xl bg-slate-900 px-5 py-3 font-bold text-white hover:bg-slate-800 sm:w-auto"
              >
                Sonraki 25 Ürünü İşle
              </button>
            </form>
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
            İşlenecek rakip eşleşmeli
            ürün bulunmuyor.
          </div>
        )}
      </section>
    </main>
  );
}

function StatCard({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-sm font-medium text-slate-500">
        {title}
      </div>

      <div className="mt-2 text-3xl font-bold text-slate-900">
        {value}
      </div>
    </div>
  );
}

function ResultCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>

      <div className="mt-1 text-2xl font-bold text-slate-900">
        {value}
      </div>
    </div>
  );
}