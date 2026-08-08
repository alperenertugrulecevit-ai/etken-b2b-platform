"use server";

import {
  CompetitorProductEnrichmentStatus,
  Prisma,
  ProductCompetitorMatchStatus,
} from "@prisma/client";

import {
  revalidatePath,
} from "next/cache";

import {
  redirect,
} from "next/navigation";

import {
  prisma,
} from "@/lib/prisma";

import {
  AuthorizationService,
} from "@/modules/authorization/services/authorization.service";

import {
  B2B_CONSTANTS,
} from "@/modules/b2b/constants/b2b.constants";

import {
  ProductEnrichmentPersistenceService,
} from "@/modules/product-enrichment/product-enrichment-persistence.service";

import {
  ProductEnrichmentService,
} from "@/modules/product-enrichment/product-enrichment.service";

function revalidateReviewPaths(): void {
  revalidatePath(
    "/admin/products",
  );

  revalidatePath(
    "/admin/products/enrichment",
  );

  revalidatePath(
    "/admin/products/enrichment/review",
  );

  revalidatePath(
    "/admin/competitor-prices",
  );

  revalidatePath(
    "/admin/competitor-prices/mappings",
  );
}

function buildRedirectUrl({
  status,
  message,
}: {
  status:
    | "success"
    | "warning"
    | "error";

  message: string;
}): string {
  const query =
    new URLSearchParams({
      status,
      message,
    });

  return `/admin/products/enrichment/review?${query.toString()}`;
}

export async function approveReviewAttempt(
  attemptId: number,
): Promise<void> {
  await AuthorizationService.requirePermission(
    "INVENTORY_ADJUST",
  );

  if (
    !Number.isInteger(attemptId) ||
    attemptId <= 0
  ) {
    redirect(
      buildRedirectUrl({
        status:
          "error",

        message:
          "Geçersiz inceleme kaydı.",
      }),
    );
  }

  try {
    const attempt =
      await prisma.productCompetitorMatchAttempt.findFirst({
        where: {
          id:
            attemptId,

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

          product: {
            select: {
              id: true,

              tenantId:
                true,

              companyId:
                true,

              code: true,

              name: true,
            },
          },

          competitorSite: {
            select: {
              id: true,

              code: true,

              name: true,

              baseUrl:
                true,

              defaultVatRate:
                true,

              isActive:
                true,
            },
          },
        },
      });

    if (!attempt) {
      redirect(
        buildRedirectUrl({
          status:
            "error",

          message:
            "İnceleme kaydı bulunamadı veya artık inceleme durumunda değil.",
        }),
      );
    }

    if (
      !attempt.candidateUrl ||
      !attempt.candidateTitle
    ) {
      redirect(
        buildRedirectUrl({
          status:
            "error",

          message:
            "İnceleme kaydında kullanılabilir aday ürün bilgisi bulunmuyor.",
        }),
      );
    }

    if (
      !attempt.competitorSite.isActive
    ) {
      redirect(
        buildRedirectUrl({
          status:
            "error",

          message:
            "Rakip site artık aktif değil.",
        }),
      );
    }

    const candidateUrl =
      new URL(
        attempt.candidateUrl,
      );

    const competitorBaseUrl =
      new URL(
        attempt.competitorSite.baseUrl,
      );

    const candidateHost =
      candidateUrl.hostname
        .toLocaleLowerCase(
          "en-US",
        )
        .replace(
          /^www\./,
          "",
        );

    const competitorHost =
      competitorBaseUrl.hostname
        .toLocaleLowerCase(
          "en-US",
        )
        .replace(
          /^www\./,
          "",
        );

    if (
      candidateHost !==
      competitorHost
    ) {
      redirect(
        buildRedirectUrl({
          status:
            "error",

          message:
            "Aday ürün bağlantısı seçilen rakip siteyle eşleşmiyor.",
        }),
      );
    }

    candidateUrl.hash = "";

    let competitorProductId:
      number;

    const existingMapping =
      await prisma.competitorProduct.findFirst({
        where: {
          tenantId:
            attempt.product.tenantId,

          companyId:
            attempt.product.companyId,

          productId:
            attempt.product.id,

          competitorSiteId:
            attempt.competitorSite.id,
        },

        select: {
          id: true,

          isActive:
            true,
        },
      });

    if (existingMapping) {
      competitorProductId =
        existingMapping.id;

      if (
        !existingMapping.isActive
      ) {
        await prisma.competitorProduct.update({
          where: {
            id:
              existingMapping.id,
          },

          data: {
            isActive:
              true,

            productUrl:
              candidateUrl.toString(),

            competitorName:
              attempt.candidateTitle,

            vatRate:
              attempt.competitorSite.defaultVatRate,

            enrichmentStatus:
              CompetitorProductEnrichmentStatus.PENDING,

            enrichmentMessage:
              "Manuel inceleme ile eşleştirme yeniden aktifleştirildi.",
          },
        });
      }
    } else {
      try {
        const mapping =
          await prisma.competitorProduct.create({
            data: {
              tenantId:
                attempt.product.tenantId,

              companyId:
                attempt.product.companyId,

              productId:
                attempt.product.id,

              competitorSiteId:
                attempt.competitorSite.id,

              productUrl:
                candidateUrl.toString(),

              competitorName:
                attempt.candidateTitle,

              competitorSku:
                null,

              vatRate:
                attempt.competitorSite.defaultVatRate,

              isActive:
                true,

              enrichmentStatus:
                CompetitorProductEnrichmentStatus.PENDING,

              enrichmentMessage:
                "Manuel inceleme ile eşleştirildi.",
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
                  attempt.product.id,

                competitorSiteId:
                  attempt.competitorSite.id,
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
    }

    await prisma.productCompetitorMatchAttempt.update({
      where: {
        id:
          attempt.id,
      },

      data: {
        status:
          ProductCompetitorMatchStatus.AUTO_MATCHED,

        message:
          `Manuel inceleme ile onaylandı. Aday puanı: ${attempt.candidateScore ?? "-"}.`,

        searchedAt:
          new Date(),
      },
    });

    const enrichment =
      await ProductEnrichmentService.enrichFromUrl(
        candidateUrl.toString(),
      );

    if (!enrichment.success) {
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

      revalidateReviewPaths();

      redirect(
        buildRedirectUrl({
          status:
            "warning",

          message:
            `${attempt.product.code} rakip ürünle eşleştirildi ancak barkod/görsel zenginleştirmesi tamamlanamadı: ${enrichment.message}`,
        }),
      );
    }

    const persistence =
      await ProductEnrichmentPersistenceService.persist(
        {
          productId:
            attempt.product.id,

          tenantId:
            attempt.product.tenantId,

          companyId:
            attempt.product.companyId,

          sourceSite:
            attempt.competitorSite.code,

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
        ? `Manuel eşleştirme ve master zenginleştirmesi tamamlandı: ${persistence.barcodeCount} barkod, ${persistence.imageCount} görsel.`
        : `Manuel eşleştirme tamamlandı. Master veri kısmi: ${persistence.barcodeCount} barkod, ${persistence.imageCount} görsel.`;

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

    revalidateReviewPaths();

    redirect(
      buildRedirectUrl({
        status:
          fullyEnriched
            ? "success"
            : "warning",

        message:
          `${attempt.product.code} manuel olarak eşleştirildi. ${persistence.barcodeCount} barkod, ${persistence.imageCount} görsel işlendi.`,
      }),
    );
  } catch (error) {
    /*
     * Next.js redirect() özel bir exception
     * kullandığı için redirect hatasını burada
     * tekrar fırlatmamız gerekiyor.
     */
    if (
      error instanceof Error &&
      error.message ===
        "NEXT_REDIRECT"
    ) {
      throw error;
    }

    console.error(
      "Review candidate approval failed:",
      error,
    );

    revalidateReviewPaths();

    redirect(
      buildRedirectUrl({
        status:
          "error",

        message:
          error instanceof Error
            ? error.message
            : "Aday ürün onaylanırken bilinmeyen bir hata oluştu.",
      }),
    );
  }
}

export async function rejectReviewAttempt(
  attemptId: number,
): Promise<void> {
  await AuthorizationService.requirePermission(
    "INVENTORY_ADJUST",
  );

  if (
    !Number.isInteger(attemptId) ||
    attemptId <= 0
  ) {
    redirect(
      buildRedirectUrl({
        status: "error",
        message:
          "Geçersiz inceleme kaydı.",
      }),
    );
  }

  const attempt =
    await prisma.productCompetitorMatchAttempt.findFirst({
      where: {
        id: attemptId,

        tenantId:
          B2B_CONSTANTS.TENANT_ID,

        companyId:
          B2B_CONSTANTS.COMPANY_ID,

        status:
          ProductCompetitorMatchStatus.REVIEW,
      },

      select: {
        id: true,
        productId: true,
        competitorSiteId: true,
        candidateUrl: true,
        candidateTitle: true,

        product: {
          select: {
            code: true,
          },
        },
      },
    });

  if (!attempt) {
    redirect(
      buildRedirectUrl({
        status: "error",
        message:
          "İnceleme kaydı bulunamadı veya daha önce sonuçlandırılmış.",
      }),
    );
  }

  /*
   * Manuel reddedilen aday URL'sini
   * kalıcı ret geçmişine kaydet.
   */
  if (attempt.candidateUrl) {
    await prisma.productCompetitorCandidateDecision.upsert({
      where: {
        productId_competitorSiteId_candidateUrl: {
          productId:
            attempt.productId,

          competitorSiteId:
            attempt.competitorSiteId,

          candidateUrl:
            attempt.candidateUrl,
        },
      },

      create: {
        tenantId:
          B2B_CONSTANTS.TENANT_ID,

        companyId:
          B2B_CONSTANTS.COMPANY_ID,

        productId:
          attempt.productId,

        competitorSiteId:
          attempt.competitorSiteId,

        candidateUrl:
          attempt.candidateUrl,

        candidateTitle:
          attempt.candidateTitle,

        decision:
          "REJECTED",

        reason:
          "Aday ürün manuel inceleme sonucunda reddedildi.",
      },

      update: {
        candidateTitle:
          attempt.candidateTitle,

        decision:
          "REJECTED",

        reason:
          "Aday ürün manuel inceleme sonucunda reddedildi.",
      },
    });
  }

  /*
   * İnceleme kaydını kapat.
   */
  await prisma.productCompetitorMatchAttempt.update({
    where: {
      id: attempt.id,
    },

    data: {
      status:
        ProductCompetitorMatchStatus.NO_MATCH,

      message:
        "Aday ürün manuel inceleme sonucunda reddedildi.",

      searchedAt:
        new Date(),
    },
  });

  revalidateReviewPaths();

  redirect(
    buildRedirectUrl({
      status: "success",

      message:
        `${attempt.product.code} için aday ürün reddedildi.`,
    }),
  );
}