import {
  CompetitorPriceFetchStatus,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { B2B_CONSTANTS } from "@/modules/b2b/constants/b2b.constants";

import { CompetitorPriceFetchService } from "./competitor-price-fetch.service";

export type CompetitorPriceCheckResult = {
  success: boolean;
  message: string;
};

export class CompetitorPriceMonitorService {
  static async checkMapping(
    mappingId: number,
  ): Promise<CompetitorPriceCheckResult> {
    const mapping =
      await prisma.competitorProduct.findFirst({
        where: {
          id: mappingId,

          tenantId:
            B2B_CONSTANTS.TENANT_ID,

          companyId:
            B2B_CONSTANTS.COMPANY_ID,

          isActive: true,
        },

        include: {
          product: {
            select: {
              code: true,
              name: true,
            },
          },

          competitorSite: {
            select: {
              name: true,
              baseUrl: true,
              defaultVatRate: true,
              isActive: true,
            },
          },
        },
      });

    if (!mapping) {
      return {
        success: false,
        message:
          "Aktif rakip ürün eşleştirmesi bulunamadı.",
      };
    }

    if (!mapping.competitorSite.isActive) {
      return {
        success: false,
        message:
          "Rakip site pasif durumda olduğu için fiyat kontrolü yapılamadı.",
      };
    }

    const vatRate =
      mapping.vatRate ??
      mapping.competitorSite.defaultVatRate;

    const result =
      await CompetitorPriceFetchService.fetchPrice(
        {
          productUrl:
            mapping.productUrl,

          competitorBaseUrl:
            mapping.competitorSite.baseUrl,

          vatRate,
        },
      );

    const isSuccess =
      result.fetchStatus ===
      CompetitorPriceFetchStatus.SUCCESS;

    await prisma.$transaction([
      prisma.competitorPriceHistory.create({
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
            result.stockStatus,

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

      prisma.competitorProduct.update({
        where: {
          id: mapping.id,
        },

        data: isSuccess
          ? {
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
                result.stockStatus,

              lastCheckedAt:
                result.checkedAt,

              lastSuccessAt:
                result.checkedAt,

              lastError: null,
            }
          : {
              lastCheckedAt:
                result.checkedAt,

              lastError:
                result.errorMessage ??
                "Fiyat kontrolü başarısız oldu.",
            },
      }),
    ]);

    if (!isSuccess) {
      return {
        success: false,

        message:
          result.errorMessage ??
          `${mapping.competitorSite.name} fiyatı okunamadı.`,
      };
    }

    const displayedPrice =
      result.priceInclVat ??
      result.priceExclVat;

    const formattedPrice =
      displayedPrice === null
        ? "-"
        : displayedPrice.toLocaleString(
            "tr-TR",
            {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            },
          );

    return {
      success: true,

      message:
        `${mapping.product.code} için ${mapping.competitorSite.name} fiyatı ` +
        `${formattedPrice} ${result.currency} olarak kaydedildi.`,
    };
  }
}