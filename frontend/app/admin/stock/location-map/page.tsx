import Link from "next/link";

import {
  HandlingUnitStatus,
  HandlingUnitType,
  Prisma,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

type SearchParams = Promise<{
  warehouseId?: string;
  locationId?: string;
  status?: string;
  search?: string;
}>;

type Props = {
  searchParams: SearchParams;
};

function getUnitTypeLabel(
  unitType: string
) {
  return unitType ===
    HandlingUnitType.PALLET
    ? "Palet"
    : "Koli";
}

function getStatusLabel(
  status: string
) {
  const labels: Record<string, string> = {
    OPEN: "Açık",
    CLOSED: "Kapalı",
    STORED: "Adreslendi",
    IN_TRANSIT: "Transferde",
    EMPTY: "Boş",
    CANCELLED: "İptal",
  };

  return labels[status] ?? status;
}

function getStatusClass(
  status: string
) {
  const classes: Record<string, string> = {
    OPEN:
      "bg-blue-100 text-blue-700",

    CLOSED:
      "bg-violet-100 text-violet-700",

    STORED:
      "bg-green-100 text-green-700",

    IN_TRANSIT:
      "bg-orange-100 text-orange-700",

    EMPTY:
      "bg-slate-100 text-slate-700",

    CANCELLED:
      "bg-red-100 text-red-700",
  };

  return (
    classes[status] ??
    "bg-slate-100 text-slate-700"
  );
}

function getLocationTypeLabel(
  locationType: string
) {
  const labels: Record<string, string> = {
    PALLET: "Palet",
    BOX: "Koli",
    HANGING: "Askılı",
    FLOOR: "Zemin",
    RETURN: "İade",
    QUALITY: "Kalite",
    RFID: "RFID",
    SHIPPING: "Mal Çıkış",
    RECEIVING: "Mal Kabul",
    QUARANTINE: "Karantina",
  };

  return (
    labels[locationType] ??
    locationType
  );
}

function createFullLocationCode({
  code,
  section,
  level,
  bin,
}: {
  code: string;
  section: string;
  level: string;
  bin: string;
}) {
  return [
    code,
    section,
    level,
    bin,
  ]
    .filter(Boolean)
    .join("-");
}

function isHandlingUnitStatus(
  value: string
): value is HandlingUnitStatus {
  return Object.values(
    HandlingUnitStatus
  ).includes(
    value as HandlingUnitStatus
  );
}

export default async function LocationStockMapPage({
  searchParams,
}: Props) {
  const query = await searchParams;

  const warehouseIdValue =
    query.warehouseId?.trim() ?? "";

  const locationIdValue =
    query.locationId?.trim() ?? "";

  const statusValue =
    query.status?.trim() ?? "";

  const search =
    query.search?.trim() ?? "";

  const warehouseId = Number(
    warehouseIdValue
  );

  const locationId = Number(
    locationIdValue
  );

  const handlingUnitWhere:
    Prisma.HandlingUnitWhereInput = {
    warehouseId: {
      not: null,
    },

    locationId: {
      not: null,
    },

    status: {
      not:
        HandlingUnitStatus.CANCELLED,
    },
  };

  if (
    Number.isInteger(warehouseId) &&
    warehouseId > 0
  ) {
    handlingUnitWhere.warehouseId =
      warehouseId;
  }

  if (
    Number.isInteger(locationId) &&
    locationId > 0
  ) {
    handlingUnitWhere.locationId =
      locationId;
  }

  if (
    statusValue &&
    isHandlingUnitStatus(statusValue)
  ) {
    handlingUnitWhere.status =
      statusValue;
  }

  if (search) {
    handlingUnitWhere.OR = [
      {
        barcode: {
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
        warehouse: {
          code: {
            contains: search,
            mode: "insensitive",
          },
        },
      },

      {
        warehouse: {
          name: {
            contains: search,
            mode: "insensitive",
          },
        },
      },

      {
        location: {
          code: {
            contains: search,
            mode: "insensitive",
          },
        },
      },

      {
        location: {
          aisle: {
            contains: search,
            mode: "insensitive",
          },
        },
      },

      {
        location: {
          section: {
            contains: search,
            mode: "insensitive",
          },
        },
      },

      {
        location: {
          level: {
            contains: search,
            mode: "insensitive",
          },
        },
      },

      {
        location: {
          bin: {
            contains: search,
            mode: "insensitive",
          },
        },
      },

      {
        items: {
          some: {
            product: {
              OR: [
                {
                  code: {
                    contains: search,
                    mode: "insensitive",
                  },
                },

                {
                  barcode: {
                    contains: search,
                    mode: "insensitive",
                  },
                },

                {
                  name: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              ],
            },
          },
        },
      },
    ];
  }

  const [
    warehouses,
    locations,
    handlingUnits,
  ] = await Promise.all([
    prisma.warehouse.findMany({
      where: {
        isActive: true,
      },

      orderBy: {
        code: "asc",
      },

      select: {
        id: true,
        code: true,
        name: true,
      },
    }),

    prisma.warehouseLocation.findMany({
      where: {
        isActive: true,

        warehouse: {
          isActive: true,
        },

        ...(Number.isInteger(
          warehouseId
        ) && warehouseId > 0
          ? {
              warehouseId,
            }
          : {}),
      },

      orderBy: [
        {
          warehouse: {
            code: "asc",
          },
        },

        {
          sortOrder: "asc",
        },

        {
          code: "asc",
        },

        {
          section: "asc",
        },

        {
          level: "asc",
        },

        {
          bin: "asc",
        },
      ],

      select: {
        id: true,
        warehouseId: true,
        code: true,
        aisle: true,
        section: true,
        level: true,
        bin: true,
        locationType: true,
        capacity: true,

        warehouse: {
          select: {
            code: true,
            name: true,
          },
        },
      },
    }),

    prisma.handlingUnit.findMany({
      where: handlingUnitWhere,

      orderBy: [
        {
          warehouseId: "asc",
        },

        {
          locationId: "asc",
        },

        {
          unitType: "asc",
        },

        {
          barcode: "asc",
        },
      ],

      select: {
        id: true,
        barcode: true,
        unitType: true,
        status: true,
        description: true,
        parentUnitId: true,

        warehouse: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },

        location: {
          select: {
            id: true,
            code: true,
            aisle: true,
            section: true,
            level: true,
            bin: true,
            locationType: true,
            capacity: true,
          },
        },

        parentUnit: {
          select: {
            id: true,
            barcode: true,
          },
        },

        childUnits: {
          select: {
            id: true,
          },
        },

        items: {
          orderBy: {
            product: {
              code: "asc",
            },
          },

          select: {
            id: true,
            quantity: true,
            reservedStock: true,

            product: {
              select: {
                id: true,
                code: true,
                barcode: true,
                name: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const totalHandlingUnitCount =
    handlingUnits.length;

  const totalBoxCount =
    handlingUnits.filter(
      (unit) =>
        unit.unitType ===
        HandlingUnitType.BOX
    ).length;

  const totalPalletCount =
    handlingUnits.filter(
      (unit) =>
        unit.unitType ===
        HandlingUnitType.PALLET
    ).length;

  const totalStockQuantity =
    handlingUnits.reduce(
      (unitTotal, unit) =>
        unitTotal +
        unit.items.reduce(
          (itemTotal, item) =>
            itemTotal +
            item.quantity,
          0
        ),
      0
    );

  const totalReservedQuantity =
    handlingUnits.reduce(
      (unitTotal, unit) =>
        unitTotal +
        unit.items.reduce(
          (itemTotal, item) =>
            itemTotal +
            item.reservedStock,
          0
        ),
      0
    );

  const totalAvailableQuantity =
    totalStockQuantity -
    totalReservedQuantity;

  const uniqueProductIds = new Set(
    handlingUnits.flatMap((unit) =>
      unit.items.map(
        (item) => item.product.id
      )
    )
  );

  type LocationSummary = {
    locationId: number;
    warehouseCode: string;
    warehouseName: string;
    fullLocationCode: string;
    locationType: string;
    capacity: number;

    handlingUnitCount: number;
    boxCount: number;
    palletCount: number;

    productCount: number;
    totalQuantity: number;
    reservedQuantity: number;
    availableQuantity: number;
  };

  const locationSummaryMap =
    new Map<number, LocationSummary>();

  for (const unit of handlingUnits) {
    if (
      !unit.location ||
      !unit.warehouse
    ) {
      continue;
    }

    const unitQuantity =
      unit.items.reduce(
        (total, item) =>
          total + item.quantity,
        0
      );

    const unitReserved =
      unit.items.reduce(
        (total, item) =>
          total +
          item.reservedStock,
        0
      );

    const fullLocationCode =
      createFullLocationCode({
        code: unit.location.code,
        section:
          unit.location.section,
        level:
          unit.location.level,
        bin: unit.location.bin,
      });

    const existingSummary =
      locationSummaryMap.get(
        unit.location.id
      );

    if (!existingSummary) {
      locationSummaryMap.set(
        unit.location.id,
        {
          locationId:
            unit.location.id,

          warehouseCode:
            unit.warehouse.code,

          warehouseName:
            unit.warehouse.name,

          fullLocationCode,

          locationType:
            getLocationTypeLabel(
              unit.location
                .locationType
            ),

          capacity:
            unit.location.capacity,

          handlingUnitCount: 1,

          boxCount:
            unit.unitType ===
            HandlingUnitType.BOX
              ? 1
              : 0,

          palletCount:
            unit.unitType ===
            HandlingUnitType.PALLET
              ? 1
              : 0,

          productCount:
            new Set(
              unit.items.map(
                (item) =>
                  item.product.id
              )
            ).size,

          totalQuantity:
            unitQuantity,

          reservedQuantity:
            unitReserved,

          availableQuantity:
            unitQuantity -
            unitReserved,
        }
      );

      continue;
    }

    existingSummary.handlingUnitCount +=
      1;

    if (
      unit.unitType ===
      HandlingUnitType.BOX
    ) {
      existingSummary.boxCount += 1;
    }

    if (
      unit.unitType ===
      HandlingUnitType.PALLET
    ) {
      existingSummary.palletCount += 1;
    }

    existingSummary.totalQuantity +=
      unitQuantity;

    existingSummary.reservedQuantity +=
      unitReserved;

    existingSummary.availableQuantity +=
      unitQuantity -
      unitReserved;
  }

  const locationSummaries =
    Array.from(
      locationSummaryMap.values()
    ).sort((first, second) => {
      const warehouseCompare =
        first.warehouseCode.localeCompare(
          second.warehouseCode,
          "tr"
        );

      if (warehouseCompare !== 0) {
        return warehouseCompare;
      }

      return first.fullLocationCode.localeCompare(
        second.fullLocationCode,
        "tr"
      );
    });

  return (
    <section className="p-10">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold">
            Lokasyon Stok Haritası
          </h1>

          <p className="mt-2 text-gray-500">
            Depo lokasyonlarındaki koli,
            palet ve ürün stoklarını tek
            ekrandan inceleyin.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/handling-units/addressing"
            className="rounded-xl bg-blue-900 px-5 py-3 font-semibold text-white hover:bg-blue-800"
          >
            Tekli Adresleme
          </Link>

          <Link
            href="/admin/handling-units/addressing/bulk"
            className="rounded-xl bg-violet-800 px-5 py-3 font-semibold text-white hover:bg-violet-700"
          >
            Toplu Adresleme
          </Link>
        </div>
      </div>

      <form className="mt-8 rounded-2xl bg-white p-6 shadow">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <label>
            <span className="mb-2 block text-sm font-semibold">
              Depo
            </span>

            <select
              name="warehouseId"
              defaultValue={
                warehouseIdValue
              }
              className="w-full rounded-xl border bg-white p-4"
            >
              <option value="">
                Tüm depolar
              </option>

              {warehouses.map(
                (warehouse) => (
                  <option
                    key={warehouse.id}
                    value={warehouse.id}
                  >
                    {warehouse.code}
                    {" — "}
                    {warehouse.name}
                  </option>
                )
              )}
            </select>
          </label>

          <label>
            <span className="mb-2 block text-sm font-semibold">
              Lokasyon
            </span>

            <select
              name="locationId"
              defaultValue={
                locationIdValue
              }
              className="w-full rounded-xl border bg-white p-4"
            >
              <option value="">
                Tüm lokasyonlar
              </option>

              {locations.map(
                (location) => {
                  const fullCode =
                    createFullLocationCode({
                      code:
                        location.code,

                      section:
                        location.section,

                      level:
                        location.level,

                      bin:
                        location.bin,
                    });

                  return (
                    <option
                      key={location.id}
                      value={location.id}
                    >
                      {
                        location
                          .warehouse
                          .code
                      }
                      {" / "}
                      {fullCode}
                      {" — "}
                      {getLocationTypeLabel(
                        location.locationType
                      )}
                    </option>
                  );
                }
              )}
            </select>
          </label>

          <label>
            <span className="mb-2 block text-sm font-semibold">
              THM Durumu
            </span>

            <select
              name="status"
              defaultValue={
                statusValue
              }
              className="w-full rounded-xl border bg-white p-4"
            >
              <option value="">
                Tüm durumlar
              </option>

              {Object.values(
                HandlingUnitStatus
              ).map((status) => (
                <option
                  key={status}
                  value={status}
                >
                  {getStatusLabel(
                    status
                  )}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="mb-2 block text-sm font-semibold">
              Arama
            </span>

            <input
              name="search"
              defaultValue={search}
              placeholder="THM, lokasyon veya ürün"
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
            href="/admin/stock/location-map"
            className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold hover:bg-slate-50"
          >
            Filtreleri Temizle
          </Link>
        </div>
      </form>

      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase text-gray-500">
            Toplam THM
          </p>

          <p className="mt-3 text-4xl font-bold text-blue-900">
            {totalHandlingUnitCount.toLocaleString(
              "tr-TR"
            )}
          </p>

          <p className="mt-3 text-sm text-gray-500">
            Koli: {totalBoxCount}
            {" | "}
            Palet: {totalPalletCount}
          </p>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase text-gray-500">
            Ürün Çeşidi
          </p>

          <p className="mt-3 text-4xl font-bold text-violet-700">
            {uniqueProductIds.size.toLocaleString(
              "tr-TR"
            )}
          </p>

          <p className="mt-3 text-sm text-gray-500">
            Filtrelenen THM içeriği
          </p>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase text-gray-500">
            Toplam Stok
          </p>

          <p className="mt-3 text-4xl font-bold text-orange-700">
            {totalStockQuantity.toLocaleString(
              "tr-TR"
            )}
          </p>

          <p className="mt-3 text-sm text-gray-500">
            Rezerve:{" "}
            {totalReservedQuantity.toLocaleString(
              "tr-TR"
            )}
          </p>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase text-gray-500">
            Kullanılabilir Stok
          </p>

          <p className="mt-3 text-4xl font-bold text-green-700">
            {totalAvailableQuantity.toLocaleString(
              "tr-TR"
            )}
          </p>

          <p className="mt-3 text-sm text-gray-500">
            Transfer edilebilir miktar
          </p>
        </article>
      </div>

      <div className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">
              Lokasyon Özeti
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Stok bulunan lokasyonların
              genel durumu.
            </p>
          </div>

          <div className="rounded-xl bg-slate-200 px-5 py-3 font-bold text-slate-700">
            Lokasyon:{" "}
            {locationSummaries.length}
          </div>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {locationSummaries.map(
            (summary) => (
              <article
                key={
                  summary.locationId
                }
                className="rounded-2xl bg-white p-6 shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-500">
                      {
                        summary.warehouseCode
                      }
                      {" — "}
                      {
                        summary.warehouseName
                      }
                    </p>

                    <p className="mt-2 font-mono text-xl font-bold text-blue-900">
                      {
                        summary.fullLocationCode
                      }
                    </p>
                  </div>

                  <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">
                    {
                      summary.locationType
                    }
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-4">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase text-gray-400">
                      THM
                    </p>

                    <p className="mt-1 text-2xl font-bold">
                      {
                        summary.handlingUnitCount
                      }
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase text-gray-400">
                      Koli / Palet
                    </p>

                    <p className="mt-1 font-bold">
                      {summary.boxCount}
                      {" / "}
                      {summary.palletCount}
                    </p>
                  </div>

                  <div className="rounded-xl bg-orange-50 p-4">
                    <p className="text-xs font-semibold uppercase text-orange-600">
                      Toplam Stok
                    </p>

                    <p className="mt-1 text-2xl font-bold text-orange-800">
                      {summary.totalQuantity.toLocaleString(
                        "tr-TR"
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl bg-green-50 p-4">
                    <p className="text-xs font-semibold uppercase text-green-600">
                      Kullanılabilir
                    </p>

                    <p className="mt-1 text-2xl font-bold text-green-800">
                      {summary.availableQuantity.toLocaleString(
                        "tr-TR"
                      )}
                    </p>
                  </div>
                </div>

                <Link
                  href={`/admin/stock/location-map?warehouseId=${warehouseIdValue}&locationId=${summary.locationId}`}
                  className="mt-5 block rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-center font-bold text-blue-900 hover:bg-blue-100"
                >
                  Lokasyonu İncele
                </Link>
              </article>
            )
          )}

          {locationSummaries.length ===
            0 && (
            <div className="rounded-2xl bg-white p-12 text-center text-gray-500 shadow md:col-span-2 xl:col-span-3">
              Seçilen filtrelere uygun
              lokasyon stoğu bulunamadı.
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 overflow-x-auto rounded-2xl bg-white shadow">
        <table className="w-full min-w-[1650px] text-left">
          <thead className="bg-blue-900 text-white">
            <tr>
              <th className="p-4">
                THM Barkodu
              </th>

              <th className="p-4">
                Tip
              </th>

              <th className="p-4">
                Durum
              </th>

              <th className="p-4">
                Depo
              </th>

              <th className="p-4">
                Lokasyon
              </th>

              <th className="p-4">
                Üst THM
              </th>

              <th className="p-4">
                Alt Birim
              </th>

              <th className="p-4">
                Ürün Çeşidi
              </th>

              <th className="p-4">
                Toplam
              </th>

              <th className="p-4">
                Rezerve
              </th>

              <th className="p-4">
                Kullanılabilir
              </th>

              <th className="p-4">
                İşlem
              </th>
            </tr>
          </thead>

          <tbody>
            {handlingUnits.map(
              (unit) => {
                const totalQuantity =
                  unit.items.reduce(
                    (total, item) =>
                      total +
                      item.quantity,
                    0
                  );

                const reservedQuantity =
                  unit.items.reduce(
                    (total, item) =>
                      total +
                      item.reservedStock,
                    0
                  );

                const availableQuantity =
                  totalQuantity -
                  reservedQuantity;

                const fullLocationCode =
                  unit.location
                    ? createFullLocationCode({
                        code:
                          unit.location
                            .code,

                        section:
                          unit.location
                            .section,

                        level:
                          unit.location
                            .level,

                        bin:
                          unit.location
                            .bin,
                      })
                    : "-";

                return (
                  <tr
                    key={unit.id}
                    className="border-b hover:bg-slate-50"
                  >
                    <td className="p-4">
                      <Link
                        href={`/admin/handling-units/${unit.id}`}
                        className="font-mono font-bold text-blue-900 hover:underline"
                      >
                        {unit.barcode}
                      </Link>
                    </td>

                    <td className="p-4">
                      <span
                        className={`rounded-full px-3 py-1 text-sm font-semibold ${
                          unit.unitType ===
                          HandlingUnitType.PALLET
                            ? "bg-violet-100 text-violet-700"
                            : "bg-cyan-100 text-cyan-700"
                        }`}
                      >
                        {getUnitTypeLabel(
                          unit.unitType
                        )}
                      </span>
                    </td>

                    <td className="p-4">
                      <span
                        className={`rounded-full px-3 py-1 text-sm font-semibold ${getStatusClass(
                          unit.status
                        )}`}
                      >
                        {getStatusLabel(
                          unit.status
                        )}
                      </span>
                    </td>

                    <td className="p-4">
                      {unit.warehouse
                        ? `${unit.warehouse.code} — ${unit.warehouse.name}`
                        : "-"}
                    </td>

                    <td className="p-4 font-mono font-bold">
                      {fullLocationCode}
                    </td>

                    <td className="p-4">
                      {unit.parentUnit ? (
                        <Link
                          href={`/admin/handling-units/${unit.parentUnit.id}`}
                          className="font-mono font-bold text-violet-700 hover:underline"
                        >
                          {
                            unit.parentUnit
                              .barcode
                          }
                        </Link>
                      ) : (
                        "-"
                      )}
                    </td>

                    <td className="p-4 font-bold">
                      {
                        unit.childUnits
                          .length
                      }
                    </td>

                    <td className="p-4 font-bold text-blue-900">
                      {unit.items.length}
                    </td>

                    <td className="p-4 text-xl font-bold">
                      {totalQuantity.toLocaleString(
                        "tr-TR"
                      )}
                    </td>

                    <td className="p-4 font-bold text-orange-700">
                      {reservedQuantity.toLocaleString(
                        "tr-TR"
                      )}
                    </td>

                    <td className="p-4 font-bold text-green-700">
                      {availableQuantity.toLocaleString(
                        "tr-TR"
                      )}
                    </td>

                    <td className="p-4">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/admin/handling-units/${unit.id}`}
                          className="rounded-lg bg-blue-900 px-4 py-2 font-semibold text-white hover:bg-blue-800"
                        >
                          Detay
                        </Link>

                        <Link
                          href={`/labels/print?type=handling-unit&ids=${unit.id}&layout=thermal-70x40`}
                          target="_blank"
                          className="rounded-lg bg-slate-800 px-4 py-2 font-semibold text-white hover:bg-slate-700"
                        >
                          Etiket
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              }
            )}

            {handlingUnits.length ===
              0 && (
              <tr>
                <td
                  colSpan={12}
                  className="p-12 text-center text-gray-500"
                >
                  Seçilen filtrelere uygun
                  koli veya palet bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-right text-sm text-gray-400">
        Gösterilen THM:{" "}
        {handlingUnits.length}
      </p>
    </section>
  );
}