import {
  Prisma,
  StockMovementType,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

function isMovementType(
  value: string
): value is StockMovementType {
  return Object.values(
    StockMovementType
  ).includes(value as StockMovementType);
}

function createStartDate(value: string) {
  if (!value) {
    return undefined;
  }

  const date = new Date(
    `${value}T00:00:00`
  );

  return Number.isNaN(date.getTime())
    ? undefined
    : date;
}

function createEndDate(value: string) {
  if (!value) {
    return undefined;
  }

  const date = new Date(
    `${value}T23:59:59.999`
  );

  return Number.isNaN(date.getTime())
    ? undefined
    : date;
}

function getMovementLabel(type: string) {
  const labels: Record<string, string> = {
    INITIAL_STOCK: "Açılış Stoğu",
    PURCHASE_RECEIPT: "Mal Kabul",
    MANUAL_IN: "Manuel Stok Girişi",
    MANUAL_OUT: "Manuel Stok Çıkışı",
    RESERVATION_CREATE: "Rezervasyon Oluşturma",
    RESERVATION_RELEASE: "Rezervasyon Çözme",
    SALE_SHIPMENT: "Satış Sevkiyatı",
    SALE_RETURN: "Satış İadesi",
    COUNT_INCREASE: "Sayım Fazlası",
    COUNT_DECREASE: "Sayım Eksiği",
    TRANSFER_IN: "Transfer Girişi",
    TRANSFER_OUT: "Transfer Çıkışı",
  };

  return labels[type] ?? type;
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(value);
}

function escapeCsvValue(
  value:
    | string
    | number
    | null
    | undefined
) {
  const text =
    value === null ||
    value === undefined
      ? ""
      : String(value);

  /*
   * Türkiye Excel ayarlarında noktalı virgül
   * ayracı daha sorunsuz açılır.
   */
  if (
    text.includes(";") ||
    text.includes('"') ||
    text.includes("\n") ||
    text.includes("\r")
  ) {
    return `"${text.replace(
      /"/g,
      '""'
    )}"`;
  }

  return text;
}

export async function GET(
  request: Request
) {
  const url = new URL(request.url);

  const search =
    url.searchParams
      .get("search")
      ?.trim() ?? "";

  const movementType =
    url.searchParams
      .get("movementType")
      ?.trim() ?? "";

  const startDate =
    url.searchParams
      .get("startDate")
      ?.trim() ?? "";

  const endDate =
    url.searchParams
      .get("endDate")
      ?.trim() ?? "";

  const parsedStartDate =
    createStartDate(startDate);

  const parsedEndDate =
    createEndDate(endDate);

  const where: Prisma.StockMovementWhereInput =
    {};

  if (search) {
    where.OR = [
      {
        product: {
          is: {
            code: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
      },

      {
        product: {
          is: {
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
      },

      {
        documentNumber: {
          contains: search,
          mode: "insensitive",
        },
      },

      {
        description: {
          contains: search,
          mode: "insensitive",
        },
      },

      {
        order: {
          is: {
            orderNumber: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
      },
    ];
  }

  if (
    movementType &&
    isMovementType(movementType)
  ) {
    where.movementType =
      movementType;
  }

  if (
    parsedStartDate ||
    parsedEndDate
  ) {
    where.createdAt = {
      ...(parsedStartDate
        ? {
            gte: parsedStartDate,
          }
        : {}),

      ...(parsedEndDate
        ? {
            lte: parsedEndDate,
          }
        : {}),
    };
  }

  const movements =
    await prisma.stockMovement.findMany({
      where,

      orderBy: [
        {
          createdAt: "desc",
        },
        {
          id: "desc",
        },
      ],

      take: 10000,

      include: {
        product: {
          select: {
            code: true,
            name: true,
          },
        },

        order: {
          select: {
            orderNumber: true,
          },
        },
      },
    });

  const headers = [
    "Tarih",
    "Ürün Kodu",
    "Ürün Adı",
    "Hareket Tipi",
    "Belge No",
    "Sipariş No",
    "Fiziksel Değişim",
    "Rezervasyon Değişimi",
    "Fiziksel Bakiye",
    "Rezerve Bakiye",
    "Kullanılabilir Bakiye",
    "Açıklama",
  ];

  const rows = movements.map(
    (movement) => [
      formatDate(
        movement.createdAt
      ),

      movement.product.code,

      movement.product.name,

      getMovementLabel(
        movement.movementType
      ),

      movement.documentNumber ?? "",

      movement.order?.orderNumber ??
        "",

      movement.physicalChange,

      movement.reservedChange,

      movement.physicalBalanceAfter,

      movement.reservedBalanceAfter,

      movement.availableBalanceAfter,

      movement.description ?? "",
    ]
  );

  const csvLines = [
    headers
      .map(escapeCsvValue)
      .join(";"),

    ...rows.map((row) =>
      row
        .map(escapeCsvValue)
        .join(";")
    ),
  ];

  /*
   * UTF-8 BOM, Türkçe karakterlerin
   * Excel'de doğru açılmasını sağlar.
   */
  const csvContent =
    "\uFEFF" +
    csvLines.join("\r\n");

  const now = new Date();

  const fileDate = [
    now.getFullYear(),
    String(
      now.getMonth() + 1
    ).padStart(2, "0"),
    String(now.getDate()).padStart(
      2,
      "0"
    ),
  ].join("-");

  return new Response(csvContent, {
    status: 200,

    headers: {
      "Content-Type":
        "text/csv; charset=utf-8",

      "Content-Disposition":
        `attachment; filename="etken-stok-hareketleri-${fileDate}.csv"`,

      "Cache-Control":
        "no-store",
    },
  });
}