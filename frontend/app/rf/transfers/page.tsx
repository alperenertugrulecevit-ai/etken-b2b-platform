import Link from "next/link";

import {
  HandlingUnitStatus,
  HandlingUnitType,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

import RFHandlingUnitTransferForm from "@/components/rf/RFHandlingUnitTransferForm";

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

export default async function RFTransferPage() {
  const handlingUnits =
    await prisma.handlingUnit.findMany({
      where: {
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
                isActive: true,
              },
            },
          },
        },
      },
    });

  const unitOptions =
    handlingUnits.map((unit) => ({
      id: unit.id,
      barcode: unit.barcode,

      unitType:
        getUnitTypeLabel(
          unit.unitType
        ),

      status:
        getStatusLabel(
          unit.status
        ),

      warehouseCode:
        unit.warehouse?.code ?? "",

      locationCode:
        unit.location
          ? createFullLocationCode({
              code: unit.location.code,
              section:
                unit.location.section,
              level:
                unit.location.level,
              bin: unit.location.bin,
            })
          : "",

      totalQuantity:
        unit.items.reduce(
          (total, item) =>
            total + item.quantity,
          0
        ),

      products: unit.items.map(
        (item) => ({
          itemId: item.id,
          productId:
            item.product.id,
          code: item.product.code,
          barcode:
            item.product.barcode,
          name: item.product.name,
          quantity: item.quantity,
          reservedStock:
            item.reservedStock,
          availableQuantity:
            item.quantity -
            item.reservedStock,
          isActive:
            item.product.isActive,
        })
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
            THM Ürün Transferi
          </h1>
        </div>

        <Link
          href="/rf"
          className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-bold shadow-sm"
        >
          ← Menü
        </Link>
      </div>

      <RFHandlingUnitTransferForm
        handlingUnits={unitOptions}
      />
    </section>
  );
}