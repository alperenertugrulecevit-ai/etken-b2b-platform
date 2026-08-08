"use server";

import {
  BarcodeRecoveryStatus,
  ProductBarcodeSourceType,
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
  ProductEnrichmentService,
} from "@/modules/product-enrichment/product-enrichment.service";

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

  return `/admin/products/enrichment/barcode-review?${query.toString()}`;
}

function revalidateBarcodePaths(): void {
  revalidatePath(
    "/admin/products",
  );

  revalidatePath(
    "/admin/products/enrichment",
  );

  revalidatePath(
    "/admin/products/enrichment/barcode-review",
  );
}

export async function approveBarcodeRecoveryAttempt(
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
          "Geçersiz barkod inceleme kaydı.",
      }),
    );
  }

  const attempt =
    await prisma.barcodeRecoveryAttempt.findFirst({
      where: {
        id:
          attemptId,

        tenantId:
          B2B_CONSTANTS.TENANT_ID,

        companyId:
          B2B_CONSTANTS.COMPANY_ID,

        status:
          BarcodeRecoveryStatus.REVIEW,
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
      },
    });

  if (!attempt) {
    redirect(
      buildRedirectUrl({
        status:
          "error",

        message:
          "İnceleme kaydı bulunamadı veya daha önce sonuçlandırılmış.",
      }),
    );
  }

  if (!attempt.candidateUrl) {
    redirect(
      buildRedirectUrl({
        status:
          "error",

        message:
          "İnceleme kaydında Avansas ürün bağlantısı bulunmuyor.",
      }),
    );
  }

  let candidateUrl:
    URL;

  try {
    candidateUrl =
      new URL(
        attempt.candidateUrl,
      );
  } catch {
    redirect(
      buildRedirectUrl({
        status:
          "error",

        message:
          "Aday ürün bağlantısı geçersiz.",
      }),
    );
  }

  const candidateHost =
    candidateUrl.hostname
      .toLocaleLowerCase(
        "en-US",
      )
      .replace(
        /^www\./,
        "",
      );

  if (
    candidateHost !==
    "avansas.com"
  ) {
    redirect(
      buildRedirectUrl({
        status:
          "error",

        message:
          "Barkod recovery adayı Avansas alan adına ait değil.",
      }),
    );
  }

  candidateUrl.hash = "";

  const normalizedUrl =
    candidateUrl.toString();

  const enrichment =
    await ProductEnrichmentService.enrichFromUrl(
      normalizedUrl,
    );

  if (!enrichment.success) {
    await prisma.barcodeRecoveryAttempt.update({
      where: {
        id:
          attempt.id,
      },

      data: {
        status:
          BarcodeRecoveryStatus.ERROR,

        message:
          `Manuel onay sırasında ürün sayfası okunamadı: ${enrichment.message}`,

        attemptedAt:
          new Date(),
      },
    });

    revalidateBarcodePaths();

    redirect(
      buildRedirectUrl({
        status:
          "error",

        message:
          `${attempt.product.code} için Avansas ürün sayfası okunamadı: ${enrichment.message}`,
      }),
    );
  }

  if (
    enrichment.barcodes.length ===
    0
  ) {
    await prisma.barcodeRecoveryAttempt.update({
      where: {
        id:
          attempt.id,
      },

      data: {
        status:
          BarcodeRecoveryStatus.NO_BARCODE,

        barcodeCount:
          0,

        message:
          "Aday ürün manuel olarak onaylandı ancak Avansas sayfasında EAN/GTIN bulunamadı.",

        attemptedAt:
          new Date(),
      },
    });

    revalidateBarcodePaths();

    redirect(
      buildRedirectUrl({
        status:
          "warning",

        message:
          `${attempt.product.code} için doğru aday onaylandı ancak Avansas sayfasında barkod bulunamadı.`,
      }),
    );
  }

  let savedBarcodeCount =
    0;

  for (
    const barcode of
    enrichment.barcodes
  ) {
    const existingBarcode =
      await prisma.productBarcode.findFirst({
        where: {
          tenantId:
            attempt.product.tenantId,

          companyId:
            attempt.product.companyId,

          barcode:
            barcode.value,
        },

        select: {
          id: true,

          productId:
            true,

          sourceSite:
            true,

          sourcePageUrl:
            true,

          verifiedAt:
            true,
        },
      });

    if (
      existingBarcode &&
      existingBarcode.productId !==
        attempt.product.id
    ) {
      await prisma.barcodeRecoveryAttempt.update({
        where: {
          id:
            attempt.id,
        },

        data: {
          status:
            BarcodeRecoveryStatus.ERROR,

          message:
            `Barkod ${barcode.value} başka bir Etken ürününe bağlı olduğu için kayıt yapılmadı.`,

          attemptedAt:
            new Date(),
        },
      });

      revalidateBarcodePaths();

      redirect(
        buildRedirectUrl({
          status:
            "error",

          message:
            `Barkod ${barcode.value} başka bir ürüne bağlı. Manuel kontrol gerekli.`,
        }),
      );
    }

    const productBarcode =
      existingBarcode
        ? await prisma.productBarcode.update({
            where: {
              id:
                existingBarcode.id,
            },

            data: {
              barcodeType:
                barcode.type,

              sourceType:
                ProductBarcodeSourceType.COMPETITOR_SITE,

              sourceSite:
                existingBarcode.sourceSite ??
                "AVANSAS",

              sourcePageUrl:
                existingBarcode.sourcePageUrl ??
                normalizedUrl,
            },
          })
        : await prisma.productBarcode.create({
            data: {
              tenantId:
                attempt.product.tenantId,

              companyId:
                attempt.product.companyId,

              productId:
                attempt.product.id,

              barcode:
                barcode.value,

              barcodeType:
                barcode.type,

              sourceType:
                ProductBarcodeSourceType.COMPETITOR_SITE,

              sourceSite:
                "AVANSAS",

              sourcePageUrl:
                normalizedUrl,

              isPrimary:
                false,

              isVerified:
                false,

              verificationCount:
                0,
            },
          });

    await prisma.productBarcodeEvidence.upsert({
      where: {
        productBarcodeId_sourceSite: {
          productBarcodeId:
            productBarcode.id,

          sourceSite:
            "AVANSAS",
        },
      },

      create: {
        tenantId:
          attempt.product.tenantId,

        companyId:
          attempt.product.companyId,

        productBarcodeId:
          productBarcode.id,

        sourceType:
          ProductBarcodeSourceType.COMPETITOR_SITE,

        sourceSite:
          "AVANSAS",

        sourcePageUrl:
          normalizedUrl,
      },

      update: {
        sourcePageUrl:
          normalizedUrl,

        lastSeenAt:
          new Date(),
      },
    });

    const evidenceCount =
      await prisma.productBarcodeEvidence.count({
        where: {
          productBarcodeId:
            productBarcode.id,
        },
      });

    const verified =
      evidenceCount >=
      2;

    await prisma.productBarcode.update({
      where: {
        id:
          productBarcode.id,
      },

      data: {
        verificationCount:
          evidenceCount,

        isVerified:
          verified,

        verifiedAt:
          verified
            ? productBarcode.verifiedAt ??
              new Date()
            : null,
      },
    });

    savedBarcodeCount +=
      1;
  }

  await prisma.barcodeRecoveryAttempt.update({
    where: {
      id:
        attempt.id,
    },

    data: {
      status:
        BarcodeRecoveryStatus.SUCCESS,

      barcodeCount:
        savedBarcodeCount,

      candidateUrl:
        normalizedUrl,

      message:
        `Manuel inceleme ile onaylandı. ${savedBarcodeCount} barkod Avansas üzerinden kaydedildi.`,

      attemptedAt:
        new Date(),
    },
  });

  revalidateBarcodePaths();

  redirect(
    buildRedirectUrl({
      status:
        "success",

      message:
        `${attempt.product.code} için ${savedBarcodeCount} barkod başarıyla kaydedildi.`,
    }),
  );
}

export async function rejectBarcodeRecoveryAttempt(
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
          "Geçersiz barkod inceleme kaydı.",
      }),
    );
  }

  const attempt =
    await prisma.barcodeRecoveryAttempt.findFirst({
      where: {
        id:
          attemptId,

        tenantId:
          B2B_CONSTANTS.TENANT_ID,

        companyId:
          B2B_CONSTANTS.COMPANY_ID,

        status:
          BarcodeRecoveryStatus.REVIEW,
      },

      select: {
        id: true,

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
        status:
          "error",

        message:
          "İnceleme kaydı bulunamadı veya daha önce sonuçlandırılmış.",
      }),
    );
  }

  await prisma.barcodeRecoveryAttempt.update({
    where: {
      id:
        attempt.id,
    },

    data: {
      status:
        BarcodeRecoveryStatus.NO_CANDIDATE,

      barcodeCount:
        0,

      message:
        "Avansas barkod adayı manuel inceleme sonucunda reddedildi.",

      attemptedAt:
        new Date(),
    },
  });

  revalidateBarcodePaths();

  redirect(
    buildRedirectUrl({
      status:
        "success",

      message:
        `${attempt.product.code} için barkod adayı reddedildi.`,
    }),
  );
}