import Link from "next/link";

import {
  HandlingUnitStatus,
  HandlingUnitType,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

import HandlingUnitUnaddressForm from "@/components/admin/HandlingUnitUnaddressForm";

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

export default async function HandlingUnitUnaddressingPage() {
  const handlingUnits =
    await prisma.handlingUnit.findMany({
      where: {
        parentUnitId: null,

        warehouseId: {
          not: null,
        },

        locationId: {
          not: null,
        },

        status: {
          notIn: [
            HandlingUnitStatus.CANCELLED,
            HandlingUnitStatus.IN_TRANSIT,
          ],
        },
      },

      orderBy: [
        {
          warehouse: {
            code: "asc",
          },
        },
        {
          location: {
            code: "asc",
          },
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
    });

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
    <section className="p-10">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold">
            Koli / Palet Adres Kaldırma
          </h1>

          <p className="mt-2 text-gray-500">
            Taşıma birimlerini mevcut depo
            lokasyonlarından çıkarın.
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
            href="/admin/handling-units/addressing/bulk"
            className="rounded-xl bg-violet-800 px-5 py-3 font-semibold text-white hover:bg-violet-700"
          >
            Toplu Adresleme
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
        <HandlingUnitUnaddressForm
          handlingUnits={
            handlingUnitOptions
          }
        />
      </div>

      <div className="mx-auto mt-8 max-w-6xl rounded-2xl border border-blue-200 bg-blue-50 p-6 text-blue-900">
        <h2 className="text-xl font-bold">
          Adres Kaldırma Kuralları
        </h2>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <p>
            Palet lokasyondan çıkarılırsa
            bağlı kolileri de çıkarılır.
          </p>

          <p>
            Palete bağlı koli tek başına
            işleme alınamaz.
          </p>

          <p>
            Ürün miktarları işlem sırasında
            değişmez.
          </p>

          <p>
            Koli–palet bağlantıları korunur.
          </p>

          <p>
            İçerikli taşıma birimleri Açık
            durumuna geçer.
          </p>

          <p>
            İçeriksiz taşıma birimleri Boş
            durumuna geçer.
          </p>
        </div>
      </div>
    </section>
  );
}