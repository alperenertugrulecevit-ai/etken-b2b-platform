import "server-only";

import {
  SUPPLIER_IMPORT_TEMPLATE,
} from "@/modules/data-import/constants/supplier-import.constants";

import type {
  ImportCellValue,
  ParsedImportSheet,
} from "@/modules/data-import/types/data-import.types";

export type SupplierImportNormalizedData = {
  name: string | null;
  taxOffice: string | null;
  taxNumber: string | null;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  district: string | null;
  postalCode: string | null;
  paymentTermDays:
    number | null;
  discountRate:
    number | null;
  deliveryDays:
    number | null;
  isActive:
    boolean | null;
};

export type ValidatedSupplierImportRow = {
  sheetName: string;
  rowNumber: number;
  externalKey:
    string | null;

  rawData:
    Record<
      string,
      ImportCellValue
    >;

  normalizedData:
    SupplierImportNormalizedData;

  errors: string[];
};

function normalizeHeader(
  value:
    ImportCellValue
) {
  return String(
    value ?? ""
  )
    .trim()
    .toLocaleLowerCase(
      "tr-TR"
    )
    .replaceAll(
      "ı",
      "i"
    )
    .replaceAll(
      "ş",
      "s"
    )
    .replaceAll(
      "ğ",
      "g"
    )
    .replaceAll(
      "ü",
      "u"
    )
    .replaceAll(
      "ö",
      "o"
    )
    .replaceAll(
      "ç",
      "c"
    )
    .replace(
      /[^a-z0-9]/g,
      ""
    );
}

function asText(
  value:
    ImportCellValue
) {
  if (
    value === null ||
    value === ""
  ) {
    return null;
  }

  return (
    String(value)
      .trim() ||
    null
  );
}

function asNumber(
  value:
    ImportCellValue
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
  value:
    ImportCellValue,

  defaultValue:
    number
) {
  if (
    value === null ||
    value === ""
  ) {
    return defaultValue;
  }

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

function asBoolean(
  value:
    ImportCellValue,

  defaultValue:
    boolean
) {
  if (
    value === null ||
    value === ""
  ) {
    return defaultValue;
  }

  if (
    typeof value ===
    "boolean"
  ) {
    return value;
  }

  if (
    typeof value ===
    "number"
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
    ].includes(
      normalized
    )
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
    ].includes(
      normalized
    )
  ) {
    return false;
  }

  return null;
}

function validateEmail(
  value:
    string | null
) {
  if (!value) {
    return true;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value
  );
}

function createHeaders(
  sheet:
    ParsedImportSheet
) {
  const headerRow =
    sheet.rows[0];

  if (!headerRow) {
    throw new Error(
      "Excel sayfasında başlık satırı bulunamadı."
    );
  }

  const expected =
    new Map(
      SUPPLIER_IMPORT_TEMPLATE
        .columns.map(
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
          expected.get(
            normalized
          ) ??
          normalized
        );
      }
    );

  const duplicate =
    headers.filter(
      (
        header,
        index
      ) =>
        Boolean(
          header
        ) &&
        headers.indexOf(
          header
        ) !== index
    );

  if (
    duplicate.length > 0
  ) {
    throw new Error(
      "Excel dosyasında tekrarlanan kolon başlıkları var."
    );
  }

  if (
    !headers.includes(
      "name"
    )
  ) {
    throw new Error(
      "Zorunlu kolon eksik: TedarikciAdi."
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
  const result:
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
        result[header] =
          values[index] ??
          null;
      }
    }
  );

  return result;
}

function normalizeSupplier(
  raw:
    Record<
      string,
      ImportCellValue
    >
): SupplierImportNormalizedData {
  return {
    name:
      asText(
        raw.name
      ),

    taxOffice:
      asText(
        raw.taxOffice
      ),

    taxNumber:
      asText(
        raw.taxNumber
      ),

    contactName:
      asText(
        raw.contactName
      ),

    phone:
      asText(
        raw.phone
      ),

    email:
      asText(
        raw.email
      )
        ?.toLowerCase() ??
      null,

    address:
      asText(
        raw.address
      ),

    city:
      asText(
        raw.city
      ),

    district:
      asText(
        raw.district
      ),

    postalCode:
      asText(
        raw.postalCode
      ),

    paymentTermDays:
      asInteger(
        raw.paymentTermDays,
        0
      ),

    discountRate:
      asNumber(
        raw.discountRate
      ) ?? 0,

    deliveryDays:
      asInteger(
        raw.deliveryDays,
        1
      ),

    isActive:
      asBoolean(
        raw.isActive,
        true
      ),
  };
}

function validateSupplier(
  data:
    SupplierImportNormalizedData
) {
  const errors:
    string[] = [];

  if (!data.name) {
    errors.push(
      "Tedarikçi adı zorunludur."
    );
  }

  if (
    data.taxNumber &&
    !/^\d{10,11}$/.test(
      data.taxNumber
    )
  ) {
    errors.push(
      "Vergi numarası 10 veya 11 rakam olmalıdır."
    );
  }

  if (
    !validateEmail(
      data.email
    )
  ) {
    errors.push(
      "E-posta adresi geçerli değil."
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

  if (
    data.deliveryDays ===
      null ||
    data.deliveryDays <
      0
  ) {
    errors.push(
      "Teslim süresi sıfır veya daha büyük tam sayı olmalıdır."
    );
  }

  if (
    data.isActive ===
    null
  ) {
    errors.push(
      "Aktif alanı Evet/Hayır, True/False veya 1/0 olmalıdır."
    );
  }

  return errors;
}

export class SupplierImportValidationService {
  static validateSheet(
    sheet:
      ParsedImportSheet
  ): ValidatedSupplierImportRow[] {
    const headers =
      createHeaders(
        sheet
      );

    const seenNames =
      new Set<string>();

    const seenTaxNumbers =
      new Set<string>();

    return sheet.rows
      .slice(1)
      .map(
        (row) => {
          const rawData =
            createRawData({
              headers,

              values:
                row.values,
            });

          const normalizedData =
            normalizeSupplier(
              rawData
            );

          const errors =
            validateSupplier(
              normalizedData
            );

          const externalKey =
            normalizedData.name
              ?.toLocaleUpperCase(
                "tr-TR"
              ) ??
            null;

          if (
            externalKey &&
            seenNames.has(
              externalKey
            )
          ) {
            errors.push(
              "Aynı tedarikçi adı Excel dosyasında birden fazla kez kullanılmış."
            );
          }

          if (
            externalKey
          ) {
            seenNames.add(
              externalKey
            );
          }

          if (
            normalizedData
              .taxNumber &&
            seenTaxNumbers.has(
              normalizedData
                .taxNumber
            )
          ) {
            errors.push(
              "Aynı vergi numarası Excel dosyasında birden fazla kez kullanılmış."
            );
          }

          if (
            normalizedData
              .taxNumber
          ) {
            seenTaxNumbers.add(
              normalizedData
                .taxNumber
            );
          }

          return {
            sheetName:
              row.sheetName,

            rowNumber:
              row.rowNumber,

            externalKey,

            rawData,

            normalizedData,

            errors,
          };
        }
      );
  }
}
