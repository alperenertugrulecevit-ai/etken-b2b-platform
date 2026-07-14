import Link from "next/link";

import {
  Prisma,
  PurchaseOrderStatus,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

type SearchParams = Promise<{
  search?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}>;

type Props = {
  searchParams: SearchParams;
};

function formatCurrency(value: number) {
  return value.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatNumber(value: number) {
  return value.toLocaleString("tr-TR");
}

function formatDate(value: Date | null) {
  if (!value) {
    return "Belirtilmedi";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    DRAFT: "Taslak",
    PENDING: "Bekliyor",
    APPROVED: "Onaylandı",
    PARTIALLY_RECEIVED: "Kısmi Mal Kabul",
    RECEIVED: "Tamamlandı",
    CANCELLED: "İptal",
  };

  return labels[status] ?? status;
}

function getStatusClass(status: string) {
  const classes: Record<string, string> = {
    DRAFT: "bg-slate-100 text-slate-700",
    PENDING: "bg-orange-100 text-orange-700",
    APPROVED: "bg-blue-100 text-blue-700",
    PARTIALLY_RECEIVED:
      "bg-violet-100 text-violet-700",
    RECEIVED: "bg-green-100 text-green-700",
    CANCELLED: "bg-red-100 text-red-700",
  };

  return (
    classes[status] ??
    "bg-slate-100 text-slate-700"
  );
}

function isPurchaseOrderStatus(
  value: string
): value is PurchaseOrderStatus {
  return Object.values(
    PurchaseOrderStatus
  ).includes(
    value as PurchaseOrderStatus
  );
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

function isOverdue({
  expectedDate,
  status,
  now,
}: {
  expectedDate: Date | null;
  status: PurchaseOrderStatus;
  now: Date;
}) {
  if (!expectedDate) {
    return false;
  }

  if (
    status ===
      PurchaseOrderStatus.RECEIVED ||
    status ===
      PurchaseOrderStatus.CANCELLED
  ) {
    return false;
  }

  return expectedDate < now;
}

export default async function PurchaseOrdersPage({
  searchParams,
}: Props) {
  const query = await searchParams;

  const search =
    query.search?.trim() ?? "";

  const status =
    query.status?.trim() ?? "";

  const startDate =
    query.startDate?.trim() ?? "";

  const endDate =
    query.endDate?.trim() ?? "";

  const parsedStartDate =
    createStartDate(startDate);

  const parsedEndDate =
    createEndDate(endDate);

  const now = new Date();

  const where: Prisma.PurchaseOrderWhereInput =
    {};

  if (search) {
    where.OR = [
      {
        purchaseNumber: {
          contains: search,
          mode: "insensitive",
        },
      },

      {
        supplier: {
          is: {
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
      },

      {
        supplier: {
          is: {
            contactName: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
      },

      {
        items: {
          some: {
            productCode: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
      },

      {
        items: {
          some: {
            productName: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
      },
    ];
  }

  if (
    status &&
    isPurchaseOrderStatus(status)
  ) {
    where.status = status;
  }

  if (
    parsedStartDate ||
    parsedEndDate
  ) {
    where.expectedDate = {
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

  const [
    purchaseOrders,
    draftCount,
    approvedCount,
    partiallyReceivedCount,
    receivedCount,
    pendingCount,
    totalPurchaseSummary,
    openPurchaseOrders,
  ] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where,

      orderBy: [
        {
          expectedDate: "asc",
        },
        {
          orderDate: "desc",
        },
      ],

      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            contactName: true,
          },
        },

        items: {
          select: {
            id: true,
            orderedQuantity: true,
            receivedQuantity: true,
          },
        },
      },
    }),

    prisma.purchaseOrder.count({
      where: {
        status:
          PurchaseOrderStatus.DRAFT,
      },
    }),

    prisma.purchaseOrder.count({
      where: {
        status:
          PurchaseOrderStatus.APPROVED,
      },
    }),

    prisma.purchaseOrder.count({
      where: {
        status:
          PurchaseOrderStatus.PARTIALLY_RECEIVED,
      },
    }),

    prisma.purchaseOrder.count({
      where: {
        status:
          PurchaseOrderStatus.RECEIVED,
      },
    }),

    prisma.purchaseOrder.count({
      where: {
        status:
          PurchaseOrderStatus.PENDING,
      },
    }),

    prisma.purchaseOrder.aggregate({
      where: {
        status: {
          not:
            PurchaseOrderStatus.CANCELLED,
        },
      },

      _sum: {
        totalAmount: true,
      },
    }),

    prisma.purchaseOrder.findMany({
      where: {
        expectedDate: {
          lt: now,
        },

        status: {
          notIn: [
            PurchaseOrderStatus.RECEIVED,
            PurchaseOrderStatus.CANCELLED,
          ],
        },
      },

      select: {
        id: true,
      },
    }),
  ]);

  const overdueCount =
    openPurchaseOrders.length;

  const totalPurchaseAmount =
    totalPurchaseSummary._sum
      .totalAmount ?? 0;

  return (
    <section className="p-10">
      {/* BAŞLIK */}

      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold">
            Satın Alma Yönetimi
          </h1>

          <p className="mt-2 text-gray-500">
            Satın alma siparişlerini,
            teslim tarihlerini ve mal kabul
            ilerlemelerini yönetin.
          </p>
        </div>

        <Link
          href="/admin/purchase-orders/new"
          className="rounded-xl bg-blue-900 px-6 py-3 font-bold text-white hover:bg-blue-800"
        >
          + Yeni Satın Alma
        </Link>
      </div>

      {/* ÖZET KARTLARI */}

      <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Taslak / Bekleyen
          </p>

          <p className="mt-3 text-4xl font-bold text-slate-700">
            {formatNumber(
              draftCount +
                pendingCount
            )}
          </p>

          <p className="mt-2 text-sm text-gray-500">
            Henüz mal kabul sürecine
            geçmeyen kayıtlar
          </p>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Mal Kabul Bekleyen
          </p>

          <p className="mt-3 text-4xl font-bold text-blue-700">
            {formatNumber(
              approvedCount
            )}
          </p>

          <p className="mt-2 text-sm text-gray-500">
            Onaylandı, henüz teslimat
            başlamadı
          </p>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Kısmi Mal Kabul
          </p>

          <p className="mt-3 text-4xl font-bold text-violet-700">
            {formatNumber(
              partiallyReceivedCount
            )}
          </p>

          <p className="mt-2 text-sm text-gray-500">
            Teslimatı tamamlanmamış satın
            almalar
          </p>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Geciken Satın Alma
          </p>

          <p className="mt-3 text-4xl font-bold text-red-600">
            {formatNumber(
              overdueCount
            )}
          </p>

          <p className="mt-2 text-sm text-gray-500">
            Beklenen tarihi geçmiş açık
            kayıtlar
          </p>
        </article>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Tamamlanan Satın Alma
          </p>

          <p className="mt-3 text-4xl font-bold text-green-700">
            {formatNumber(
              receivedCount
            )}
          </p>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Toplam Satın Alma Tutarı
          </p>

          <p className="mt-3 text-3xl font-bold text-blue-900">
            {formatCurrency(
              totalPurchaseAmount
            )}{" "}
            ₺
          </p>

          <p className="mt-2 text-sm text-gray-500">
            İptal edilen satın almalar hariç
          </p>
        </article>
      </div>

      {/* FİLTRELER */}

      <form className="mt-8 rounded-2xl bg-white p-6 shadow">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
          <label className="xl:col-span-2">
            <span className="mb-2 block text-sm font-semibold">
              Arama
            </span>

            <input
              name="search"
              defaultValue={search}
              placeholder="Satın alma no, tedarikçi veya ürün ara"
              className="w-full rounded-xl border p-4"
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-semibold">
              Durum
            </span>

            <select
              name="status"
              defaultValue={status}
              className="w-full rounded-xl border bg-white p-4"
            >
              <option value="">
                Tüm durumlar
              </option>

              {Object.values(
                PurchaseOrderStatus
              ).map(
                (statusOption) => (
                  <option
                    key={statusOption}
                    value={statusOption}
                  >
                    {getStatusLabel(
                      statusOption
                    )}
                  </option>
                )
              )}
            </select>
          </label>

          <label>
            <span className="mb-2 block text-sm font-semibold">
              Beklenen Teslim Başlangıç
            </span>

            <input
              name="startDate"
              type="date"
              defaultValue={startDate}
              className="w-full rounded-xl border p-4"
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-semibold">
              Beklenen Teslim Bitiş
            </span>

            <input
              name="endDate"
              type="date"
              defaultValue={endDate}
              className="w-full rounded-xl border p-4"
            />
          </label>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="submit"
            className="rounded-xl bg-blue-900 px-6 py-3 font-bold text-white hover:bg-blue-800"
          >
            Filtrele
          </button>

          <Link
            href="/admin/purchase-orders"
            className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold hover:bg-slate-50"
          >
            Filtreleri Temizle
          </Link>
        </div>
      </form>

      {/* SATIN ALMA TABLOSU */}

      <div className="mt-8 overflow-x-auto rounded-2xl bg-white shadow">
        <table className="w-full min-w-[1650px] text-left">
          <thead className="bg-blue-900 text-white">
            <tr>
              <th className="p-4">
                Satın Alma No
              </th>

              <th className="p-4">
                Tedarikçi
              </th>

              <th className="p-4">
                Sipariş Tarihi
              </th>

              <th className="p-4">
                Beklenen Teslim
              </th>

              <th className="p-4">
                Ürün Satırı
              </th>

              <th className="p-4">
                Sipariş Miktarı
              </th>

              <th className="p-4">
                Kabul Edilen
              </th>

              <th className="p-4">
                Kalan
              </th>

              <th className="p-4">
                İlerleme
              </th>

              <th className="p-4">
                Toplam
              </th>

              <th className="p-4">
                Durum
              </th>

              <th className="p-4">
                İşlemler
              </th>
            </tr>
          </thead>

          <tbody>
            {purchaseOrders.map(
              (purchaseOrder) => {
                const totalOrdered =
                  purchaseOrder.items.reduce(
                    (total, item) =>
                      total +
                      item.orderedQuantity,
                    0
                  );

                const totalReceived =
                  purchaseOrder.items.reduce(
                    (total, item) =>
                      total +
                      item.receivedQuantity,
                    0
                  );

                const remaining =
                  totalOrdered -
                  totalReceived;

                const progress =
                  totalOrdered > 0
                    ? Math.min(
                        100,
                        Math.round(
                          (totalReceived /
                            totalOrdered) *
                            100
                        )
                      )
                    : 0;

                const overdue = isOverdue({
                  expectedDate:
                    purchaseOrder.expectedDate,

                  status:
                    purchaseOrder.status,

                  now,
                });

                const canReceive =
                  purchaseOrder.status ===
                    PurchaseOrderStatus.APPROVED ||
                  purchaseOrder.status ===
                    PurchaseOrderStatus.PARTIALLY_RECEIVED;

                return (
                  <tr
                    key={purchaseOrder.id}
                    className={`border-b hover:bg-slate-50 ${
                      overdue
                        ? "bg-red-50/50"
                        : ""
                    }`}
                  >
                    <td className="p-4">
                      <p className="font-bold text-blue-900">
                        {
                          purchaseOrder.purchaseNumber
                        }
                      </p>

                      {overdue && (
                        <span className="mt-2 inline-block rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                          Gecikmiş
                        </span>
                      )}
                    </td>

                    <td className="p-4">
                      <p className="font-semibold">
                        {
                          purchaseOrder
                            .supplier.name
                        }
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        {purchaseOrder
                          .supplier
                          .contactName ||
                          "Yetkili belirtilmedi"}
                      </p>
                    </td>

                    <td className="whitespace-nowrap p-4">
                      {formatDate(
                        purchaseOrder.orderDate
                      )}
                    </td>

                    <td
                      className={`whitespace-nowrap p-4 font-semibold ${
                        overdue
                          ? "text-red-700"
                          : ""
                      }`}
                    >
                      {formatDate(
                        purchaseOrder.expectedDate
                      )}
                    </td>

                    <td className="p-4">
                      {
                        purchaseOrder
                          .items.length
                      }{" "}
                      satır
                    </td>

                    <td className="p-4 font-semibold">
                      {formatNumber(
                        totalOrdered
                      )}
                    </td>

                    <td className="p-4 font-bold text-green-700">
                      {formatNumber(
                        totalReceived
                      )}
                    </td>

                    <td className="p-4 font-bold text-orange-700">
                      {formatNumber(
                        remaining
                      )}
                    </td>

                    <td className="p-4">
                      <div className="w-36">
                        <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full rounded-full bg-green-600"
                            style={{
                              width: `${progress}%`,
                            }}
                          />
                        </div>

                        <p className="mt-2 text-sm font-semibold">
                          %{progress}
                        </p>
                      </div>
                    </td>

                    <td className="whitespace-nowrap p-4 font-bold">
                      {formatCurrency(
                        purchaseOrder.totalAmount
                      )}{" "}
                      ₺
                    </td>

                    <td className="p-4">
                      <span
                        className={`inline-block whitespace-nowrap rounded-full px-3 py-1 text-sm font-semibold ${getStatusClass(
                          purchaseOrder.status
                        )}`}
                      >
                        {getStatusLabel(
                          purchaseOrder.status
                        )}
                      </span>
                    </td>

                    <td className="p-4">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/admin/purchase-orders/${purchaseOrder.id}`}
                          className="rounded-lg bg-slate-800 px-4 py-2 font-semibold text-white hover:bg-slate-700"
                        >
                          Detay
                        </Link>

                        {canReceive && (
                          <Link
                            href={`/admin/purchase-orders/${purchaseOrder.id}/receive`}
                            className="rounded-lg bg-green-700 px-4 py-2 font-semibold text-white hover:bg-green-800"
                          >
                            Mal Kabul
                          </Link>
                        )}

                        {totalReceived > 0 && (
                          <Link
                            href={`/admin/purchase-orders/${purchaseOrder.id}/receipts`}
                            className="rounded-lg bg-blue-900 px-4 py-2 font-semibold text-white hover:bg-blue-800"
                          >
                            Geçmiş
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              }
            )}

            {purchaseOrders.length ===
              0 && (
              <tr>
                <td
                  colSpan={12}
                  className="p-12 text-center text-gray-500"
                >
                  Seçilen filtrelere uygun
                  satın alma siparişi
                  bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-right text-sm text-gray-400">
        Gösterilen satın alma:{" "}
        {formatNumber(
          purchaseOrders.length
        )}
      </div>
    </section>
  );
}