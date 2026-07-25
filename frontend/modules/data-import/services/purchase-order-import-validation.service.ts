import "server-only";

import {
  PurchaseOrderStatus,
} from "@prisma/client";

import {
  PURCHASE_ORDER_IMPORT_TEMPLATE,
} from "@/modules/data-import/constants/purchase-order-import.constants";

import type {
  ImportCellValue,
  ParsedImportSheet,
} from "@/modules/data-import/types/data-import.types";

export type PurchaseOrderImportNormalizedData = {
  purchaseNumber: string | null;
  supplierName: string | null;
  status: PurchaseOrderStatus | null;
  orderDate: string | null;
  expectedDate: string | null;
  paymentTermDays: number | null;
  discountRate: number | null;
  supplierNote: string | null;
  internalNote: string | null;
};

export type ValidatedPurchaseOrderImportRow = {
  sheetName: string;
  rowNumber: number;
  externalKey: string | null;

  rawData:
    Record<
      string,
      ImportCellValue
    >;

  normalizedData:
    PurchaseOrderImportNormalizedData;

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

function createIsoDate({
  year,
  month,
  day,
}: {
  year: number;
  month: number;
  day: number;
}) {
  const date =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day
      )
    );

  if (
    date.getUTCFullYear() !==
      year ||
    date.getUTCMonth() !==
      month - 1 ||
    date.getUTCDate() !==
      day
  ) {
    return null;
  }

  return date.toISOString();
}

function asDateIso(
  value: ImportCellValue
) {
  if (
    value === null ||
    value === ""
  ) {
    return null;
  }

  /*
   * Excel tarih seri numarası.
   */
  if (
    typeof value ===
      "number"
  ) {
    if (
      !Number.isFinite(
        value
      ) ||
      value <= 0
    ) {
      return null;
    }

    const milliseconds =
      Math.round(
        (
          value -
          25569
        ) *
          86400 *
          1000
      );

    const date =
      new Date(
        milliseconds
      );

    return Number.isNaN(
      date.getTime()
    )
      ? null
      : date.toISOString();
  }

  const text =
    String(value).trim();

  /*
   * YYYY-MM-DD
   */
  const internationalMatch =
    text.match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

  if (
    internationalMatch
  ) {
    return createIsoDate({
      year:
        Number(
          internationalMatch[1]
        ),

      month:
        Number(
          internationalMatch[2]
        ),

      day:
        Number(
          internationalMatch[3]
        ),
    });
  }

  /*
   * DD.MM.YYYY veya
   * DD/MM/YYYY
   */
  const turkishMatch =
    text.match(
      /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/
    );

  if (turkishMatch) {
    return createIsoDate({
      year:
        Number(
          turkishMatch[3]
        ),

      month:
        Number(
          turkishMatch[2]
        ),

      day:
        Number(
          turkishMatch[1]
        ),
    });
  }

  /*
   * Excel okuma servisi tarih
   * hücresini ISO metnine
   * dönüştürebilir.
   */
  const parsedDate =
    new Date(text);

  return Number.isNaN(
    parsedDate.getTime()
  )
    ? null
    : parsedDate.toISOString();
}

function asStatus(
  value: ImportCellValue
): PurchaseOrderStatus | null {
  const normalized =
    asUpperText(
      value
    );

  if (!normalized) {
    return PurchaseOrderStatus.DRAFT;
  }

  const aliases:
    Record<
      string,
      PurchaseOrderStatus
    > = {
    TASLAK:
      PurchaseOrderStatus.DRAFT,

    DRAFT:
      PurchaseOrderStatus.DRAFT,

    BEKLIYOR:
      PurchaseOrderStatus.PENDING,

    BEKLEMEDE:
      PurchaseOrderStatus.PENDING,

    PENDING:
      PurchaseOrderStatus.PENDING,

    ONAYLI:
      PurchaseOrderStatus.APPROVED,

    ONAYLANDI:
      PurchaseOrderStatus.APPROVED,

    APPROVED:
      PurchaseOrderStatus.APPROVED,
  };

  return (
    aliases[
      normalized
    ] ?? null
  );
}

function createHeaderKeys(
  sheet: ParsedImportSheet
) {
  const headerRow =
    sheet.rows[0];

  if (!headerRow) {
    throw new Error(
      "Satın alma siparişleri sayfasında başlık satırı bulunamadı."
    );
  }

  const expectedHeaders =
    new Map(
      PURCHASE_ORDER_IMPORT_TEMPLATE
        .orderColumns
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
      "Satın alma siparişleri sayfasında tekrarlanan kolon başlıkları var."
    );
  }

  const missingHeaders =
    PURCHASE_ORDER_IMPORT_TEMPLATE
      .orderColumns
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
      `Satın alma siparişleri sayfasındaki zorunlu kolonlar eksik: ${missingHeaders.join(
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

function normalizeOrder(
  rawData:
    Record<
      string,
      ImportCellValue
    >
): PurchaseOrderImportNormalizedData {
  return {
    purchaseNumber:
      asUpperText(
        rawData.purchaseNumber
      ),

    supplierName:
      asText(
        rawData.supplierName
      ),

    status:
      asStatus(
        rawData.status
      ),

    orderDate:
      asDateIso(
        rawData.orderDate
      ),

    expectedDate:
      asDateIso(
        rawData.expectedDate
      ),

    paymentTermDays:
      rawData.paymentTermDays ===
        null ||
      rawData.paymentTermDays ===
        ""
        ? 0
        : asInteger(
            rawData.paymentTermDays
          ),

    discountRate:
      rawData.discountRate ===
        null ||
      rawData.discountRate ===
        ""
        ? 0
        : asNumber(
            rawData.discountRate
          ),

    supplierNote:
      asText(
        rawData.supplierNote
      ),

    internalNote:
      asText(
        rawData.internalNote
      ),
  };
}

function validateOrder(
  data:
    PurchaseOrderImportNormalizedData
) {
  const errors:
    string[] = [];

  if (
    !data.purchaseNumber
  ) {
    errors.push(
      "Satın alma sipariş numarası zorunludur."
    );
  }

  if (
    !data.supplierName
  ) {
    errors.push(
      "Tedarikçi adı zorunludur."
    );
  }

  if (!data.status) {
    errors.push(
      "Durum Taslak, Bekliyor veya Onaylı olmalıdır."
    );
  }

  if (!data.orderDate) {
    errors.push(
      "Sipariş tarihi geçerli bir tarih olmalıdır."
    );
  }

  if (
    data.expectedDate &&
    data.orderDate &&
    new Date(
      data.expectedDate
    ).getTime() <
      new Date(
        data.orderDate
      ).getTime()
  ) {
    errors.push(
      "Beklenen teslim tarihi sipariş tarihinden önce olamaz."
    );
  }

  if (
    data.paymentTermDays ===
      null ||
    data.paymentTermDays <
      0
  ) {
    errors.push(
      "Ödeme vadesi sıfır veya daha büyük tam sayı olmalıdır."
    );
  }

  if (
    data.discountRate ===
      null ||
    data.discountRate <
      0 ||
    data.discountRate >
      100
  ) {
    errors.push(
      "İskonto oranı 0-100 arasında olmalıdır."
    );
  }

  return errors;
}

export class PurchaseOrderImportValidationService {
  static validateSheet(
    sheet:
      ParsedImportSheet
  ): ValidatedPurchaseOrderImportRow[] {
    const headers =
      createHeaderKeys(
        sheet
      );

    const seenPurchaseNumbers =
      new Set<string>();

    const results:
      ValidatedPurchaseOrderImportRow[] =
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
        normalizeOrder(
          rawData
        );

      const errors =
        validateOrder(
          normalizedData
        );

      const externalKey =
        normalizedData.purchaseNumber;

      if (
        externalKey &&
        seenPurchaseNumbers.has(
          externalKey
        )
      ) {
        errors.push(
          "Aynı satın alma sipariş numarası Excel dosyasında birden fazla kez kullanılmış."
        );
      }

      if (externalKey) {
        seenPurchaseNumbers.add(
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