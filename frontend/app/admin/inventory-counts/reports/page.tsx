import {
  InventoryCountStatus,
  Prisma,
} from "@prisma/client";

import Link from "next/link";

import { prisma } from "@/lib/prisma";

import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

type InventoryCountReportsPageProps = {
  searchParams: Promise<{
    countNumber?: string;
    warehouseId?: string;
    startDate?: string;
    endDate?: string;
  }>;
};

function formatDate(value: Date | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(value);
}

function parseDateFilter(
  value: string,
  endOfDay = false
) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const timeValue = endOfDay
    ? "23:59:59.999"
    : "00:00:00.000";

  const parsedDate = new Date(
    `${value}T${timeValue}+03:00`
  );

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat(
    "tr-TR"
  ).format(value);
}

function getDifferenceClass(
  difference: number
) {
  if (difference > 0) {
    return "text-emerald-700";
  }

  if (difference < 0) {
    return "text-red-700";
  }

  return "text-slate-600";
}

function getDifferenceLabel(
  difference: number
) {
  if (difference > 0) {
    return `+${formatNumber(difference)}`;
  }

  return formatNumber(difference);
}

function getHandlingUnitTypeLabel(
  value: string
) {
  const labels: Record<string, string> = {
    PALLET: "Palet",
    BOX: "Koli",
    PICKING_PALLET: "Toplama Paleti",
    PICKING_BOX: "Toplama Kolisi",
  };

  return labels[value] ?? value;
}

export default async function InventoryCountReportsPage({
  searchParams,
}: InventoryCountReportsPageProps) {
  await AuthorizationService.requireAnyPermission([
    "INVENTORY_COUNT_VIEW",
    "INVENTORY_COUNT_APPROVE",
  ]);

  const query = await searchParams;

  const countNumber = String(
    query.countNumber ?? ""
  )
    .trim()
    .toUpperCase();

  const warehouseIdValue = String(
    query.warehouseId ?? ""
  ).trim();

  const startDateValue = String(
    query.startDate ?? ""
  ).trim();

  const endDateValue = String(
    query.endDate ?? ""
  ).trim();

  const warehouseId = Number(
    warehouseIdValue
  );

  const startDate = parseDateFilter(
    startDateValue
  );

  const endDate = parseDateFilter(
    endDateValue,
    true
  );

  /*
   * CSV bağlantısına yalnızca geçerli ve aktif
   * filtreler eklenir.
   */
  const exportParameters =
    new URLSearchParams();

  if (countNumber) {
    exportParameters.set(
      "countNumber",
      countNumber
    );
  }

  if (
    Number.isInteger(warehouseId) &&
    warehouseId > 0
  ) {
    exportParameters.set(
      "warehouseId",
      String(warehouseId)
    );
  }

  if (startDate) {
    exportParameters.set(
      "startDate",
      startDateValue
    );
  }

  if (endDate) {
    exportParameters.set(
      "endDate",
      endDateValue
    );
  }

  const exportQuery =
    exportParameters.toString();

  const exportUrl =
    `/admin/inventory-counts/reports/export${
      exportQuery
        ? `?${exportQuery}`
        : ""
    }`;

  const approvedAtFilter:
    Prisma.DateTimeNullableFilter | undefined =
      startDate || endDate
        ? {
            ...(startDate
              ? {
                  gte: startDate,
                }
              : {}),

            ...(endDate
              ? {
                  lte: endDate,
                }
              : {}),
          }
        : undefined;

  const where:
    Prisma.InventoryCountWhereInput = {
    status: InventoryCountStatus.APPROVED,

    ...(countNumber
      ? {
          countNumber: {
            contains: countNumber,
            mode: "insensitive",
          },
        }
      : {}),

    ...(Number.isInteger(warehouseId) &&
    warehouseId > 0
      ? {
          warehouseId,
        }
      : {}),

    ...(approvedAtFilter
      ? {
          approvedAt: approvedAtFilter,
        }
      : {}),
  };

  const [warehouses, inventoryCounts] =
    await Promise.all([
      prisma.warehouse.findMany({
        where: {
          isActive: true,
        },

        orderBy: [
          {
            code: "asc",
          },
          {
            name: "asc",
          },
        ],

        select: {
          id: true,
          code: true,
          name: true,
        },
      }),

      prisma.inventoryCount.findMany({
        where,

        orderBy: [
          {
            approvedAt: "desc",
          },
          {
            countNumber: "desc",
          },
        ],

        select: {
          id: true,
          countNumber: true,

          createdAt: true,
          snapshotAt: true,
          startedAt: true,
          submittedAt: true,
          approvedAt: true,

          createdByName: true,
          approvedByName: true,
          notes: true,

          warehouse: {
            select: {
              code: true,
              name: true,
            },
          },

          assignees: {
            orderBy: [
              {
                fullName: "asc",
              },
              {
                username: "asc",
              },
            ],

            select: {
              id: true,
              fullName: true,
              username: true,
              employeeCode: true,
            },
          },

          locations: {
            orderBy: {
              locationCode: "asc",
            },

            select: {
              id: true,
              locationCode: true,
              countedByName: true,
              completedAt: true,
            },
          },

          lines: {
            orderBy: [
              {
                locationCode: "asc",
              },
              {
                handlingUnitBarcode: "asc",
              },
              {
                productCode: "asc",
              },
            ],

            select: {
              id: true,

              locationCode: true,

              handlingUnitBarcode: true,
              handlingUnitType: true,

              productCode: true,
              productBarcode: true,
              productName: true,

              systemQuantity: true,
              locationSystemQuantity: true,

              countedQuantity: true,
              difference: true,
              appliedQuantityChange: true,

              countedByName: true,
              countedAt: true,

              isDiscovered: true,
              note: true,
            },
          },
        },
      }),
    ]);

  const allLines = inventoryCounts.flatMap(
    (inventoryCount) =>
      inventoryCount.lines
  );

  const totalSystemQuantity =
    allLines.reduce(
      (total, line) =>
        total + line.systemQuantity,
      0
    );

  const totalCountedQuantity =
    allLines.reduce(
      (total, line) =>
        total +
        (line.countedQuantity ?? 0),
      0
    );

  const positiveDifference =
    allLines.reduce(
      (total, line) =>
        total +
        Math.max(
          line.difference ?? 0,
          0
        ),
      0
    );

  const negativeDifference =
    allLines.reduce(
      (total, line) =>
        total +
        Math.abs(
          Math.min(
            line.difference ?? 0,
            0
          )
        ),
      0
    );

  const differentLineCount =
    allLines.filter(
      (line) =>
        (line.difference ?? 0) !== 0
    ).length;

  return (
    <main className="min-h-screen bg-slate-50 p-6 lg:p-10">
      <div className="mx-auto max-w-[1600px]">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-700">
              Stok ve Sayım Yönetimi
            </p>

            <h1 className="mt-2 text-3xl font-black text-slate-950">
              Sayım Raporları
            </h1>

            <p className="mt-3 max-w-3xl text-slate-600">
              Onaylanan sayımları sayım numarası,
              onay tarihi ve depo bazında inceleyin.
              Ürün, THM, lokasyon ve sayım
              farklarını görüntüleyin.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={exportUrl}
              className="rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white transition hover:bg-emerald-600"
            >
              CSV İndir
            </Link>

            <Link
              href="/admin/inventory-counts"
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-700 transition hover:bg-slate-100"
            >
              Sayım Listesine Dön
            </Link>
          </div>
        </div>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-slate-950">
            Rapor Filtreleri
          </h2>

          <form
            method="get"
            className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5"
          >
            <div>
              <label
                htmlFor="countNumber"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                Sayım Numarası
              </label>

              <input
                id="countNumber"
                name="countNumber"
                type="text"
                defaultValue={countNumber}
                placeholder="SAY-..."
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-700/20"
              />
            </div>

            <div>
              <label
                htmlFor="warehouseId"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                Depo
              </label>

              <select
                id="warehouseId"
                name="warehouseId"
                defaultValue={warehouseIdValue}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-700/20"
              >
                <option value="">
                  Tüm Depolar
                </option>

                {warehouses.map(
                  (warehouse) => (
                    <option
                      key={warehouse.id}
                      value={warehouse.id}
                    >
                      {warehouse.code} -{" "}
                      {warehouse.name}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label
                htmlFor="startDate"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                Başlangıç Tarihi
              </label>

              <input
                id="startDate"
                name="startDate"
                type="date"
                defaultValue={startDateValue}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-700/20"
              />
            </div>

            <div>
              <label
                htmlFor="endDate"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                Bitiş Tarihi
              </label>

              <input
                id="endDate"
                name="endDate"
                type="date"
                defaultValue={endDateValue}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-700/20"
              />
            </div>

            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="flex-1 rounded-xl bg-blue-900 px-4 py-3 font-bold text-white transition hover:bg-blue-800"
              >
                Raporla
              </button>

              <Link
                href="/admin/inventory-counts/reports"
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-bold text-slate-700 transition hover:bg-slate-100"
              >
                Temizle
              </Link>
            </div>
          </form>

          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <strong>CSV İndir</strong> düğmesi,
            ekranda seçili olan sayım numarası,
            depo ve tarih filtrelerini kullanır.
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
              Sayım
            </p>

            <p className="mt-2 text-3xl font-black text-blue-950">
              {formatNumber(
                inventoryCounts.length
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Ürün / THM Satırı
            </p>

            <p className="mt-2 text-3xl font-black text-slate-950">
              {formatNumber(allLines.length)}
            </p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
              Farklı Satır
            </p>

            <p className="mt-2 text-3xl font-black text-amber-950">
              {formatNumber(
                differentLineCount
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Toplam Fazla
            </p>

            <p className="mt-2 text-3xl font-black text-emerald-950">
              +
              {formatNumber(
                positiveDifference
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-red-700">
              Toplam Eksik
            </p>

            <p className="mt-2 text-3xl font-black text-red-950">
              -
              {formatNumber(
                negativeDifference
              )}
            </p>
          </div>
        </section>

        <div className="mt-4 text-sm text-slate-500">
          Sistem miktarı:{" "}
          <strong className="text-slate-800">
            {formatNumber(
              totalSystemQuantity
            )}
          </strong>

          {" · "}

          Sayılan miktar:{" "}
          <strong className="text-slate-800">
            {formatNumber(
              totalCountedQuantity
            )}
          </strong>
        </div>

        <section className="mt-8 space-y-6">
          {inventoryCounts.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
              <div className="text-4xl">
                📋
              </div>

              <h2 className="mt-4 text-xl font-black text-slate-950">
                Onaylanmış sayım bulunamadı
              </h2>

              <p className="mt-2 text-slate-500">
                Seçilen filtrelere uygun
                onaylanmış bir sayım kaydı yok.
              </p>
            </div>
          ) : (
            inventoryCounts.map(
              (inventoryCount) => {
                const countDifference =
                  inventoryCount.lines.reduce(
                    (total, line) =>
                      total +
                      (line.difference ?? 0),
                    0
                  );

                const countDifferentLines =
                  inventoryCount.lines.filter(
                    (line) =>
                      (line.difference ?? 0) !==
                      0
                  ).length;

                return (
                  <article
                    key={inventoryCount.id}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                  >
                    <div className="border-b border-slate-200 bg-slate-50 p-5">
                      <div className="flex flex-wrap items-start justify-between gap-5">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <code className="rounded-lg bg-blue-100 px-3 py-1 text-sm font-black text-blue-800">
                              {
                                inventoryCount.countNumber
                              }
                            </code>

                            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">
                              Onaylandı
                            </span>

                            <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-700">
                              {
                                inventoryCount
                                  .warehouse.code
                              }{" "}
                              -{" "}
                              {
                                inventoryCount
                                  .warehouse.name
                              }
                            </span>
                          </div>

                          <p className="mt-3 text-sm text-slate-600">
                            Onay tarihi:{" "}
                            <strong>
                              {formatDate(
                                inventoryCount.approvedAt
                              )}
                            </strong>

                            {" · "}

                            Onaylayan:{" "}
                            <strong>
                              {inventoryCount.approvedByName ??
                                "-"}
                            </strong>
                          </p>

                          <p className="mt-1 text-sm text-slate-600">
                            Oluşturan:{" "}
                            <strong>
                              {
                                inventoryCount.createdByName
                              }
                            </strong>

                            {" · "}

                            Sayım personeli:{" "}
                            <strong>
                              {inventoryCount
                                .assignees.length >
                              0
                                ? inventoryCount.assignees
                                    .map(
                                      (assignee) =>
                                        assignee.fullName
                                    )
                                    .join(", ")
                                : "-"}
                            </strong>
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
                            <span className="font-bold text-slate-500">
                              Satır:
                            </span>{" "}
                            <strong>
                              {formatNumber(
                                inventoryCount.lines
                                  .length
                              )}
                            </strong>
                          </div>

                          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
                            <span className="font-bold text-amber-700">
                              Farklı:
                            </span>{" "}
                            <strong className="text-amber-950">
                              {formatNumber(
                                countDifferentLines
                              )}
                            </strong>
                          </div>

                          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm">
                            <span className="font-bold text-blue-700">
                              Net fark:
                            </span>{" "}
                            <strong
                              className={getDifferenceClass(
                                countDifference
                              )}
                            >
                              {getDifferenceLabel(
                                countDifference
                              )}
                            </strong>
                          </div>

                          <Link
                            href={`/admin/inventory-counts/${inventoryCount.id}`}
                            className="rounded-xl border border-blue-300 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800 transition hover:bg-blue-100"
                          >
                            Sayımı Aç
                          </Link>
                        </div>
                      </div>
                    </div>

                    {inventoryCount.lines
                      .length === 0 ? (
                      <div className="p-6 text-center text-slate-500">
                        Bu sayımda ürün satırı
                        bulunmuyor.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[1500px] text-left text-sm">
                          <thead className="bg-slate-100 text-xs uppercase tracking-wider text-slate-600">
                            <tr>
                              <th className="px-4 py-3">
                                Lokasyon
                              </th>

                              <th className="px-4 py-3">
                                THM
                              </th>

                              <th className="px-4 py-3">
                                THM Tipi
                              </th>

                              <th className="px-4 py-3">
                                Ürün Kodu
                              </th>

                              <th className="px-4 py-3">
                                Barkod
                              </th>

                              <th className="px-4 py-3">
                                Ürün
                              </th>

                              <th className="px-4 py-3 text-right">
                                Sistem
                              </th>

                              <th className="px-4 py-3 text-right">
                                Sayılan
                              </th>

                              <th className="px-4 py-3 text-right">
                                Fark
                              </th>

                              <th className="px-4 py-3 text-right">
                                Uygulanan
                              </th>

                              <th className="px-4 py-3">
                                Sayan
                              </th>

                              <th className="px-4 py-3">
                                Sayım Tarihi
                              </th>

                              <th className="px-4 py-3">
                                Açıklama
                              </th>
                            </tr>
                          </thead>

                          <tbody className="divide-y divide-slate-200">
                            {inventoryCount.lines.map(
                              (line) => {
                                const difference =
                                  line.difference ??
                                  0;

                                return (
                                  <tr
                                    key={line.id}
                                    className={
                                      difference !==
                                      0
                                        ? "bg-amber-50/50"
                                        : "bg-white"
                                    }
                                  >
                                    <td className="whitespace-nowrap px-4 py-3 font-black text-slate-900">
                                      {
                                        line.locationCode
                                      }
                                    </td>

                                    <td className="whitespace-nowrap px-4 py-3">
                                      <code className="rounded bg-slate-100 px-2 py-1 font-bold text-slate-800">
                                        {
                                          line.handlingUnitBarcode
                                        }
                                      </code>
                                    </td>

                                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                                      {getHandlingUnitTypeLabel(
                                        line.handlingUnitType
                                      )}
                                    </td>

                                    <td className="whitespace-nowrap px-4 py-3 font-bold text-blue-900">
                                      {
                                        line.productCode
                                      }
                                    </td>

                                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                                      {
                                        line.productBarcode
                                      }
                                    </td>

                                    <td className="min-w-64 px-4 py-3 text-slate-900">
                                      {
                                        line.productName
                                      }

                                      {line.isDiscovered && (
                                        <span className="ml-2 inline-flex rounded-full bg-violet-100 px-2 py-1 text-xs font-bold text-violet-800">
                                          Sayımda Bulundu
                                        </span>
                                      )}
                                    </td>

                                    <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-slate-700">
                                      {formatNumber(
                                        line.systemQuantity
                                      )}
                                    </td>

                                    <td className="whitespace-nowrap px-4 py-3 text-right font-black text-slate-950">
                                      {formatNumber(
                                        line.countedQuantity ??
                                          0
                                      )}
                                    </td>

                                    <td
                                      className={`whitespace-nowrap px-4 py-3 text-right font-black ${getDifferenceClass(
                                        difference
                                      )}`}
                                    >
                                      {getDifferenceLabel(
                                        difference
                                      )}
                                    </td>

                                    <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-slate-700">
                                      {getDifferenceLabel(
                                        line.appliedQuantityChange ??
                                          0
                                      )}
                                    </td>

                                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                                      {line.countedByName ??
                                        "-"}
                                    </td>

                                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                                      {formatDate(
                                        line.countedAt
                                      )}
                                    </td>

                                    <td className="min-w-56 px-4 py-3 text-slate-600">
                                      {line.note ?? "-"}
                                    </td>
                                  </tr>
                                );
                              }
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </article>
                );
              }
            )
          )}
        </section>
      </div>
    </main>
  );
}