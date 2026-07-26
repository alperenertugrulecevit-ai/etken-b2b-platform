import "server-only";

import {
  CUSTOMER_IMPORT_TEMPLATE,
} from "@/modules/data-import/constants/customer-import.constants";

import type {
  ImportCellValue,
  ParsedImportSheet,
} from "@/modules/data-import/types/data-import.types";

export type CustomerImportNormalizedData = {
  customerCode: string | null;
  companyName: string | null;
  taxOffice: string | null;
  taxNumber: string | null;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  district: string | null;
  paymentTermDays: number | null;
  discountRate: number | null;
  creditLimit: number | null;
  isActive: boolean | null;
};

export type ValidatedCustomerImportRow = {
  sheetName: string;
  rowNumber: number;
  externalKey: string | null;

  rawData:
    Record<
      string,
      ImportCellValue
    >;

  normalizedData:
    CustomerImportNormalizedData;

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

  const normalized =
    String(value)
      .trim()
      .replace(
        /\s/g,
        ""
      )
      .replace(
        ",",
        "."
      );

  const result =
    Number(
      normalized
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

function createHeaderKeys(
  sheet: ParsedImportSheet
) {
  const headerRow =
    sheet.rows[0];

  if (!headerRow) {
    throw new Error(
      "Müşteriler sayfasında başlık satırı bulunamadı."
    );
  }

  const expectedHeaders =
    new Map(
      CUSTOMER_IMPORT_TEMPLATE
        .customerColumns
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
      "Müşteriler sayfasında tekrarlanan kolon başlıkları var."
    );
  }

  const missingHeaders =
    CUSTOMER_IMPORT_TEMPLATE
      .customerColumns
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
      `Müşteriler sayfasındaki zorunlu kolonlar eksik: ${missingHeaders.join(
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

function normalizeCustomer(
  rawData:
    Record<
      string,
      ImportCellValue
    >
): CustomerImportNormalizedData {
  return {
    customerCode:
      asUpperText(
        rawData.customerCode
      ),

    companyName:
      asText(
        rawData.companyName
      ),

    taxOffice:
      asText(
        rawData.taxOffice
      ),

    taxNumber:
      asText(
        rawData.taxNumber
      )?.replace(
        /\s/g,
        ""
      ) ?? null,

    contactName:
      asText(
        rawData.contactName
      ),

    phone:
      asText(
        rawData.phone
      ),

    email:
      asText(
        rawData.email
      )?.toLocaleLowerCase(
        "tr-TR"
      ) ?? null,

    address:
      asText(
        rawData.address
      ),

    city:
      asText(
        rawData.city
      ),

    district:
      asText(
        rawData.district
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

    creditLimit:
      rawData.creditLimit ===
        null ||
      rawData.creditLimit ===
        ""
        ? 0
        : asNumber(
            rawData.creditLimit
          ),

    isActive:
      asBoolean(
        rawData.isActive,
        true
      ),
  };
}

function validateEmail(
  email: string | null
) {
  if (!email) {
    return true;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email
  );
}

function validateCustomer(
  data:
    CustomerImportNormalizedData
) {
  const errors:
    string[] = [];

  if (
    !data.customerCode
  ) {
    errors.push(
      "Müşteri kodu zorunludur."
    );
  } else if (
    data.customerCode.length >
    60
  ) {
    errors.push(
      "Müşteri kodu en fazla 60 karakter olabilir."
    );
  }

  if (
    !data.companyName
  ) {
    errors.push(
      "Firma adı zorunludur."
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
    data.creditLimit ===
      null ||
    data.creditLimit <
      0
  ) {
    errors.push(
      "Kredi limiti sıfır veya daha büyük sayı olmalıdır."
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

export class CustomerImportValidationService {
  static validateSheet(
    sheet:
      ParsedImportSheet
  ): ValidatedCustomerImportRow[] {
    const headers =
      createHeaderKeys(
        sheet
      );

    const seenCodes =
      new Set<string>();

    const seenTaxNumbers =
      new Set<string>();

    const results:
      ValidatedCustomerImportRow[] =
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
        normalizeCustomer(
          rawData
        );

      const errors =
        validateCustomer(
          normalizedData
        );

      const externalKey =
        normalizedData.customerCode;

      if (
        externalKey &&
        seenCodes.has(
          externalKey
        )
      ) {
        errors.push(
          "Aynı müşteri kodu Excel dosyasında birden fazla kez kullanılmış."
        );
      }

      if (externalKey) {
        seenCodes.add(
          externalKey
        );
      }

      if (
        normalizedData.taxNumber &&
        seenTaxNumbers.has(
          normalizedData.taxNumber
        )
      ) {
        errors.push(
          "Aynı vergi numarası Excel dosyasında birden fazla kez kullanılmış."
        );
      }

      if (
        normalizedData.taxNumber
      ) {
        seenTaxNumbers.add(
          normalizedData.taxNumber
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