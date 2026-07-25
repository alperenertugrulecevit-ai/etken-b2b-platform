import "server-only";

import {
  PURCHASE_ORDER_IMPORT_TEMPLATE,
} from "@/modules/data-import/constants/purchase-order-import.constants";

import type {
  ImportCellValue,
  ParsedImportSheet,
} from "@/modules/data-import/types/data-import.types";

export type PurchaseOrderLineImportNormalizedData = {
  purchaseNumber: string | null;
  productCode: string | null;
  orderedQuantity: number | null;
  unitPrice: number | null;
  vatRate: number | null;
};

export type ValidatedPurchaseOrderLineImportRow = {
  sheetName: string;
  rowNumber: number;
  externalKey: string | null;

  rawData:
    Record<
      string,
      ImportCellValue
    >;

  normalizedData:
    PurchaseOrderLineImportNormalizedData;

  errors: string[];
};

function normalizeHeader(
  value: ImportCellValue
) {
  return String(
    value ?? ""
  )
    .trim()
    .toLocaleLowerCase(
      "tr-TR"
    )
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
    asText(
      value
    )?.toLocaleUpperCase(
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
    typeof value ===
    "number"
  ) {
    return Number.isFinite(
      value
    )
      ? value
      : null;
  }

  const result =
    Number(
      String(value)
        .trim()
        .replace(
          /\s/g,
          ""
        )
        .replace(
          ",",
          "."
        )
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
    Number.isInteger(
      result
    )
  )
    ? result
    : null;
}

function createHeaderKeys(
  sheet:
    ParsedImportSheet
) {
  const headerRow =
    sheet.rows[0];

  if (!headerRow) {
    throw new Error(
      "Sipariş satırları sayfasında başlık satırı bulunamadı."
    );
  }

  const expectedHeaders =
    new Map(
      PURCHASE_ORDER_IMPORT_TEMPLATE
        .lineColumns
        .map(
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
          ) ??
          normalized
        );
      }
    );

  const duplicateHeaders =
    headers.filter(
      (
        header,
        index
      ) =>
        Boolean(header) &&
        headers.indexOf(
          header
        ) !== index
    );

  if (
    duplicateHeaders.length >
    0
  ) {
    throw new Error(
      "Sipariş satırları sayfasında tekrarlanan kolon başlıkları var."
    );
  }

  const missingHeaders =
    PURCHASE_ORDER_IMPORT_TEMPLATE
      .lineColumns
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
    missingHeaders.length >
    0
  ) {
    throw new Error(
      `Sipariş satırları sayfasındaki zorunlu kolonlar eksik: ${missingHeaders.join(
        ", "
      )}.`
    );
  }

  return headers;
}

function createRawData({
  headers,
  values,
}: {
  headers: string[];
  values:
    ImportCellValue[];
}) {
  const rawData:
    Record<
      string,
      ImportCellValue
    > = {};

  headers.forEach(
    (
      header,
      index
    ) => {
      if (header) {
        rawData[
          header
        ] =
          values[
            index
          ] ?? null;
      }
    }
  );

  return rawData;
}

function normalizeLine(
  rawData:
    Record<
      string,
      ImportCellValue
    >
): PurchaseOrderLineImportNormalizedData {
  return {
    purchaseNumber:
      asUpperText(
        rawData.purchaseNumber
      ),

    productCode:
      asUpperText(
        rawData.productCode
      ),

    orderedQuantity:
      asInteger(
        rawData.orderedQuantity
      ),

    unitPrice:
      asNumber(
        rawData.unitPrice
      ),

    vatRate:
      asInteger(
        rawData.vatRate
      ),
  };
}

function validateLine({
  data,
  purchaseNumbers,
}: {
  data:
    PurchaseOrderLineImportNormalizedData;

  purchaseNumbers:
    Set<string>;
}) {
  const errors:
    string[] = [];

  if (
    !data.purchaseNumber
  ) {
    errors.push(
      "Satın alma sipariş numarası zorunludur."
    );
  } else if (
    !purchaseNumbers.has(
      data.purchaseNumber
    )
  ) {
    errors.push(
      `${data.purchaseNumber} sipariş numarası SatinalmaSiparisleri sayfasında bulunamadı.`
    );
  }

  if (
    !data.productCode
  ) {
    errors.push(
      "Ürün kodu zorunludur."
    );
  }

  if (
    data.orderedQuantity ===
      null ||
    data.orderedQuantity <=
      0
  ) {
    errors.push(
      "Sipariş miktarı sıfırdan büyük tam sayı olmalıdır."
    );
  }

  if (
    data.unitPrice ===
      null ||
    data.unitPrice <
      0
  ) {
    errors.push(
      "Birim fiyat sıfır veya daha büyük geçerli bir sayı olmalıdır."
    );
  }

  if (
    data.vatRate ===
      null ||
    data.vatRate <
      0 ||
    data.vatRate >
      100
  ) {
    errors.push(
      "KDV oranı 0-100 arasında tam sayı olmalıdır."
    );
  }

  return errors;
}

export class PurchaseOrderLineImportValidationService {
  static validateSheet(
    sheet:
      ParsedImportSheet,

    purchaseNumbers:
      Set<string>
  ): ValidatedPurchaseOrderLineImportRow[] {
    const headers =
      createHeaderKeys(
        sheet
      );

    const seenLines =
      new Set<string>();

    const results:
      ValidatedPurchaseOrderLineImportRow[] =
      [];

    for (
      const row of
      sheet.rows.slice(1)
    ) {
      const rawData =
        createRawData({
          headers,
          values:
            row.values,
        });

      const normalizedData =
        normalizeLine(
          rawData
        );

      const errors =
        validateLine({
          data:
            normalizedData,

          purchaseNumbers,
        });

      const externalKey =
        normalizedData.purchaseNumber &&
        normalizedData.productCode
          ? `${normalizedData.purchaseNumber}|${normalizedData.productCode}`
          : null;

      if (
        externalKey &&
        seenLines.has(
          externalKey
        )
      ) {
        errors.push(
          "Aynı ürün aynı satın alma siparişinde birden fazla kez kullanılmış."
        );
      }

      if (externalKey) {
        seenLines.add(
          externalKey
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