import Link from "next/link";

import {
  HandlingUnitStatus,
  HandlingUnitType,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

import HandlingUnitFullTransferForm from "@/components/admin/HandlingUnitFullTransferForm";

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

export default async function HandlingUnitFullTransferPage() {
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

        childUnits: {
          select: {
            id: true,
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

      childUnitCount:
        unit.childUnits.length,

      products:
        unit.items.map(
          (item) => ({
            itemId: item.id,

            productId:
              item.product.id,

            code:
              item.product.code,

            barcode:
              item.product.barcode,

            name:
              item.product.name,

            quantity:
              item.quantity,

            reservedStock:
              item.reservedStock,
          })
        ),
    }));

  return (
    <section className="p-10">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold">
            Komple THM Transferi
          </h1>

          <p className="mt-2 text-gray-500">
            Bir koli veya palette bulunan
            bütün ürünleri tek işlemle başka
            koli ya da palete aktarın.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/handling-units/transfers"
            className="rounded-xl bg-blue-900 px-5 py-3 font-semibold text-white hover:bg-blue-800"
          >
            Tekli Ürün Transferi
          </Link>

          <Link
            href="/admin/handling-units/merge"
            className="rounded-xl bg-violet-800 px-5 py-3 font-semibold text-white hover:bg-violet-700"
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

      <div className="mx-auto mt-8 max-w-7xl">
        <HandlingUnitFullTransferForm
          handlingUnits={
            handlingUnitOptions
          }
        />
      </div>

      <div className="mx-auto mt-8 max-w-7xl rounded-2xl border border-blue-200 bg-blue-50 p-6 text-blue-900">
        <h2 className="text-xl font-bold">
          Komple Transfer Kuralları
        </h2>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <p>
            Kaynaktaki tüm ürün çeşitleri ve
            miktarlar hedefe aktarılır.
          </p>

          <p>
            Hedefte aynı ürün varsa miktarlar
            tek satırda birleştirilir.
          </p>

          <p>
            Kaynak işlem sonunda Boş durumuna
            geçer.
          </p>

          <p>
            Kaynağın depo ve lokasyon adresi
            korunur.
          </p>

          <p>
            Hedef adresliyse Adreslendi,
            adressizse Açık olur.
          </p>

          <p>
            Rezerve stok bulunan kaynak
            komple transfer edilemez.
          </p>

          <p>
            Bağlı alt kolisi bulunan palet
            kaynak olarak kullanılamaz.
          </p>

          <p>
            Global fiziksel ürün stoğu
            değişmez.
          </p>
        </div>
      </div>
    </section>
  );
}