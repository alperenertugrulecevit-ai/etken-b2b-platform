export const DATA_IMPORT_LIMITS = {
  MAX_FILE_SIZE_BYTES:
    5 * 1024 * 1024,
  MAX_DATA_ROWS: 5000,
  MAX_SHEETS: 5,
  MAX_COLUMNS: 60,
  MAX_CELL_TEXT_LENGTH: 2000,
  ACCEPTED_EXTENSION: ".xlsx",
  ACCEPTED_MIME_TYPES: [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/octet-stream",
  ],
} as const;

export const DATA_IMPORT_TYPE_LABELS = {
  PRODUCT: "Ürün",
  SUPPLIER: "Tedarikçi",
  CUSTOMER: "Müşteri",
  PURCHASE_ORDER:
    "Satın Alma Siparişi",
  SALES_ORDER: "Sevk / Satış Siparişi",
} as const;

export const DATA_IMPORT_MODE_LABELS = {
  CREATE_ONLY: "Yalnızca Yeni Kayıt",
  UPSERT: "Yeni Ekle / Güncelle",
} as const;
