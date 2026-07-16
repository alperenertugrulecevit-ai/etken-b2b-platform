import Link from "next/link";

import {
  HandlingUnitStatus,
  HandlingUnitType,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

import RFPalletBoxUnlinkForm from "@/components/rf/RFPalletBoxUnlinkForm";

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

export default async function RFPalletUnlinkPage() {
  const linkedBoxes =
    await prisma.handlingUnit.findMany({
      where: {
        unitType:
          HandlingUnitType.BOX,

        parentUnitId: {
          not: null,
        },

        status: {
          notIn: [
            HandlingUnitStatus.CANCELLED,
            HandlingUnitStatus.IN_TRANSIT,
          ],
        },

        parentUnit: {
          unitType:
            HandlingUnitType.PALLET,
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

        parentUnit: {
          select: {
            id: true,
            barcode: true,
          },
        },

        warehouse: {
          select: {
            code: true,
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

        items: {
          select: {
            quantity: true,
          },
        },
      },
    });

  const linkedBoxOptions =
    linkedBoxes
      .filter(
        (box) =>
          box.parentUnit !== null
      )
      .map((box) => ({
        id: box.id,
        barcode: box.barcode,

        status:
          getStatusLabel(
            box.status
          ),

        palletId:
          box.parentUnit!.id,

        palletBarcode:
          box.parentUnit!.barcode,

        warehouseCode:
          box.warehouse?.code ?? "",

        locationCode:
          box.location
            ? createFullLocationCode({
                code:
                  box.location.code,

                section:
                  box.location.section,

                level:
                  box.location.level,

                bin:
                  box.location.bin,
              })
            : "",

        totalQuantity:
          box.items.reduce(
            (total, item) =>
              total + item.quantity,
            0
          ),
      }));

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
            RF Operasyonu
          </p>

          <h1 className="mt-1 text-2xl font-black">
            Koliyi Paletten Ayır
          </h1>
        </div>

        <Link
          href="/rf"
          className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-bold shadow-sm"
        >
          ← Menü
        </Link>
      </div>

      <RFPalletBoxUnlinkForm
        linkedBoxes={
          linkedBoxOptions
        }
      />

      <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-900">
        <p className="font-black">
          Seri Ayırma
        </p>

        <p className="mt-2 text-sm leading-6">
          İşlem tamamlandıktan sonra koli
          alanı otomatik temizlenir. Sıradaki
          bağlı koliyi doğrudan
          okutabilirsiniz.
        </p>
      </div>
    </section>
  );
}