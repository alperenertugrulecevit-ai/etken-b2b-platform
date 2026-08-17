import { prisma } from "@/lib/prisma";
import { B2B_CONSTANTS } from "@/modules/b2b/constants/b2b.constants";

import {
  Ofis26SupplierSyncService,
  type Ofis26SupplierSyncResult,
} from "./ofis26-supplier-sync.service";

const OFIS26_SITE_CODE =
  "OFIS26";

const DEFAULT_BATCH_SIZE =
  200;

const MAX_BATCH_SIZE =
  250;

const DEFAULT_CONCURRENCY =
  8;

const MAX_CONCURRENCY =
  10;

/*
 * Ofis26 fiyatının ne kadar süre
 * doğrulanmadan satışta kalmasına
 * izin vereceğiz.
 *
 * Tam katalog yaklaşık 15 dakikada
 * bir dolaşacağı için 30 dakika
 * güvenli tampon kullanıyoruz.
 *
 * 30 dakikadan uzun süre başarılı
 * fiyat doğrulaması yapılamayan
 * tedarikçi ürünü stock=0 yapılır.
 */
const DEFAULT_STALE_MINUTES =
  120;

const MIN_STALE_MINUTES =
  60;

const MAX_STALE_MINUTES =
  1440;

export type Ofis26BatchSyncFailure = {
  mappingId: number;

  productCode:
    string | null;

  message:
    string;
};

export type Ofis26BatchSyncSummary = {
  startedAt:
    string;

  finishedAt:
    string;

  durationMs:
    number;

  availableMappings:
    number;

  attempted:
    number;

  success:
    number;

  failed:
    number;

  staleDisabled:
    number;

  batchSize:
    number;

  concurrency:
    number;

  staleMinutes:
    number;

  failures:
    Ofis26BatchSyncFailure[];
};

type MappingCandidate = {
  id:
    number;

  lastCheckedAt:
    Date | null;

  product: {
    code:
      string;
  };
};

function parsePositiveInteger(
  value:
    string | undefined,
  fallback:
    number,
  minimum:
    number,
  maximum:
    number,
): number {
  if (!value) {
    return fallback;
  }

  const parsed =
    Number.parseInt(
      value,
      10,
    );

  if (
    !Number.isFinite(
      parsed,
    )
  ) {
    return fallback;
  }

  return Math.min(
    maximum,
    Math.max(
      minimum,
      parsed,
    ),
  );
}

function getBatchSize(): number {
  return parsePositiveInteger(
    process.env
      .OFIS26_SYNC_BATCH_SIZE,
    DEFAULT_BATCH_SIZE,
    1,
    MAX_BATCH_SIZE,
  );
}

function getConcurrency(): number {
  return parsePositiveInteger(
    process.env
      .OFIS26_SYNC_CONCURRENCY,
    DEFAULT_CONCURRENCY,
    1,
    MAX_CONCURRENCY,
  );
}

function getStaleMinutes(): number {
  return parsePositiveInteger(
    process.env
      .OFIS26_SYNC_STALE_MINUTES,
    DEFAULT_STALE_MINUTES,
    MIN_STALE_MINUTES,
    MAX_STALE_MINUTES,
  );
}

function sortCandidates(
  candidates:
    MappingCandidate[],
): MappingCandidate[] {
  return [
    ...candidates,
  ].sort(
    (
      left,
      right,
    ) => {
      /*
       * Hiç kontrol edilmemiş ürünler
       * her zaman önce gelir.
       */
      if (
        left.lastCheckedAt ===
          null &&
        right.lastCheckedAt !==
          null
      ) {
        return -1;
      }

      if (
        left.lastCheckedAt !==
          null &&
        right.lastCheckedAt ===
          null
      ) {
        return 1;
      }

      if (
        left.lastCheckedAt ===
          null &&
        right.lastCheckedAt ===
          null
      ) {
        return (
          left.id -
          right.id
        );
      }

      const leftTime =
        left.lastCheckedAt
          ?.getTime() ??
        0;

      const rightTime =
        right.lastCheckedAt
          ?.getTime() ??
        0;

      if (
        leftTime !==
        rightTime
      ) {
        return (
          leftTime -
          rightTime
        );
      }

      return (
        left.id -
        right.id
      );
    },
  );
}

async function syncOne(
  candidate:
    MappingCandidate,
): Promise<{
  candidate:
    MappingCandidate;

  result:
    Ofis26SupplierSyncResult;
}> {
  try {
    const result =
      await Ofis26SupplierSyncService
        .syncMapping(
          candidate.id,
        );

    return {
      candidate,
      result,
    };
  } catch (
    error
  ) {
    const message =
      error instanceof
      Error
        ? error.message
        : "Bilinmeyen Ofis26 senkronizasyon hatası.";

    return {
      candidate,

      result: {
        success:
          false,

        productCode:
          candidate
            .product
            .code,

        message,
      },
    };
  }
}

async function runWithConcurrency(
  candidates:
    MappingCandidate[],
  concurrency:
    number,
): Promise<
  Array<{
    candidate:
      MappingCandidate;

    result:
      Ofis26SupplierSyncResult;
  }>
> {
  const results:
    Array<{
      candidate:
        MappingCandidate;

      result:
        Ofis26SupplierSyncResult;
    }> =
    [];

  let cursor =
    0;

  async function worker() {
    while (
      true
    ) {
      const index =
        cursor;

      cursor +=
        1;

      if (
        index >=
        candidates.length
      ) {
        return;
      }

      const candidate =
        candidates[
          index
        ];

      const result =
        await syncOne(
          candidate,
        );

      results.push(
        result,
      );
    }
  }

  const workerCount =
    Math.min(
      concurrency,
      candidates.length,
    );

  await Promise.all(
    Array.from(
      {
        length:
          workerCount,
      },
      () =>
        worker(),
    ),
  );

  return results;
}

async function disableStaleProducts(
  staleMinutes:
    number,
): Promise<number> {
  const staleBefore =
    new Date(
      Date.now() -
        staleMinutes *
          60 *
          1000,
    );

  /*
   * Son başarılı fiyat doğrulaması
   * 30 dakikadan eski olan Ofis26
   * ürünlerini buluyoruz.
   *
   * Fiyatı silemiyoruz; geçmiş
   * kayıt olarak kalıyor.
   * Ancak stock=0 yaparak eski
   * fiyatla satış riskini kesiyoruz.
   */
  const staleMappings =
    await prisma
      .competitorProduct
      .findMany({
        where: {
          tenantId:
            B2B_CONSTANTS.TENANT_ID,

          companyId:
            B2B_CONSTANTS.COMPANY_ID,

          isActive:
            true,

          competitorSite: {
            code:
              OFIS26_SITE_CODE,

            isActive:
              true,
          },

          lastSuccessAt: {
            not:
              null,

            lt:
              staleBefore,
          },
        },

        select: {
          productId:
            true,
        },
      });

  const productIds =
    Array.from(
      new Set(
        staleMappings.map(
          (
            mapping,
          ) =>
            mapping.productId,
        ),
      ),
    );

  if (
    productIds.length ===
    0
  ) {
    return 0;
  }

  const result =
    await prisma.product
      .updateMany({
        where: {
          id: {
            in:
              productIds,
          },

          supplier:
            "Ofis26",

          ownStock:
            false,

          stock: {
            gt:
              0,
          },
        },

        data: {
          stock:
            0,
        },
      });

  return result.count;
}

export class Ofis26SupplierBatchSyncService {
  static async syncNextBatch(): Promise<
    Ofis26BatchSyncSummary
  > {
    const started =
      new Date();

    const batchSize =
      getBatchSize();

    const concurrency =
      getConcurrency();

    const staleMinutes =
      getStaleMinutes();

    /*
     * 784 kayıt küçük bir küme.
     * Tamamını metadata olarak alıp
     * JS tarafında lastCheckedAt
     * sırasına koyuyoruz.
     *
     * Böylece en uzun süredir
     * kontrol edilmeyen ürünler
     * her scheduler çağrısında
     * öne gelir.
     */
    const candidates =
      await prisma
        .competitorProduct
        .findMany({
          where: {
            tenantId:
              B2B_CONSTANTS.TENANT_ID,

            companyId:
              B2B_CONSTANTS.COMPANY_ID,

            isActive:
              true,

            competitorSite: {
              code:
                OFIS26_SITE_CODE,

              isActive:
                true,
            },

            product: {
              supplier:
                "Ofis26",

              isActive:
                true,
            },
          },

          select: {
            id:
              true,

            lastCheckedAt:
              true,

            product: {
              select: {
                code:
                  true,
              },
            },
          },
        });

    const selected =
      sortCandidates(
        candidates,
      ).slice(
        0,
        batchSize,
      );

    const syncResults =
      await runWithConcurrency(
        selected,
        concurrency,
      );

    const success =
      syncResults.filter(
        (
          item,
        ) =>
          item.result
            .success,
      ).length;

    const failures =
      syncResults
        .filter(
          (
            item,
          ) =>
            !item.result
              .success,
        )
        .map(
          (
            item,
          ): Ofis26BatchSyncFailure => ({
            mappingId:
              item
                .candidate
                .id,

            productCode:
              item.result
                .productCode ??
              item
                .candidate
                .product
                .code,

            message:
              item.result
                .message,
          }),
        );

    /*
     * Senkronun sonunda fiyatı uzun
     * süredir doğrulanamayan ürünleri
     * güvenli şekilde satıştan
     * çekiyoruz.
     */
    const staleDisabled =
      await disableStaleProducts(
        staleMinutes,
      );

    const finished =
      new Date();

    return {
      startedAt:
        started.toISOString(),

      finishedAt:
        finished.toISOString(),

      durationMs:
        finished.getTime() -
        started.getTime(),

      availableMappings:
        candidates.length,

      attempted:
        selected.length,

      success,

      failed:
        failures.length,

      staleDisabled,

      batchSize,

      concurrency,

      staleMinutes,

      /*
       * Response ve log şişmesin.
       * İlk 25 hatayı döndürüyoruz.
       */
      failures:
        failures.slice(
          0,
          25,
        ),
    };
  }
}