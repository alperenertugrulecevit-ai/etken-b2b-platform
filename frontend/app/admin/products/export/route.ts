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
          product.categoryRef?.parent?.name ??
          "—";

        const subCategory =
          product.category;

        return {
          sku: product.code,
          legacyBarcode: product.barcode,
          barcodeType: primaryBarcode?.barcodeType ?? "",
          barcodeSource: primaryBarcode?.sourceSite ?? primaryBarcode?.sourceType ?? "",
          imageCount: product.productImageSources.length,
          barcodeCount: product.productBarcodes.length,
          dataStatus: (product.productBarcodes.length > 0 && (product.productImageSources.length > 0 || Boolean(product.imageUrl))) ? "Veri Tam" : "Veri Eksik",
          stockStatus: product.stock - product.reservedStock <= 0 ? "Stok Yok" : product.stock - product.reservedStock <= 20 ? "Kritik" : product.stock - product.reservedStock <= 100 ? "Düşük" : "Yeterli",
          stockSource: product.ownStock ? "ETKEN Deposu" : "Tedarikçi Stoğu",
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

  // Keep the export's visible columns aligned with the Product Management table.
  // Additional metadata follows the table columns; interactive Actions are not exported.
  const exportColumns = [
    {
        "label": "Görsel URL",
        "key": "imageUrl",
        "type": "String",
        "width": 55
    },
    {
        "label": "Kod",
        "key": "sku",
        "type": "String",
        "width": 18
    },
    {
        "label": "Ürün",
        "key": "name",
        "type": "String",
        "width": 45
    },
    {
        "label": "Eski Barkod",
        "key": "legacyBarcode",
        "type": "String",
        "width": 22
    },
    {
        "label": "Üretici Barkodu",
        "key": "barcode",
        "type": "String",
        "width": 22
    },
    {
        "label": "Barkod Tipi",
        "key": "barcodeType",
        "type": "String",
        "width": 16
    },
    {
        "label": "Barkod Kaynağı",
        "key": "barcodeSource",
        "type": "String",
        "width": 22
    },
    {
        "label": "Görsel Sayısı",
        "key": "imageCount",
        "type": "Number",
        "width": 16
    },
    {
        "label": "Barkod Sayısı",
        "key": "barcodeCount",
        "type": "Number",
        "width": 16
    },
    {
        "label": "Veri Durumu",
        "key": "dataStatus",
        "type": "String",
        "width": 18
    },
    {
        "label": "Marka",
        "key": "brand",
        "type": "String",
        "width": 20
    },
    {
        "label": "Ana Kategori",
        "key": "mainCategory",
        "type": "String",
        "width": 24
    },
    {
        "label": "Kategori",
        "key": "subCategory",
        "type": "String",
        "width": 24
    },
    {
        "label": "Tedarikçi",
        "key": "supplier",
        "type": "String",
        "width": 28
    },
    {
        "label": "Fiziksel",
        "key": "physicalStock",
        "type": "Number",
        "width": 14
    },
    {
        "label": "Rezerve",
        "key": "reservedStock",
        "type": "Number",
        "width": 14
    },
    {
        "label": "Kullanılabilir",
        "key": "availableStock",
        "type": "Number",
        "width": 18
    },
    {
        "label": "Stok Durumu",
        "key": "stockStatus",
        "type": "String",
        "width": 18
    },
    {
        "label": "Fiyat",
        "key": "price",
        "type": "Number",
        "width": 16
    },
    {
        "label": "Stok Kaynağı",
        "key": "stockSource",
        "type": "String",
        "width": 22
    },
    {
        "label": "Yayın",
        "key": "active",
        "type": "String",
        "width": 12
    },
    {
        "label": "KDV",
        "key": "vat",
        "type": "Number",
        "width": 10
    },
    {
        "label": "Barkod Doğrulandı",
        "key": "barcodeVerified",
        "type": "String",
        "width": 18
    },
    {
        "label": "Görsel Doğrulandı",
        "key": "imageVerified",
        "type": "String",
        "width": 18
    }
] as const;

  const header = exportColumns.map((column) => ({
    value: column.label,
    ...headerStyle,
  }));

  const dataRows = rows.map((row) =>
    exportColumns.map((column) => ({
      type: column.type === "Number" ? Number : String,
      value: row[column.key],
    })),
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

      columns: exportColumns.map((column) => ({ width: column.width })),

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