"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
import { B2B_CONSTANTS } from "@/modules/b2b/constants/b2b.constants";
import { CompetitorPriceMonitorService } from "@/modules/competitor-prices/competitor-price-monitor.service";
import { ProductEnrichmentService } from "@/modules/product-enrichment/product-enrichment.service";
import { ProductEnrichmentPersistenceService } from "@/modules/product-enrichment/product-enrichment-persistence.service";

import type {
  CompetitorMappingActionState,
} from "./types";

function readText(
  formData: FormData,
  fieldName: string,
): string {
  const value = formData.get(fieldName);

  return typeof value === "string"
    ? value.trim()
    : "";
}

function parsePositiveInteger(
  value: FormDataEntryValue | null,
  fieldLabel: string,
): number {
  const parsedValue =
    typeof value === "string"
      ? Number(value)
      : Number.NaN;

  if (
    !Number.isInteger(parsedValue) ||
    parsedValue <= 0
  ) {
    throw new Error(
      `${fieldLabel} seçimi geçersiz.`,
    );
  }

  return parsedValue;
}

function parseOptionalVatRate(
  value: FormDataEntryValue | null,
): number | null {
  if (
    typeof value !== "string" ||
    value.trim() === ""
  ) {
    return null;
  }

  const parsedValue = Number(value);

  if (
    !Number.isInteger(parsedValue) ||
    parsedValue < 0 ||
    parsedValue > 100
  ) {
    throw new Error(
      "KDV oranı 0 ile 100 arasında tam sayı olmalıdır.",
    );
  }

  return parsedValue;
}

function normalizeProductUrl(
  rawValue: string,
): URL {
  const normalizedRawValue =
    rawValue.trim();

  if (
    normalizedRawValue.includes(
      "{query}",
    ) ||
    normalizedRawValue
      .toLocaleLowerCase("en-US")
      .includes("%7bquery%7d")
  ) {
    throw new Error(
      "Arama URL şablonu ürün bağlantısı olarak kullanılamaz. Rakip ürünün gerçek ürün sayfasını seçin.",
    );
  }

  const url =
    new URL(normalizedRawValue);

  if (
    url.protocol !== "http:" &&
    url.protocol !== "https:"
  ) {
    throw new Error(
      "Rakip ürün bağlantısı HTTP veya HTTPS olmalıdır.",
    );
  }

  url.hash = "";

  return url;
}

function normalizeHost(
  value: string,
): string {
  return value
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/^www\./, "");
}

function revalidateCompetitorPaths(): void {
  revalidatePath(
    "/admin/competitor-prices",
  );

  revalidatePath(
    "/admin/competitor-prices/sites",
  );

  revalidatePath(
    "/admin/competitor-prices/mappings",
  );

  revalidatePath(
    "/admin/competitor-prices/mappings/search",
  );

  revalidatePath(
    "/admin/products",
  );

  revalidatePath(
    "/admin/product-images",
  );
}

export async function createCompetitorMapping(
  _previousState: CompetitorMappingActionState,
  formData: FormData,
): Promise<CompetitorMappingActionState> {
  await AuthorizationService.requirePermission(
    "INVENTORY_ADJUST",
  );

  try {
    const productId =
      parsePositiveInteger(
        formData.get("productId"),
        "Etken ürünü",
      );

    const competitorSiteId =
      parsePositiveInteger(
        formData.get(
          "competitorSiteId",
        ),
        "Rakip site",
      );

    const rawProductUrl = readText(
      formData,
      "productUrl",
    );

    const competitorName = readText(
      formData,
      "competitorName",
    );

    const competitorSku = readText(
      formData,
      "competitorSku",
    );

    if (!rawProductUrl) {
      return {
        status: "error",
        message:
          "Rakip ürün bağlantısı zorunludur.",
      };
    }

    if (rawProductUrl.length > 2000) {
      return {
        status: "error",
        message:
          "Rakip ürün bağlantısı çok uzun.",
      };
    }

    if (
      competitorName.length > 300
    ) {
      return {
        status: "error",
        message:
          "Rakip ürün adı 300 karakteri aşamaz.",
      };
    }

    if (
      competitorSku.length > 100
    ) {
      return {
        status: "error",
        message:
          "Rakip ürün kodu 100 karakteri aşamaz.",
      };
    }

    const vatRate =
      parseOptionalVatRate(
        formData.get("vatRate"),
      );

    const productUrl =
      normalizeProductUrl(
        rawProductUrl,
      );

    const [
      product,
      competitorSite,
    ] = await Promise.all([
      prisma.product.findFirst({
        where: {
          id: productId,

          tenantId:
            B2B_CONSTANTS.TENANT_ID,

          companyId:
            B2B_CONSTANTS.COMPANY_ID,
        },

        select: {
          id: true,
          tenantId: true,
          companyId: true,
          code: true,
          name: true,
        },
      }),

      prisma.competitorSite.findFirst({
        where: {
          id: competitorSiteId,

          tenantId:
            B2B_CONSTANTS.TENANT_ID,

          companyId:
            B2B_CONSTANTS.COMPANY_ID,

          isActive: true,
        },

        select: {
          id: true,
          code: true,
          name: true,
          baseUrl: true,
          defaultVatRate: true,
        },
      }),
    ]);

    if (!product) {
      return {
        status: "error",
        message:
          "Seçilen Etken ürünü bulunamadı.",
      };
    }

    if (!competitorSite) {
      return {
        status: "error",
        message:
          "Seçilen rakip site bulunamadı veya pasif durumda.",
      };
    }

    const competitorBaseUrl =
      new URL(
        competitorSite.baseUrl,
      );

    if (
      normalizeHost(
        productUrl.hostname,
      ) !==
      normalizeHost(
        competitorBaseUrl.hostname,
      )
    ) {
      return {
        status: "error",

        message:
          `Ürün bağlantısı ${competitorSite.name} alan adına ait olmalıdır.`,
      };
    }

    await prisma.competitorProduct.create({
      data: {
        tenantId:
          B2B_CONSTANTS.TENANT_ID,

        companyId:
          B2B_CONSTANTS.COMPANY_ID,

        productId:
          product.id,

        competitorSiteId:
          competitorSite.id,

        productUrl:
          productUrl.toString(),

        competitorName:
          competitorName || null,

        competitorSku:
          competitorSku || null,

        vatRate:
          vatRate ??
          competitorSite.defaultVatRate,

        isActive: true,
      },
    });

    /*
     * Rakip eşleştirmesi başarıyla
     * oluşturulduktan sonra ürün
     * master verisini zenginleştir.
     *
     * Bu işlem başarısız olursa
     * oluşturulan rakip eşleştirmesi
     * korunur.
     */
    try {
      const enrichment =
        await ProductEnrichmentService.enrichFromUrl(
          productUrl.toString(),
        );

      if (!enrichment.success) {
        revalidateCompetitorPaths();

        return {
          status: "success",

          message:
            `${product.code} ürünü ${competitorSite.name} ile eşleştirildi. Ancak barkod ve görsel taraması tamamlanamadı: ${enrichment.message}`,
        };
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
              competitorSite.code,

            result:
              enrichment,
          },
        );

      revalidateCompetitorPaths();

      const barcodeMessage =
        persistence.barcodeCount > 0
          ? `${persistence.barcodeCount} barkod`
          : "barkod bulunamadı";

      const imageMessage =
        persistence.imageCount > 0
          ? `${persistence.imageCount} görsel`
          : "görsel bulunamadı";

      return {
        status: "success",

        message:
          `${product.code} ürünü ${competitorSite.name} ile başarıyla eşleştirildi. Ürün master zenginleştirmesi tamamlandı: ${barcodeMessage}, ${imageMessage}.`,
      };
    } catch (enrichmentError) {
      console.error(
        "Product enrichment after competitor mapping failed:",
        enrichmentError,
      );

      revalidateCompetitorPaths();

      return {
        status: "success",

        message:
          `${product.code} ürünü ${competitorSite.name} ile başarıyla eşleştirildi. Ancak barkod ve görsel bilgileri kaydedilirken hata oluştu.`,
      };
    }
  } catch (error) {
    console.error(
      "Create competitor mapping failed:",
      error,
    );

    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        status: "error",

        message:
          "Bu ürün, rakip site veya bağlantı ile daha önce eşleştirilmiş.",
      };
    }

    return {
      status: "error",

      message:
        error instanceof Error
          ? error.message
          : "Rakip ürün eşleştirilirken bilinmeyen bir hata oluştu.",
    };
  }
}

export async function toggleCompetitorMappingStatus(
  mappingId: number,
  currentStatus: boolean,
): Promise<void> {
  await AuthorizationService.requirePermission(
    "INVENTORY_ADJUST",
  );

  if (
    !Number.isInteger(mappingId) ||
    mappingId <= 0
  ) {
    throw new Error(
      "Geçersiz ürün eşleştirmesi.",
    );
  }

  const mapping =
    await prisma.competitorProduct.findFirst({
      where: {
        id: mappingId,

        tenantId:
          B2B_CONSTANTS.TENANT_ID,

        companyId:
          B2B_CONSTANTS.COMPANY_ID,
      },

      select: {
        id: true,
      },
    });

  if (!mapping) {
    throw new Error(
      "Rakip ürün eşleştirmesi bulunamadı.",
    );
  }

  await prisma.competitorProduct.update({
    where: {
      id: mapping.id,
    },

    data: {
      isActive: !currentStatus,
    },
  });

  revalidateCompetitorPaths();
}

export async function deleteCompetitorMapping(
  mappingId: number,
): Promise<void> {
  await AuthorizationService.requirePermission(
    "INVENTORY_ADJUST",
  );

  if (
    !Number.isInteger(mappingId) ||
    mappingId <= 0
  ) {
    throw new Error(
      "Geçersiz ürün eşleştirmesi.",
    );
  }

  const mapping =
    await prisma.competitorProduct.findFirst({
      where: {
        id: mappingId,

        tenantId:
          B2B_CONSTANTS.TENANT_ID,

        companyId:
          B2B_CONSTANTS.COMPANY_ID,
      },

      select: {
        id: true,
      },
    });

  if (!mapping) {
    throw new Error(
      "Silinecek rakip ürün eşleştirmesi bulunamadı.",
    );
  }

  await prisma.competitorProduct.delete({
    where: {
      id: mapping.id,
    },
  });

  revalidateCompetitorPaths();
}

export async function checkCompetitorPrice(
  mappingId: number,
): Promise<never> {
  await AuthorizationService.requirePermission(
    "INVENTORY_ADJUST",
  );

  if (
    !Number.isInteger(mappingId) ||
    mappingId <= 0
  ) {
    throw new Error(
      "Geçersiz ürün eşleştirmesi.",
    );
  }

  const result =
    await CompetitorPriceMonitorService.checkMapping(
      mappingId,
    );

  revalidateCompetitorPaths();

  const query =
    new URLSearchParams({
      priceCheck:
        result.success
          ? "success"
          : "error",

      message:
        result.message,
    });

  redirect(
    `/admin/competitor-prices/mappings?${query.toString()}`,
  );
}