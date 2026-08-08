"use server";

import {
  CompetitorSourceType,
  Prisma,
} from "@prisma/client";
import { revalidatePath } from "next/cache";

import type {
  CompetitorSiteActionState,
} from "./types";

import { prisma } from "@/lib/prisma";
import { B2B_CONSTANTS } from "@/modules/b2b/constants/b2b.constants";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";


function readRequiredText(
  formData: FormData,
  fieldName: string,
): string {
  const value = formData.get(fieldName);

  return typeof value === "string"
    ? value.trim()
    : "";
}

function normalizeCode(value: string): string {
  return value
    .trim()
    .toLocaleUpperCase("tr-TR")
    .replace(/[^A-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeBaseUrl(value: string): string {
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
      "Arama sonucu limiti 1 ile 50 arasında olmalıdır.",
    );
  }

  return parsedValue;
}

function parseSourceType(
  value: FormDataEntryValue | null,
): CompetitorSourceType {
  if (
    typeof value !== "string" ||
    !Object.values(CompetitorSourceType).includes(
      value as CompetitorSourceType,
    )
  ) {
    throw new Error(
      "Geçerli bir kaynak tipi seçin.",
    );
  }

  return value as CompetitorSourceType;
}

function revalidateCompetitorPricePaths(): void {
  revalidatePath(
    "/admin/competitor-prices",
  );
  revalidatePath(
    "/admin/competitor-prices/sites",
  );
  revalidatePath(
    "/admin/competitor-prices/mappings",
  );
}

export async function createCompetitorSite(
  _previousState: CompetitorSiteActionState,
  formData: FormData,
): Promise<CompetitorSiteActionState> {
  await AuthorizationService.requirePermission(
    "INVENTORY_ADJUST",
  );

  try {
    const name = readRequiredText(
      formData,
      "name",
    );

    const rawCode = readRequiredText(
      formData,
      "code",
    );

    const rawBaseUrl = readRequiredText(
      formData,
      "baseUrl",
    );

    const notesValue = readRequiredText(
      formData,
      "notes",
    );

    const searchUrlTemplate = readRequiredText(
  formData,
  "searchUrlTemplate",
);

const productUrlPattern = readRequiredText(
  formData,
  "productUrlPattern",
);

const searchEnabled =
  formData.get("searchEnabled") === "on";

const searchResultLimit =
  parseSearchResultLimit(
    formData.get("searchResultLimit"),
  );

    if (name.length < 2) {
      return {
        status: "error",
        message:
          "Rakip site adı en az 2 karakter olmalıdır.",
      };
    }

    if (name.length > 100) {
      return {
        status: "error",
        message:
          "Rakip site adı 100 karakteri aşamaz.",
      };
    }

    const code = normalizeCode(rawCode);

    if (code.length < 2) {
      return {
        status: "error",
        message:
          "Rakip site kodu en az 2 karakter olmalıdır.",
      };
    }

    if (code.length > 30) {
      return {
        status: "error",
        message:
          "Rakip site kodu 30 karakteri aşamaz.",
      };
    }

    if (!rawBaseUrl) {
      return {
        status: "error",
        message:
          "Rakip site adresi zorunludur.",
      };
    }

    const baseUrl =
      normalizeBaseUrl(rawBaseUrl);

    const sourceType = parseSourceType(
      formData.get("sourceType"),
    );

    const defaultVatRate =
      parseOptionalVatRate(
        formData.get("defaultVatRate"),
      );

    await prisma.competitorSite.create({
      data: {
        tenantId:
          B2B_CONSTANTS.TENANT_ID,

        companyId:
          B2B_CONSTANTS.COMPANY_ID,

        code,
        name,
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
          notesValue || null,

        isActive: true,
      },
    });

    if (searchEnabled) {
  if (!searchUrlTemplate) {
    return {
      status: "error",
      message:
        "Otomatik arama açıksa arama URL şablonu zorunludur.",
    };
  }

  if (
    !searchUrlTemplate.includes(
      "{query}",
    )
  ) {
    return {
      status: "error",
      message:
        "Arama URL şablonunda {query} değişkeni bulunmalıdır.",
    };
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
    parsedSearchUrl.hostname.replace(
      /^www\./,
      "",
    ) !==
    parsedBaseUrl.hostname.replace(
      /^www\./,
      "",
    )
  ) {
    return {
      status: "error",
      message:
        "Arama URL şablonu rakip sitenin alan adına ait olmalıdır.",
    };
  }
}

    revalidateCompetitorPricePaths();

    return {
      status: "success",
      message: `${name} başarıyla eklendi.`,
    };
  } catch (error) {
    console.error(
      "Create competitor site failed:",
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
          "Bu rakip site kodu veya adresi daha önce tanımlanmış.",
      };
    }

    return {
      status: "error",

      message:
        error instanceof Error
          ? error.message
          : "Rakip site eklenirken bilinmeyen bir hata oluştu.",
    };
  }
}

export async function toggleCompetitorSiteStatus(
  siteId: number,
  currentStatus: boolean,
): Promise<void> {
  await AuthorizationService.requirePermission(
    "INVENTORY_ADJUST",
  );

  if (
    !Number.isInteger(siteId) ||
    siteId <= 0
  ) {
    throw new Error(
      "Geçersiz rakip site kaydı.",
    );
  }

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
      isActive: !currentStatus,
    },
  });

  revalidateCompetitorPricePaths();
}