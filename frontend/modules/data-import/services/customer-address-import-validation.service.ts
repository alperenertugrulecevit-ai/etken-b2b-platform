import "server-only";

import {
  CUSTOMER_IMPORT_TEMPLATE,
} from "@/modules/data-import/constants/customer-import.constants";

import type {
  ImportCellValue,
  ParsedImportSheet,
} from "@/modules/data-import/types/data-import.types";

export type CustomerAddressImportNormalizedData = {
  customerCode: string | null;
  title: string | null;
  addressType: string | null;
  contactName: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  district: string | null;
  postalCode: string | null;
  deliveryStartTime: string | null;
  deliveryEndTime: string | null;
  hasForklift: boolean | null;
  rampCount: number | null;
  vehicleType: string | null;
  description: string | null;
  isDefault: boolean | null;
  isActive: boolean | null;
};

export type ValidatedCustomerAddressImportRow = {
  sheetName: string;
  rowNumber: number;
  externalKey: string | null;

  rawData:
    Record<
      string,
      ImportCellValue
    >;

  normalizedData:
    CustomerAddressImportNormalizedData;

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
      "var",
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
      "yok",
      "pasif",
    ].includes(
      normalized
    )
  ) {
    return false;
  }

  return null;
}

function asTimeText(
  value: ImportCellValue
) {
  if (
    value === null ||
    value === ""
  ) {
    return null;
  }

  /*
   * Excel saati günün kesri
   * olarak gönderebilir.
   * Örnek: 0.5 = 12:00
   */
  if (
    typeof value ===
      "number" &&
    value >= 0 &&
    value < 1
  ) {
    const totalMinutes =
      Math.round(
        value *
          24 *
          60
      );

    const hours =
      String(
        Math.floor(
          totalMinutes /
            60
        ) % 24
      ).padStart(
        2,
        "0"
      );

    const minutes =
      String(
        totalMinutes %
          60
      ).padStart(
        2,
        "0"
      );

    return `${hours}:${minutes}`;
  }

  const text =
    asText(value);

  if (!text) {
    return null;
  }

  /*
   * Normal saat biçimleri:
   * 9:00
   * 09:00
   * 09:00:00
   */
  const timeMatch =
    text.match(
      /^(\d{1,2}):(\d{2})(?::\d{2})?$/
    );

  if (timeMatch) {
    const hour =
      Number(
        timeMatch[1]
      );

    const minute =
      Number(
        timeMatch[2]
      );

    if (
      hour >= 0 &&
      hour <= 23 &&
      minute >= 0 &&
      minute <= 59
    ) {
      return `${String(
        hour
      ).padStart(
        2,
        "0"
      )}:${String(
        minute
      ).padStart(
        2,
        "0"
      )}`;
    }

    return text;
  }

  /*
   * Excel saat hücreleri okuma
   * sırasında ISO tarih-saat
   * metnine dönüşebilir:
   *
   * 1899-12-30T09:00:00.000Z
   */
  const isoDateTimeMatch =
    text.match(
      /^\d{4}-\d{2}-\d{2}T(\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?$/
    );

  if (
    isoDateTimeMatch
  ) {
    const hour =
      Number(
        isoDateTimeMatch[1]
      );

    const minute =
      Number(
        isoDateTimeMatch[2]
      );

    if (
      hour >= 0 &&
      hour <= 23 &&
      minute >= 0 &&
      minute <= 59
    ) {
      return `${String(
        hour
      ).padStart(
        2,
        "0"
      )}:${String(
        minute
      ).padStart(
        2,
        "0"
      )}`;
    }
  }

  return text;
}

function createHeaderKeys(
  sheet: ParsedImportSheet
) {
  const headerRow =
    sheet.rows[0];

  if (!headerRow) {
    throw new Error(
      "Teslimat adresleri sayfasında başlık satırı bulunamadı."
    );
  }

  const expectedHeaders =
    new Map(
      CUSTOMER_IMPORT_TEMPLATE
        .addressColumns
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
      "Teslimat adresleri sayfasında tekrarlanan kolon başlıkları var."
    );
  }

  const missingHeaders =
    CUSTOMER_IMPORT_TEMPLATE
      .addressColumns
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
      `Teslimat adresleri sayfasındaki zorunlu kolonlar eksik: ${missingHeaders.join(
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

function normalizeAddress(
  rawData:
    Record<
      string,
      ImportCellValue
    >
): CustomerAddressImportNormalizedData {
  return {
    customerCode:
      asUpperText(
        rawData.customerCode
      ),

    title:
      asText(
        rawData.title
      ),

    addressType:
      asUpperText(
        rawData.addressType
      ),

    contactName:
      asText(
        rawData.contactName
      ),

    phone:
      asText(
        rawData.phone
      ),

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

    postalCode:
      asText(
        rawData.postalCode
      ),

    deliveryStartTime:
      asTimeText(
        rawData.deliveryStartTime
      ),

    deliveryEndTime:
      asTimeText(
        rawData.deliveryEndTime
      ),

    hasForklift:
      asBoolean(
        rawData.hasForklift,
        false
      ),

    rampCount:
      rawData.rampCount ===
        null ||
      rawData.rampCount ===
        ""
        ? 0
        : asInteger(
            rawData.rampCount
          ),

    vehicleType:
      asText(
        rawData.vehicleType
      ),

    description:
      asText(
        rawData.description
      ),

    isDefault:
      asBoolean(
        rawData.isDefault,
        false
      ),

    isActive:
      asBoolean(
        rawData.isActive,
        true
      ),
  };
}

function isValidTime(
  value: string | null
) {
  if (!value) {
    return true;
  }

  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(
    value
  );
}

function validateAddress({
  data,
  customerCodes,
}: {
  data:
    CustomerAddressImportNormalizedData;

  customerCodes:
    Set<string>;
}) {
  const errors:
    string[] = [];

  if (
    !data.customerCode
  ) {
    errors.push(
      "Müşteri kodu zorunludur."
    );
  } else if (
    !customerCodes.has(
      data.customerCode
    )
  ) {
    errors.push(
      `${data.customerCode} müşteri kodu Musteriler sayfasında bulunamadı.`
    );
  }

  if (!data.title) {
    errors.push(
      "Adres başlığı zorunludur."
    );
  }

  if (
    !data.addressType
  ) {
    errors.push(
      "Adres tipi zorunludur."
    );
  }

  if (!data.address) {
    errors.push(
      "Teslimat adresi zorunludur."
    );
  }

  if (!data.city) {
    errors.push(
      "İl zorunludur."
    );
  }

  if (!data.district) {
    errors.push(
      "İlçe zorunludur."
    );
  }

  if (
    !isValidTime(
      data.deliveryStartTime
    )
  ) {
    errors.push(
      "Teslimat başlangıç saati SS:DD formatında olmalıdır. Örnek: 09:00."
    );
  }

  if (
    !isValidTime(
      data.deliveryEndTime
    )
  ) {
    errors.push(
      "Teslimat bitiş saati SS:DD formatında olmalıdır. Örnek: 18:00."
    );
  }

  if (
    data.hasForklift ===
    null
  ) {
    errors.push(
      "ForkliftVar alanı Evet/Hayır, Var/Yok, True/False veya 1/0 olmalıdır."
    );
  }

  if (
    data.rampCount ===
      null ||
    data.rampCount <
      0
  ) {
    errors.push(
      "Rampa sayısı sıfır veya daha büyük tam sayı olmalıdır."
    );
  }

  if (
    data.isDefault ===
    null
  ) {
    errors.push(
      "VarsayilanAdres alanı Evet/Hayır, True/False veya 1/0 olmalıdır."
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

export class CustomerAddressImportValidationService {
  static validateSheet(
    sheet:
      ParsedImportSheet,

    customerCodes:
      Set<string>
  ): ValidatedCustomerAddressImportRow[] {
    const headers =
      createHeaderKeys(
        sheet
      );

    const seenAddresses =
      new Set<string>();

    const defaultAddressCustomers =
      new Set<string>();

    const results:
      ValidatedCustomerAddressImportRow[] =
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
        normalizeAddress(
          rawData
        );

      const errors =
        validateAddress({
          data:
            normalizedData,
          customerCodes,
        });

      const externalKey =
        normalizedData.customerCode &&
        normalizedData.title
          ? `${normalizedData.customerCode}|${normalizedData.title.toLocaleUpperCase(
              "tr-TR"
            )}`
          : null;

      if (
        externalKey &&
        seenAddresses.has(
          externalKey
        )
      ) {
        errors.push(
          "Aynı müşteri kodu ve adres başlığı Excel dosyasında birden fazla kez kullanılmış."
        );
      }

      if (externalKey) {
        seenAddresses.add(
          externalKey
        );
      }

      if (
        normalizedData.customerCode &&
        normalizedData.isDefault ===
          true
      ) {
        if (
          defaultAddressCustomers.has(
            normalizedData.customerCode
          )
        ) {
          errors.push(
            "Bir müşterinin Excel dosyasında yalnızca bir varsayılan teslimat adresi olabilir."
          );
        }

        defaultAddressCustomers.add(
          normalizedData.customerCode
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