"use server";

import {
  CompetitorSourceType,
  Prisma,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
import { B2B_CONSTANTS } from "@/modules/b2b/constants/b2b.constants";

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
      "Geçersiz rakip site kaydı.",
    );
  }

  return parsedValue;
}

function normalizeCode(
  value: string,
): string {
  return value
    .trim()
    .toLocaleUpperCase("tr-TR")
    .replace(/[^A-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeBaseUrl(
  value: string,
): string {
  const url = new URL(value);

  if (
    url.protocol !== "http:" &&
    url.protocol !== "https:"
  ) {
    throw new Error(
      "Rakip site adresi HTTP veya HTTPS olmalıdır.",
    );
  }

  return `${url.protocol}//${url.host}`;
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

function parseSearchResultLimit(
  value: FormDataEntryValue | null,
): number {
  if (
    typeof value !== "string" ||
    value.trim() === ""
  ) {
    return 10;
  }

  const parsedValue = Number(value);

  if (
    !Number.isInteger(parsedValue) ||
    parsedValue < 1 ||
    parsedValue > 50
  ) {
    throw new Error(
      "Aday sonuç limiti 1 ile 50 arasında olmalıdır.",
    );
  }

  return parsedValue;
}

function parseSourceType(
  value: FormDataEntryValue | null,
): CompetitorSourceType {
  if (
    typeof value !== "string" ||
    !Object.values(
      CompetitorSourceType,
    ).includes(
      value as CompetitorSourceType,
    )
  ) {
    throw new Error(
      "Geçerli bir kaynak tipi seçin.",
    );
  }

  return value as CompetitorSourceType;
}

function normalizeHost(
  value: string,
): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/^www\./, "");
}

function validateSearchSettings({
  baseUrl,
  searchEnabled,
  searchUrlTemplate,
}: {
  baseUrl: string;
  searchEnabled: boolean;
  searchUrlTemplate: string;
}): void {
  if (!searchEnabled) {
    return;
  }

  if (!searchUrlTemplate) {
    throw new Error(
      "Otomatik arama açıksa arama URL şablonu zorunludur.",
    );
  }

  if (
    !searchUrlTemplate.includes(
      "{query}",
    )
  ) {
    throw new Error(
      "Arama URL şablonunda {query} değişkeni bulunmalıdır.",
    );
  }

  const exampleSearchUrl =
    searchUrlTemplate.replace(
      "{query}",
      encodeURIComponent("test"),
    );

  const parsedSearchUrl =
    new URL(exampleSearchUrl);

  const parsedBaseUrl =
    new URL(baseUrl);

  if (
    normalizeHost(
      parsedSearchUrl.hostname,
    ) !==
    normalizeHost(
      parsedBaseUrl.hostname,
    )
  ) {
    throw new Error(
      "Arama URL şablonu rakip sitenin alan adına ait olmalıdır.",
    );
  }
}

function revalidatePaths(
  siteId: number,
): void {
  revalidatePath(
    "/admin/competitor-prices",
  );

  revalidatePath(
    "/admin/competitor-prices/sites",
  );

  revalidatePath(
    `/admin/competitor-prices/sites/${siteId}/edit`,
  );

  revalidatePath(
    "/admin/competitor-prices/mappings",
  );
}

export async function updateCompetitorSite(
  formData: FormData,
): Promise<void> {
  await AuthorizationService.requirePermission(
    "INVENTORY_ADJUST",
  );

  const siteId = parsePositiveInteger(
    formData.get("siteId"),
  );

  try {
    const name = readText(
      formData,
      "name",
    );

    const code = normalizeCode(
      readText(
        formData,
        "code",
      ),
    );

    const rawBaseUrl = readText(
      formData,
      "baseUrl",
    );

    const searchUrlTemplate =
      readText(
        formData,
        "searchUrlTemplate",
      );

    const productUrlPattern =
      readText(
        formData,
        "productUrlPattern",
      );

    const notes = readText(
      formData,
      "notes",
    );

    if (
      name.length < 2 ||
      name.length > 100
    ) {
      throw new Error(
        "Rakip site adı 2 ile 100 karakter arasında olmalıdır.",
      );
    }

    if (
      code.length < 2 ||
      code.length > 30
    ) {
      throw new Error(
        "Rakip site kodu 2 ile 30 karakter arasında olmalıdır.",
      );
    }

    if (!rawBaseUrl) {
      throw new Error(
        "Rakip site adresi zorunludur.",
      );
    }

    const baseUrl =
      normalizeBaseUrl(
        rawBaseUrl,
      );

    const sourceType =
      parseSourceType(
        formData.get("sourceType"),
      );

    const defaultVatRate =
      parseOptionalVatRate(
        formData.get(
          "defaultVatRate",
        ),
      );

    const searchEnabled =
      formData.get(
        "searchEnabled",
      ) === "on";

    const searchResultLimit =
      parseSearchResultLimit(
        formData.get(
          "searchResultLimit",
        ),
      );

    validateSearchSettings({
      baseUrl,
      searchEnabled,
      searchUrlTemplate,
    });

    const site =
      await prisma.competitorSite.findFirst({
        where: {
          id: siteId,

          tenantId:
            B2B_CONSTANTS.TENANT_ID,

          companyId:
            B2B_CONSTANTS.COMPANY_ID,
        },

        select: {
          id: true,
        },
      });

    if (!site) {
      throw new Error(
        "Rakip site bulunamadı.",
      );
    }

    await prisma.competitorSite.update({
      where: {
        id: site.id,
      },

      data: {
        name,
        code,
        baseUrl,
        sourceType,
        defaultVatRate,

        searchEnabled,

        searchUrlTemplate:
          searchUrlTemplate || null,

        productUrlPattern:
          productUrlPattern || null,

        searchResultLimit,

        notes:
          notes || null,
      },
    });

    revalidatePaths(site.id);
  } catch (error) {
    console.error(
      "Update competitor site failed:",
      error,
    );

    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      redirect(
        `/admin/competitor-prices/sites/${siteId}/edit?status=error&message=${encodeURIComponent(
          "Bu rakip site kodu daha önce kullanılmış.",
        )}`,
      );
    }

    const message =
      error instanceof Error
        ? error.message
        : "Rakip site güncellenirken bilinmeyen bir hata oluştu.";

    redirect(
      `/admin/competitor-prices/sites/${siteId}/edit?status=error&message=${encodeURIComponent(
        message,
      )}`,
    );
  }

  redirect(
    `/admin/competitor-prices/sites/${siteId}/edit?status=success&message=${encodeURIComponent(
      "Rakip site ayarları başarıyla güncellendi.",
    )}`,
  );
}