import Link from "next/link";

import {
  HandlingUnitStatus,
  HandlingUnitType,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

import PalletBoxLinkForm from "@/components/admin/PalletBoxLinkForm";

import {
  unlinkBoxFromPallet,
} from "./actions";

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

export default async function PalletBoxLinkPage() {
  const [pallets, freeBoxes, linkedBoxes] =
    await Promise.all([
      prisma.handlingUnit.findMany({
        where: {
          unitType:
            HandlingUnitType.PALLET,

          status: {
            in: [
              HandlingUnitStatus.OPEN,
              HandlingUnitStatus.EMPTY,
            ],
          },

          parentUnitId: null,
        },

        orderBy: {
          barcode: "asc",
        },

        select: {
          id: true,
          barcode: true,
          status: true,

          items: {
            select: {
              quantity: true,
            },
          },

          childUnits: {
            where: {
              unitType:
                HandlingUnitType.BOX,
            },

            select: {
              id: true,
            },
          },
        },
      }),

      prisma.handlingUnit.findMany({
        where: {
          unitType:
            HandlingUnitType.BOX,

          parentUnitId: null,

          status: {
            in: [
              HandlingUnitStatus.OPEN,
              HandlingUnitStatus.CLOSED,
              HandlingUnitStatus.EMPTY,
            ],
          },
        },

        orderBy: {
          barcode: "asc",
        },

        select: {
          id: true,
          barcode: true,
          status: true,

          items: {
            select: {
              quantity: true,
            },
          },
        },
      }),

      prisma.handlingUnit.findMany({
        where: {
          unitType:
            HandlingUnitType.BOX,

          parentUnitId: {
            not: null,
          },
        },

        orderBy: [
          {
            parentUnit: {
              barcode: "asc",
            },
          },
          {
            barcode: "asc",
          },
        ],

        select: {
          id: true,
          barcode: true,
          status: true,

          items: {
            select: {
              quantity: true,
            },
          },

          parentUnit: {
            select: {
              id: true,
              barcode: true,
              status: true,
            },
          },

          warehouse: {
            select: {
              code: true,
              name: true,
            },
          },

          location: {
            select: {
              code: true,
              section: true,
              level: true,
              bin: true,
            },
          },
        },
      }),
    ]);

  const palletOptions =
    pallets.map((pallet) => ({
      id: pallet.id,
      barcode: pallet.barcode,

      status:
        getStatusLabel(
          pallet.status
        ),

      linkedBoxCount:
        pallet.childUnits.length,

      totalQuantity:
        pallet.items.reduce(
          (total, item) =>
            total + item.quantity,
          0
        ),
    }));

  const boxOptions =
    freeBoxes.map((box) => ({
      id: box.id,
      barcode: box.barcode,

      status:
        getStatusLabel(box.status),

      totalQuantity:
        box.items.reduce(
          (total, item) =>
            total + item.quantity,
          0
        ),
    }));

  const linkedBoxStock =
    linkedBoxes.reduce(
      (total, box) =>
        total +
        box.items.reduce(
          (itemTotal, item) =>
            itemTotal + item.quantity,
          0
        ),
      0
    );

  return (
    <section className="p-10">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold">
            Koli–Palet Bağlama
          </h1>

          <p className="mt-2 text-gray-500">
            Fiziksel kolileri paletlere
            bağlayın veya bağlı kolileri
            paletten ayırın.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/handling-units/merge"
            className="rounded-xl bg-blue-900 px-5 py-3 font-semibold text-white hover:bg-blue-800"
          >
            Toplu Birleştirme
          </Link>

          <Link
            href="/admin/handling-units"
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold hover:bg-slate-50"
          >
            ← Koli / Palet Listesine Dön
          </Link>
        </div>
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-3">
        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase text-gray-500">
            Kullanılabilir Palet
          </p>

          <p className="mt-3 text-4xl font-bold text-blue-900">
            {pallets.length}
          </p>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase text-gray-500">
            Bağımsız Koli
          </p>

          <p className="mt-3 text-4xl font-bold text-green-700">
            {freeBoxes.length}
          </p>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase text-gray-500">
            Bağlı Koli Stoğu
          </p>

          <p className="mt-3 text-4xl font-bold text-violet-700">
            {linkedBoxStock.toLocaleString(
              "tr-TR"
            )}
          </p>
        </article>
      </div>

      <div className="mx-auto mt-8 max-w-6xl">
        <PalletBoxLinkForm
          pallets={palletOptions}
          boxes={boxOptions}
        />
      </div>

      <div className="mx-auto mt-8 max-w-6xl overflow-x-auto rounded-2xl bg-white shadow">
        <table className="w-full min-w-[1200px] text-left">
          <thead className="bg-blue-900 text-white">
            <tr>
              <th className="p-4">
                Palet
              </th>

              <th className="p-4">
                Koli
              </th>

              <th className="p-4">
                Koli Durumu
              </th>

              <th className="p-4">
                Koli Stoğu
              </th>

              <th className="p-4">
                Depo
              </th>

              <th className="p-4">
                Lokasyon
              </th>

              <th className="p-4">
                İşlem
              </th>
            </tr>
          </thead>

          <tbody>
            {linkedBoxes.map((box) => {
              const boxQuantity =
                box.items.reduce(
                  (total, item) =>
                    total +
                    item.quantity,
                  0
                );

              const fullLocationCode =
                box.location
                  ? [
                      box.location.code,
                      box.location.section,
                      box.location.level,
                      box.location.bin,
                    ]
                      .filter(Boolean)
                      .join("-")
                  : "-";

              return (
                <tr
                  key={box.id}
                  className="border-b hover:bg-slate-50"
                >
                  <td className="p-4">
                    <Link
                      href={`/admin/handling-units/${box.parentUnit?.id}`}
                      className="font-mono font-bold text-blue-900 hover:underline"
                    >
                      {box.parentUnit
                        ?.barcode ?? "-"}
                    </Link>
                  </td>

                  <td className="p-4">
                    <Link
                      href={`/admin/handling-units/${box.id}`}
                      className="font-mono font-bold text-cyan-700 hover:underline"
                    >
                      {box.barcode}
                    </Link>
                  </td>

                  <td className="p-4 font-semibold">
                    {getStatusLabel(
                      box.status
                    )}
                  </td>

                  <td className="p-4 text-xl font-bold">
                    {boxQuantity.toLocaleString(
                      "tr-TR"
                    )}
                  </td>

                  <td className="p-4">
                    {box.warehouse
                      ? `${box.warehouse.code} — ${box.warehouse.name}`
                      : "-"}
                  </td>

                  <td className="p-4 font-mono font-semibold">
                    {fullLocationCode}
                  </td>

                  <td className="p-4">
                    <form
                      action={unlinkBoxFromPallet.bind(
                        null,
                        box.id
                      )}
                    >
                      <button
                        type="submit"
                        className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700"
                      >
                        Paletten Ayır
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}

            {linkedBoxes.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="p-12 text-center text-gray-500"
                >
                  Henüz bir palete bağlı koli
                  bulunmuyor.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}