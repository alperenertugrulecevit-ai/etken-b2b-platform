import Link from "next/link";

import {
  HandlingUnitStatus,
  HandlingUnitType,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

import HandlingUnitProductTransferForm from "@/components/admin/HandlingUnitProductTransferForm";

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

export default async function HandlingUnitTransfersPage() {
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

  const handlingUnitOptions =
    handlingUnits.map((unit) => {
      const totalQuantity =
        unit.items.reduce(
          (total, item) =>
            total + item.quantity,
          0
        );

      const reservedQuantity =
        unit.items.reduce(
          (total, item) =>
            total +
            item.reservedStock,
          0
        );

      const locationCode =
        unit.location
          ? [
              unit.location.code,
              unit.location.section,
              unit.location.level,
              unit.location.bin,
            ]
              .filter(Boolean)
              .join("-")
          : "";

      return {
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

        locationCode,

        totalQuantity,
        reservedQuantity,

        products: unit.items.map(
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

            availableQuantity:
              item.quantity -
              item.reservedStock,

            isActive:
              item.product.isActive,
          })
        ),
      };
    });

  return (
    <section className="p-10">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold">
            Koli / Palet Ürün Transferi
          </h1>

          <p className="mt-2 text-gray-500">
            Kaynak koli veya paleti
            seçtiğinizde yalnızca o taşıma
            biriminde bulunan ürünler
            listelenir.
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

      <div className="mx-auto mt-8 max-w-6xl">
        <HandlingUnitProductTransferForm
          handlingUnits={
            handlingUnitOptions
          }
        />
      </div>

      <div className="mx-auto mt-8 max-w-6xl rounded-2xl border border-blue-200 bg-blue-50 p-6 text-blue-900">
        <h2 className="text-xl font-bold">
          Transfer Kuralları
        </h2>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <p>
            Kaynak Açık veya Adreslendi
            durumunda olabilir.
          </p>

          <p>
            Hedef Açık, Boş veya Adreslendi
            durumunda olabilir.
          </p>

          <p>
            Ürün seçimi yalnızca kaynak
            taşıma biriminin içeriğinden
            yapılır.
          </p>

          <p>
            Rezerve edilmiş miktar transfer
            edilemez.
          </p>

          <p>
            Kaynak ve hedefin depo/lokasyon
            bilgileri değişmez.
          </p>

          <p>
            Kaynak tamamen boşalırsa durumu
            Boş yapılır.
          </p>

          <p>
            Adresli boş hedefe ürün gelirse
            durumu tekrar Adreslendi olur.
          </p>

          <p>
            Transfer toplam fiziksel stoğu
            değiştirmez.
          </p>
        </div>
      </div>
    </section>
  );
}