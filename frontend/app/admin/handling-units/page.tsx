import Link from "next/link";

import {
  HandlingUnitStatus,
  HandlingUnitType,
  Prisma,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

import HandlingUnitCreateForm from "@/components/admin/HandlingUnitCreateForm";

import {
  toggleHandlingUnitStatus,
} from "./actions";

type SearchParams = Promise<{
  search?: string;
  unitType?: string;
  status?: string;
}>;

type Props = {
  searchParams: SearchParams;
};

function getUnitTypeLabel(
  unitType: HandlingUnitType
) {
  const labels: Record<
    HandlingUnitType,
    string
  > = {
    [HandlingUnitType.BOX]: "Koli",
    [HandlingUnitType.PALLET]:
      "Palet",
    [HandlingUnitType.PICKING_BOX]:
      "Toplama Kolisi",
    [HandlingUnitType.PICKING_PALLET]:
      "Toplama Paleti",
  };

  return labels[unitType];
}

function getUnitTypeClass(
  unitType: HandlingUnitType
) {
  const classes: Record<
    HandlingUnitType,
    string
  > = {
    [HandlingUnitType.BOX]:
      "bg-cyan-100 text-cyan-700",

    [HandlingUnitType.PALLET]:
      "bg-blue-100 text-blue-700",

    [HandlingUnitType.PICKING_BOX]:
      "bg-amber-100 text-amber-800",

    [HandlingUnitType.PICKING_PALLET]:
      "bg-orange-100 text-orange-800",
  };

  return classes[unitType];
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

function isHandlingUnitType(
  value: string
): value is HandlingUnitType {
  return Object.values(
    HandlingUnitType
  ).includes(
    value as HandlingUnitType
  );
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

export default async function HandlingUnitsPage({
  searchParams,
}: Props) {
  const query = await searchParams;

  const search =
    query.search?.trim() ?? "";

  const unitType =
    query.unitType?.trim() ?? "";

  const status =
    query.status?.trim() ?? "";

  const where:
    Prisma.HandlingUnitWhereInput = {};

  if (search) {
    where.OR = [
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
        items: {
          some: {
            product: {
              is: {
                OR: [
                  {
                    code: {
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

                  {
                    barcode: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                ],
              },
            },
          },
        },
      },
    ];
  }

  if (
    unitType &&
    isHandlingUnitType(unitType)
  ) {
    where.unitType = unitType;
  }

  if (
    status &&
    isHandlingUnitStatus(status)
  ) {
    where.status = status;
  }

  const handlingUnits =
    await prisma.handlingUnit.findMany({
      where,

      orderBy: [
        {
          createdAt: "desc",
        },
        {
          barcode: "asc",
        },
      ],

      include: {
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
            section: true,
            level: true,
            bin: true,
          },
        },

        parentUnit: {
          select: {
            id: true,
            barcode: true,
            unitType: true,
          },
        },

        items: {
          select: {
            id: true,
            quantity: true,
            reservedStock: true,
          },
        },

        childUnits: {
          select: {
            id: true,
            barcode: true,
          },
        },
      },
    });

  const palletCount =
    handlingUnits.filter(
      (unit) =>
        unit.unitType ===
        HandlingUnitType.PALLET
    ).length;

  const boxCount =
    handlingUnits.filter(
      (unit) =>
        unit.unitType ===
        HandlingUnitType.BOX
    ).length;

  const pickingPalletCount =
    handlingUnits.filter(
      (unit) =>
        unit.unitType ===
        HandlingUnitType.PICKING_PALLET
    ).length;

  const pickingBoxCount =
    handlingUnits.filter(
      (unit) =>
        unit.unitType ===
        HandlingUnitType.PICKING_BOX
    ).length;

  const openCount =
    handlingUnits.filter(
      (unit) =>
        unit.status ===
        HandlingUnitStatus.OPEN
    ).length;

  const storedCount =
    handlingUnits.filter(
      (unit) =>
        unit.status ===
        HandlingUnitStatus.STORED
    ).length;

  const totalItemQuantity =
    handlingUnits.reduce(
      (unitTotal, handlingUnit) =>
        unitTotal +
        handlingUnit.items.reduce(
          (itemTotal, item) =>
            itemTotal +
            item.quantity,
          0
        ),
      0
    );

  return (
    <section className="p-10">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold">
            Koli / Palet Yönetimi
          </h1>

          <p className="mt-2 text-gray-500">
            Stok ve toplama taşıma
            birimlerinin barkodlarını,
            içeriklerini, üst birimlerini ve
            adres durumlarını yönetin.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/handling-units/bulk"
            className="rounded-xl bg-blue-900 px-5 py-3 font-semibold text-white hover:bg-blue-800"
          >
            + Toplu Barkod Oluştur
          </Link>

          <Link
            href="/admin/stock/locations"
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold hover:bg-slate-50"
          >
            Lokasyon Bazlı Stoğa Git
          </Link>
        </div>
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Stok Paleti
          </p>

          <p className="mt-3 text-4xl font-bold text-blue-900">
            {palletCount.toLocaleString(
              "tr-TR"
            )}
          </p>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Stok Kolisi
          </p>

          <p className="mt-3 text-4xl font-bold text-cyan-700">
            {boxCount.toLocaleString(
              "tr-TR"
            )}
          </p>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Toplama Paleti
          </p>

          <p className="mt-3 text-4xl font-bold text-orange-700">
            {pickingPalletCount.toLocaleString(
              "tr-TR"
            )}
          </p>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Toplama Kolisi
          </p>

          <p className="mt-3 text-4xl font-bold text-amber-700">
            {pickingBoxCount.toLocaleString(
              "tr-TR"
            )}
          </p>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Açık Birim
          </p>

          <p className="mt-3 text-4xl font-bold text-violet-700">
            {openCount.toLocaleString(
              "tr-TR"
            )}
          </p>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Adreslenen
          </p>

          <p className="mt-3 text-4xl font-bold text-green-700">
            {storedCount.toLocaleString(
              "tr-TR"
            )}
          </p>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Toplam İçerik
          </p>

          <p className="mt-3 text-4xl font-bold text-orange-700">
            {totalItemQuantity.toLocaleString(
              "tr-TR"
            )}
          </p>
        </article>
      </div>

      <div className="mt-8 grid gap-8 2xl:grid-cols-[460px_1fr]">
        <HandlingUnitCreateForm />

        <div className="space-y-6">
          <form className="rounded-2xl bg-white p-6 shadow">
            <div className="grid gap-5 md:grid-cols-3">
              <label>
                <span className="mb-2 block text-sm font-semibold">
                  Arama
                </span>

                <input
                  name="search"
                  defaultValue={search}
                  placeholder="Barkod, açıklama veya ürün ara"
                  className="w-full rounded-xl border p-4"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-semibold">
                  Taşıma Birimi Tipi
                </span>

                <select
                  name="unitType"
                  defaultValue={unitType}
                  className="w-full rounded-xl border bg-white p-4"
                >
                  <option value="">
                    Tüm tipler
                  </option>

                  <option value="BOX">
                    Koli
                  </option>

                  <option value="PALLET">
                    Palet
                  </option>

                  <option value="PICKING_BOX">
                    Toplama Kolisi
                  </option>

                  <option value="PICKING_PALLET">
                    Toplama Paleti
                  </option>
                </select>
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
                    HandlingUnitStatus
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
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="submit"
                className="rounded-xl bg-blue-900 px-6 py-3 font-bold text-white hover:bg-blue-800"
              >
                Filtrele
              </button>

              <Link
                href="/admin/handling-units"
                className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold hover:bg-slate-50"
              >
                Filtreleri Temizle
              </Link>
            </div>
          </form>

          <div className="overflow-x-auto rounded-2xl bg-white shadow">
            <table className="w-full min-w-[1700px] text-left">
              <thead className="bg-blue-900 text-white">
                <tr>
                  <th className="p-4">
                    Barkod
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
                    Üst Birim
                  </th>

                  <th className="p-4">
                    Ürün Satırı
                  </th>

                  <th className="p-4">
                    Toplam Miktar
                  </th>

                  <th className="p-4">
                    Rezerve
                  </th>

                  <th className="p-4">
                    Kullanılabilir
                  </th>

                  <th className="p-4">
                    Bağlı Birim
                  </th>

                  <th className="p-4">
                    Açıklama
                  </th>

                  <th className="p-4">
                    İşlemler
                  </th>
                </tr>
              </thead>

              <tbody>
                {handlingUnits.map(
                  (handlingUnit) => {
                    const totalQuantity =
                      handlingUnit.items.reduce(
                        (total, item) =>
                          total +
                          item.quantity,
                        0
                      );

                    const totalReservedStock =
                      handlingUnit.items.reduce(
                        (total, item) =>
                          total +
                          item.reservedStock,
                        0
                      );

                    const availableQuantity =
                      totalQuantity -
                      totalReservedStock;

                    const fullLocationCode =
                      handlingUnit.location
                        ? createFullLocationCode({
                            code:
                              handlingUnit
                                .location.code,

                            section:
                              handlingUnit
                                .location
                                .section,

                            level:
                              handlingUnit
                                .location.level,

                            bin:
                              handlingUnit
                                .location.bin,
                          })
                        : "-";

                    const canToggleStatus =
                      handlingUnit.status ===
                        HandlingUnitStatus.OPEN ||
                      handlingUnit.status ===
                        HandlingUnitStatus.CLOSED ||
                      handlingUnit.status ===
                        HandlingUnitStatus.EMPTY;

                    return (
                      <tr
                        key={handlingUnit.id}
                        className="border-b hover:bg-slate-50"
                      >
                        <td className="p-4">
                          <span className="whitespace-nowrap rounded-lg bg-slate-900 px-3 py-2 font-mono font-bold text-white">
                            {
                              handlingUnit.barcode
                            }
                          </span>
                        </td>

                        <td className="p-4">
                          <span
                            className={`whitespace-nowrap rounded-full px-3 py-1 text-sm font-semibold ${getUnitTypeClass(
                              handlingUnit.unitType
                            )}`}
                          >
                            {getUnitTypeLabel(
                              handlingUnit.unitType
                            )}
                          </span>
                        </td>

                        <td className="p-4">
                          <span
                            className={`whitespace-nowrap rounded-full px-3 py-1 text-sm font-semibold ${getStatusClass(
                              handlingUnit.status
                            )}`}
                          >
                            {getStatusLabel(
                              handlingUnit.status
                            )}
                          </span>
                        </td>

                        <td className="p-4">
                          {handlingUnit.warehouse ? (
                            <>
                              <p className="font-bold text-blue-900">
                                {
                                  handlingUnit
                                    .warehouse.code
                                }
                              </p>

                              <p className="mt-1 text-sm text-gray-500">
                                {
                                  handlingUnit
                                    .warehouse.name
                                }
                              </p>
                            </>
                          ) : (
                            "-"
                          )}
                        </td>

                        <td className="p-4">
                          {handlingUnit.location ? (
                            <span className="whitespace-nowrap rounded-lg bg-slate-100 px-3 py-2 font-mono font-semibold text-slate-800">
                              {
                                fullLocationCode
                              }
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>

                        <td className="p-4">
                          {handlingUnit.parentUnit ? (
                            <div>
                              <p className="font-mono font-bold text-blue-900">
                                {
                                  handlingUnit
                                    .parentUnit
                                    .barcode
                                }
                              </p>

                              <p className="mt-1 text-xs text-gray-500">
                                {getUnitTypeLabel(
                                  handlingUnit
                                    .parentUnit
                                    .unitType
                                )}
                              </p>
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>

                        <td className="p-4 font-semibold">
                          {
                            handlingUnit
                              .items.length
                          }
                        </td>

                        <td className="p-4 text-xl font-bold">
                          {totalQuantity.toLocaleString(
                            "tr-TR"
                          )}
                        </td>

                        <td className="p-4 font-semibold text-orange-700">
                          {totalReservedStock.toLocaleString(
                            "tr-TR"
                          )}
                        </td>

                        <td className="p-4 font-bold text-green-700">
                          {availableQuantity.toLocaleString(
                            "tr-TR"
                          )}
                        </td>

                        <td className="p-4 text-xl font-bold text-blue-900">
                          {
                            handlingUnit
                              .childUnits.length
                          }
                        </td>

                        <td className="max-w-72 p-4 text-sm text-gray-600">
                          {handlingUnit.description ||
                            "-"}
                        </td>

                        <td className="p-4">
                          <div className="flex flex-wrap gap-2">
                            <Link
                              href={`/admin/handling-units/${handlingUnit.id}`}
                              className="rounded-lg bg-blue-900 px-4 py-2 font-semibold text-white hover:bg-blue-800"
                            >
                              Detay
                            </Link>

                            <Link
                              href={`/labels/print?type=handling-unit&ids=${handlingUnit.id}&layout=thermal-70x40`}
                              target="_blank"
                              className="rounded-lg bg-slate-800 px-4 py-2 font-semibold text-white hover:bg-slate-700"
                            >
                              Etiket
                            </Link>

                            {canToggleStatus && (
                              <form
                                action={toggleHandlingUnitStatus.bind(
                                  null,
                                  handlingUnit.id,
                                  handlingUnit.status
                                )}
                              >
                                <button
                                  type="submit"
                                  className="rounded-lg bg-violet-700 px-4 py-2 font-semibold text-white hover:bg-violet-800"
                                >
                                  {handlingUnit.status ===
                                  HandlingUnitStatus.OPEN
                                    ? "Kapat"
                                    : "Aç"}
                                </button>
                              </form>
                            )}
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
                      colSpan={13}
                      className="p-12 text-center text-gray-500"
                    >
                      Seçilen filtrelere uygun
                      taşıma birimi bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="text-right text-sm text-gray-400">
            Gösterilen taşıma birimi:{" "}
            {handlingUnits.length}
          </p>
        </div>
      </div>
    </section>
  );
}