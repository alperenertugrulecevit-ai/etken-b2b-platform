import Link from "next/link";

import {
  HandlingUnitStatus,
  HandlingUnitType,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

import RFFullHandlingUnitTransferForm from "@/components/rf/RFFullHandlingUnitTransferForm";

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

export default async function RFFullTransferPage() {
  const handlingUnits =
    await prisma.handlingUnit.findMany({
      where: {
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
        unitType: true,
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

        childUnits: {
          select: {
            id: true,
          },
        },

        items: {
          select: {
            quantity: true,
            reservedStock: true,
          },
        },
      },
    });

  const unitOptions =
    handlingUnits.map((unit) => ({
      id: unit.id,
      barcode: unit.barcode,

      unitType:
        unit.unitType ===
        HandlingUnitType.PALLET
          ? "Palet"
          : "Koli",

      status:
        getStatusLabel(
          unit.status
        ),

      warehouseCode:
        unit.warehouse?.code ?? "",

      locationCode:
        unit.location
          ? createFullLocationCode({
              code:
                unit.location.code,

              section:
                unit.location.section,

              level:
                unit.location.level,

              bin:
                unit.location.bin,
            })
          : "",

      totalQuantity:
        unit.items.reduce(
          (total, item) =>
            total + item.quantity,
          0
        ),

      reservedQuantity:
        unit.items.reduce(
          (total, item) =>
            total +
            item.reservedStock,
          0
        ),

      productCount:
        unit.items.length,

      childUnitCount:
        unit.childUnits.length,
    }));

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
            RF Operasyonu
          </p>

          <h1 className="mt-1 text-2xl font-black">
            Komple THM Transferi
          </h1>
        </div>

        <Link
          href="/rf"
          className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-bold shadow-sm"
        >
          ← Menü
        </Link>
      </div>

      <RFFullHandlingUnitTransferForm
        handlingUnits={unitOptions}
      />

      <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-900">
        <p className="font-black">
          Komple Transfer
        </p>

        <p className="mt-2 text-sm leading-6">
          Kaynak koli veya paletteki bütün
          ürünler hedef taşıma birimine
          aktarılır. Hedefte aynı ürün varsa
          miktarlar otomatik birleştirilir.
        </p>
      </div>
    </section>
  );
}