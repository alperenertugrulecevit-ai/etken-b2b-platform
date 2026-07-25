export const PRODUCT_IMPORT_TEMPLATE = {
  fileName: "etken-urun-aktarim-sablonu.xlsx",
  sheetName: "Urunler",
  columns: [
    { key: "code", header: "UrunKodu", required: true, width: 18 },
    { key: "barcode", header: "Barkod", required: true, width: 20 },
    { key: "name", header: "UrunAdi", required: true, width: 35 },
    { key: "brand", header: "Marka", required: true, width: 20 },
    { key: "category", header: "Kategori", required: true, width: 24 },
    { key: "supplier", header: "Tedarikci", required: true, width: 28 },
    { key: "price", header: "Fiyat", required: true, width: 14 },
    { key: "vat", header: "KDV", required: true, width: 10 },
    { key: "ownStock", header: "KendiStogu", required: false, width: 14 },
    { key: "isActive", header: "Aktif", required: false, width: 12 },
  ],
} as const;
