import writeXlsxFile from "write-excel-file/node";

import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

function formatDateForFile(
  date: Date,
) {
  return [
    date.getFullYear(),
    String(
      date.getMonth() + 1,
    ).padStart(2, "0"),
    String(
      date.getDate(),
    ).padStart(2, "0"),
  ].join("-");
}

export async function GET() {
  await AuthorizationService.requirePermission(
    "INVENTORY_ADJUST",
  );

  const products =
    await prisma.product.findMany({
      include: {
        categoryRef: {
          select: {
            name: true,

            parent: {
              select: {
                name: true,
              },
            },
          },
        },

        productBarcodes: {
          orderBy: [
            {
              isVerified: "desc",
            },
            {
              isPrimary: "desc",
            },
            {
              id: "asc",
            },
          ],
        },

        productImageSources: {
          orderBy: [
            {
              isVerified: "desc",
            },
            {
              isPrimary: "desc",
            },
            {
              sortOrder: "asc",
            },
            {
              id: "asc",
            },
          ],
        },
      },

      orderBy: [
        {
          category: "asc",
        },
        {
          code: "asc",
        },
      ],
    });

  const rows =
    products.map(
      (product) => {
        const primaryBarcode =
          product.productBarcodes.find(
            (barcode) =>
              barcode.isPrimary,
          ) ??
          product.productBarcodes.find(
            (barcode) =>
              barcode.isVerified,
          ) ??
          product.productBarcodes[0] ??
          null;

        const primaryImage =
          product.productImageSources.find(
            (image) =>
              image.isPrimary &&
              image.isVerified,
          ) ??
          product.productImageSources.find(
            (image) =>
              image.isPrimary,
          ) ??
          product.productImageSources.find(
            (image) =>
              image.isVerified,
          ) ??
          product.productImageSources[0] ??
          null;

        const imageUrl =
          primaryImage?.storageUrl ??
          primaryImage?.sourceUrl ??
          product.imageUrl ??
          "";

        const mainCategory =
          product.categoryRef?.parent
            ?.name ??
          product.categoryRef?.name ??
          product.category;

        const subCategory =
          product.categoryRef?.parent
            ? product.categoryRef.name
            : "";

        return {
          sku: product.code,
          brand: product.brand,
          name: product.name,

          mainCategory,
          subCategory,

          supplier:
            product.supplier,

          barcode:
            primaryBarcode?.barcode ??
            product.barcode ??
            "",

          imageUrl,

          physicalStock:
            product.stock,

          reservedStock:
            product.reservedStock,

          availableStock:
            product.stock -
            product.reservedStock,

          price:
            Number(
              product.price,
            ),

          vat:
            product.vat,

          ownStock:
            product.ownStock
              ? "EVET"
              : "HAYIR",

          active:
            product.isActive
              ? "EVET"
              : "HAYIR",

          barcodeVerified:
            primaryBarcode
              ?.isVerified
              ? "EVET"
              : "HAYIR",

          imageVerified:
            primaryImage
              ?.isVerified
              ? "EVET"
              : "HAYIR",
        };
      },
    );

  const headerStyle = {
    fontWeight:
      "bold" as const,

    backgroundColor:
      "#1E3A8A",

    color:
      "#FFFFFF",

    align:
      "center" as const,

    verticalAlign:
      "center" as const,
  };

  const header = [
    {
      value: "ETKEN SKU",
      ...headerStyle,
    },
    {
      value: "Marka",
      ...headerStyle,
    },
    {
      value: "Ürün Adı",
      ...headerStyle,
    },
    {
      value: "Ana Kategori",
      ...headerStyle,
    },
    {
      value: "Alt Kategori",
      ...headerStyle,
    },
    {
      value: "Tedarikçi",
      ...headerStyle,
    },
    {
      value:
        "Üretici Barkodu",
      ...headerStyle,
    },
    {
      value: "Görsel URL",
      ...headerStyle,
    },
    {
      value: "Fiziksel Stok",
      ...headerStyle,
    },
    {
      value: "Rezerve Stok",
      ...headerStyle,
    },
    {
      value:
        "Kullanılabilir Stok",
      ...headerStyle,
    },
    {
      value: "Satış Fiyatı",
      ...headerStyle,
    },
    {
      value: "KDV",
      ...headerStyle,
    },
    {
      value: "Kendi Stoğu",
      ...headerStyle,
    },
    {
      value: "Aktif",
      ...headerStyle,
    },
    {
      value:
        "Barkod Doğrulandı",
      ...headerStyle,
    },
    {
      value:
        "Görsel Doğrulandı",
      ...headerStyle,
    },
  ];

  const dataRows =
    rows.map(
      (row) => [
        {
          type: String,
          value: row.sku,
        },

        {
          type: String,
          value: row.brand,
        },

        {
          type: String,
          value: row.name,
        },

        {
          type: String,
          value:
            row.mainCategory,
        },

        {
          type: String,
          value:
            row.subCategory,
        },

        {
          type: String,
          value:
            row.supplier,
        },

        {
          type: String,
          value:
            row.barcode,
        },

        {
          type: String,
          value:
            row.imageUrl,
        },

        {
          type: Number,
          value:
            row.physicalStock,
        },

        {
          type: Number,
          value:
            row.reservedStock,
        },

        {
          type: Number,
          value:
            row.availableStock,
        },

        {
          type: Number,
          value: row.price,
          format:
            "#,##0.00",
        },

        {
          type: Number,
          value: row.vat,
        },

        {
          type: String,
          value:
            row.ownStock,
        },

        {
          type: String,
          value:
            row.active,
        },

        {
          type: String,
          value:
            row.barcodeVerified,
        },

        {
          type: String,
          value:
            row.imageVerified,
        },
      ],
    );

const workbook =
  writeXlsxFile(
    [
      header,
      ...dataRows,
    ],
    {
      sheet:
        "Products_Export",

      columns: [
        { width: 18 },
        { width: 20 },
        { width: 45 },
        { width: 24 },
        { width: 24 },
        { width: 28 },
        { width: 22 },
        { width: 55 },
        { width: 14 },
        { width: 14 },
        { width: 18 },
        { width: 16 },
        { width: 10 },
        { width: 14 },
        { width: 12 },
        { width: 18 },
        { width: 18 },
      ],

      stickyRowsCount: 1,
    },
  );

const buffer =
  await workbook.toBuffer();

  const fileName =
    `etken-urun-listesi-${formatDateForFile(
      new Date(),
    )}.xlsx`;

return new Response(
  new Uint8Array(buffer),
    {
      status: 200,

      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

        "Content-Disposition":
          `attachment; filename="${fileName}"`,

        "Cache-Control":
          "no-store",
      },
    },
  );
}