import {
  InventoryCountStatus,
  Prisma,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

function parseDateFilter(
  value: string,
  endOfDay = false
) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value
    )
  ) {
    return null;
  }

  const timeValue = endOfDay
    ? "23:59:59.999"
    : "00:00:00.000";

  const parsedDate = new Date(
    `${value}T${timeValue}+03:00`
  );

  if (
    Number.isNaN(
      parsedDate.getTime()
    )
  ) {
    return null;
  }

  return parsedDate;
}

function formatDate(
  value: Date | null
) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "tr-TR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",

      timeZone:
        "Europe/Istanbul",
    }
  ).format(value);
}

function getHandlingUnitTypeLabel(
  value: string
) {
  const labels: Record<
    string,
    string
  > = {
    PALLET: "Palet",
    BOX: "Koli",

    PICKING_PALLET:
      "Toplama Paleti",

    PICKING_BOX:
      "Toplama Kolisi",
  };

  return labels[value] ?? value;
}

function getLocationStatusLabel(
  value: string
) {
  const labels: Record<
    string,
    string
  > = {
    PENDING: "Sayılmadı",

    IN_PROGRESS:
      "Sayım Yarım Kaldı",

    COMPLETED:
      "Tamamlandı",
  };

  return labels[value] ?? value;
}

function getLineStatusLabel(
  value: string
) {
  const labels: Record<
    string,
    string
  > = {
    PENDING: "Bekliyor",

    COUNTED:
      "Sayıldı",

    RECOUNT_REQUIRED:
      "Tekrar Sayım",

    APPROVED:
      "Onaylandı",
  };

  return labels[value] ?? value;
}

function escapeCsvValue(
  value:
    | string
    | number
    | boolean
    | null
    | undefined
) {
  const text =
    value === null ||
    value === undefined
      ? ""
      : String(value);

  /*
   * Türkiye Excel ayarlarında
   * noktalı virgül ayracı daha
   * sorunsuz açılır.
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

function createFileName(
  countNumber: string
) {
  const now = new Date();

  const fileDate = [
    now.getFullYear(),

    String(
      now.getMonth() + 1
    ).padStart(2, "0"),

    String(
      now.getDate()
    ).padStart(2, "0"),
  ].join("-");

  const safeCountNumber =
    countNumber
      .replace(
        /[^A-Za-z0-9_-]/g,
        ""
      )
      .slice(0, 60);

  return safeCountNumber
    ? (
        `etken-sayim-raporu-${safeCountNumber}-${fileDate}.csv`
      )
    : (
        `etken-sayim-raporlari-${fileDate}.csv`
      );
}

export async function GET(
  request: Request
) {
  await AuthorizationService.requireAnyPermission(
    [
      "INVENTORY_COUNT_VIEW",
      "INVENTORY_COUNT_APPROVE",
    ]
  );

  const url =
    new URL(
      request.url
    );

  const countNumber =
    (
      url.searchParams.get(
        "countNumber"
      ) ?? ""
    )
      .trim()
      .toUpperCase();

  const warehouseIdValue =
    (
      url.searchParams.get(
        "warehouseId"
      ) ?? ""
    ).trim();

  const startDateValue =
    (
      url.searchParams.get(
        "startDate"
      ) ?? ""
    ).trim();

  const endDateValue =
    (
      url.searchParams.get(
        "endDate"
      ) ?? ""
    ).trim();

  const warehouseId =
    Number(
      warehouseIdValue
    );

  const startDate =
    parseDateFilter(
      startDateValue
    );

  const endDate =
    parseDateFilter(
      endDateValue,
      true
    );

  const approvedAtFilter:
    Prisma.DateTimeNullableFilter | undefined =
      startDate || endDate
        ? {
            ...(startDate
              ? {
                  gte:
                    startDate,
                }
              : {}),

            ...(endDate
              ? {
                  lte:
                    endDate,
                }
              : {}),
          }
        : undefined;

  const inventoryCountWhere:
    Prisma.InventoryCountWhereInput = {
    status:
      InventoryCountStatus.APPROVED,

    ...(countNumber
      ? {
          countNumber: {
            contains:
              countNumber,

            mode:
              "insensitive",
          },
        }
      : {}),

    ...(Number.isInteger(
      warehouseId
    ) && warehouseId > 0
      ? {
          warehouseId,
        }
      : {}),

    ...(approvedAtFilter
      ? {
          approvedAt:
            approvedAtFilter,
        }
      : {}),
  };

  const lineWhere:
    Prisma.InventoryCountLineWhereInput = {
    inventoryCount: {
      is:
        inventoryCountWhere,
    },
  };

  const lines =
    await prisma.inventoryCountLine.findMany({
      where:
        lineWhere,

      orderBy: [
        {
          approvedAt: "desc",
        },
        {
          inventoryCountId:
            "desc",
        },
        {
          locationCode:
            "asc",
        },
        {
          handlingUnitBarcode:
            "asc",
        },
        {
          productCode:
            "asc",
        },
      ],

      take: 100000,

      select: {
        id: true,

        locationCode: true,

        handlingUnitBarcode:
          true,

        handlingUnitType:
          true,

        productCode: true,
        productBarcode: true,
        productName: true,

        systemQuantity: true,

        countedQuantity:
          true,

        difference: true,

        appliedQuantityChange:
          true,

        countedByName:
          true,

        countedAt: true,

        status: true,

        isDiscovered:
          true,

        note: true,

        inventoryCountLocation: {
          select: {
            status: true,

            countedByName:
              true,

            completedAt:
              true,
          },
        },

        inventoryCount: {
          select: {
            countNumber: true,

            createdAt: true,

            snapshotAt: true,

            startedAt: true,

            submittedAt:
              true,

            approvedAt: true,

            createdByName:
              true,

            approvedByName:
              true,

            warehouse: {
              select: {
                code: true,
                name: true,
              },
            },
          },
        },
      },
    });

  const headers = [
    "Sayım Numarası",
    "Depo Kodu",
    "Depo Adı",
    "Sayım Oluşturma Tarihi",
    "Sayım Başlangıç Tarihi",
    "Sayım Onay Tarihi",
    "Sayımı Oluşturan",
    "Sayımı Onaylayan",
    "Lokasyon",
    "Lokasyon Durumu",
    "Lokasyonu Sayan",
    "Lokasyon Tamamlanma Tarihi",
    "THM Barkodu",
    "THM Tipi",
    "Ürün Kodu",
    "Ürün Barkodu",
    "Ürün Adı",
    "Sistem Miktarı",
    "Sayım Sonucu",
    "Sayım Farkı",
    "Stoklara Uygulanan Fark",
    "Ürünü Sayan",
    "Ürün Sayım Tarihi",
    "Satır Durumu",
    "Sayımda Bulunan Yeni Ürün",
    "Açıklama",
  ];

  const rows =
    lines.map(
      (line) => [
        line.inventoryCount
          .countNumber,

        line.inventoryCount
          .warehouse.code,

        line.inventoryCount
          .warehouse.name,

        formatDate(
          line.inventoryCount
            .createdAt
        ),

        formatDate(
          line.inventoryCount
            .startedAt
        ),

        formatDate(
          line.inventoryCount
            .approvedAt
        ),

        line.inventoryCount
          .createdByName,

        line.inventoryCount
          .approvedByName ?? "",

        line.locationCode,

        getLocationStatusLabel(
          line.inventoryCountLocation
            .status
        ),

        line.inventoryCountLocation
          .countedByName ?? "",

        formatDate(
          line.inventoryCountLocation
            .completedAt
        ),

        line.handlingUnitBarcode,

        getHandlingUnitTypeLabel(
          line.handlingUnitType
        ),

        line.productCode,

        line.productBarcode,

        line.productName,

        line.systemQuantity,

        line.countedQuantity ??
          0,

        line.difference ??
          (
            (
              line.countedQuantity ??
              0
            ) -
            line.systemQuantity
          ),

        line.appliedQuantityChange ??
          0,

        line.countedByName ??
          "",

        formatDate(
          line.countedAt
        ),

        getLineStatusLabel(
          line.status
        ),

        line.isDiscovered
          ? "Evet"
          : "Hayır",

        line.note ?? "",
      ]
    );

  const csvLines = [
    headers
      .map(
        escapeCsvValue
      )
      .join(";"),

    ...rows.map(
      (row) =>
        row
          .map(
            escapeCsvValue
          )
          .join(";")
    ),
  ];

  /*
   * UTF-8 BOM Türkçe karakterlerin
   * Excel'de doğru açılmasını sağlar.
   */
  const csvContent =
    "\uFEFF" +
    csvLines.join(
      "\r\n"
    );

  const fileName =
    createFileName(
      countNumber
    );

  return new Response(
    csvContent,
    {
      status: 200,

      headers: {
        "Content-Type":
          "text/csv; charset=utf-8",

        "Content-Disposition":
          `attachment; filename="${fileName}"`,

        "Cache-Control":
          "no-store",

        "X-Content-Type-Options":
          "nosniff",
      },
    }
  );
}