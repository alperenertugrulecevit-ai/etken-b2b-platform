import {
  ProductBarcodeSourceType,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { B2B_CONSTANTS } from "@/modules/b2b/constants/b2b.constants";
import { CompetitorProductSearchService } from "@/modules/competitor-prices/competitor-product-search.service";

import { ProductEnrichmentService } from "./product-enrichment.service";

type BarcodeRecoveryStatus =
  | "SUCCESS"
  | "NO_CANDIDATE"
  | "REVIEW"
  | "NO_BARCODE"
  | "ERROR";

export type BarcodeRecoveryResult = {
  status: BarcodeRecoveryStatus;

  productId: number;
  productCode: string;

  candidateTitle: string | null;
  candidateUrl: string | null;
  candidateScore: number | null;

  barcodeCount: number;

  message: string;
};

export class BarcodeRecoveryService {
  static async recoverFromAvansas(
    productId: number,
  ): Promise<BarcodeRecoveryResult> {
    try {
      const product =
        await prisma.product.findFirst({
          where: {
            id: productId,

            tenantId:
              B2B_CONSTANTS.TENANT_ID,

            companyId:
              B2B_CONSTANTS.COMPANY_ID,

            isActive: true,
          },

          select: {
            id: true,
            tenantId: true,
            companyId: true,

            code: true,
            name: true,
            brand: true,
            barcode: true,

            productBarcodes: {
              take: 1,
              select: {
                id: true,
              },
            },
          },
        });

      if (!product) {
        throw new Error(
          "Ürün bulunamadı.",
        );
      }

      if (
        product.productBarcodes.length >
        0
      ) {
        return {
          status: "SUCCESS",

          productId:
            product.id,

          productCode:
            product.code,

          candidateTitle:
            null,

          candidateUrl:
            null,

          candidateScore:
            null,

          barcodeCount:
            product.productBarcodes.length,

          message:
            "Ürünün zaten kayıtlı barkodu var.",
        };
      }

      const avansas =
        await prisma.competitorSite.findFirst({
          where: {
            tenantId:
              B2B_CONSTANTS.TENANT_ID,

            companyId:
              B2B_CONSTANTS.COMPANY_ID,

            code:
              "AVANSAS",

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
            searchUrlTemplate: true,
            productUrlPattern: true,
            searchResultLimit: true,
          },
        });

      if (
        !avansas ||
        !avansas.searchUrlTemplate
      ) {
        throw new Error(
          "Avansas otomatik araması kullanıma hazır değil.",
        );
      }

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
              avansas.baseUrl,

            searchUrlTemplate:
              avansas.searchUrlTemplate,

            productUrlPattern:
              avansas.productUrlPattern,

            resultLimit:
              avansas.searchResultLimit,
          },
        );

      if (!searchResult.success) {
        return {
          status: "ERROR",

          productId:
            product.id,

          productCode:
            product.code,

          candidateTitle:
            null,

          candidateUrl:
            null,

          candidateScore:
            null,

          barcodeCount:
            0,

          message:
            searchResult.message,
        };
      }

      const highCandidates =
        searchResult.candidates.filter(
          (candidate) =>
            candidate.confidence ===
              "HIGH" &&
            candidate.variantMatched,
        );

      if (
        highCandidates.length ===
        0
      ) {
        const reviewCandidates =
          searchResult.candidates.filter(
            (candidate) =>
              candidate.confidence ===
              "REVIEW",
          );

        return {
          status:
            reviewCandidates.length > 0
              ? "REVIEW"
              : "NO_CANDIDATE",

          productId:
            product.id,

          productCode:
            product.code,

          candidateTitle:
            reviewCandidates[0]
              ?.title ??
            null,

          candidateUrl:
            reviewCandidates[0]
              ?.productUrl ??
            null,

          candidateScore:
            reviewCandidates[0]
              ?.score ??
            null,

          barcodeCount:
            0,

          message:
            reviewCandidates.length > 0
              ? "Avansas'ta aday bulundu ancak güven seviyesi otomatik barkod aktarımı için yeterli değil."
              : "Avansas'ta güvenli ürün adayı bulunamadı.",
        };
      }

      if (
        highCandidates.length >
        1
      ) {
        return {
          status: "REVIEW",

          productId:
            product.id,

          productCode:
            product.code,

          candidateTitle:
            highCandidates[0].title,

          candidateUrl:
            highCandidates[0].productUrl,

          candidateScore:
            highCandidates[0].score,

          barcodeCount:
            0,

          message:
            "Birden fazla yüksek güvenli Avansas adayı bulundu. Manuel inceleme gerekli.",
        };
      }

      const candidate =
        highCandidates[0];

      const enrichment =
        await ProductEnrichmentService.enrichFromUrl(
          candidate.productUrl,
        );

      if (!enrichment.success) {
        return {
          status: "ERROR",

          productId:
            product.id,

          productCode:
            product.code,

          candidateTitle:
            candidate.title,

          candidateUrl:
            candidate.productUrl,

          candidateScore:
            candidate.score,

          barcodeCount:
            0,

          message:
            enrichment.message,
        };
      }

      if (
        enrichment.barcodes.length ===
        0
      ) {
        return {
          status: "NO_BARCODE",

          productId:
            product.id,

          productCode:
            product.code,

          candidateTitle:
            candidate.title,

          candidateUrl:
            candidate.productUrl,

          candidateScore:
            candidate.score,

          barcodeCount:
            0,

          message:
            "Doğru Avansas ürünü bulundu ancak sayfada barkod bilgisi bulunamadı.",
        };
      }

      let barcodeCount = 0;

      for (
        const barcode of
        enrichment.barcodes
      ) {
        const existing =
          await prisma.productBarcode.findFirst({
            where: {
              tenantId:
                product.tenantId,

              companyId:
                product.companyId,

              barcode:
                barcode.value,
            },

            select: {
              id: true,
              productId: true,
            },
          });

        if (
          existing &&
          existing.productId !==
            product.id
        ) {
          throw new Error(
            `Barkod ${barcode.value} başka bir ürüne bağlı.`,
          );
        }

        const productBarcode =
          existing ??
          await prisma.productBarcode.create({
            data: {
              tenantId:
                product.tenantId,

              companyId:
                product.companyId,

              productId:
                product.id,

              barcode:
                barcode.value,

              barcodeType:
                barcode.type,

              sourceType:
                ProductBarcodeSourceType.COMPETITOR_SITE,

              sourceSite:
                "AVANSAS",

              sourcePageUrl:
                candidate.productUrl,

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
              product.tenantId,

            companyId:
              product.companyId,

            productBarcodeId:
              productBarcode.id,

            sourceType:
              ProductBarcodeSourceType.COMPETITOR_SITE,

            sourceSite:
              "AVANSAS",

            sourcePageUrl:
              candidate.productUrl,
          },

          update: {
            sourcePageUrl:
              candidate.productUrl,

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
                ? new Date()
                : null,
          },
        });

        barcodeCount += 1;
      }

      return {
        status: "SUCCESS",

        productId:
          product.id,

        productCode:
          product.code,

        candidateTitle:
          candidate.title,

        candidateUrl:
          candidate.productUrl,

        candidateScore:
          candidate.score,

        barcodeCount,

        message:
          `${barcodeCount} barkod Avansas üzerinden bulundu ve ürün master kaydına eklendi.`,
      };
    } catch (error) {
      return {
        status: "ERROR",

        productId,
        productCode: "",

        candidateTitle:
          null,

        candidateUrl:
          null,

        candidateScore:
          null,

        barcodeCount:
          0,

        message:
          error instanceof Error
            ? error.message
            : "Barkod tamamlama sırasında bilinmeyen bir hata oluştu.",
      };
    }
  }
}