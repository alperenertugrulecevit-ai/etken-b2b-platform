import Link from "next/link";

import {
  HandlingUnitStatus,
  HandlingUnitType,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

import RFPalletBoxLinkForm from "@/components/rf/RFPalletBoxLinkForm";

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

export default async function RFPalletLinkPage() {
  const [pallets, boxes] =
    await Promise.all([
      prisma.handlingUnit.findMany({
        where: {
          unitType:
            HandlingUnitType.PALLET,

          parentUnitId: null,

          status: {
            in: [
              HandlingUnitStatus.OPEN,
              HandlingUnitStatus.EMPTY,
              HandlingUnitStatus.STORED,
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
              HandlingUnitStatus.STORED,
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

      warehouseCode:
        pallet.warehouse?.code ?? "",

      locationCode:
        pallet.location
          ? createFullLocationCode({
              code:
                pallet.location.code,

              section:
                pallet.location.section,

              level:
                pallet.location.level,

              bin:
                pallet.location.bin,
            })
          : "",

      linkedBoxCount:
        pallet.childUnits.length,

      directStockQuantity:
        pallet.items.reduce(
          (total, item) =>
            total + item.quantity,
          0
        ),
    }));

  const boxOptions =
    boxes.map((box) => ({
      id: box.id,
      barcode: box.barcode,

      status:
        getStatusLabel(
          box.status
        ),

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
            Koli–Palet Bağlama
          </h1>
        </div>

        <Link
          href="/rf"
          className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-bold shadow-sm"
        >
          ← Menü
        </Link>
      </div>

      <RFPalletBoxLinkForm
        pallets={palletOptions}
        boxes={boxOptions}
      />

      <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-900">
        <p className="font-black">
          Seri Koli Bağlama
        </p>

        <p className="mt-2 text-sm leading-6">
          Başarılı işlemden sonra palet
          barkodu ekranda kalır. Aynı palete
          bağlanacak sıradaki koliyi doğrudan
          okutabilirsiniz.
        </p>
      </div>

      <div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-orange-900">
        <p className="font-black">
          Adresli Palet
        </p>

        <p className="mt-2 text-sm leading-6">
          Adreslenmiş palete bağlanan koli,
          otomatik olarak paletin depo ve
          lokasyon bilgilerini alır.
        </p>
      </div>
    </section>
  );
}