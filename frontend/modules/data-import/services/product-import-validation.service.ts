import "server-only";

import {
  PRODUCT_IMPORT_TEMPLATE,
} from "@/modules/data-import/constants/product-import.constants";

import type {
  ImportCellValue,
  ParsedImportSheet,
} from "@/modules/data-import/types/data-import.types";

export type ProductImportNormalizedData = {
  code: string | null;
  barcode: string | null;
  name: string | null;
  brand: string | null;
  category: string | null;
  supplier: string | null;
  price: number | null;
  vat: number | null;
  ownStock: boolean | null;
  isActive: boolean | null;
};

export type ValidatedProductImportRow = {
  sheetName: string;
  rowNumber: number;
  externalKey: string | null;
  rawData: Record<
    string,
    ImportCellValue
  >;
  normalizedData:
    ProductImportNormalizedData;
  errors: string[];
};

function normalizeHeader(
  value: ImportCellValue
) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("ş", "s")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .replace(
      /[^a-z0-9]/g,
      ""
    );
}

function asText(
  value: ImportCellValue
) {
  if (
    value === null ||
    value === ""
  ) {
    return null;
  }

  return (
    String(value).trim() ||
    null
  );
}

function asUpperText(
  value: ImportCellValue
) {
  return (
    asText(value)
      ?.toLocaleUpperCase(
        "tr-TR"
      ) ?? null
  );
}

function asNumber(
  value: ImportCellValue
) {
  if (
    value === null ||
    value === ""
  ) {
    return null;
  }

  if (
    typeof value === "number"
  ) {
    return Number.isFinite(
      value
    )
      ? value
      : null;
  }

  const result = Number(
    String(value)
      .trim()
      .replace(",", ".")
  );

  return Number.isFinite(
    result
  )
    ? result
    : null;
}

function asInteger(
  value: ImportCellValue
) {
  const result =
    asNumber(value);

  return (
    result !== null &&
    Number.isInteger(result)
  )
    ? result
    : null;
}

function asBoolean(
  value: ImportCellValue,
  defaultValue: boolean
) {
  if (
    value === null ||
    value === ""
  ) {
    return defaultValue;
  }

  if (
    typeof value === "boolean"
  ) {
    return value;
  }

  if (
    typeof value === "number"
  ) {
    if (value === 1) {
      return true;
    }

    if (value === 0) {
      return false;
    }

    return null;
  }

  const normalized =
    String(value)
      .trim()
      .toLocaleLowerCase(
        "tr-TR"
      );

  if (
    [
      "true",
      "1",
      "evet",
      "e",
      "aktif",
    ].includes(normalized)
  ) {
    return true;
  }

  if (
    [
      "false",
      "0",
      "hayir",
      "hayır",
      "h",
      "pasif",
    ].includes(normalized)
  ) {
    return false;
  }

  return null;
}

function createHeaderKeys(
  sheet: ParsedImportSheet
) {
  const headerRow =
    sheet.rows[0];

  if (!headerRow) {
    throw new Error(
      "Excel sayfasında başlık satırı bulunamadı."
    );
  }

  const expectedHeaders =
    new Map(
      PRODUCT_IMPORT_TEMPLATE.columns.map(
        (column) => [
          normalizeHeader(
            column.header
          ),
          column.key,
        ]
      )
    );

  const headers =
    headerRow.values.map(
      (value) => {
        const normalized =
          normalizeHeader(
            value
          );

        return (
          expectedHeaders.get(
            normalized
          ) ?? normalized
        );
      }
    );

  const duplicateHeaders =
    headers.filter(
      (header, index) =>
        Boolean(header) &&
        headers.indexOf(
          header
        ) !== index
    );

  if (
    duplicateHeaders.length > 0
  ) {
    throw new Error(
      "Excel dosyasında tekrarlanan kolon başlıkları var."
    );
  }

  const missingHeaders =
    PRODUCT_IMPORT_TEMPLATE.columns
      .filter(
        (column) =>
          column.required &&
          !headers.includes(
            column.key
          )
      )
      .map(
        (column) =>
          column.header
      );

  if (
    missingHeaders.length > 0
  ) {
    throw new Error(
      `Zorunlu kolonlar eksik: ${missingHeaders.join(", ")}.`
    );
  }

  return headers;
}

function createRawData({
  headers,
  values,
}: {
  headers: string[];
  values: ImportCellValue[];
}) {
  const rawData: Record<
    string,
    ImportCellValue
  > = {};

  headers.forEach(
    (header, index) => {
      if (header) {
        rawData[header] =
          values[index] ??
          null;
      }
    }
  );

  return rawData;
}

function normalizeProduct(
  rawData: Record<
    string,
    ImportCellValue
  >
): ProductImportNormalizedData {
  return {
    code:
      asUpperText(
        rawData.code
      ),

    barcode:
      asText(
        rawData.barcode
      ),

    name:
      asText(
        rawData.name
      ),

    brand:
      asText(
        rawData.brand
      ),

    category:
      asText(
        rawData.category
      ),

    supplier:
      asText(
        rawData.supplier
      ),

    price:
      asNumber(
        rawData.price
      ),

    vat:
      asInteger(
        rawData.vat
      ),

    ownStock:
      asBoolean(
        rawData.ownStock,
        false
      ),

    isActive:
      asBoolean(
        rawData.isActive,
        true
      ),
  };
}

function validateProduct(
  data:
    ProductImportNormalizedData
) {
  const errors: string[] = [];

  if (!data.code) {
    errors.push(
      "Ürün kodu zorunludur."
    );
  } else if (
    data.code.length > 60
  ) {
    errors.push(
      "Ürün kodu en fazla 60 karakter olabilir."
    );
  }

  if (!data.name) {
    errors.push(
      "Ürün adı zorunludur."
    );
  }

  if (!data.barcode) {
    errors.push(
      "Barkod zorunludur."
    );
  }

  if (
    data.barcode &&
    data.barcode.length > 60
  ) {
    errors.push(
      "Barkod en fazla 60 karakter olabilir."
    );
  }

  if (!data.brand) {
    errors.push(
      "Marka zorunludur."
    );
  }

  if (!data.category) {
    errors.push(
      "Kategori zorunludur."
    );
  }

  if (!data.supplier) {
    errors.push(
      "Tedarikçi zorunludur."
    );
  }

  if (
    data.price === null ||
    data.price < 0
  ) {
    errors.push(
      "Fiyat sıfır veya daha büyük geçerli bir sayı olmalıdır."
    );
  }

  if (
    data.vat === null ||
    data.vat < 0 ||
    data.vat > 100
  ) {
    errors.push(
      "KDV 0-100 arasında tam sayı olmalıdır."
    );
  }

  if (
    data.ownStock === null
  ) {
    errors.push(
      "KendiStogu alanı Evet/Hayır, True/False veya 1/0 olmalıdır."
    );
  }

  if (
    data.isActive === null
  ) {
    errors.push(
      "Aktif alanı Evet/Hayır, True/False veya 1/0 olmalıdır."
    );
  }

  return errors;
}

export class ProductImportValidationService {
  static validateSheet(
    sheet: ParsedImportSheet
  ): ValidatedProductImportRow[] {
    const headers =
      createHeaderKeys(sheet);

    const seenCodes =
      new Set<string>();

    const seenBarcodes =
      new Set<string>();

    const results:
      ValidatedProductImportRow[] =
      [];

    for (
      const row
      of sheet.rows.slice(1)
    ) {
      const rawData =
        createRawData({
          headers,
          values:
            row.values,
        });

      const normalizedData =
        normalizeProduct(
          rawData
        );

      const errors =
        validateProduct(
          normalizedData
        );

      const externalKey =
        normalizedData.code;

      if (
        externalKey &&
        seenCodes.has(
          externalKey
        )
      ) {
        errors.push(
          "Aynı ürün kodu Excel dosyasında birden fazla kez kullanılmış."
        );
      }

      if (externalKey) {
        seenCodes.add(
          externalKey
        );
      }

      if (
        normalizedData.barcode &&
        seenBarcodes.has(
          normalizedData.barcode
        )
      ) {
        errors.push(
          "Aynı barkod Excel dosyasında birden fazla kez kullanılmış."
        );
      }

      if (
        normalizedData.barcode
      ) {
        seenBarcodes.add(
          normalizedData.barcode
        );
      }

      results.push({
        sheetName:
          row.sheetName,

        rowNumber:
          row.rowNumber,

        externalKey,

        rawData,

        normalizedData,

        errors,
      });
    }

    return results;
  }
}
