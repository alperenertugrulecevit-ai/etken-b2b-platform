import Link from "next/link";

import {
  HandlingUnitStatus,
  HandlingUnitType,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

import RFHandlingUnitAddressForm from "@/components/rf/RFHandlingUnitAddressForm";

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

export default async function RFAddressingPage() {
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
        section: true,
        level: true,
        bin: true,
        locationType: true,

        warehouse: {
          select: {
            code: true,
          },
        },
      },
    }),

    prisma.handlingUnit.findMany({
      where: {
        parentUnitId: null,

        status: {
          notIn: [
            HandlingUnitStatus.CANCELLED,
            HandlingUnitStatus.IN_TRANSIT,
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
          select: {
            quantity: true,
          },
        },

        childUnits: {
          select: {
            id: true,

            items: {
              select: {
                quantity: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const locationOptions =
    locations.map((location) => ({
      id: location.id,

      warehouseId:
        location.warehouseId,

      warehouseCode:
        location.warehouse.code,

      fullCode:
        createFullLocationCode({
          code: location.code,
          section: location.section,
          level: location.level,
          bin: location.bin,
        }),

      locationType:
        getLocationTypeLabel(
          location.locationType
        ),
    }));

  const handlingUnitOptions =
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

      directStockQuantity:
        unit.items.reduce(
          (total, item) =>
            total + item.quantity,
          0
        ),

      childStockQuantity:
        unit.childUnits.reduce(
          (
            childTotal,
            childUnit
          ) =>
            childTotal +
            childUnit.items.reduce(
              (
                itemTotal,
                item
              ) =>
                itemTotal +
                item.quantity,
              0
            ),
          0
        ),

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
            THM Adresleme
          </h1>
        </div>

        <Link
          href="/rf"
          className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-bold shadow-sm"
        >
          ← Menü
        </Link>
      </div>

      <RFHandlingUnitAddressForm
        warehouses={warehouses}
        locations={locationOptions}
        handlingUnits={
          handlingUnitOptions
        }
      />

      <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-900">
        <p className="font-black">
          Seri Adresleme
        </p>

        <p className="mt-2 text-sm leading-6">
          Başarılı işlemden sonra depo ve
          lokasyon ekranda kalır. Aynı adrese
          yerleştirilecek sıradaki koli veya
          paleti doğrudan okutabilirsiniz.
        </p>
      </div>
    </section>
  );
}