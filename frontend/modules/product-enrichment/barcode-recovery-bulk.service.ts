import {
  BarcodeRecoveryStatus,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { B2B_CONSTANTS } from "@/modules/b2b/constants/b2b.constants";

import {
  BarcodeRecoveryService,
  type BarcodeRecoveryResult,
} from "./barcode-recovery.service";

export type BarcodeRecoveryBulkResult = {
  processedCount: number;

  successCount: number;
  reviewCount: number;
  noCandidateCount: number;
  noBarcodeCount: number;
  errorCount: number;

  remainingCount: number;

  items: BarcodeRecoveryResult[];
};

export class BarcodeRecoveryBulkService {
  static async getPendingCount(): Promise<number> {
    const products =
      await prisma.product.findMany({
        where: {
          tenantId:
            B2B_CONSTANTS.TENANT_ID,

          companyId:
            B2B_CONSTANTS.COMPANY_ID,

          isActive: true,

          productBarcodes: {
            none: {},
          },

          competitorProducts: {
            some: {
              isActive: true,

              competitorSite: {
                code: "OFIX",
              },
            },
          },
        },

        select: {
          id: true,

          barcodeRecoveryAttempts: {
            where: {
              sourceSite:
                "AVANSAS",
            },

            select: {
              status: true,
            },
          },
        },
      });

    return products.filter(
      (product) => {
        const attempt =
          product.barcodeRecoveryAttempts[0];

        return (
          !attempt ||
          attempt.status ===
            BarcodeRecoveryStatus.PENDING
        );
      },
    ).length;
  }

  static async runBatch(
    batchSize = 5,
  ): Promise<BarcodeRecoveryBulkResult> {
    const safeBatchSize =
      Math.min(
        Math.max(
          Math.trunc(batchSize),
          1,
        ),
        25,
      );

    const products =
      await prisma.product.findMany({
        where: {
          tenantId:
            B2B_CONSTANTS.TENANT_ID,

          companyId:
            B2B_CONSTANTS.COMPANY_ID,

          isActive: true,

          productBarcodes: {
            none: {},
          },

          competitorProducts: {
            some: {
              isActive: true,

              competitorSite: {
                code: "OFIX",
              },
            },
          },
        },

        select: {
          id: true,
          code: true,
          name: true,

          barcodeRecoveryAttempts: {
            where: {
              sourceSite:
                "AVANSAS",
            },

            select: {
              status: true,
            },
          },
        },

        orderBy: {
          id: "asc",
        },
      });

    const queuedProducts =
      products
        .filter(
          (product) => {
            const attempt =
              product
                .barcodeRecoveryAttempts[0];

            return (
              !attempt ||
              attempt.status ===
                BarcodeRecoveryStatus.PENDING
            );
          },
        )
        .slice(
          0,
          safeBatchSize,
        );

    const items:
      BarcodeRecoveryResult[] =
      [];

    for (
      const product of
      queuedProducts
    ) {
      await prisma.barcodeRecoveryAttempt.upsert({
        where: {
          productId_sourceSite: {
            productId:
              product.id,

            sourceSite:
              "AVANSAS",
          },
        },

        create: {
          tenantId:
            B2B_CONSTANTS.TENANT_ID,

          companyId:
            B2B_CONSTANTS.COMPANY_ID,

          productId:
            product.id,

          sourceSite:
            "AVANSAS",

          status:
            BarcodeRecoveryStatus.PENDING,

          message:
            "Barkod kurtarma araması başlatıldı.",
        },

        update: {
          status:
            BarcodeRecoveryStatus.PENDING,

          message:
            "Barkod kurtarma araması yeniden başlatıldı.",
        },
      });

      const result =
        await BarcodeRecoveryService.recoverFromAvansas(
          product.id,
        );

      items.push(
        result,
      );

      const mappedStatus:
        BarcodeRecoveryStatus =
        result.status === "SUCCESS"
          ? BarcodeRecoveryStatus.SUCCESS
          : result.status === "REVIEW"
            ? BarcodeRecoveryStatus.REVIEW
            : result.status ===
                "NO_CANDIDATE"
              ? BarcodeRecoveryStatus.NO_CANDIDATE
              : result.status ===
                  "NO_BARCODE"
                ? BarcodeRecoveryStatus.NO_BARCODE
                : BarcodeRecoveryStatus.ERROR;

      await prisma.barcodeRecoveryAttempt.update({
        where: {
          productId_sourceSite: {
            productId:
              product.id,

            sourceSite:
              "AVANSAS",
          },
        },

        data: {
          status:
            mappedStatus,

          candidateTitle:
            result.candidateTitle,

          candidateUrl:
            result.candidateUrl,

          candidateScore:
            result.candidateScore,

          barcodeCount:
            result.barcodeCount,

          message:
            result.message,

          attemptedAt:
            new Date(),
        },
      });
    }

    const remainingCount =
      await this.getPendingCount();

    return {
      processedCount:
        items.length,

      successCount:
        items.filter(
          (item) =>
            item.status ===
            "SUCCESS",
        ).length,

      reviewCount:
        items.filter(
          (item) =>
            item.status ===
            "REVIEW",
        ).length,

      noCandidateCount:
        items.filter(
          (item) =>
            item.status ===
            "NO_CANDIDATE",
        ).length,

      noBarcodeCount:
        items.filter(
          (item) =>
            item.status ===
            "NO_BARCODE",
        ).length,

      errorCount:
        items.filter(
          (item) =>
            item.status ===
            "ERROR",
        ).length,

      remainingCount,

      items,
    };
  }
}