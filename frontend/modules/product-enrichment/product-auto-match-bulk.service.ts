import {
  CompetitorProductEnrichmentStatus,
  Prisma,
  ProductCompetitorMatchStatus,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { B2B_CONSTANTS } from "@/modules/b2b/constants/b2b.constants";
import { CompetitorProductSearchService } from "@/modules/competitor-prices/competitor-product-search.service";

import { ProductEnrichmentPersistenceService } from "./product-enrichment-persistence.service";
import { ProductEnrichmentService } from "./product-enrichment.service";

type ProductAutoMatchItemStatus =
  | "AUTO_MATCHED"
  | "REVIEW"
  | "NO_MATCH"
  | "SEARCH_ERROR"
  | "ENRICHMENT_PARTIAL"
  | "ERROR";

type ProductAutoMatchItemResult = {
  productId: number;
  productCode: string;
  productName: string;

  competitorSiteId: number | null;
  competitorSiteName: string | null;

  status: ProductAutoMatchItemStatus;

  candidateTitle: string | null;
  candidateUrl: string | null;
  candidateScore: number | null;

  message: string;
};

export type ProductAutoMatchBulkResult = {
  processedProducts: number;

  autoMatchedCount: number;
  reviewCount: number;
  noMatchCount: number;
  searchErrorCount: number;
  errorCount: number;

  remainingProductCount: number;

  items: ProductAutoMatchItemResult[];
};

type ActiveCompetitorSite = {
  id: number;
  code: string;
  name: string;
  baseUrl: string;
  defaultVatRate: number | null;
  searchUrlTemplate: string | null;
  productUrlPattern: string | null;
  searchResultLimit: number;
};

function normalizeUrl(
  rawValue: string,
): string {
  const url =
    new URL(rawValue);

  url.hash = "";

  return url.toString();
}

function isAttemptFinished(
  status: ProductCompetitorMatchStatus,
): boolean {
  return (
    status ===
      ProductCompetitorMatchStatus.AUTO_MATCHED ||
    status ===
      ProductCompetitorMatchStatus.REVIEW ||
    status ===
      ProductCompetitorMatchStatus.NO_MATCH ||
    status ===
      ProductCompetitorMatchStatus.SEARCH_ERROR
  );
}

async function getActiveCompetitorSites(): Promise<
  ActiveCompetitorSite[]
> {
  return prisma.competitorSite.findMany({
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
      defaultVatRate: true,

      searchUrlTemplate: true,
      productUrlPattern: true,
      searchResultLimit: true,
    },

    orderBy: {
      id: "asc",
    },
  });
}

export class ProductAutoMatchBulkService {
  /*
   * Gerçek kuyruk sayısı.
   *
   * Rakip eşleşmesi olmayan ve en az
   * bir aktif rakip sitede henüz
   * denenmemiş/PENDING araması bulunan
   * ürünleri sayar.
   */
  static async getUnmatchedProductCount(): Promise<number> {
    const competitorSites =
      await getActiveCompetitorSites();

    if (
      competitorSites.length ===
      0
    ) {
      return 0;
    }

    const activeSiteIds =
      competitorSites.map(
        (site) =>
          site.id,
      );

    const products =
      await prisma.product.findMany({
        where: {
          tenantId:
            B2B_CONSTANTS.TENANT_ID,

          companyId:
            B2B_CONSTANTS.COMPANY_ID,

          isActive: true,

          competitorProducts: {
            none: {
              isActive: true,
            },
          },
        },

        select: {
          id: true,

          competitorMatchAttempts: {
            where: {
              competitorSiteId: {
                in:
                  activeSiteIds,
              },
            },

            select: {
              competitorSiteId:
                true,

              status:
                true,
            },
          },
        },
      });

    return products.filter(
      (product) => {
        const attemptsBySite =
          new Map(
            product.competitorMatchAttempts.map(
              (attempt) => [
                attempt.competitorSiteId,
                attempt.status,
              ],
            ),
          );

        return competitorSites.some(
          (site) => {
            const status =
              attemptsBySite.get(
                site.id,
              );

            return (
              !status ||
              status ===
                ProductCompetitorMatchStatus.PENDING
            );
          },
        );
      },
    ).length;
  }

  static async runBatch(
    batchSize = 5,
  ): Promise<ProductAutoMatchBulkResult> {
    /*
     * Rakip sitelere gerçek HTTP
     * sorguları yapıldığı için batch
     * küçük tutuluyor.
     */
    const safeBatchSize =
      Math.min(
        Math.max(
          Math.trunc(
            batchSize,
          ),
          1,
        ),
        25,
      );

    const competitorSites =
      await getActiveCompetitorSites();

    if (
      competitorSites.length ===
      0
    ) {
      throw new Error(
        "Otomatik ürün araması açık aktif rakip site bulunamadı.",
      );
    }

    const activeSiteIds =
      competitorSites.map(
        (site) =>
          site.id,
      );

    /*
     * Burada take kullanmıyoruz.
     *
     * Çünkü listenin başındaki ürünler
     * NO_MATCH/REVIEW olmuş olabilir.
     * take: 10 kullansaydık aynı ilk
     * ürün grubu kuyruğu bloke edebilirdi.
     *
     * Maksimum ürün sayımız açısından
     * bu sorgu güvenlidir; yalnızca hafif
     * alanlar ve attempt statüleri çekilir.
     */
    const unmatchedProducts =
      await prisma.product.findMany({
        where: {
          tenantId:
            B2B_CONSTANTS.TENANT_ID,

          companyId:
            B2B_CONSTANTS.COMPANY_ID,

          isActive: true,

          competitorProducts: {
            none: {
              isActive: true,
            },
          },
        },

        select: {
          id: true,
          tenantId: true,
          companyId: true,

          code: true,
          barcode: true,

          name: true,
          brand: true,

          competitorMatchAttempts: {
            where: {
              competitorSiteId: {
                in:
                  activeSiteIds,
              },
            },

            select: {
              id: true,

              competitorSiteId:
                true,

              status:
                true,
            },
          },
        },

        orderBy: {
          id: "asc",
        },
      });

    /*
     * En az bir rakip sitede henüz
     * denenmemiş veya PENDING kaydı
     * bulunan ürünleri gerçek kuyruğa
     * alıyoruz.
     */
    const queuedProducts =
      unmatchedProducts
        .filter(
          (product) => {
            const attemptsBySite =
              new Map(
                product.competitorMatchAttempts.map(
                  (attempt) => [
                    attempt.competitorSiteId,
                    attempt.status,
                  ],
                ),
              );

            return competitorSites.some(
              (site) => {
                const status =
                  attemptsBySite.get(
                    site.id,
                  );

                return (
                  !status ||
                  status ===
                    ProductCompetitorMatchStatus.PENDING
                );
              },
            );
          },
        )
        .slice(
          0,
          safeBatchSize,
        );

    const items:
      ProductAutoMatchItemResult[] =
      [];

    for (
      const product of
      queuedProducts
    ) {
      let productHandled =
        false;

      let foundReviewCandidate =
        false;

      let hadSuccessfulSearch =
        false;

      let lastSearchError:
        string | null =
        null;

      const attemptsBySite =
        new Map(
          product.competitorMatchAttempts.map(
            (attempt) => [
              attempt.competitorSiteId,
              attempt.status,
            ],
          ),
        );

      for (
        const site of
        competitorSites
      ) {
        if (
          !site.searchUrlTemplate
        ) {
          continue;
        }

        const currentAttemptStatus =
          attemptsBySite.get(
            site.id,
          );

        /*
         * Bu site daha önce tamamlanmışsa
         * tekrar sorgulama.
         */
        if (
          currentAttemptStatus &&
          isAttemptFinished(
            currentAttemptStatus,
          )
        ) {
          continue;
        }

        /*
         * Arama başlamadan PENDING kaydı
         * oluşturuyoruz.
         *
         * İşlem ortada kesilirse kayıt
         * PENDING kalır ve sonraki batch
         * yeniden deneyebilir.
         */
        await prisma.productCompetitorMatchAttempt.upsert({
          where: {
            productId_competitorSiteId: {
              productId:
                product.id,

              competitorSiteId:
                site.id,
            },
          },

          create: {
            tenantId:
              product.tenantId,

            companyId:
              product.companyId,

            productId:
              product.id,

            competitorSiteId:
              site.id,

            status:
              ProductCompetitorMatchStatus.PENDING,

            message:
              "Rakip ürün araması başlatıldı.",
          },

          update: {
            status:
              ProductCompetitorMatchStatus.PENDING,

            message:
              "Rakip ürün araması yeniden başlatıldı.",
          },
        });

        try {
          const searchResult =
            await CompetitorProductSearchService.search(
              {
                productCode:
                  product.code,

                productName:
                  product.name,

                productBrand:
                  product.brand,

                productBarcode:
                  product.barcode,

                competitorBaseUrl:
                  site.baseUrl,

                searchUrlTemplate:
                  site.searchUrlTemplate,

                productUrlPattern:
                  site.productUrlPattern,

                resultLimit:
                  site.searchResultLimit,
              },
            );

          if (
            !searchResult.success
          ) {
            lastSearchError =
              `${site.name}: ${searchResult.message}`;

            await prisma.productCompetitorMatchAttempt.update({
              where: {
                productId_competitorSiteId: {
                  productId:
                    product.id,

                  competitorSiteId:
                    site.id,
                },
              },

              
              data: {
                status:
                  ProductCompetitorMatchStatus.SEARCH_ERROR,

                candidateTitle:
                  null,

                candidateUrl:
                  null,

                candidateScore:
                  null,

                highConfidenceCount:
                  0,

                reviewCount:
                  0,

                rejectedCount:
                  0,

                message:
                  searchResult.message,

                searchedAt:
                  new Date(),
              },
            });

            continue;
          }

          hadSuccessfulSearch =
            true;

            const rejectedDecisions =
  await prisma.productCompetitorCandidateDecision.findMany({
    where: {
      tenantId:
        product.tenantId,

      companyId:
        product.companyId,

      productId:
        product.id,

      competitorSiteId:
        site.id,

      decision:
        "REJECTED",
    },

    select: {
      candidateUrl:
        true,
    },
  });

const rejectedUrls =
  new Set(
    rejectedDecisions.map(
      (decision) =>
        normalizeUrl(
          decision.candidateUrl,
        ),
    ),
  );

const availableCandidates =
  searchResult.candidates.filter(
    (candidate) =>
      !rejectedUrls.has(
        normalizeUrl(
          candidate.productUrl,
        ),
      ),
  );

          const highCandidates =
  availableCandidates.filter(
    (candidate) =>
      candidate.confidence ===
        "HIGH" &&
      candidate.variantMatched,
  );

const reviewCandidates =
  availableCandidates.filter(
    (candidate) =>
      candidate.confidence ===
      "REVIEW",
  );

const rejectedCandidates =
  availableCandidates.filter(
    (candidate) =>
      candidate.confidence ===
      "REJECTED",
  );

          const bestCandidate =
            highCandidates[0] ??
            reviewCandidates[0] ??
            availableCandidates[0] ??
            null;

          /*
           * Otomatik seçim için tam olarak
           * bir HIGH aday gerekiyor.
           */
          if (
            highCandidates.length !==
            1
          ) {
            const needsReview =
              highCandidates.length >
                1 ||
              reviewCandidates.length >
                0;

            if (
              needsReview
            ) {
              foundReviewCandidate =
                true;

              await prisma.productCompetitorMatchAttempt.update({
                where: {
                  productId_competitorSiteId: {
                    productId:
                      product.id,

                    competitorSiteId:
                      site.id,
                  },
                },

                data: {
                  status:
                    ProductCompetitorMatchStatus.REVIEW,

                  candidateTitle:
                    bestCandidate?.title ??
                    null,

                  candidateUrl:
                    bestCandidate?.productUrl ??
                    null,

                  candidateScore:
                    bestCandidate?.score ??
                    null,

                  highConfidenceCount:
                    highCandidates.length,

                  reviewCount:
                    reviewCandidates.length,

                  rejectedCount:
                    rejectedCandidates.length,

                  message:
                    highCandidates.length >
                    1
                      ? "Birden fazla yüksek güvenli aday bulundu. Manuel inceleme gerekli."
                      : "Aday bulundu ancak güven seviyesi otomatik eşleştirme için yeterli değil.",

                  searchedAt:
                    new Date(),
                },
              });

              continue;
            }

            /*
             * Yalnızca REJECTED adaylar var
             * veya hiçbir güvenli aday yok.
             */
            await prisma.productCompetitorMatchAttempt.update({
              where: {
                productId_competitorSiteId: {
                  productId:
                    product.id,

                  competitorSiteId:
                    site.id,
                },
              },

              data: {
                status:
                  ProductCompetitorMatchStatus.NO_MATCH,

                candidateTitle:
                  bestCandidate?.title ??
                  null,

                candidateUrl:
                  bestCandidate?.productUrl ??
                  null,

                candidateScore:
                  bestCandidate?.score ??
                  null,

                highConfidenceCount:
                  highCandidates.length,

                reviewCount:
                  reviewCandidates.length,

                rejectedCount:
                  rejectedCandidates.length,

                message:
                  "Güvenli otomatik ürün eşleşmesi bulunamadı.",

                searchedAt:
                  new Date(),
              },
            });

            continue;
          }

          const candidate =
            highCandidates[0];

          const normalizedProductUrl =
            normalizeUrl(
              candidate.productUrl,
            );

          /*
           * Aynı ürün başka bir işlem
           * tarafından eşleştirildiyse
           * duplicate üretme.
           */
          const existingMapping =
            await prisma.competitorProduct.findFirst({
              where: {
                tenantId:
                  product.tenantId,

                companyId:
                  product.companyId,

                productId:
                  product.id,

                isActive:
                  true,
              },

              select: {
                id: true,
              },
            });

          if (
            existingMapping
          ) {
            await prisma.productCompetitorMatchAttempt.update({
              where: {
                productId_competitorSiteId: {
                  productId:
                    product.id,

                  competitorSiteId:
                    site.id,
                },
              },

              data: {
                status:
                  ProductCompetitorMatchStatus.AUTO_MATCHED,

                candidateTitle:
                  candidate.title,

                candidateUrl:
                  normalizedProductUrl,

                candidateScore:
                  candidate.score,

                highConfidenceCount:
                  highCandidates.length,

                reviewCount:
                  reviewCandidates.length,

                rejectedCount:
                  rejectedCandidates.length,

                message:
                  "Ürün zaten aktif bir rakip ürünle eşleştirilmiş.",

                searchedAt:
                  new Date(),
              },
            });

            productHandled =
              true;

            items.push({
              productId:
                product.id,

              productCode:
                product.code,

              productName:
                product.name,

              competitorSiteId:
                site.id,

              competitorSiteName:
                site.name,

              status:
                "AUTO_MATCHED",

              candidateTitle:
                candidate.title,

              candidateUrl:
                normalizedProductUrl,

              candidateScore:
                candidate.score,

              message:
                "Ürün zaten başka bir işlem tarafından eşleştirilmiş.",
            });

            break;
          }

          let competitorProductId:
            number;

          try {
            const mapping =
              await prisma.competitorProduct.create({
                data: {
                  tenantId:
                    product.tenantId,

                  companyId:
                    product.companyId,

                  productId:
                    product.id,

                  competitorSiteId:
                    site.id,

                  productUrl:
                    normalizedProductUrl,

                  competitorName:
                    candidate.title,

                  competitorSku:
                    null,

                  vatRate:
                    site.defaultVatRate,

                  isActive:
                    true,

                  enrichmentStatus:
                    CompetitorProductEnrichmentStatus.PENDING,
                },

                select: {
                  id: true,
                },
              });

            competitorProductId =
              mapping.id;
          } catch (error) {
            if (
              error instanceof
                Prisma.PrismaClientKnownRequestError &&
              error.code ===
                "P2002"
            ) {
              const existing =
                await prisma.competitorProduct.findFirst({
                  where: {
                    productId:
                      product.id,

                    competitorSiteId:
                      site.id,
                  },

                  select: {
                    id: true,
                  },
                });

              if (!existing) {
                throw error;
              }

              competitorProductId =
                existing.id;
            } else {
              throw error;
            }
          }

          /*
           * Arama denemesi artık otomatik
           * eşleşti olarak kapanıyor.
           */
          await prisma.productCompetitorMatchAttempt.update({
            where: {
              productId_competitorSiteId: {
                productId:
                  product.id,

                competitorSiteId:
                  site.id,
              },
            },

            data: {
              status:
                ProductCompetitorMatchStatus.AUTO_MATCHED,

              candidateTitle:
                candidate.title,

              candidateUrl:
                normalizedProductUrl,

              candidateScore:
                candidate.score,

              highConfidenceCount:
                highCandidates.length,

              reviewCount:
                reviewCandidates.length,

              rejectedCount:
                rejectedCandidates.length,

              message:
                "Yüksek güvenli ve varyant uyumlu aday otomatik eşleştirildi.",

              searchedAt:
                new Date(),
            },
          });

          /*
           * Eşleşme sonrası master
           * enrichment aynı işlemde
           * çalıştırılıyor.
           */
          const enrichment =
            await ProductEnrichmentService.enrichFromUrl(
              normalizedProductUrl,
            );

          if (
            !enrichment.success
          ) {
            await prisma.competitorProduct.update({
              where: {
                id:
                  competitorProductId,
              },

              data: {
                enrichmentStatus:
                  CompetitorProductEnrichmentStatus.ERROR,

                lastEnrichedAt:
                  new Date(),

                enrichmentMessage:
                  enrichment.message,
              },
            });

            items.push({
              productId:
                product.id,

              productCode:
                product.code,

              productName:
                product.name,

              competitorSiteId:
                site.id,

              competitorSiteName:
                site.name,

              status:
                "ENRICHMENT_PARTIAL",

              candidateTitle:
                candidate.title,

              candidateUrl:
                normalizedProductUrl,

              candidateScore:
                candidate.score,

              message:
                `Rakip ürün otomatik eşleştirildi ancak master zenginleştirmesi tamamlanamadı: ${enrichment.message}`,
            });

            productHandled =
              true;

            break;
          }

          const persistence =
            await ProductEnrichmentPersistenceService.persist(
              {
                productId:
                  product.id,

                tenantId:
                  product.tenantId,

                companyId:
                  product.companyId,

                sourceSite:
                  site.code,

                result:
                  enrichment,
              },
            );

          const fullyEnriched =
            persistence.barcodeCount >
              0 &&
            persistence.imageCount >
              0;

          const enrichmentStatus =
            fullyEnriched
              ? CompetitorProductEnrichmentStatus.SUCCESS
              : CompetitorProductEnrichmentStatus.PARTIAL;

          const enrichmentMessage =
            fullyEnriched
              ? `Otomatik eşleştirme ve master zenginleştirmesi tamamlandı: ${persistence.barcodeCount} barkod, ${persistence.imageCount} görsel.`
              : `Otomatik eşleştirme tamamlandı. Master veri kısmi: ${persistence.barcodeCount} barkod, ${persistence.imageCount} görsel.`;

          await prisma.competitorProduct.update({
            where: {
              id:
                competitorProductId,
            },

            data: {
              enrichmentStatus,

              lastEnrichedAt:
                new Date(),

              enrichmentMessage,

              enrichmentBarcodeCount:
                persistence.barcodeCount,

              enrichmentImageCount:
                persistence.imageCount,
            },
          });

          items.push({
            productId:
              product.id,

            productCode:
              product.code,

            productName:
              product.name,

            competitorSiteId:
              site.id,

            competitorSiteName:
              site.name,

            status:
              fullyEnriched
                ? "AUTO_MATCHED"
                : "ENRICHMENT_PARTIAL",

            candidateTitle:
              candidate.title,

            candidateUrl:
              normalizedProductUrl,

            candidateScore:
              candidate.score,

            message:
              enrichmentMessage,
          });

          productHandled =
            true;

          break;
        } catch (error) {
          console.error(
            "Automatic competitor product matching failed:",
            {
              productId:
                product.id,

              productCode:
                product.code,

              competitorSiteId:
                site.id,

              competitorSite:
                site.name,

              error,
            },
          );

          const errorMessage =
            error instanceof Error
              ? error.message
              : "Bilinmeyen hata.";

          lastSearchError =
            `${site.name}: ${errorMessage}`;

          /*
           * PENDING durumda bırakmak yerine
           * SEARCH_ERROR yapıyoruz.
           * Daha sonra özel Retry aksiyonu
           * ile tekrar PENDING yapılabilir.
           */
          try {
            await prisma.productCompetitorMatchAttempt.update({
              where: {
                productId_competitorSiteId: {
                  productId:
                    product.id,

                  competitorSiteId:
                    site.id,
                },
              },

              data: {
                status:
                  ProductCompetitorMatchStatus.SEARCH_ERROR,

                message:
                  errorMessage,

                searchedAt:
                  new Date(),
              },
            });
          } catch (
            attemptUpdateError
          ) {
            console.error(
              "Product competitor match attempt error status could not be saved:",
              attemptUpdateError,
            );
          }
        }
      }

      if (
        productHandled
      ) {
        continue;
      }

      if (
        foundReviewCandidate
      ) {
        items.push({
          productId:
            product.id,

          productCode:
            product.code,

          productName:
            product.name,

          competitorSiteId:
            null,

          competitorSiteName:
            null,

          status:
            "REVIEW",

          candidateTitle:
            null,

          candidateUrl:
            null,

          candidateScore:
            null,

          message:
            "Bir veya daha fazla aday bulundu ancak otomatik eşleştirme için sonuç yeterince kesin değil.",
        });

        continue;
      }

      if (
        !hadSuccessfulSearch &&
        lastSearchError
      ) {
        items.push({
          productId:
            product.id,

          productCode:
            product.code,

          productName:
            product.name,

          competitorSiteId:
            null,

          competitorSiteName:
            null,

          status:
            "SEARCH_ERROR",

          candidateTitle:
            null,

          candidateUrl:
            null,

          candidateScore:
            null,

          message:
            lastSearchError,
        });

        continue;
      }

      items.push({
        productId:
          product.id,

        productCode:
          product.code,

        productName:
          product.name,

        competitorSiteId:
          null,

        competitorSiteName:
          null,

        status:
          "NO_MATCH",

        candidateTitle:
          null,

        candidateUrl:
          null,

        candidateScore:
          null,

        message:
          "Aktif rakip sitelerde güvenli otomatik ürün eşleşmesi bulunamadı.",
      });
    }

    const remainingProductCount =
      await this.getUnmatchedProductCount();

    return {
      processedProducts:
        items.length,

      autoMatchedCount:
        items.filter(
          (item) =>
            item.status ===
              "AUTO_MATCHED" ||
            item.status ===
              "ENRICHMENT_PARTIAL",
        ).length,

      reviewCount:
        items.filter(
          (item) =>
            item.status ===
            "REVIEW",
        ).length,

      noMatchCount:
        items.filter(
          (item) =>
            item.status ===
            "NO_MATCH",
        ).length,

      searchErrorCount:
        items.filter(
          (item) =>
            item.status ===
            "SEARCH_ERROR",
        ).length,

      errorCount:
        items.filter(
          (item) =>
            item.status ===
            "ERROR",
        ).length,

      remainingProductCount,

      items,
    };
  }
}