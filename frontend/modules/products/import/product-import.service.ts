import {
  readSheet,
  type Row,
} from "read-excel-file/node";

import { prisma } from "@/lib/prisma";

import type {
  ParsedProductImportRow,
  ProductImportRowError,
  ProductImportState,
} from "./product-import.types";

const EXPECTED_SHEET_NAME = "Products_100";
const FALLBACK_SUPPLIER = "TEDARİKÇİ BEKLİYOR";

type HeaderMap = Map<string, number>;

type ImportAccumulator = {
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  errors: ProductImportRowError[];
};

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("ş", "s")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .replaceAll(/[^a-z0-9]/g, "");
}

function stringValue(value: unknown): string {
  return String(value ?? "").trim();
}

function nullableString(value: unknown): string | null {
  const normalized = stringValue(value);

  return normalized.length > 0 ? normalized : null;
}

function nullableNumber(value: unknown): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const normalized = String(value)
    .trim()
    .replaceAll(".", "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

function nullableInteger(value: unknown): number | null {
  const number = nullableNumber(value);

  if (number === null) {
    return null;
  }

  return Math.max(0, Math.trunc(number));
}

function getHeaderMap(headerRow: Row): HeaderMap {
  const headerMap: HeaderMap = new Map();

  headerRow.forEach((cell, index) => {
    const normalized = normalizeHeader(cell);

    if (normalized) {
      headerMap.set(normalized, index);
    }
  });

  return headerMap;
}

function getCell(
  row: Row,
  headerMap: HeaderMap,
  possibleHeaders: string[]
): unknown {
  for (const header of possibleHeaders) {
    const index = headerMap.get(
      normalizeHeader(header)
    );

    if (index !== undefined) {
      return row[index];
    }
  }

  return null;
}

function parseRow(
  row: Row,
  rowNumber: number,
  headerMap: HeaderMap
): ParsedProductImportRow {
  return {
    rowNumber,

    code: stringValue(
      getCell(row, headerMap, [
        "ETKEN_SKU",
        "SKU",
        "Ürün Kodu",
        "Kod",
      ])
    ).toLocaleUpperCase("tr-TR"),

    brand: stringValue(
      getCell(row, headerMap, [
        "Marka",
        "Brand",
      ])
    ),

    name: stringValue(
      getCell(row, headerMap, [
        "Ürün Adı",
        "Urun Adi",
        "Product Name",
      ])
    ),

    mainCategory: stringValue(
      getCell(row, headerMap, [
        "Ana Kategori",
        "Main Category",
      ])
    ),

    subCategory: stringValue(
      getCell(row, headerMap, [
        "Alt Kategori",
        "Sub Category",
        "Kategori",
      ])
    ),

    salesUnit: stringValue(
      getCell(row, headerMap, [
        "Satış Birimi",
        "Satis Birimi",
        "Birim",
      ])
    ),

    packageInfo: stringValue(
      getCell(row, headerMap, [
        "Ambalaj / Paket Bilgisi",
        "Ambalaj",
        "Paket Bilgisi",
      ])
    ),

    price: nullableNumber(
      getCell(row, headerMap, [
        "Satış Fiyatı",
        "Satis Fiyati",
        "Fiyat",
        "Price",
      ])
    ),

    stock: nullableInteger(
      getCell(row, headerMap, [
        "Stok",
        "Stock",
      ])
    ),

    supplier: nullableString(
      getCell(row, headerMap, [
        "Tedarikçi",
        "Tedarikci",
        "Supplier",
      ])
    ),

    barcode: nullableString(
      getCell(row, headerMap, [
        "Üretici Barkodu",
        "Uretici Barkodu",
        "Barkod",
        "Barcode",
        "GTIN",
        "EAN",
      ])
    ),
  };
}

function validateRow(
  row: ParsedProductImportRow
): string[] {
  const errors: string[] = [];

  if (!row.code) {
    errors.push("ETKEN SKU boş.");
  }

  if (!row.name) {
    errors.push("Ürün adı boş.");
  }

  if (!row.brand) {
    errors.push("Marka boş.");
  }

  if (!row.mainCategory && !row.subCategory) {
    errors.push("Kategori boş.");
  }

  if (row.code.length > 100) {
    errors.push(
      "ETKEN SKU 100 karakterden uzun olamaz."
    );
  }

  if (
    row.price !== null &&
    row.price < 0
  ) {
    errors.push(
      "Satış fiyatı negatif olamaz."
    );
  }

  if (
    row.stock !== null &&
    row.stock < 0
  ) {
    errors.push(
      "Stok negatif olamaz."
    );
  }

  return errors;
}

function temporaryBarcode(code: string): string {
  return `TMP-${code}`;
}

function effectiveCategory(
  row: ParsedProductImportRow
): string {
  return (
    row.subCategory ||
    row.mainCategory ||
    "Kategorisiz"
  );
}

function buildImportDescription(
  row: ParsedProductImportRow
): string {
  return [
    row.salesUnit
      ? `Satış birimi: ${row.salesUnit}`
      : null,

    row.packageInfo
      ? `Paket: ${row.packageInfo}`
      : null,
  ]
    .filter(Boolean)
    .join(" | ");
}

async function upsertProduct(
  row: ParsedProductImportRow
): Promise<"created" | "updated"> {
  const existingProduct =
    await prisma.product.findUnique({
      where: {
        code: row.code,
      },
    });

  const category = effectiveCategory(row);
  const description = buildImportDescription(row);

  /*
   * Product modelinde henüz açıklama ve ambalaj
   * alanları bulunmadığı için description değişkeni
   * şimdilik hazırlanıyor ancak veritabanına yazılmıyor.
   *
   * Veri modeli genişletildiğinde aynı Excel alanları
   * doğrudan ürün detaylarına aktarılabilir.
   */
  void description;

  if (existingProduct) {
    const nextPrice =
      row.price ?? existingProduct.price;

    const nextStock =
      row.stock ?? existingProduct.stock;

    const nextSupplier =
      row.supplier ??
      existingProduct.supplier;

    const nextBarcode =
      row.barcode ??
      existingProduct.barcode;

    await prisma.product.update({
      where: {
        id: existingProduct.id,
      },

      data: {
        name: row.name,
        brand: row.brand,
        category,
        supplier: nextSupplier,
        price: nextPrice,
        stock: nextStock,
        barcode: nextBarcode,

        /*
         * Fiyatı sıfır veya daha düşük olan ürün,
         * mevcut durumda yanlışlıkla satışa açılmaz.
         */
isActive: true,
      },
    });

    return "updated";
  }

  const newPrice = row.price ?? 0;
  const newStock = row.stock ?? 0;

  await prisma.product.create({
    data: {
      code: row.code,
      barcode:
        row.barcode ??
        temporaryBarcode(row.code),

      name: row.name,
      brand: row.brand,
      category,

      supplier:
        row.supplier ??
        FALLBACK_SUPPLIER,

      price: newPrice,
      stock: newStock,
      reservedStock: 0,
      vat: 20,
      ownStock: false,

      /*
       * Fiyat girilmemiş yeni ürünler taslak/pasif
       * olarak oluşturulur.
       */
isActive: true,    },
  });

  return "created";
}

export class ProductImportService {
  static async importExcel(
    file: File
  ): Promise<ProductImportState> {
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      return {
        status: "error",
        message:
          "Yalnızca .xlsx uzantılı Excel dosyaları yüklenebilir.",
        totalRows: 0,
        createdCount: 0,
        updatedCount: 0,
        skippedCount: 0,
        errors: [],
      };
    }

    const fileBuffer = Buffer.from(
      await file.arrayBuffer()
    );

    let rows: Row[];

    try {
      rows = await readSheet(
  fileBuffer,
  EXPECTED_SHEET_NAME,
);
    } catch (error) {
      console.error(
        "Product Excel read error:",
        error
      );

      return {
        status: "error",
        message:
          `"${EXPECTED_SHEET_NAME}" isimli Excel sayfası okunamadı. ` +
          "Doğru Etken katalog dosyasını seçtiğinizden emin olun.",
        totalRows: 0,
        createdCount: 0,
        updatedCount: 0,
        skippedCount: 0,
        errors: [],
      };
    }

    if (rows.length < 2) {
      return {
        status: "error",
        message:
          "Excel dosyasında içe aktarılabilir ürün satırı bulunamadı.",
        totalRows: 0,
        createdCount: 0,
        updatedCount: 0,
        skippedCount: 0,
        errors: [],
      };
    }

    const headerMap = getHeaderMap(rows[0]);

    const requiredHeaders = [
      "ETKEN_SKU",
      "Marka",
      "Ürün Adı",
    ];

    const missingHeaders =
      requiredHeaders.filter(
        (header) =>
          !headerMap.has(
            normalizeHeader(header)
          )
      );

    if (missingHeaders.length > 0) {
      return {
        status: "error",
        message:
          `Zorunlu sütunlar bulunamadı: ${missingHeaders.join(
            ", "
          )}`,
        totalRows: 0,
        createdCount: 0,
        updatedCount: 0,
        skippedCount: 0,
        errors: [],
      };
    }

    const dataRows = rows
      .slice(1)
      .filter((row) =>
        row.some(
          (cell) =>
            cell !== null &&
            cell !== undefined &&
            String(cell).trim() !== ""
        )
      );

    const accumulator: ImportAccumulator = {
      createdCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      errors: [],
    };

    const seenCodes = new Set<string>();

    for (
      let index = 0;
      index < dataRows.length;
      index += 1
    ) {
      const rowNumber = index + 2;

      const parsedRow = parseRow(
        dataRows[index],
        rowNumber,
        headerMap
      );

      const validationErrors =
        validateRow(parsedRow);

      if (seenCodes.has(parsedRow.code)) {
        validationErrors.push(
          "Aynı ETKEN SKU Excel dosyasında birden fazla kez kullanılmış."
        );
      }

      if (parsedRow.code) {
        seenCodes.add(parsedRow.code);
      }

      if (validationErrors.length > 0) {
        accumulator.skippedCount += 1;

        accumulator.errors.push({
          rowNumber,
          code: parsedRow.code,
          productName: parsedRow.name,
          message:
            validationErrors.join(" "),
        });

        continue;
      }

      try {
        const result =
          await upsertProduct(parsedRow);

        if (result === "created") {
          accumulator.createdCount += 1;
        } else {
          accumulator.updatedCount += 1;
        }
      } catch (error) {
        console.error(
          `Product import row ${rowNumber} error:`,
          error
        );

        accumulator.skippedCount += 1;

        accumulator.errors.push({
          rowNumber,
          code: parsedRow.code,
          productName: parsedRow.name,
          message:
            error instanceof Error
              ? error.message
              : "Ürün kaydedilirken bilinmeyen bir hata oluştu.",
        });
      }
    }

    const processedCount =
      accumulator.createdCount +
      accumulator.updatedCount;

    return {
      status:
        processedCount > 0
          ? "success"
          : "error",

      message:
        processedCount > 0
          ? "Excel ürün içe aktarma işlemi tamamlandı."
          : "Hiçbir ürün içe aktarılamadı.",

      totalRows: dataRows.length,
      createdCount:
        accumulator.createdCount,
      updatedCount:
        accumulator.updatedCount,
      skippedCount:
        accumulator.skippedCount,
      errors: accumulator.errors.slice(0, 100),
    };
  }
}