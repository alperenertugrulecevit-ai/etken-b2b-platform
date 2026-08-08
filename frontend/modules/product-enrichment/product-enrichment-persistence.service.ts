import {
  ProductBarcodeSourceType,
  ProductImageSourceType,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { GoogleCloudStorageService } from "@/modules/storage/google-cloud-storage.service";

import type {
  ProductEnrichmentResult,
} from "./product-enrichment.types";

type PersistProductEnrichmentInput = {
  productId: number;

  tenantId: string;
  companyId: string;

  sourceSite: string;

  result: ProductEnrichmentResult;
};

function selectPreferredImages(
  result: ProductEnrichmentResult,
) {
  const highResolution =
    result.images.filter(
      (image) =>
        image.url.includes(
          "/mnresize/900/",
        ),
    );

  const selected =
    highResolution.length > 0
      ? highResolution
      : result.images;

  const seen =
    new Set<string>();

  return selected.filter(
    (image) => {
      const normalized =
        image.url
          .replace(
            "/mnresize/300/",
            "/mnresize/{size}/",
          )
          .replace(
            "/mnresize/900/",
            "/mnresize/{size}/",
          );

      if (
        seen.has(
          normalized,
        )
      ) {
        return false;
      }

      seen.add(
        normalized,
      );

      return true;
    },
  );
}

export class ProductEnrichmentPersistenceService {
  static async persist(
    input: PersistProductEnrichmentInput,
  ): Promise<{
    barcodeCount: number;
    imageCount: number;
  }> {
    const product =
      await prisma.product.findFirst({
        where: {
          id:
            input.productId,

          tenantId:
            input.tenantId,

          companyId:
            input.companyId,
        },

        select: {
          id: true,
          code: true,
          imageUrl: true,
        },
      });

    if (!product) {
      throw new Error(
        "Ürün bulunamadı.",
      );
    }

    /*
     * BARKOD
     */

    let barcodeCount = 0;

    for (
      const barcode of
      input.result.barcodes
    ) {
      let productBarcode =
        await prisma.productBarcode.findFirst({
          where: {
            tenantId:
              input.tenantId,

            companyId:
              input.companyId,

            barcode:
              barcode.value,
          },
        });

      if (
        productBarcode &&
        productBarcode.productId !==
          product.id
      ) {
        throw new Error(
          `Barkod ${barcode.value} başka bir ürüne bağlı.`,
        );
      }

      if (!productBarcode) {
        productBarcode =
          await prisma.productBarcode.create({
            data: {
              tenantId:
                input.tenantId,

              companyId:
                input.companyId,

              productId:
                product.id,

              barcode:
                barcode.value,

              barcodeType:
                barcode.type,

              sourceType:
                ProductBarcodeSourceType.COMPETITOR_SITE,

              sourceSite:
                input.sourceSite,

              sourcePageUrl:
                input.result.sourceUrl,

              isPrimary:
                false,

              isVerified:
                false,

              verificationCount:
                0,
            },
          });
      }

      await prisma.productBarcodeEvidence.upsert({
        where: {
          productBarcodeId_sourceSite: {
            productBarcodeId:
              productBarcode.id,

            sourceSite:
              input.sourceSite,
          },
        },

        create: {
          tenantId:
            input.tenantId,

          companyId:
            input.companyId,

          productBarcodeId:
            productBarcode.id,

          sourceType:
            ProductBarcodeSourceType.COMPETITOR_SITE,

          sourceSite:
            input.sourceSite,

          sourcePageUrl:
            input.result.sourceUrl,
        },

        update: {
          sourcePageUrl:
            input.result.sourceUrl,

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
        evidenceCount >= 2;

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

          sourceSite:
            productBarcode.sourceSite ??
            input.sourceSite,

          sourcePageUrl:
            productBarcode.sourcePageUrl ??
            input.result.sourceUrl,
        },
      });

      barcodeCount += 1;
    }

    /*
     * GÖRSELLER
     */

    const preferredImages =
      selectPreferredImages(
        input.result,
      );

    let imageCount = 0;

    for (
      let index = 0;
      index <
      preferredImages.length;
      index += 1
    ) {
      const image =
        preferredImages[index];

      let imageRecord =
        await prisma.productImageSource.findFirst({
          where: {
            productId:
              product.id,

            sourceUrl:
              image.url,
          },
        });

      if (!imageRecord) {
        imageRecord =
          await prisma.productImageSource.create({
            data: {
              tenantId:
                input.tenantId,

              companyId:
                input.companyId,

              productId:
                product.id,

              sourceType:
                ProductImageSourceType.COMPETITOR_SITE,

              sourceSite:
                input.sourceSite,

              sourcePageUrl:
                input.result.sourceUrl,

              sourceUrl:
                image.url,

              isPrimary:
                index === 0,

              isVerified:
                false,

              verificationCount:
                1,

              sortOrder:
                index,
            },
          });
      }

      /*
       * Daha önce Storage'a aktarılmamışsa
       * görseli ETKEN bucket'a kopyala.
       */
      if (
        !imageRecord.storageUrl ||
        !imageRecord.storageObjectName
      ) {
        try {
          const storedImage =
            await GoogleCloudStorageService.storeProductImage(
              {
                tenantId:
                  input.tenantId,

                companyId:
                  input.companyId,

                productId:
                  product.id,

                productCode:
                  product.code,

                sourceUrl:
                  image.url,

                sortOrder:
                  index,
              },
            );

          imageRecord =
            await prisma.productImageSource.update({
              where: {
                id:
                  imageRecord.id,
              },

              data: {
                storageObjectName:
                  storedImage.objectName,

                storageUrl:
                  storedImage.publicUrl,
              },
            });
        } catch (storageError) {
          /*
           * Tek bir görsel upload hatası bütün
           * ürün enrichment işlemini bozmasın.
           */
          console.error(
            "Product image Cloud Storage upload failed:",
            {
              productId:
                product.id,

              sourceUrl:
                image.url,

              error:
                storageError,
            },
          );
        }
      }

      imageCount += 1;
    }

    /*
     * PRODUCT.imageUrl
     *
     * Ana görsel için mümkünse Storage URL
     * kullan. Storage başarısızsa kaynak URL
     * geçici fallback olarak kalabilir.
     */

    const masterImages =
      await prisma.productImageSource.findMany({
        where: {
          productId:
            product.id,
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
            sortOrder:
              "asc",
          },

          {
            id:
              "asc",
          },
        ],
      });

    const primaryImage =
      masterImages.find(
        (image) =>
          image.isPrimary &&
          Boolean(
            image.storageUrl,
          ),
      ) ??
      masterImages.find(
        (image) =>
          Boolean(
            image.storageUrl,
          ),
      ) ??
      masterImages.find(
        (image) =>
          image.isPrimary,
      ) ??
      masterImages[0] ??
      null;

    if (primaryImage) {
      const masterImageUrl =
        primaryImage.storageUrl ??
        primaryImage.sourceUrl;

      if (
        product.imageUrl !==
        masterImageUrl
      ) {
        await prisma.product.update({
          where: {
            id:
              product.id,
          },

          data: {
            imageUrl:
              masterImageUrl,
          },
        });
      }
    }

    return {
      barcodeCount,
      imageCount,
    };
  }
}