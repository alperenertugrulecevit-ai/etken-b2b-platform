import Link from "next/link";

import {
  HandlingUnitStatus,
  HandlingUnitType,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

import HandlingUnitBulkAddressForm from "@/components/admin/HandlingUnitBulkAddressForm";

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

export default async function HandlingUnitBulkAddressPage() {
  const [
    handlingUnits,
    warehouses,
    locations,
  ] = await Promise.all([
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

      orderBy: [
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
      },
    }),
  ]);

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
            childUnitTotal,
            childUnit
          ) =>
            childUnitTotal +
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

  const locationOptions =
    locations.map((location) => ({
      id: location.id,

      warehouseId:
        location.warehouseId,

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

  return (
    <section className="p-10">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold">
            Toplu Koli / Palet Adresleme
          </h1>

          <p className="mt-2 text-gray-500">
            Birden fazla koli veya paleti
            aynı depo lokasyonuna toplu olarak
            yerleştirin.
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
            href="/admin/handling-units"
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold hover:bg-slate-50"
          >
            ← Koli / Palet Listesine Dön
          </Link>
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-6xl">
        <HandlingUnitBulkAddressForm
          handlingUnits={
            handlingUnitOptions
          }
          warehouses={warehouses}
          locations={locationOptions}
        />
      </div>

      <div className="mx-auto mt-8 max-w-6xl rounded-2xl border border-blue-200 bg-blue-50 p-6 text-blue-900">
        <h2 className="text-xl font-bold">
          Toplu Adresleme Kuralları
        </h2>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <p>
            Aynı işlemde en fazla 200 ana
            taşıma birimi adreslenebilir.
          </p>

          <p>
            Palet adreslendiğinde bağlı
            kolileri de aynı adrese taşınır.
          </p>

          <p>
            Palete bağlı koli tek başına
            listeye eklenemez.
          </p>

          <p>
            İptal veya transferde olan birim
            adreslenemez.
          </p>

          <p>
            Zaten hedef adreste bulunan
            birimler işlemde atlanır.
          </p>

          <p>
            Taşıma birimlerinin ürün miktarı
            değişmez.
          </p>
        </div>
      </div>
    </section>
  );
}