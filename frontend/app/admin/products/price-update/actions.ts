"use server";

import {
  readSheet,
  type Row,
} from "read-excel-file/node";

import {
  revalidatePath,
} from "next/cache";

import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

export type ProductPriceUpdateError = {
  rowNumber: number;
  code: string;
  message: string;
};

export type ProductPriceUpdateState = {
  status:
    | "idle"
    | "success"
    | "error";

  message: string;

  totalRows: number;
  updatedCount: number;
  unchangedCount: number;
  skippedCount: number;

  errors:
    ProductPriceUpdateError[];
};

function createInitialState(): ProductPriceUpdateState {
  return {
    status: "idle",
    message: "",
    totalRows: 0,
    updatedCount: 0,
    unchangedCount: 0,
    skippedCount: 0,
    errors: [],
  };
}

function normalizeHeader(
  value: unknown,
) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase(
      "tr-TR",
    )
    .replaceAll("ı", "i")
    .replaceAll("ş", "s")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .replace(
      /[^a-z0-9]/g,
      "",
    );
}

function parsePrice(
  value: unknown,
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  if (
    typeof value ===
    "number"
  ) {
    return Number.isFinite(
      value,
    )
      ? value
      : null;
  }

  const raw =
    String(value)
      .trim()
      .replace(/\s/g, "")
      .replace(/₺/g, "");

  if (!raw) {
    return null;
  }

  /*
   * 1.234,56
   */
  if (
    raw.includes(",") &&
    raw.includes(".")
  ) {
    const parsed =
      Number(
        raw
          .replaceAll(".", "")
          .replace(",", "."),
      );

    return Number.isFinite(
      parsed,
    )
      ? parsed
      : null;
  }

  /*
   * 1234,56
   */
  if (raw.includes(",")) {
    const parsed =
      Number(
        raw.replace(
          ",",
          ".",
        ),
      );

    return Number.isFinite(
      parsed,
    )
      ? parsed
      : null;
  }

  const parsed =
    Number(raw);

  return Number.isFinite(
    parsed,
  )
    ? parsed
    : null;
}

export async function updateProductPricesFromExcel(
  _previousState: ProductPriceUpdateState,
  formData: FormData,
): Promise<ProductPriceUpdateState> {
  await AuthorizationService.requirePermission(
    "INVENTORY_ADJUST",
  );

  const file =
    formData.get(
      "priceFile",
    );

  if (!(file instanceof File)) {
    return {
      ...createInitialState(),

      status: "error",

      message:
        "Lütfen fiyat güncelleme Excel dosyasını seçin.",
    };
  }

  if (file.size === 0) {
    return {
      ...createInitialState(),

      status: "error",

      message:
        "Seçilen Excel dosyası boş.",
    };
  }

  if (
    !file.name
      .toLowerCase()
      .endsWith(".xlsx")
  ) {
    return {
      ...createInitialState(),

      status: "error",

      message:
        "Yalnızca .xlsx uzantılı Excel dosyaları yüklenebilir.",
    };
  }

  const maximumFileSize =
    5 * 1024 * 1024;

  if (
    file.size >
    maximumFileSize
  ) {
    return {
      ...createInitialState(),

      status: "error",

      message:
        "Excel dosyası 5 MB sınırını aşamaz.",
    };
  }

  let rows: Row[];

  try {
    const buffer =
      Buffer.from(
        await file.arrayBuffer(),
      );

    rows =
        await readSheet(
        buffer,
      );
  } catch (error) {
    console.error(
      "Price update Excel read error:",
      error,
    );

    return {
      ...createInitialState(),

      status: "error",

      message:
        "Excel dosyası okunamadı.",
    };
  }

  if (
    rows.length < 2
  ) {
    return {
      ...createInitialState(),

      status: "error",

      message:
        "Excel dosyasında fiyat güncellenecek ürün bulunamadı.",
    };
  }

  const headerRow =
    rows[0];

  const headerMap =
    new Map<string, number>();

  headerRow.forEach(
    (cell, index) => {
      const key =
        normalizeHeader(
          cell,
        );

      if (key) {
        headerMap.set(
          key,
          index,
        );
      }
    },
  );

  const skuHeaders = [
    "ETKEN SKU",
    "ETKEN_SKU",
    "SKU",
    "Ürün Kodu",
    "Urun Kodu",
    "Kod",
  ];

  const priceHeaders = [
    "Satış Fiyatı",
    "Satis Fiyati",
    "Fiyat",
    "Yeni Fiyat",
    "Price",
  ];

  function findIndex(
    possibleHeaders: string[],
  ) {
    for (
      const header
      of possibleHeaders
    ) {
      const index =
        headerMap.get(
          normalizeHeader(
            header,
          ),
        );

      if (
        index !==
        undefined
      ) {
        return index;
      }
    }

    return null;
  }

  const skuIndex =
    findIndex(
      skuHeaders,
    );

  const priceIndex =
    findIndex(
      priceHeaders,
    );

  if (
    skuIndex === null ||
    priceIndex === null
  ) {
    return {
      ...createInitialState(),

      status: "error",

      message:
        "Excel dosyasında ETKEN SKU ve Satış Fiyatı sütunları bulunmalıdır.",
    };
  }

  const dataRows =
    rows
      .slice(1)
      .map(
        (row, index) => ({
          row,
          rowNumber:
            index + 2,
        }),
      )
      .filter(
        ({ row }) =>
          row.some(
            (cell) =>
              cell !== null &&
              cell !== undefined &&
              String(
                cell,
              ).trim() !==
                "",
          ),
      );

  let updatedCount = 0;
  let unchangedCount = 0;
  let skippedCount = 0;

  const errors:
    ProductPriceUpdateError[] =
    [];

  const seenCodes =
    new Set<string>();

  for (
    const {
      row,
      rowNumber,
    } of dataRows
  ) {
    const code =
      String(
        row[
          skuIndex
        ] ?? "",
      )
        .trim()
        .toLocaleUpperCase(
          "tr-TR",
        );

    const price =
      parsePrice(
        row[
          priceIndex
        ],
      );

    if (!code) {
      skippedCount += 1;

      errors.push({
        rowNumber,
        code: "",
        message:
          "ETKEN SKU boş.",
      });

      continue;
    }

    if (
      seenCodes.has(
        code,
      )
    ) {
      skippedCount += 1;

      errors.push({
        rowNumber,
        code,
        message:
          "Aynı ETKEN SKU Excel dosyasında birden fazla kez bulunuyor.",
      });

      continue;
    }

    seenCodes.add(code);

    if (
      price === null
    ) {
      skippedCount += 1;

      errors.push({
        rowNumber,
        code,
        message:
          "Satış fiyatı boş veya geçersiz.",
      });

      continue;
    }

    if (price < 0) {
      skippedCount += 1;

      errors.push({
        rowNumber,
        code,
        message:
          "Satış fiyatı negatif olamaz.",
      });

      continue;
    }

    const product =
      await prisma.product.findUnique(
        {
          where: {
            code,
          },

          select: {
            id: true,
            price: true,
          },
        },
      );

    if (!product) {
      skippedCount += 1;

      errors.push({
        rowNumber,
        code,
        message:
          "Ürün sistemde bulunamadı.",
      });

      continue;
    }

    const oldPrice =
      Number(
        product.price,
      );

    if (
      Math.abs(
        oldPrice -
          price,
      ) < 0.0001
    ) {
      unchangedCount += 1;
      continue;
    }

    await prisma.product.update(
      {
        where: {
          id: product.id,
        },

        data: {
          price,
        },
      },
    );

    updatedCount += 1;
  }

  revalidatePath("/");
  revalidatePath(
    "/products",
  );
  revalidatePath(
    "/admin",
  );
  revalidatePath(
    "/admin/products",
  );
  revalidatePath(
    "/admin/products/price-update",
  );

  return {
    status:
      errors.length ===
        dataRows.length
        ? "error"
        : "success",

    message:
      `${updatedCount} ürünün fiyatı güncellendi.`,

    totalRows:
      dataRows.length,

    updatedCount,
    unchangedCount,
    skippedCount,

    errors,
  };
}