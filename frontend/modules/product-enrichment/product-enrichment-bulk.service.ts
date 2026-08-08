import {
  CompetitorProductEnrichmentStatus,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { B2B_CONSTANTS } from "@/modules/b2b/constants/b2b.constants";

import { ProductEnrichmentPersistenceService } from "./product-enrichment-persistence.service";
import { ProductEnrichmentService } from "./product-enrichment.service";

type BulkEnrichmentItemStatus =
  | "SUCCESS"
  | "PARTIAL"
  | "ERROR";

type BulkEnrichmentItemResult = {
  competitorProductId: number;

  productId: number;
  productCode: string;
  productName: string;

  competitorSite: string;

  status: BulkEnrichmentItemStatus;

  message: string;

  barcodeCount: number;
  imageCount: number;

  barcodeMissing: boolean;
  imageMissing: boolean;
};

export type BulkEnrichmentResult = {
  processedCount: number;

  successCount: number;
  partialCount: number;
  errorCount: number;

  noBarcodeCount: number;
  noImageCount: number;

  remainingCount: number;

  items: BulkEnrichmentItemResult[];
};

function buildSuccessMessage(
  barcodeCount: number,
  imageCount: number,
): string {
  if (
    barcodeCount > 0 &&
    imageCount > 0
  ) {
    return `Ürün master verileri tamamlandı: ${barcodeCount} barkod, ${imageCount} görsel.`;
  }

  if (
    barcodeCount === 0 &&
    imageCount > 0
  ) {
    return `Görseller aktarıldı (${imageCount} adet), ancak kaynak sayfada barkod bulunamadı.`;
  }

  if (
    barcodeCount > 0 &&
    imageCount === 0
  ) {
    return `Barkod aktarıldı (${barcodeCount} adet), ancak kaynak sayfada ürün görseli bulunamadı.`;
  }

  return "Ürün sayfası okundu ancak barkod veya ürün görseli bulunamadı.";
}

export class ProductEnrichmentBulkService {
  static async getPendingCount(): Promise<number> {
    return prisma.competitorProduct.count({
      where: {
        tenantId:
          B2B_CONSTANTS.TENANT_ID,

        companyId:
          B2B_CONSTANTS.COMPANY_ID,

        isActive: true,

        enrichmentStatus:
          CompetitorProductEnrichmentStatus.PENDING,

        product: {
          is: {
            tenantId:
              B2B_CONSTANTS.TENANT_ID,

            companyId:
              B2B_CONSTANTS.COMPANY_ID,

            isActive: true,
          },
        },

        competitorSite: {
          is: {
            tenantId:
              B2B_CONSTANTS.TENANT_ID,

            companyId:
              B2B_CONSTANTS.COMPANY_ID,

            isActive: true,
          },
        },
      },
    });
  }

  static async runBatch(
    batchSize = 10,
  ): Promise<BulkEnrichmentResult> {
    const safeBatchSize =
      Math.min(
        Math.max(
          Math.trunc(batchSize),
          1,
        ),
        25,
      );

    /*
     * Artık PRODUCT değil,
     * PENDING CompetitorProduct kayıtları
     * kuyruk kabul edilir.
     *
     * Böylece bir kaynakta barkod yoksa
     * aynı URL sonsuza kadar tekrar
     * işlenmez.
     */
    const mappings =
      await prisma.competitorProduct.findMany({
        where: {
          tenantId:
            B2B_CONSTANTS.TENANT_ID,

          companyId:
            B2B_CONSTANTS.COMPANY_ID,

          isActive: true,

          enrichmentStatus:
            CompetitorProductEnrichmentStatus.PENDING,

          product: {
            is: {
              tenantId:
                B2B_CONSTANTS.TENANT_ID,

              companyId:
                B2B_CONSTANTS.COMPANY_ID,

              isActive: true,
            },
          },

          competitorSite: {
            is: {
              tenantId:
                B2B_CONSTANTS.TENANT_ID,

              companyId:
                B2B_CONSTANTS.COMPANY_ID,

              isActive: true,
            },
          },
        },

        select: {
          id: true,
          productUrl: true,

          product: {
            select: {
              id: true,
              tenantId: true,
              companyId: true,

              code: true,
              name: true,
            },
          },

          competitorSite: {
            select: {
              code: true,
              name: true,
            },
          },
        },

        orderBy: {
          id: "asc",
        },

        take:
          safeBatchSize,
      });

    const items:
      BulkEnrichmentItemResult[] =
      [];

    for (
      const mapping of mappings
    ) {
      const product =
        mapping.product;

      try {
        const enrichment =
          await ProductEnrichmentService.enrichFromUrl(
            mapping.productUrl,
          );

        if (!enrichment.success) {
          const message =
            enrichment.message;

          await prisma.competitorProduct.update({
            where: {
              id:
                mapping.id,
            },

            data: {
              enrichmentStatus:
                CompetitorProductEnrichmentStatus.ERROR,

              lastEnrichedAt:
                new Date(),

              enrichmentMessage:
                message,

              enrichmentBarcodeCount:
                0,

              enrichmentImageCount:
                0,
            },
          });

          items.push({
            competitorProductId:
              mapping.id,

            productId:
              product.id,

            productCode:
              product.code,

            productName:
              product.name,

            competitorSite:
              mapping.competitorSite.name,

            status:
              "ERROR",

            message,

            barcodeCount:
              0,

            imageCount:
              0,

            barcodeMissing:
              true,

            imageMissing:
              true,
          });

          continue;
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
                mapping.competitorSite.code,

              result:
                enrichment,
            },
          );

        /*
         * Persistence sonucu seçilmiş/
         * kaydedilmiş master veri adedidir.
         */
        const barcodeCount =
          persistence.barcodeCount;

        const imageCount =
          persistence.imageCount;

        const barcodeMissing =
          barcodeCount === 0;

        const imageMissing =
          imageCount === 0;

        const fullySuccessful =
          !barcodeMissing &&
          !imageMissing;

        const enrichmentStatus =
          fullySuccessful
            ? CompetitorProductEnrichmentStatus.SUCCESS
            : CompetitorProductEnrichmentStatus.PARTIAL;

        const message =
          buildSuccessMessage(
            barcodeCount,
            imageCount,
          );

        /*
         * Önemli:
         *
         * PARTIAL da işlenmiş kabul edilir.
         * Örneğin OFIX barkod yayınlamıyorsa
         * bu URL tekrar tekrar taranmaz.
         *
         * Aynı ürünün AVANSAS gibi başka
         * bir CompetitorProduct eşleşmesi
         * varsa o bağımsız olarak işlenir.
         */
        await prisma.competitorProduct.update({
          where: {
            id:
              mapping.id,
          },

          data: {
            enrichmentStatus,

            lastEnrichedAt:
              new Date(),

            enrichmentMessage:
              message,

            enrichmentBarcodeCount:
              barcodeCount,

            enrichmentImageCount:
              imageCount,
          },
        });

        items.push({
          competitorProductId:
            mapping.id,

          productId:
            product.id,

          productCode:
            product.code,

          productName:
            product.name,

          competitorSite:
            mapping.competitorSite.name,

          status:
            fullySuccessful
              ? "SUCCESS"
              : "PARTIAL",

          message,

          barcodeCount,
          imageCount,

          barcodeMissing,
          imageMissing,
        });
      } catch (error) {
        console.error(
          "Bulk product enrichment failed:",
          {
            competitorProductId:
              mapping.id,

            productId:
              product.id,

            productCode:
              product.code,

            productUrl:
              mapping.productUrl,

            error,
          },
        );

        const message =
          error instanceof Error
            ? error.message
            : "Bilinmeyen enrichment hatası.";

        /*
         * ERROR kayıtları da otomatik
         * batch kuyruğundan çıkar.
         *
         * Daha sonra admin ekranına
         * "Hatalıları Yeniden Dene"
         * işlemi ekleyeceğiz.
         */
        try {
          await prisma.competitorProduct.update({
            where: {
              id:
                mapping.id,
            },

            data: {
              enrichmentStatus:
                CompetitorProductEnrichmentStatus.ERROR,

              lastEnrichedAt:
                new Date(),

              enrichmentMessage:
                message,
            },
          });
        } catch (
          statusUpdateError
        ) {
          console.error(
            "Competitor enrichment error status could not be saved:",
            statusUpdateError,
          );
        }

        items.push({
          competitorProductId:
            mapping.id,

          productId:
            product.id,

          productCode:
            product.code,

          productName:
            product.name,

          competitorSite:
            mapping.competitorSite.name,

          status:
            "ERROR",

          message,

          barcodeCount:
            0,

          imageCount:
            0,

          barcodeMissing:
            true,

          imageMissing:
            true,
        });
      }
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

      partialCount:
        items.filter(
          (item) =>
            item.status ===
            "PARTIAL",
        ).length,

      errorCount:
        items.filter(
          (item) =>
            item.status ===
            "ERROR",
        ).length,

      /*
       * Bunları status üzerinden değil,
       * gerçek veri sonucundan sayıyoruz.
       * Bir kayıtta hem barkod hem görsel
       * bulunmamış olabilir.
       */
      noBarcodeCount:
        items.filter(
          (item) =>
            item.status !==
              "ERROR" &&
            item.barcodeMissing,
        ).length,

      noImageCount:
        items.filter(
          (item) =>
            item.status !==
              "ERROR" &&
            item.imageMissing,
        ).length,

      remainingCount,

      items,
    };
  }
}