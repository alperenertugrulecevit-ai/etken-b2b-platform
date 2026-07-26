import {
  Prisma,
  WmsOperationType,
} from "@prisma/client";

import Link from "next/link";

import { prisma } from "@/lib/prisma";

import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

const PAGE_SIZE = 50;

const THM_OPERATION_TYPES: WmsOperationType[] = [
  WmsOperationType.RECEIVING,
  WmsOperationType.PICKING,
  WmsOperationType.PACKING,
  WmsOperationType.SHIPPING,
  WmsOperationType.ITEM_TRANSFER,
  WmsOperationType.FULL_TRANSFER,
  WmsOperationType.PALLET_LINK,
  WmsOperationType.PALLET_UNLINK,
  WmsOperationType.ADDRESSING,
  WmsOperationType.UNADDRESSING,
];

const OPERATION_OPTIONS: Array<{
  value: WmsOperationType;
  label: string;
}> = [
  {
    value: WmsOperationType.RECEIVING,
    label: "Mal Kabul",
  },
  {
    value: WmsOperationType.PICKING,
    label: "Toplama",
  },
  {
    value: WmsOperationType.PACKING,
    label: "Paketleme / Dağılım",
  },
  {
    value: WmsOperationType.SHIPPING,
    label: "Sevkiyat",
  },
  {
    value: WmsOperationType.ITEM_TRANSFER,
    label: "Ürün Transferi",
  },
  {
    value: WmsOperationType.FULL_TRANSFER,
    label: "Komple THM Transferi",
  },
  {
    value: WmsOperationType.PALLET_LINK,
    label: "Koli-Palet Bağlama",
  },
  {
    value: WmsOperationType.PALLET_UNLINK,
    label: "Paletten Koli Ayırma",
  },
  {
    value: WmsOperationType.ADDRESSING,
    label: "Adresleme",
  },
  {
    value: WmsOperationType.UNADDRESSING,
    label: "Adresten Çıkarma",
  },
];

type Props = {
  searchParams: Promise<{
    q?: string | string[];
    operationType?: string | string[];
    startDate?: string | string[];
    endDate?: string | string[];
    page?: string | string[];
  }>;
};

function getFirstValue(
  value: string | string[] | undefined
) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function normalizeSearchValue(
  value: string | string[] | undefined
) {
  return getFirstValue(value).trim();
}

function parsePage(
  value: string | string[] | undefined
) {
  const parsedValue = Number(
    getFirstValue(value)
  );

  if (
    !Number.isInteger(parsedValue) ||
    parsedValue <= 0
  ) {
    return 1;
  }

  return parsedValue;
}

function parseStartDate(
  value: string
) {
  if (!value) {
    return null;
  }

  const date = new Date(
    `${value}T00:00:00`
  );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date;
}

function parseEndDate(
  value: string
) {
  if (!value) {
    return null;
  }

  const date = new Date(
    `${value}T00:00:00`
  );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  date.setDate(
    date.getDate() + 1
  );

  return date;
}

function isOperationType(
  value: string
): value is WmsOperationType {
  return THM_OPERATION_TYPES.some(
    (operationType) =>
      operationType === value
  );
}

function getOperationLabel(
  operationType: WmsOperationType
) {
  return (
    OPERATION_OPTIONS.find(
      (option) =>
        option.value ===
        operationType
    )?.label ??
    operationType
  );
}

function getOperationColor(
  operationType: WmsOperationType
) {
  switch (operationType) {
    case WmsOperationType.RECEIVING:
      return "bg-green-100 text-green-800";

    case WmsOperationType.PICKING:
      return "bg-blue-100 text-blue-800";

    case WmsOperationType.PACKING:
      return "bg-violet-100 text-violet-800";

    case WmsOperationType.SHIPPING:
      return "bg-orange-100 text-orange-800";

    case WmsOperationType.ITEM_TRANSFER:
    case WmsOperationType.FULL_TRANSFER:
      return "bg-cyan-100 text-cyan-800";

    case WmsOperationType.ADDRESSING:
    case WmsOperationType.UNADDRESSING:
      return "bg-amber-100 text-amber-800";

    default:
      return "bg-slate-100 text-slate-700";
  }
}

function formatDate(
  value: Date
) {
  return new Intl.DateTimeFormat(
    "tr-TR",
    {
      dateStyle: "short",
      timeStyle: "medium",
    }
  ).format(value);
}

function formatNumber(
  value: number | null
) {
  if (value === null) {
    return "-";
  }

  return new Intl.NumberFormat(
    "tr-TR"
  ).format(value);
}

function getMetadataObject(
  metadata: Prisma.JsonValue | null
): Record<string, Prisma.JsonValue> {
  if (
    !metadata ||
    typeof metadata !== "object" ||
    Array.isArray(metadata)
  ) {
    return {};
  }

  return metadata as Record<
    string,
    Prisma.JsonValue
  >;
}

function getMetadataString(
  metadata: Prisma.JsonValue | null,
  key: string
) {
  const value =
    getMetadataObject(
      metadata
    )[key];

  return typeof value === "string"
    ? value
    : "";
}

function getMetadataStringArray(
  metadata: Prisma.JsonValue | null,
  key: string
) {
  const value =
    getMetadataObject(
      metadata
    )[key];

  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (
      item
    ): item is string =>
      typeof item === "string"
  );
}

function buildPageUrl({
  q,
  operationType,
  startDate,
  endDate,
  page,
}: {
  q: string;
  operationType: string;
  startDate: string;
  endDate: string;
  page: number;
}) {
  const params =
    new URLSearchParams();

  if (q) {
    params.set(
      "q",
      q
    );
  }

  if (operationType) {
    params.set(
      "operationType",
      operationType
    );
  }

  if (startDate) {
    params.set(
      "startDate",
      startDate
    );
  }

  if (endDate) {
    params.set(
      "endDate",
      endDate
    );
  }

  params.set(
    "page",
    String(page)
  );

  return (
    "/admin/stock/thm-movements?" +
    params.toString()
  );
}

export default async function ThmMovementsPage({
  searchParams,
}: Props) {
  await AuthorizationService.requirePermission(
    "INVENTORY_VIEW"
  );

  const query =
    await searchParams;

  const search =
    normalizeSearchValue(
      query.q
    );

  const requestedOperationType =
    normalizeSearchValue(
      query.operationType
    );

  const selectedOperationType =
    isOperationType(
      requestedOperationType
    )
      ? requestedOperationType
      : "";

  const startDateValue =
    normalizeSearchValue(
      query.startDate
    );

  const endDateValue =
    normalizeSearchValue(
      query.endDate
    );

  const requestedPage =
    parsePage(
      query.page
    );

  const startDate =
    parseStartDate(
      startDateValue
    );

  const endDate =
    parseEndDate(
      endDateValue
    );

  const filters:
    Prisma.WmsOperationLogWhereInput[] =
      [];

  filters.push({
    OR: [
      {
        barcode: {
          not: null,
        },
      },
      {
        sourceBarcode: {
          not: null,
        },
      },
      {
        targetBarcode: {
          not: null,
        },
      },
    ],
  });

  if (
    selectedOperationType
  ) {
    filters.push({
      operationType:
        selectedOperationType,
    });
  }

  if (
    startDate ||
    endDate
  ) {
    filters.push({
      createdAt: {
        ...(startDate
          ? {
              gte: startDate,
            }
          : {}),

        ...(endDate
          ? {
              lt: endDate,
            }
          : {}),
      },
    });
  }

  if (search) {
    filters.push({
      OR: [
        {
          barcode: {
            contains:
              search,
            mode:
              "insensitive",
          },
        },
        {
          sourceBarcode: {
            contains:
              search,
            mode:
              "insensitive",
          },
        },
        {
          targetBarcode: {
            contains:
              search,
            mode:
              "insensitive",
          },
        },
        {
          productCode: {
            contains:
              search,
            mode:
              "insensitive",
          },
        },
        {
          productName: {
            contains:
              search,
            mode:
              "insensitive",
          },
        },
        {
          orderNumber: {
            contains:
              search,
            mode:
              "insensitive",
          },
        },
        {
          purchaseNumber: {
            contains:
              search,
            mode:
              "insensitive",
          },
        },
        {
          operatorName: {
            contains:
              search,
            mode:
              "insensitive",
          },
        },
        {
          description: {
            contains:
              search,
            mode:
              "insensitive",
          },
        },
      ],
    });
  }

  const where:
    Prisma.WmsOperationLogWhereInput =
      {
        isSuccessful: true,

        operationType: {
          in:
            THM_OPERATION_TYPES,
        },

        AND:
          filters,
      };

  const totalCount =
    await prisma.wmsOperationLog.count({
      where,
    });

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        totalCount /
          PAGE_SIZE
      )
    );

  const currentPage =
    Math.min(
      requestedPage,
      totalPages
    );

  const logs =
    await prisma.wmsOperationLog.findMany({
      where,

      orderBy: [
        {
          createdAt:
            "desc",
        },
        {
          id:
            "desc",
        },
      ],

      skip:
        (currentPage - 1) *
        PAGE_SIZE,

      take:
        PAGE_SIZE,
    });

  const purchaseOrderIds =
    Array.from(
      new Set(
        logs
          .map(
            (log) =>
              log.purchaseOrderId
          )
          .filter(
            (
              value
            ): value is number =>
              value !== null
          )
      )
    );

  const orderIds =
    Array.from(
      new Set(
        logs
          .map(
            (log) =>
              log.orderId
          )
          .filter(
            (
              value
            ): value is number =>
              value !== null
          )
      )
    );

  const shippingHandlingUnitIds =
    Array.from(
      new Set(
        logs
          .map((log) =>
            getMetadataString(
              log.metadata,
              "shippingHandlingUnitId"
            )
          )
          .filter(Boolean)
      )
    );

  const distributionIds =
    Array.from(
      new Set(
        logs
          .map((log) =>
            getMetadataString(
              log.metadata,
              "distributionId"
            )
          )
          .filter(Boolean)
      )
    );

  const handlingUnitBarcodes =
    Array.from(
      new Set(
        logs
          .flatMap(
            (log) => [
              log.barcode,
              log.sourceBarcode,
              log.targetBarcode,
            ]
          )
          .filter(
            (
              value
            ): value is string =>
              Boolean(value)
          )
      )
    );

  const [
    purchaseOrders,
    orders,
    shippingHandlingUnits,
    distributions,
    handlingUnits,
  ] =
    await Promise.all([
      purchaseOrderIds.length > 0
        ? prisma.purchaseOrder.findMany({
            where: {
              id: {
                in:
                  purchaseOrderIds,
              },
            },

            select: {
              id: true,
              purchaseNumber:
                true,

              supplier: {
                select: {
                  name: true,
                },
              },
            },
          })
        : Promise.resolve([]),

      orderIds.length > 0
        ? prisma.order.findMany({
            where: {
              id: {
                in:
                  orderIds,
              },
            },

            select: {
              id: true,
              orderNumber:
                true,

              customer: {
                select: {
                  companyName:
                    true,
                },
              },
            },
          })
        : Promise.resolve([]),

      shippingHandlingUnitIds.length >
      0
        ? prisma.shippingHandlingUnit.findMany({
            where: {
              id: {
                in:
                  shippingHandlingUnitIds,
              },
            },

            select: {
              id: true,
              customerName:
                true,

              orders: {
                orderBy: {
                  orderNumber:
                    "asc",
                },

                select: {
                  orderNumber:
                    true,
                },
              },
            },
          })
        : Promise.resolve([]),

      distributionIds.length > 0
        ? prisma.waveDistribution.findMany({
            where: {
              id: {
                in:
                  distributionIds,
              },
            },

            select: {
              id: true,
              distributionCode:
                true,
              customerName:
                true,

              wave: {
                select: {
                  waveNo:
                    true,
                },
              },

              orders: {
                orderBy: {
                  orderNumber:
                    "asc",
                },

                select: {
                  orderNumber:
                    true,
                },
              },
            },
          })
        : Promise.resolve([]),

      handlingUnitBarcodes.length >
      0
        ? prisma.handlingUnit.findMany({
            where: {
              barcode: {
                in:
                  handlingUnitBarcodes,
              },
            },

            select: {
              id: true,
              barcode: true,
            },
          })
        : Promise.resolve([]),
    ]);

  const purchaseOrderMap =
    new Map(
      purchaseOrders.map(
        (purchaseOrder) => [
          purchaseOrder.id,
          purchaseOrder,
        ]
      )
    );

  const orderMap =
    new Map(
      orders.map(
        (order) => [
          order.id,
          order,
        ]
      )
    );

  const shippingHandlingUnitMap =
    new Map(
      shippingHandlingUnits.map(
        (shippingUnit) => [
          shippingUnit.id,
          shippingUnit,
        ]
      )
    );

  const distributionMap =
    new Map(
      distributions.map(
        (distribution) => [
          distribution.id,
          distribution,
        ]
      )
    );

  const handlingUnitMap =
    new Map(
      handlingUnits.map(
        (handlingUnit) => [
          handlingUnit.barcode,
          handlingUnit,
        ]
      )
    );

  const rows =
    logs.map((log) => {
      const metadata =
        getMetadataObject(
          log.metadata
        );

      const purchaseOrder =
        log.purchaseOrderId
          ? purchaseOrderMap.get(
              log.purchaseOrderId
            )
          : undefined;

      const order =
        log.orderId
          ? orderMap.get(
              log.orderId
            )
          : undefined;

      const shippingHandlingUnitId =
        getMetadataString(
          log.metadata,
          "shippingHandlingUnitId"
        );

      const shippingHandlingUnit =
        shippingHandlingUnitId
          ? shippingHandlingUnitMap.get(
              shippingHandlingUnitId
            )
          : undefined;

      const distributionId =
        getMetadataString(
          log.metadata,
          "distributionId"
        );

      const distribution =
        distributionId
          ? distributionMap.get(
              distributionId
            )
          : undefined;

      const supplierName =
        purchaseOrder
          ?.supplier.name ??
        getMetadataString(
          log.metadata,
          "supplierName"
        );

      const purchaseNumber =
        log.purchaseNumber ??
        purchaseOrder
          ?.purchaseNumber ??
        getMetadataString(
          log.metadata,
          "purchaseNumber"
        );

      const customerName =
        order
          ?.customer.companyName ??
        shippingHandlingUnit
          ?.customerName ??
        distribution
          ?.customerName ??
        getMetadataString(
          log.metadata,
          "customerName"
        );

      const orderNumberSet =
        new Set<string>();

      if (log.orderNumber) {
        orderNumberSet.add(
          log.orderNumber
        );
      }

      if (order?.orderNumber) {
        orderNumberSet.add(
          order.orderNumber
        );
      }

      for (
        const orderNumber of
          getMetadataStringArray(
            log.metadata,
            "orderNumbers"
          )
      ) {
        orderNumberSet.add(
          orderNumber
        );
      }

      for (
        const shippingOrder of
          shippingHandlingUnit
            ?.orders ?? []
      ) {
        orderNumberSet.add(
          shippingOrder.orderNumber
        );
      }

      for (
        const distributionOrder of
          distribution?.orders ??
          []
      ) {
        orderNumberSet.add(
          distributionOrder.orderNumber
        );
      }

      const sourceBarcode =
        log.sourceBarcode ??
        (
          log.operationType ===
          WmsOperationType.SHIPPING
            ? log.barcode
            : null
        );

      const targetBarcode =
        log.targetBarcode ??
        (
          log.operationType ===
            WmsOperationType.RECEIVING ||
          log.operationType ===
            WmsOperationType.SHIPPING
            ? log.barcode
            : null
        );

      const waveNo =
        getMetadataString(
          log.metadata,
          "waveNo"
        ) ||
        distribution
          ?.wave.waveNo ||
        "";

      const distributionCode =
        getMetadataString(
          log.metadata,
          "distributionCode"
        ) ||
        distribution
          ?.distributionCode ||
        (
          typeof metadata
            .distributionId ===
          "string"
            ? metadata
                .distributionId
            : ""
        );

      return {
        log,
        supplierName,
        purchaseNumber,
        customerName,

        orderNumbers:
          Array.from(
            orderNumberSet
          ),

        sourceBarcode,
        targetBarcode,
        waveNo,
        distributionCode,
      };
    });

  const firstRow =
    totalCount === 0
      ? 0
      : (
          currentPage - 1
        ) *
          PAGE_SIZE +
        1;

  const lastRow =
    Math.min(
      currentPage *
        PAGE_SIZE,
      totalCount
    );

  return (
    <main className="min-h-screen bg-slate-100 p-5 lg:p-8">
      <div className="mx-auto max-w-[1900px]">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-cyan-700">
              Depo İzlenebilirliği
            </p>

            <h1 className="mt-2 text-3xl font-black text-slate-950">
              THM Hareketleri
            </h1>

            <p className="mt-2 max-w-4xl leading-7 text-slate-600">
              Mal kabul, toplama,
              paketleme, dağılım,
              transfer ve sevkiyat
              işlemlerini kaynak ve
              hedef THM bilgileriyle
              inceleyin.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/stock/movements"
              className="rounded-xl bg-blue-900 px-5 py-3 font-bold text-white hover:bg-blue-800"
            >
              Stok Hareketleri
            </Link>

            <Link
              href="/admin/handling-units"
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-700 hover:bg-slate-50"
            >
              Koli / Palet Yönetimi
            </Link>
          </div>
        </div>

        <form
          method="get"
          className="mt-7 rounded-2xl bg-white p-5 shadow-sm"
        >
          <div className="grid gap-4 lg:grid-cols-5">
            <label className="block lg:col-span-2">
              <span className="mb-2 block text-sm font-bold text-slate-700">
                Arama
              </span>

              <input
                name="q"
                defaultValue={
                  search
                }
                placeholder="THM, ürün, sipariş, firma veya personel"
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">
                İşlem Tipi
              </span>

              <select
                name="operationType"
                defaultValue={
                  selectedOperationType
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
              >
                <option value="">
                  Tüm İşlemler
                </option>

                {OPERATION_OPTIONS.map(
                  (option) => (
                    <option
                      key={
                        option.value
                      }
                      value={
                        option.value
                      }
                    >
                      {
                        option.label
                      }
                    </option>
                  )
                )}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">
                Başlangıç Tarihi
              </span>

              <input
                type="date"
                name="startDate"
                defaultValue={
                  startDateValue
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">
                Bitiş Tarihi
              </span>

              <input
                type="date"
                name="endDate"
                defaultValue={
                  endDateValue
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="submit"
              className="rounded-xl bg-blue-900 px-6 py-3 font-bold text-white hover:bg-blue-800"
            >
              Filtrele
            </button>

            <Link
              href="/admin/stock/thm-movements"
              className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-bold text-slate-700 hover:bg-slate-50"
            >
              Filtreleri Temizle
            </Link>
          </div>
        </form>

        <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[1850px] w-full text-left text-sm">
              <thead className="bg-blue-950 text-white">
                <tr>
                  <th className="px-4 py-4">
                    Tarih
                  </th>

                  <th className="px-4 py-4">
                    İşlem
                  </th>

                  <th className="px-4 py-4">
                    Ürün
                  </th>

                  <th className="px-4 py-4">
                    Kaynak THM
                  </th>

                  <th className="px-4 py-4">
                    Hedef / İşlem THM
                  </th>

                  <th className="px-4 py-4">
                    Miktar
                  </th>

                  <th className="px-4 py-4">
                    Tedarikçi
                  </th>

                  <th className="px-4 py-4">
                    Satın Alma Sipariş No
                  </th>

                  <th className="px-4 py-4">
                    Müşteri / Alıcı
                  </th>

                  <th className="px-4 py-4">
                    Sevk Sipariş No
                  </th>

                  <th className="px-4 py-4">
                    Wave / Dağılım
                  </th>

                  <th className="px-4 py-4">
                    Personel
                  </th>

                  <th className="px-4 py-4">
                    Açıklama
                  </th>
                </tr>
              </thead>

              <tbody>
                {rows.length ===
                0 ? (
                  <tr>
                    <td
                      colSpan={
                        13
                      }
                      className="px-6 py-16 text-center text-slate-500"
                    >
                      Filtrelere uygun
                      THM hareketi
                      bulunamadı.
                    </td>
                  </tr>
                ) : (
                  rows.map(
                    ({
                      log,
                      supplierName,
                      purchaseNumber,
                      customerName,
                      orderNumbers,
                      sourceBarcode,
                      targetBarcode,
                      waveNo,
                      distributionCode,
                    }) => {
                      const sourceUnit =
                        sourceBarcode
                          ? handlingUnitMap.get(
                              sourceBarcode
                            )
                          : undefined;

                      const targetUnit =
                        targetBarcode
                          ? handlingUnitMap.get(
                              targetBarcode
                            )
                          : undefined;

                      return (
                        <tr
                          key={
                            log.id
                          }
                          className="border-b border-slate-200 align-top hover:bg-slate-50"
                        >
                          <td className="whitespace-nowrap px-4 py-4 font-semibold text-slate-700">
                            {formatDate(
                              log.createdAt
                            )}
                          </td>

                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-black ${getOperationColor(
                                log.operationType
                              )}`}
                            >
                              {getOperationLabel(
                                log.operationType
                              )}
                            </span>
                          </td>

                          <td className="px-4 py-4">
                            <p className="font-black text-blue-950">
                              {log.productCode ??
                                "-"}
                            </p>

                            <p className="mt-1 max-w-56 text-xs leading-5 text-slate-500">
                              {log.productName ??
                                "-"}
                            </p>
                          </td>

                          <td className="px-4 py-4">
                            {sourceBarcode ? (
                              sourceUnit ? (
                                <Link
                                  href={`/admin/handling-units/${sourceUnit.id}`}
                                  className="font-black text-blue-800 hover:underline"
                                >
                                  {
                                    sourceBarcode
                                  }
                                </Link>
                              ) : (
                                <span className="font-bold text-slate-700">
                                  {
                                    sourceBarcode
                                  }
                                </span>
                              )
                            ) : (
                              "-"
                            )}
                          </td>

                          <td className="px-4 py-4">
                            {targetBarcode ? (
                              targetUnit ? (
                                <Link
                                  href={`/admin/handling-units/${targetUnit.id}`}
                                  className="font-black text-cyan-800 hover:underline"
                                >
                                  {
                                    targetBarcode
                                  }
                                </Link>
                              ) : (
                                <span className="font-bold text-slate-700">
                                  {
                                    targetBarcode
                                  }
                                </span>
                              )
                            ) : (
                              "-"
                            )}

                            {log.operationType ===
                              WmsOperationType.RECEIVING &&
                              targetBarcode && (
                                <p className="mt-1 text-xs font-bold text-green-700">
                                  Mal Kabul THM
                                </p>
                              )}
                          </td>

                          <td className="whitespace-nowrap px-4 py-4 font-black text-slate-900">
                            {formatNumber(
                              log.quantity
                            )}
                          </td>

                          <td className="px-4 py-4">
                            <span className="font-bold text-slate-800">
                              {supplierName ||
                                "-"}
                            </span>
                          </td>

                          <td className="px-4 py-4">
                            <span className="font-black text-green-800">
                              {purchaseNumber ||
                                "-"}
                            </span>
                          </td>

                          <td className="px-4 py-4">
                            <span className="font-bold text-slate-800">
                              {customerName ||
                                "-"}
                            </span>
                          </td>

                          <td className="px-4 py-4">
                            {orderNumbers.length >
                            0 ? (
                              <div className="flex max-w-64 flex-wrap gap-1">
                                {orderNumbers.map(
                                  (
                                    orderNumber
                                  ) => (
                                    <span
                                      key={
                                        orderNumber
                                      }
                                      className="rounded-lg bg-orange-100 px-2 py-1 text-xs font-black text-orange-800"
                                    >
                                      {
                                        orderNumber
                                      }
                                    </span>
                                  )
                                )}
                              </div>
                            ) : (
                              "-"
                            )}
                          </td>

                          <td className="px-4 py-4">
                            <p className="font-black text-blue-900">
                              {waveNo ||
                                "-"}
                            </p>

                            {distributionCode && (
                              <p className="mt-1 text-xs font-bold text-cyan-700">
                                {
                                  distributionCode
                                }
                              </p>
                            )}
                          </td>

                          <td className="px-4 py-4">
                            <p className="font-bold text-slate-800">
                              {log.operatorName ??
                                "-"}
                            </p>

                            {log.terminalCode && (
                              <p className="mt-1 text-xs text-slate-500">
                                {
                                  log.terminalCode
                                }
                              </p>
                            )}
                          </td>

                          <td className="px-4 py-4">
                            <p className="max-w-96 leading-6 text-slate-600">
                              {log.description ??
                                "-"}
                            </p>
                          </td>
                        </tr>
                      );
                    }
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-5 shadow-sm">
          <div>
            <p className="font-black text-slate-900">
              Sayfa {
                currentPage
              } / {
                totalPages
              }
            </p>

            <p className="mt-1 text-sm text-slate-500">
              {firstRow} -{" "}
              {lastRow} arası
              gösteriliyor. Toplam{" "}
              {totalCount} kayıt.
            </p>
          </div>

          <div className="flex gap-3">
            {currentPage > 1 ? (
              <Link
                href={buildPageUrl({
                  q: search,
                  operationType:
                    selectedOperationType,
                  startDate:
                    startDateValue,
                  endDate:
                    endDateValue,
                  page:
                    currentPage -
                    1,
                })}
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-700 hover:bg-slate-50"
              >
                ← Önceki Sayfa
              </Link>
            ) : (
              <span className="cursor-not-allowed rounded-xl bg-slate-100 px-5 py-3 font-bold text-slate-400">
                ← Önceki Sayfa
              </span>
            )}

            {currentPage <
            totalPages ? (
              <Link
                href={buildPageUrl({
                  q: search,
                  operationType:
                    selectedOperationType,
                  startDate:
                    startDateValue,
                  endDate:
                    endDateValue,
                  page:
                    currentPage +
                    1,
                })}
                className="rounded-xl bg-blue-900 px-5 py-3 font-bold text-white hover:bg-blue-800"
              >
                Sonraki Sayfa →
              </Link>
            ) : (
              <span className="cursor-not-allowed rounded-xl bg-slate-100 px-5 py-3 font-bold text-slate-400">
                Sonraki Sayfa →
              </span>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}