import {
  CompetitorPriceFetchStatus,
  CompetitorStockStatus,
} from "@prisma/client";
import * as cheerio from "cheerio";

import { prisma } from "@/lib/prisma";
import { B2B_CONSTANTS } from "@/modules/b2b/constants/b2b.constants";
import { ProductImageStorageService } from "@/modules/products/images/product-image-storage.service";

import { CompetitorPriceFetchService } from "./competitor-price-fetch.service";

const OFIS26_SITE_CODE =
  "OFIS26";

const PRICE_MULTIPLIER =
  1.20;

const REQUEST_TIMEOUT_MS =
  20_000;

const USER_AGENT =
  "Mozilla/5.0 (compatible; EtkenOfficeSupplierSync/1.0; +https://etkenofis.com)";

export type Ofis26SupplierSyncResult = {
  success: boolean;

  message: string;

  productCode?: string;

  ofis26Price?: number | null;

  etkenPrice?: number | null;

  stockStatus?: CompetitorStockStatus;

  stock?: number;

  imageUpdated?: boolean;
};

type Ofis26StockInfo = {
  stockAmount: number | null;

  stockStatus: CompetitorStockStatus;
};

function calculateEtkenPrice(
  ofis26Price: number,
): number {
  return Number(
    (
      ofis26Price *
      PRICE_MULTIPLIER
    ).toFixed(2),
  );
}

function isPendingUrl(
  value: string,
): boolean {
  return value.includes(
    "/__etken_pending__/",
  );
}

function cleanText(
  value:
    | string
    | null
    | undefined,
): string {
  return (
    value ?? ""
  )
    .replace(
      /\s+/g,
      " ",
    )
    .trim();
}

function resolveAbsoluteUrl(
  rawUrl: string,
  pageUrl: string,
): string | null {
  try {
    return new URL(
      rawUrl,
      pageUrl,
    ).toString();
  } catch {
    return null;
  }
}

function extractImageUrl(
  html: string,
  pageUrl: string,
): string | null {
  const $ =
    cheerio.load(
      html,
    );

  /*
   * 1. JSON-LD Product.image
   */
  const jsonLdScripts =
    $(
      'script[type="application/ld+json"]',
    );

  for (
    let index = 0;
    index <
    jsonLdScripts.length;
    index += 1
  ) {
    const element =
      jsonLdScripts.eq(
        index,
      );

    const raw =
      element.html();

    if (!raw) {
      continue;
    }

    try {
      const parsed =
        JSON.parse(
          raw,
        ) as unknown;

      const records:
        Record<
          string,
          unknown
        >[] = [];

      const collect = (
        value: unknown,
      ) => {
        if (
          Array.isArray(
            value,
          )
        ) {
          for (
            const item
            of value
          ) {
            collect(
              item,
            );
          }

          return;
        }

        if (
          typeof value !==
            "object" ||
          value === null
        ) {
          return;
        }

        const record =
          value as Record<
            string,
            unknown
          >;

        records.push(
          record,
        );

        if (
          Array.isArray(
            record[
              "@graph"
            ],
          )
        ) {
          collect(
            record[
              "@graph"
            ],
          );
        }
      };

      collect(
        parsed,
      );

      for (
        const record
        of records
      ) {
        const type =
          record[
            "@type"
          ];

        const isProduct =
          typeof type ===
            "string"
            ? type
                .toLowerCase() ===
              "product"
            : Array.isArray(
                  type,
                )
              ? type.some(
                  (
                    item,
                  ) =>
                    typeof item ===
                      "string" &&
                    item
                      .toLowerCase() ===
                      "product",
                )
              : false;

        if (
          !isProduct
        ) {
          continue;
        }

        const image =
          record.image;

        if (
          typeof image ===
          "string"
        ) {
          const resolved =
            resolveAbsoluteUrl(
              image,
              pageUrl,
            );

          if (
            resolved
          ) {
            return resolved;
          }
        }

        if (
          Array.isArray(
            image,
          )
        ) {
          const first =
            image.find(
              (
                value,
              ) =>
                typeof value ===
                "string",
            );

          if (
            typeof first ===
            "string"
          ) {
            const resolved =
              resolveAbsoluteUrl(
                first,
                pageUrl,
              );

            if (
              resolved
            ) {
              return resolved;
            }
          }
        }

        if (
          typeof image ===
            "object" &&
          image !== null
        ) {
          const imageRecord =
            image as Record<
              string,
              unknown
            >;

          const imageValue =
            imageRecord.url ??
            imageRecord
              .contentUrl;

          if (
            typeof imageValue ===
            "string"
          ) {
            const resolved =
              resolveAbsoluteUrl(
                imageValue,
                pageUrl,
              );

            if (
              resolved
            ) {
              return resolved;
            }
          }
        }
      }
    } catch {
      /*
       * GeÃ§ersiz JSON-LD
       * bloklarÄ± atlanÄ±r.
       */
    }
  }

  /*
   * 2. Ofis26/Ticimax
   * link rel=image_src
   */
  const linkImage =
    cleanText(
      $(
        'link[rel="image_src"]',
      )
        .first()
        .attr(
          "href",
        ),
    );

  if (
    linkImage
  ) {
    const resolved =
      resolveAbsoluteUrl(
        linkImage,
        pageUrl,
      );

    if (
      resolved
    ) {
      return resolved;
    }
  }

  /*
   * 3. OpenGraph
   */
  const ogImage =
    cleanText(
      $(
        'meta[property="og:image"]',
      )
        .first()
        .attr(
          "content",
        ),
    );

  if (
    ogImage
  ) {
    const resolved =
      resolveAbsoluteUrl(
        ogImage,
        pageUrl,
      );

    if (
      resolved
    ) {
      return resolved;
    }
  }

  /*
   * 4. Twitter image
   */
  const twitterImage =
    cleanText(
      $(
        'meta[name="twitter:image"]',
      )
        .first()
        .attr(
          "content",
        ),
    );

  if (
    twitterImage
  ) {
    const resolved =
      resolveAbsoluteUrl(
        twitterImage,
        pageUrl,
      );

    if (
      resolved
    ) {
      return resolved;
    }
  }

  /*
   * 5. Standart Ã¼rÃ¼n
   * gÃ¶rseli adaylarÄ±
   */
  const selectors = [
    '[itemprop="image"]',
    ".product-image img",
    ".product__image img",
    ".product-detail img",
    ".product-detail-image img",
    ".product-gallery img",
    ".gallery img",
    ".ProductDetail img",
  ];

  for (
    const selector
    of selectors
  ) {
    const element =
      $(
        selector,
      ).first();

    if (
      element.length ===
      0
    ) {
      continue;
    }

    const source =
      element.attr(
        "src",
      ) ??
      element.attr(
        "data-src",
      ) ??
      element.attr(
        "data-original",
      ) ??
      element.attr(
        "data-lazy-src",
      );

    if (!source) {
      continue;
    }

    const absolute =
      resolveAbsoluteUrl(
        source,
        pageUrl,
      );

    if (
      absolute
    ) {
      return absolute;
    }
  }

  return null;
}

function extractOfis26StockInfo(
  html: string,
): Ofis26StockInfo {
  /*
   * Ofis26 / Ticimax ana
   * Ã¼rÃ¼n verisi:
   *
   * var productDetailModel = {
   *   product: {
   *     stokAdedi: 12.0,
   *     aktif: true,
   *     anaUrun: true
   *   }
   * }
   */

  /*
   * Ã–nce productDetailModel
   * bloÄŸunu mÃ¼mkÃ¼n olduÄŸunca
   * gÃ¼venli ÅŸekilde ayÄ±rÄ±yoruz.
   */
  const startMarker =
    "var productDetailModel =";

  const startIndex =
    html.indexOf(
      startMarker,
    );

  if (
    startIndex >= 0
  ) {
    const jsonStart =
      html.indexOf(
        "{",
        startIndex +
          startMarker.length,
      );

    if (
      jsonStart >= 0
    ) {
      let depth =
        0;

      let inString =
        false;

      let escaped =
        false;

      let jsonEnd =
        -1;

      for (
        let index =
          jsonStart;
        index <
        html.length;
        index += 1
      ) {
        const char =
          html[
            index
          ];

        if (
          inString
        ) {
          if (
            escaped
          ) {
            escaped =
              false;

            continue;
          }

          if (
            char ===
            "\\"
          ) {
            escaped =
              true;

            continue;
          }

          if (
            char ===
            '"'
          ) {
            inString =
              false;
          }

          continue;
        }

        if (
          char ===
          '"'
        ) {
          inString =
            true;

          continue;
        }

        if (
          char ===
          "{"
        ) {
          depth +=
            1;

          continue;
        }

        if (
          char ===
          "}"
        ) {
          depth -=
            1;

          if (
            depth ===
            0
          ) {
            jsonEnd =
              index +
              1;

            break;
          }
        }
      }

      if (
        jsonEnd >
        jsonStart
      ) {
        const rawJson =
          html.slice(
            jsonStart,
            jsonEnd,
          );

        try {
          const model =
            JSON.parse(
              rawJson,
            ) as {
              product?: {
                stokAdedi?: number;

                aktif?: boolean;

                anaUrun?: boolean;
              };
            };

          const product =
            model.product;

          if (
            product &&
            product.anaUrun !==
              false
          ) {
            const stockAmount =
              product.stokAdedi;

            if (
              typeof stockAmount ===
                "number" &&
              Number.isFinite(
                stockAmount,
              )
            ) {
              const normalizedStock =
                Math.max(
                  0,
                  Math.floor(
                    stockAmount,
                  ),
                );

              return {
                stockAmount:
                  normalizedStock,

                stockStatus:
                  normalizedStock >
                  0
                    ? CompetitorStockStatus.IN_STOCK
                    : CompetitorStockStatus.OUT_OF_STOCK,
              };
            }
          }
        } catch {
          /*
           * Parse baÅŸarÄ±sÄ±zsa
           * regex yedeÄŸine geÃ§.
           */
        }
      }
    }
  }

  /*
   * Regex yedeÄŸi.
   *
   * productDetailModel
   * iÃ§erisinde ilk ana Ã¼rÃ¼nÃ¼n
   * stokAdedi deÄŸerini arÄ±yoruz.
   */
  const productModelSection =
    startIndex >= 0
      ? html.slice(
          startIndex,
          Math.min(
            html.length,
            startIndex +
              100_000,
          ),
        )
      : html;

  const stockMatch =
    productModelSection.match(
      /"stokAdedi"\s*:\s*(-?\d+(?:\.\d+)?)[\s\S]{0,10000}?"anaUrun"\s*:\s*true/i,
    ) ??
    productModelSection.match(
      /"anaUrun"\s*:\s*true[\s\S]{0,10000}?"stokAdedi"\s*:\s*(-?\d+(?:\.\d+)?)/i,
    );

  if (
    stockMatch?.[1] !==
    undefined
  ) {
    const parsed =
      Number(
        stockMatch[
          1
        ],
      );

    if (
      Number.isFinite(
        parsed,
      )
    ) {
      const normalizedStock =
        Math.max(
          0,
          Math.floor(
            parsed,
          ),
        );

      return {
        stockAmount:
          normalizedStock,

        stockStatus:
          normalizedStock >
          0
            ? CompetitorStockStatus.IN_STOCK
            : CompetitorStockStatus.OUT_OF_STOCK,
      };
    }
  }

  return {
    stockAmount:
      null,

    stockStatus:
      CompetitorStockStatus.UNKNOWN,
  };
}

async function fetchPageHtml(
  pageUrl: string,
): Promise<string> {
  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () =>
        controller.abort(),
      REQUEST_TIMEOUT_MS,
    );

  try {
    const response =
      await fetch(
        pageUrl,
        {
          method:
            "GET",

          headers: {
            "user-agent":
              USER_AGENT,

            accept:
              "text/html,application/xhtml+xml",

            "accept-language":
              "tr-TR,tr;q=0.9,en;q=0.7",
          },

          redirect:
            "follow",

          cache:
            "no-store",

          signal:
            controller.signal,
        },
      );

    if (
      !response.ok
    ) {
      throw new Error(
        `Ofis26 Ã¼rÃ¼n sayfasÄ± HTTP ${response.status} dÃ¶ndÃ¼rdÃ¼.`,
      );
    }

    const contentType =
      response.headers
        .get(
          "content-type",
        )
        ?.toLocaleLowerCase(
          "en-US",
        ) ??
      "";

    if (
      !contentType.includes(
        "text/html",
      )
    ) {
      throw new Error(
        "Ofis26 Ã¼rÃ¼n sayfasÄ± HTML olmayan iÃ§erik dÃ¶ndÃ¼rdÃ¼.",
      );
    }

    return await response.text();
  } finally {
    clearTimeout(
      timeout,
    );
  }
}

async function downloadImage(
  imageUrl: string,
): Promise<Buffer> {
  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () =>
        controller.abort(),
      REQUEST_TIMEOUT_MS,
    );

  try {
    const response =
      await fetch(
        imageUrl,
        {
          method:
            "GET",

          headers: {
            "user-agent":
              USER_AGENT,

            accept:
              "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
          },

          redirect:
            "follow",

          cache:
            "no-store",

          signal:
            controller.signal,
        },
      );

    if (
      !response.ok
    ) {
      throw new Error(
        `Ofis26 gÃ¶rseli HTTP ${response.status} dÃ¶ndÃ¼rdÃ¼.`,
      );
    }

    const contentType =
      response.headers
        .get(
          "content-type",
        )
        ?.toLocaleLowerCase(
          "en-US",
        ) ??
      "";

    if (
      !contentType.startsWith(
        "image/",
      )
    ) {
      throw new Error(
        "Ofis26 gÃ¶rsel adresi image/* iÃ§erik dÃ¶ndÃ¼rmedi.",
      );
    }

    const arrayBuffer =
      await response.arrayBuffer();

    return Buffer.from(
      arrayBuffer,
    );
  } finally {
    clearTimeout(
      timeout,
    );
  }
}

export class Ofis26SupplierSyncService {
  static async syncMapping(
    mappingId: number,
  ): Promise<Ofis26SupplierSyncResult> {
    const mapping =
      await prisma.competitorProduct
        .findFirst({
          where: {
            id:
              mappingId,

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
          },

          include: {
            product: {
              select: {
                id:
                  true,

                code:
                  true,

                name:
                  true,

                imageUrl:
                  true,

                stock:
                  true,

                price:
                  true,
              },
            },

            competitorSite: {
              select: {
                id:
                  true,

                code:
                  true,

                name:
                  true,

                baseUrl:
                  true,

                defaultVatRate:
                  true,
              },
            },
          },
        });

    if (
      !mapping
    ) {
      return {
        success:
          false,

        message:
          "Aktif Ofis26 Ã¼rÃ¼n eÅŸleÅŸtirmesi bulunamadÄ±.",
      };
    }

    if (
      isPendingUrl(
        mapping.productUrl,
      )
    ) {
      return {
        success:
          false,

        productCode:
          mapping.product
            .code,

        message:
          `${mapping.product.code} iÃ§in gerÃ§ek Ofis26 Ã¼rÃ¼n URL'si henÃ¼z eÅŸleÅŸtirilmedi.`,
      };
    }

    const vatRate =
      mapping.vatRate ??
      mapping
        .competitorSite
        .defaultVatRate;

    /*
     * SayfayÄ± bir kez Ã§ekiyoruz.
     * Stok ve gÃ¶rsel aynÄ± HTML'den
     * okunuyor.
     */
    let pageHtml:
      string;

    try {
      pageHtml =
        await fetchPageHtml(
          mapping.productUrl,
        );
    } catch (
      error
    ) {
      const message =
        error instanceof
        Error
          ? error.message
          : "Ofis26 Ã¼rÃ¼n sayfasÄ± okunamadÄ±.";

      await prisma
        .competitorProduct
        .update({
          where: {
            id:
              mapping.id,
          },

          data: {
            lastCheckedAt:
              new Date(),

            lastError:
              message,
          },
        });

      return {
        success:
          false,

        productCode:
          mapping.product
            .code,

        message,
      };
    }

    const ofis26StockInfo =
      extractOfis26StockInfo(
        pageHtml,
      );

    /*
     * Fiyat iÃ§in mevcut genel
     * fiyat okuyucuyu kullanÄ±yoruz.
     */
    const result =
      await CompetitorPriceFetchService
        .fetchPrice({
          productUrl:
            mapping.productUrl,

          competitorBaseUrl:
            mapping
              .competitorSite
              .baseUrl,

          vatRate,
        });

    const isSuccess =
      result.fetchStatus ===
        CompetitorPriceFetchStatus.SUCCESS;

    if (
      !isSuccess ||
      result.priceInclVat ===
        null
    ) {
      await prisma.$transaction([
        prisma
          .competitorPriceHistory
          .create({
            data: {
              competitorProductId:
                mapping.id,

              priceExclVat:
                result.priceExclVat,

              priceInclVat:
                result.priceInclVat,

              currency:
                result.currency,

              vatRate:
                result.vatRate,

              stockStatus:
                ofis26StockInfo
                  .stockStatus !==
                CompetitorStockStatus.UNKNOWN
                  ? ofis26StockInfo
                      .stockStatus
                  : result.stockStatus,

              fetchStatus:
                result.fetchStatus,

              rawPriceText:
                result.rawPriceText,

              errorMessage:
                result.errorMessage,

              checkedAt:
                result.checkedAt,
            },
          }),

        prisma
          .competitorProduct
          .update({
            where: {
              id:
                mapping.id,
            },

            data: {
              lastCheckedAt:
                result.checkedAt,

              lastStockStatus:
                ofis26StockInfo
                  .stockStatus !==
                CompetitorStockStatus.UNKNOWN
                  ? ofis26StockInfo
                      .stockStatus
                  : mapping.lastStockStatus,

              lastError:
                result.errorMessage ??
                "Ofis26 senkronizasyonu baÅŸarÄ±sÄ±z oldu.",
            },
          }),
      ]);

      /*
       * Fiyat okunamadÄ±ysa satÄ±ÅŸ
       * fiyatÄ±nÄ± deÄŸiÅŸtirmiyoruz.
       *
       * Ancak gerÃ§ek stok okunabildiyse
       * stok bilgisini gÃ¼venle
       * gÃ¼ncelleyebiliriz.
       */
      if (
        ofis26StockInfo
          .stockAmount !==
        null
      ) {
        await prisma.product.update({
          where: {
            id:
              mapping.product
                .id,
          },

          data: {
            stock:
              ofis26StockInfo
                .stockAmount,

            isActive:
              true,

            ownStock:
              false,

            supplier:
              "Ofis26",
          },
        });
      }

      return {
        success:
          false,

        productCode:
          mapping.product
            .code,

        stockStatus:
          ofis26StockInfo
            .stockStatus,

        stock:
          ofis26StockInfo
            .stockAmount ??
          undefined,

        message:
          result.errorMessage ??
          "Ofis26 fiyatÄ± okunamadÄ±.",
      };
    }

    const ofis26Price =
      result.priceInclVat;

    const etkenPrice =
      calculateEtkenPrice(
        ofis26Price,
      );

    const effectiveStockStatus =
      ofis26StockInfo
        .stockStatus !==
      CompetitorStockStatus.UNKNOWN
        ? ofis26StockInfo
            .stockStatus
        : result.stockStatus;

    const updateStock =
      ofis26StockInfo
        .stockAmount !==
      null;

    const nextStock =
      ofis26StockInfo
        .stockAmount;

    /*
     * CanlÄ± fiyat + canlÄ± stok
     * kaydÄ±.
     */
    await prisma.$transaction([
      prisma
        .competitorPriceHistory
        .create({
          data: {
            competitorProductId:
              mapping.id,

            priceExclVat:
              result.priceExclVat,

            priceInclVat:
              result.priceInclVat,

            currency:
              result.currency,

            vatRate:
              result.vatRate,

            stockStatus:
              effectiveStockStatus,

            fetchStatus:
              result.fetchStatus,

            rawPriceText:
              result.rawPriceText,

            errorMessage:
              result.errorMessage,

            checkedAt:
              result.checkedAt,
          },
        }),

      prisma
        .competitorProduct
        .update({
          where: {
            id:
              mapping.id,
          },

          data: {
            competitorName:
              result.productName ??
              mapping.competitorName,

            lastPriceExclVat:
              result.priceExclVat,

            lastPriceInclVat:
              result.priceInclVat,

            lastCurrency:
              result.currency,

            lastStockStatus:
              effectiveStockStatus,

            lastCheckedAt:
              result.checkedAt,

            lastSuccessAt:
              result.checkedAt,

            lastError:
              null,
          },
        }),

      prisma.product.update({
        where: {
          id:
            mapping.product
              .id,
        },

        data: {
          /*
           * Excel fiyatÄ± artÄ±k
           * dikkate alÄ±nmaz.
           *
           * CanlÄ± Ofis26 fiyatÄ± /
           * 1.20 kullanılır.
           */
          price:
            etkenPrice,

          ...(
            updateStock &&
            nextStock !==
              null
              ? {
                  stock:
                    nextStock,
                }
              : {}
          ),

          /*
           * Stok 0 olsa bile Ã¼rÃ¼n
           * sayfasÄ± yayÄ±nda kalÄ±r.
           */
          isActive:
            true,

          ownStock:
            false,

          supplier:
            "Ofis26",
        },
      }),
    ]);

    let imageUpdated =
      false;

    /*
     * GÃ¶rsel iÅŸlemi fiyat/stok
     * transaction'Ä±ndan ayrÄ±.
     *
     * GÃ¶rsel hatasÄ± fiyat ve
     * stok senkronunu bozmaz.
     */
    try {
      const imageUrl =
        extractImageUrl(
          pageHtml,
          mapping.productUrl,
        );

      if (
        imageUrl
      ) {
        /*
         * Ürünün daha önce kalıcı GCS görseli
         * oluşturulmuşsa bunu koruyoruz.
         *
         * Eski geliştirme ortamından kalan
         * /products/... storageUrl kayıtları
         * production görselini tekrar local
         * URL'ye çevirmemeli.
         */
        const existingCloudSource =
          await prisma
            .productImageSource
            .findFirst({
              where: {
                productId:
                  mapping.product
                    .id,

                storageUrl: {
                  startsWith:
                    "https://storage.googleapis.com/",
                },
              },

              orderBy: [
                {
                  isVerified:
                    "desc",
                },

                {
                  isPrimary:
                    "desc",
                },

                {
                  updatedAt:
                    "desc",
                },
              ],
            });

        const existingSource =
          await prisma
            .productImageSource
            .findFirst({
              where: {
                productId:
                  mapping.product
                    .id,

                sourceUrl:
                  imageUrl,
              },
            });

        if (
          existingCloudSource
        ) {
          await prisma.$transaction(
            async (
              tx,
            ) => {
              await tx
                .productImageSource
                .updateMany({
                  where: {
                    productId:
                      mapping.product
                        .id,

                    isPrimary:
                      true,

                    id: {
                      not:
                        existingCloudSource.id,
                    },
                  },

                  data: {
                    isPrimary:
                      false,
                  },
                });

              if (
                !existingCloudSource
                  .isPrimary
              ) {
                await tx
                  .productImageSource
                  .update({
                    where: {
                      id:
                        existingCloudSource.id,
                    },

                    data: {
                      isPrimary:
                        true,
                    },
                  });
              }

              if (
                mapping.product
                  .imageUrl !==
                existingCloudSource
                  .storageUrl
              ) {
                await tx.product.update({
                  where: {
                    id:
                      mapping.product
                        .id,
                  },

                  data: {
                    imageUrl:
                      existingCloudSource
                        .storageUrl,
                  },
                });
              }
            },
          );

          imageUpdated =
            mapping.product
              .imageUrl !==
            existingCloudSource
              .storageUrl;

          return {
            success:
              true,

            productCode:
              mapping.product
                .code,

            ofis26Price,

            etkenPrice,

            stockStatus:
              effectiveStockStatus,

            stock:
              updateStock &&
              nextStock !==
                null
                ? nextStock
                : undefined,

            imageUpdated,

            message:
              `${mapping.product.code} senkronize edildi. ` +
              `Ofis26: ${ofis26Price.toLocaleString(
                "tr-TR",
                {
                  minimumFractionDigits:
                    2,
                  maximumFractionDigits:
                    2,
                },
              )} TL`,
          };
        }

        if (
          !existingSource
        ) {
          const sourceBuffer =
            await downloadImage(
              imageUrl,
            );

          const storageUrl =
            await ProductImageStorageService
              .store(
                mapping.product
                  .code,

                sourceBuffer,
              );

          await prisma.$transaction(
            async (
              tx,
            ) => {
              await tx
                .productImageSource
                .updateMany({
                  where: {
                    productId:
                      mapping
                        .product
                        .id,

                    isPrimary:
                      true,
                  },

                  data: {
                    isPrimary:
                      false,
                  },
                });

              await tx
                .productImageSource
                .create({
                  data: {
                    productId:
                      mapping
                        .product
                        .id,

                    sourceType:
                      "SUPPLIER",

                    sourceSite:
                      OFIS26_SITE_CODE,

                    sourcePageUrl:
                      mapping
                        .productUrl,

                    sourceUrl:
                      imageUrl,

                    storageUrl,

                    isPrimary:
                      true,

                    isVerified:
                      true,

                    verificationCount:
                      1,

                    sortOrder:
                      0,
                  },
                });

              await tx
                .product
                .update({
                  where: {
                    id:
                      mapping
                        .product
                        .id,
                  },

                  data: {
                    imageUrl:
                      storageUrl,
                  },
                });
            },
          );

          imageUpdated =
            true;
        } else if (
          existingSource.storageUrl &&
          mapping.product
            .imageUrl !==
            existingSource.storageUrl
        ) {
          await prisma
            .product
            .update({
              where: {
                id:
                  mapping
                    .product
                    .id,
              },

              data: {
                imageUrl:
                  existingSource
                    .storageUrl,
              },
            });
        }
      }
    } catch (
      error
    ) {
      console.error(
        `Ofis26 image sync failed for ${mapping.product.code}:`,
        error,
      );
    }

    return {
      success:
        true,

      productCode:
        mapping.product
          .code,

      ofis26Price,

      etkenPrice,

      stockStatus:
        effectiveStockStatus,

      stock:
        updateStock &&
        nextStock !==
          null
          ? nextStock
          : undefined,

      imageUpdated,

      message:
        `${mapping.product.code} senkronize edildi. ` +
        `Ofis26: ${ofis26Price.toLocaleString(
          "tr-TR",
          {
            minimumFractionDigits:
              2,

            maximumFractionDigits:
              2,
          },
        )} TL, ` +
        `Etken: ${etkenPrice.toLocaleString(
          "tr-TR",
          {
            minimumFractionDigits:
              2,

            maximumFractionDigits:
              2,
          },
        )} TL, ` +
        `Ofis26 stok: ${
          nextStock ===
          null
            ? "bilinmiyor"
            : nextStock
        }.`,
    };
  }
}

