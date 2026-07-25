export const SUPPLIER_IMPORT_TEMPLATE = {
  fileName:
    "etken-tedarikci-aktarim-sablonu.xlsx",

  sheetName:
    "Tedarikciler",

  columns: [
    {
      key: "name",
      header: "TedarikciAdi",
      required: true,
      width: 32,
    },
    {
      key: "taxOffice",
      header: "VergiDairesi",
      required: false,
      width: 20,
    },
    {
      key: "taxNumber",
      header: "VergiNo",
      required: false,
      width: 18,
    },
    {
      key: "contactName",
      header: "Yetkili",
      required: false,
      width: 24,
    },
    {
      key: "phone",
      header: "Telefon",
      required: false,
      width: 18,
    },
    {
      key: "email",
      header: "Eposta",
      required: false,
      width: 28,
    },
    {
      key: "address",
      header: "Adres",
      required: false,
      width: 40,
    },
    {
      key: "city",
      header: "Il",
      required: false,
      width: 16,
    },
    {
      key: "district",
      header: "Ilce",
      required: false,
      width: 16,
    },
    {
      key: "postalCode",
      header: "PostaKodu",
      required: false,
      width: 14,
    },
    {
      key: "paymentTermDays",
      header: "OdemeVadesiGun",
      required: false,
      width: 18,
    },
    {
      key: "discountRate",
      header: "IskontoOrani",
      required: false,
      width: 16,
    },
    {
      key: "deliveryDays",
      header: "TeslimSuresiGun",
      required: false,
      width: 18,
    },
    {
      key: "isActive",
      header: "Aktif",
      required: false,
      width: 12,
    },
  ],
} as const;
