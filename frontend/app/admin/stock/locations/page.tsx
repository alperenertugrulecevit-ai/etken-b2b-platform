import Link from "next/link";

import {
  HandlingUnitPurpose,
  HandlingUnitStatus,
  HandlingUnitType,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

import StockAvailabilityTable, {
  type StockAvailabilityRow,
} from "@/components/admin/StockAvailabilityTable";

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

function getUnitTypeLabel(
  unitType: HandlingUnitType
) {
  return unitType ===
    HandlingUnitType.PALLET
    ? "Palet"
    : "Koli";
}

function getBlockReason({
  purpose,
  status,
  warehouseId,
  locationId,
  warehouseActive,
  locationActive,
  assignedOrderId,
}: {
  purpose: HandlingUnitPurpose;
  status: HandlingUnitStatus;
  warehouseId: number | null;
  locationId: number | null;
  warehouseActive: boolean;
  locationActive: boolean;
  assignedOrderId: number | null;
}) {
  const reasons: string[] = [];

  if (!warehouseId) {
    reasons.push(
      "Depo bilgisi bulunmuyor"
    );
  }

  if (!locationId) {
    reasons.push(
      "THM bir lokasyona adreslenmemiş"
    );
  }

  if (!warehouseActive) {
    reasons.push(
      "Depo pasif durumda"
    );
  }

  if (!locationActive) {
    reasons.push(
      "Lokasyon pasif durumda"
    );
  }

  if (
    purpose !==
    HandlingUnitPurpose.STOCK
  ) {
    reasons.push(
      "THM normal stok amacıyla kullanılmıyor"
    );
  }

  if (assignedOrderId) {
    reasons.push(
      "THM bir satış siparişine bağlı"
    );
  }

  if (
    status ===
    HandlingUnitStatus.IN_TRANSIT
  ) {
    reasons.push(
      "THM transfer sürecinde"
    );
  }

  if (
    status ===
    HandlingUnitStatus.CANCELLED
  ) {
    reasons.push(
      "THM iptal durumda"
    );
  }

  if (
    status ===
    HandlingUnitStatus.EMPTY
  ) {
    reasons.push(
      "THM boş durumda"
    );
  }

  return reasons.join(", ");
}

export default async function LocationStockPage() {
  const items =
    await prisma.handlingUnitItem.findMany({
      where: {
        quantity: {
          gt: 0,
        },
      },

      orderBy: [
        {
          handlingUnit: {
            warehouse: {
              code: "asc",
            },
          },
        },
        {
          handlingUnit: {
            location: {
              sortOrder: "asc",
            },
          },
        },
        {
          handlingUnit: {
            barcode: "asc",
          },
        },
        {
          product: {
            code: "asc",
          },
        },
      ],

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

        handlingUnit: {
          select: {
            id: true,
            barcode: true,
            unitType: true,
            purpose: true,
            status: true,
            warehouseId: true,
            locationId: true,
            assignedOrderId: true,

            warehouse: {
              select: {
                id: true,
                code: true,
                name: true,
                isActive: true,
              },
            },

            location: {
              select: {
                id: true,
                code: true,
                section: true,
                level: true,
                bin: true,
                isActive: true,
              },
            },

            assignedOrder: {
              select: {
                orderNumber: true,

                customer: {
                  select: {
                    companyName: true,
                  },
                },
              },
            },
          },
        },
      },
    });

  const rows: StockAvailabilityRow[] =
    items.map((item) => {
      const unit =
        item.handlingUnit;

      const warehouseActive =
        unit.warehouse?.isActive ??
        false;

      const locationActive =
        unit.location?.isActive ??
        false;

      const statusIsPlannable =
        unit.status ===
          HandlingUnitStatus.STORED ||
        unit.status ===
          HandlingUnitStatus.OPEN ||
        unit.status ===
          HandlingUnitStatus.CLOSED;

      const isPlannable =
        unit.purpose ===
          HandlingUnitPurpose.STOCK &&
        unit.assignedOrderId === null &&
        unit.warehouseId !== null &&
        unit.locationId !== null &&
        warehouseActive &&
        locationActive &&
        statusIsPlannable;

      const plannableStock =
        isPlannable
          ? item.quantity
          : 0;

      const blockedStock =
        isPlannable
          ? 0
          : item.quantity;

      /*
       * Rezerve stok sadece planlanabilir
       * stoktan kullanılabilir düşülür.
       *
       * Bloke THM üzerindeki rezerve miktar
       * raporda ayrıca gösterilir fakat
       * kullanılabilir stok oluşturmaz.
       */
      const availableStock =
        isPlannable
          ? Math.max(
              0,
              plannableStock -
                item.reservedStock
            )
          : 0;

      const blockReason =
        isPlannable
          ? ""
          : getBlockReason({
              purpose:
                unit.purpose,

              status:
                unit.status,

              warehouseId:
                unit.warehouseId,

              locationId:
                unit.locationId,

              warehouseActive,

              locationActive,

              assignedOrderId:
                unit.assignedOrderId,
            });

      return {
        itemId: item.id,

        warehouseId:
          unit.warehouse?.id ??
          null,

        warehouseCode:
          unit.warehouse?.code ??
          "",

        warehouseName:
          unit.warehouse?.name ??
          "",

        locationId:
          unit.location?.id ??
          null,

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

        handlingUnitId:
          unit.id,

        handlingUnitBarcode:
          unit.barcode,

        handlingUnitType:
          getUnitTypeLabel(
            unit.unitType
          ),

        handlingUnitPurpose:
          unit.purpose,

        handlingUnitStatus:
          unit.status,

        assignedOrderNumber:
          unit.assignedOrder
            ?.orderNumber ?? "",

        assignedCustomerName:
          unit.assignedOrder
            ?.customer
            .companyName ?? "",

        productId:
          item.product.id,

        productCode:
          item.product.code,

        productBarcode:
          item.product.barcode,

        productName:
          item.product.name,

        locationStock:
          item.quantity,

        plannableStock,

        blockedStock,

        reservedStock:
          item.reservedStock,

        availableStock,

        stockClass:
          isPlannable
            ? "PLANNABLE"
            : "BLOCKED",

        blockReason,
      };
    });

  const totalPhysicalStock =
    rows.reduce(
      (total, row) =>
        total +
        row.locationStock,
      0
    );

  const totalPlannableStock =
    rows.reduce(
      (total, row) =>
        total +
        row.plannableStock,
      0
    );

  const totalBlockedStock =
    rows.reduce(
      (total, row) =>
        total +
        row.blockedStock,
      0
    );

  return (
    <section className="p-10">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold">
            Lokasyon Bazlı Stok
          </h1>

          <p className="mt-2 max-w-3xl text-gray-500">
            Stokları depo, lokasyon, THM ve
            ürün bazında inceleyin.
            Adreslenmiş normal stoklar
            planlanabilir; adreslenmemiş veya
            operasyon sürecindeki stoklar
            bloke olarak gösterilir.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/handling-units"
            className="rounded-xl bg-blue-900 px-5 py-3 font-semibold text-white hover:bg-blue-800"
          >
            Koli / Palet Yönetimi
          </Link>

          <Link
            href="/admin"
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold hover:bg-slate-50"
          >
            ← Yönetim Paneli
          </Link>
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl bg-slate-900 p-6 text-white shadow">
          <p className="text-sm font-bold uppercase text-slate-300">
            Toplam Fiziksel Stok
          </p>

          <p className="mt-3 text-4xl font-black">
            {totalPhysicalStock.toLocaleString(
              "tr-TR"
            )}
          </p>
        </article>

        <article className="rounded-2xl bg-green-700 p-6 text-white shadow">
          <p className="text-sm font-bold uppercase text-green-100">
            Planlanabilir Stok
          </p>

          <p className="mt-3 text-4xl font-black">
            {totalPlannableStock.toLocaleString(
              "tr-TR"
            )}
          </p>
        </article>

        <article className="rounded-2xl bg-red-700 p-6 text-white shadow">
          <p className="text-sm font-bold uppercase text-red-100">
            Bloke Stok
          </p>

          <p className="mt-3 text-4xl font-black">
            {totalBlockedStock.toLocaleString(
              "tr-TR"
            )}
          </p>
        </article>
      </div>

      <div className="mt-8">
        <StockAvailabilityTable
          rows={rows}
        />
      </div>

      <div className="mt-8 rounded-2xl border border-blue-200 bg-blue-50 p-6 text-blue-900">
        <h2 className="text-xl font-bold">
          Stok Sınıflandırma Kuralı
        </h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl bg-white/70 p-4">
            <p className="font-bold text-green-800">
              Planlanabilir Stok
            </p>

            <p className="mt-2 text-sm leading-6">
              Aktif depo ve aktif lokasyona
              adreslenmiş, normal stok amacı
              taşıyan ve herhangi bir satış
              siparişine bağlı olmayan
              THM’lerdeki stoktur.
            </p>
          </div>

          <div className="rounded-xl bg-white/70 p-4">
            <p className="font-bold text-red-800">
              Bloke Stok
            </p>

            <p className="mt-2 text-sm leading-6">
              Adreslenmemiş, pasif lokasyonda
              bulunan, toplama/paketleme
              amacı taşıyan, transferde olan
              veya bir siparişe bağlı
              THM’lerdeki stoktur.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}