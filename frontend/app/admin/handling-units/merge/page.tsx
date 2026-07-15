import Link from "next/link";

import {
  HandlingUnitStatus,
  HandlingUnitType,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

import HandlingUnitBulkMergeForm from "@/components/admin/HandlingUnitBulkMergeForm";

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

export default async function HandlingUnitMergePage() {
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

        items: {
          select: {
            quantity: true,
            reservedStock: true,
          },
        },

        childUnits: {
          select: {
            id: true,
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
    }));

  return (
    <section className="p-10">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold">
            Toplu Koli / Palet Birleştirme
          </h1>

          <p className="mt-2 text-gray-500">
            Açık veya adreslenmiş taşıma
            birimlerinin ürün içeriklerini tek
            hedef koli veya palette
            birleştirin.
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
            href="/admin/handling-units"
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold hover:bg-slate-50"
          >
            ← Koli / Palet Listesine Dön
          </Link>
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-6xl">
        <HandlingUnitBulkMergeForm
          handlingUnits={
            handlingUnitOptions
          }
        />
      </div>

      <div className="mx-auto mt-8 max-w-6xl rounded-2xl border border-blue-200 bg-blue-50 p-6 text-blue-900">
        <h2 className="text-xl font-bold">
          Birleştirme Kuralları
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
            Rezerve stok bulunan kaynak
            birleştirilemez.
          </p>

          <p>
            Bağlı alt birimi bulunan kaynak
            birleştirilemez.
          </p>

          <p>
            Kaynaklardaki aynı ürünler hedefte
            tek satırda toplanır.
          </p>

          <p>
            İşlem sonunda kaynakların durumu
            Boş yapılır.
          </p>

          <p>
            Kaynakların mevcut depo ve
            lokasyon bilgileri korunur.
          </p>

          <p>
            Adresli boş hedefe stok gelirse
            durumu tekrar Adreslendi olur.
          </p>

          <p>
            Fiziksel toplam stok miktarı
            değişmez.
          </p>

          <p>
            İşlem tek transaction içinde
            tamamlanır.
          </p>
        </div>
      </div>
    </section>
  );
}