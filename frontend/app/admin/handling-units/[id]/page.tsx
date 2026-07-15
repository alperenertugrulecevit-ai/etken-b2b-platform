import Link from "next/link";
import { notFound } from "next/navigation";

import {
  HandlingUnitStatus,
  HandlingUnitType,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

import HandlingUnitProductLoadForm from "@/components/admin/HandlingUnitProductLoadForm";

import {
  removeProductFromHandlingUnit,
} from "./actions";

type Props = {
  params: Promise<{
    id: string;
  }>;
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

export default async function HandlingUnitDetailPage({
  params,
}: Props) {
  const { id } = await params;

  const handlingUnitId =
    Number(id);

  if (
    !Number.isInteger(
      handlingUnitId
    ) ||
    handlingUnitId <= 0
  ) {
    notFound();
  }

  const handlingUnit =
    await prisma.handlingUnit.findUnique({
      where: {
        id: handlingUnitId,
      },

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

        childUnits: {
          orderBy: {
            barcode: "asc",
          },

          select: {
            id: true,
            barcode: true,
            unitType: true,
            status: true,
          },
        },

        items: {
          orderBy: {
            product: {
              code: "asc",
            },
          },

          include: {
            product: {
              select: {
                id: true,
                code: true,
                barcode: true,
                name: true,
                stock: true,
              },
            },
          },
        },
      },
    });

  if (!handlingUnit) {
    notFound();
  }

  const canLoadProduct =
    handlingUnit.status ===
      HandlingUnitStatus.OPEN ||
    handlingUnit.status ===
      HandlingUnitStatus.EMPTY;

  const totalQuantity =
    handlingUnit.items.reduce(
      (total, item) =>
        total + item.quantity,
      0
    );

  const totalReserved =
    handlingUnit.items.reduce(
      (total, item) =>
        total +
        item.reservedStock,
      0
    );

  const totalAvailable =
    totalQuantity -
    totalReserved;

  const fullLocationCode =
    handlingUnit.location
      ? createFullLocationCode({
          code:
            handlingUnit.location
              .code,

          section:
            handlingUnit.location
              .section,

          level:
            handlingUnit.location
              .level,

          bin:
            handlingUnit.location
              .bin,
        })
      : "-";

  return (
    <section className="p-10">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold">
            Koli / Palet Detayı
          </h1>

          <p className="mt-3 break-all font-mono text-2xl font-bold text-blue-900">
            {handlingUnit.barcode}
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <span className="rounded-full bg-cyan-100 px-4 py-2 font-semibold text-cyan-700">
              {getUnitTypeLabel(
                handlingUnit.unitType
              )}
            </span>

            <span
              className={`rounded-full px-4 py-2 font-semibold ${getStatusClass(
                handlingUnit.status
              )}`}
            >
              {getStatusLabel(
                handlingUnit.status
              )}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href={`/labels/print?type=handling-unit&ids=${handlingUnit.id}&layout=thermal-70x40`}
            target="_blank"
            className="rounded-xl bg-slate-800 px-5 py-3 font-semibold text-white hover:bg-slate-700"
          >
            Etiketi Yazdır
          </Link>

          <Link
            href="/admin/handling-units"
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold hover:bg-slate-50"
          >
            ← Koli / Palet Listesine Dön
          </Link>
        </div>
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase text-gray-500">
            Ürün Satırı
          </p>

          <p className="mt-3 text-4xl font-bold text-blue-900">
            {handlingUnit.items.length}
          </p>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase text-gray-500">
            Toplam Miktar
          </p>

          <p className="mt-3 text-4xl font-bold text-violet-700">
            {totalQuantity.toLocaleString(
              "tr-TR"
            )}
          </p>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase text-gray-500">
            Rezerve
          </p>

          <p className="mt-3 text-4xl font-bold text-orange-700">
            {totalReserved.toLocaleString(
              "tr-TR"
            )}
          </p>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase text-gray-500">
            Kullanılabilir
          </p>

          <p className="mt-3 text-4xl font-bold text-green-700">
            {totalAvailable.toLocaleString(
              "tr-TR"
            )}
          </p>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase text-gray-500">
            Bağlı Alt Birim
          </p>

          <p className="mt-3 text-4xl font-bold text-cyan-700">
            {
              handlingUnit.childUnits
                .length
            }
          </p>
        </article>
      </div>

      <div className="mt-8 grid gap-8 2xl:grid-cols-[460px_1fr]">
        <HandlingUnitProductLoadForm
          handlingUnitId={
            handlingUnit.id
          }
          handlingUnitBarcode={
            handlingUnit.barcode
          }
          canLoadProduct={
            canLoadProduct
          }
        />

        <div className="space-y-6">
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-2xl bg-white p-5 shadow">
              <p className="text-xs font-semibold uppercase text-gray-500">
                Depo
              </p>

              <p className="mt-2 font-bold">
                {handlingUnit.warehouse
                  ? `${handlingUnit.warehouse.code} — ${handlingUnit.warehouse.name}`
                  : "-"}
              </p>
            </article>

            <article className="rounded-2xl bg-white p-5 shadow">
              <p className="text-xs font-semibold uppercase text-gray-500">
                Lokasyon
              </p>

              <p className="mt-2 font-mono font-bold">
                {fullLocationCode}
              </p>
            </article>

            <article className="rounded-2xl bg-white p-5 shadow">
              <p className="text-xs font-semibold uppercase text-gray-500">
                Üst Birim
              </p>

              <p className="mt-2 font-mono font-bold">
                {handlingUnit.parentUnit
                  ?.barcode ?? "-"}
              </p>
            </article>

            <article className="rounded-2xl bg-white p-5 shadow">
              <p className="text-xs font-semibold uppercase text-gray-500">
                Açıklama
              </p>

              <p className="mt-2 font-semibold">
                {handlingUnit.description ||
                  "-"}
              </p>
            </article>
          </div>

          <div className="overflow-x-auto rounded-2xl bg-white shadow">
            <table className="w-full min-w-[1200px] text-left">
              <thead className="bg-blue-900 text-white">
                <tr>
                  <th className="p-4">
                    Ürün Kodu
                  </th>

                  <th className="p-4">
                    Ürün Barkodu
                  </th>

                  <th className="p-4">
                    Ürün Tanımı
                  </th>

                  <th className="p-4">
                    Miktar
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
                {handlingUnit.items.map(
                  (item) => {
                    const availableQuantity =
                      item.quantity -
                      item.reservedStock;

                    return (
                      <tr
                        key={item.id}
                        className="border-b hover:bg-slate-50"
                      >
                        <td className="p-4 font-bold text-blue-900">
                          {
                            item.product
                              .code
                          }
                        </td>

                        <td className="p-4 font-mono">
                          {
                            item.product
                              .barcode
                          }
                        </td>

                        <td className="p-4 font-semibold">
                          {
                            item.product
                              .name
                          }
                        </td>

                        <td className="p-4 text-xl font-bold">
                          {item.quantity}
                        </td>

                        <td className="p-4 font-semibold text-orange-700">
                          {
                            item.reservedStock
                          }
                        </td>

                        <td className="p-4 font-bold text-green-700">
                          {
                            availableQuantity
                          }
                        </td>

                        <td className="p-4">
                          <form
                            action={removeProductFromHandlingUnit.bind(
                              null,
                              handlingUnit.id,
                              item.id
                            )}
                            className="flex items-center gap-2"
                          >
                            <input
                              name="quantity"
                              type="number"
                              min="1"
                              max={
                                availableQuantity
                              }
                              defaultValue="1"
                              className="w-24 rounded-lg border p-2"
                              disabled={
                                !canLoadProduct ||
                                availableQuantity <=
                                  0
                              }
                              required
                            />

                            <button
                              type="submit"
                              disabled={
                                !canLoadProduct ||
                                availableQuantity <=
                                  0
                              }
                              className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                            >
                              Çıkar
                            </button>
                          </form>
                        </td>
                      </tr>
                    );
                  }
                )}

                {handlingUnit.items.length ===
                  0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="p-12 text-center text-gray-500"
                    >
                      Bu koli veya palete henüz
                      ürün yüklenmemiş.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {handlingUnit.childUnits.length >
            0 && (
            <div className="rounded-2xl bg-white p-6 shadow">
              <h2 className="text-2xl font-bold">
                Bağlı Alt Birimler
              </h2>

              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {handlingUnit.childUnits.map(
                  (childUnit) => (
                    <Link
                      key={childUnit.id}
                      href={`/admin/handling-units/${childUnit.id}`}
                      className="rounded-xl border p-4 hover:bg-slate-50"
                    >
                      <p className="font-mono font-bold text-blue-900">
                        {
                          childUnit.barcode
                        }
                      </p>

                      <p className="mt-2 text-sm text-gray-500">
                        {getUnitTypeLabel(
                          childUnit.unitType
                        )}
                        {" — "}
                        {getStatusLabel(
                          childUnit.status
                        )}
                      </p>
                    </Link>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}