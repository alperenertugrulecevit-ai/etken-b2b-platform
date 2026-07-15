import Link from "next/link";

import {
  HandlingUnitStatus,
  HandlingUnitType,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

import HandlingUnitAddressForm from "@/components/admin/HandlingUnitAddressForm";

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

export default async function HandlingUnitAddressingPage() {
  const [
    handlingUnits,
    warehouses,
    locations,
  ] = await Promise.all([
    prisma.handlingUnit.findMany({
      where: {
        status: {
          not:
            HandlingUnitStatus.CANCELLED,
        },

        parentUnitId: null,
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

      warehouseName:
        unit.warehouse?.name ?? "",

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
          (unitTotal, childUnit) =>
            unitTotal +
            childUnit.items.reduce(
              (itemTotal, item) =>
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
            Koli / Palet Adresleme
          </h1>

          <p className="mt-2 text-gray-500">
            Koli ve paletleri depo
            lokasyonlarına yerleştirin veya
            mevcut adreslerini değiştirin.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/handling-units/pallet-link"
            className="rounded-xl bg-blue-900 px-5 py-3 font-semibold text-white hover:bg-blue-800"
          >
            Koli–Palet Bağlama
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
        <HandlingUnitAddressForm
          handlingUnits={
            handlingUnitOptions
          }
          warehouses={warehouses}
          locations={locationOptions}
        />
      </div>

      <div className="mx-auto mt-8 max-w-6xl rounded-2xl border border-blue-200 bg-blue-50 p-6 text-blue-900">
        <h2 className="text-xl font-bold">
          Adresleme Kuralları
        </h2>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <p>
            Yalnızca aktif depo ve
            lokasyonlara adresleme yapılır.
          </p>

          <p>
            Palet adreslenirse bağlı koliler
            aynı adrese taşınır.
          </p>

          <p>
            Palete bağlı koli tek başına
            adreslenemez.
          </p>

          <p>
            Taşıma biriminin ürün miktarı
            adresleme sırasında değişmez.
          </p>

          <p>
            Başka adrese gönderilen taşıma
            biriminin eski adresi güncellenir.
          </p>

          <p>
            Aynı lokasyona tekrar adresleme
            yapılmasına izin verilmez.
          </p>
        </div>
      </div>
    </section>
  );
}