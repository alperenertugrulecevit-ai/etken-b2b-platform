import Link from "next/link";

import {
  HandlingUnitStatus,
  PurchaseOrderStatus,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

import RFReceivingForm from "@/components/rf/RFReceivingForm";

function getPurchaseOrderStatusLabel(
  status: string
) {
  const labels: Record<string, string> = {
    DRAFT: "Taslak",
    PENDING: "Bekliyor",
    APPROVED: "Onaylandı",
    PARTIALLY_RECEIVED:
      "Kısmi Mal Kabul",
    RECEIVED: "Mal Kabul Tamamlandı",
    CANCELLED: "İptal",
  };

  return labels[status] ?? status;
}

function getHandlingUnitStatusLabel(
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

export default async function RFReceivingPage() {
  const [
    purchaseOrders,
    handlingUnits,
  ] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where: {
        status: {
          in: [
            PurchaseOrderStatus.APPROVED,
            PurchaseOrderStatus.PARTIALLY_RECEIVED,
          ],
        },
      },

      orderBy: [
        {
          expectedDate: "asc",
        },
        {
          purchaseNumber: "asc",
        },
      ],

      select: {
        id: true,
        purchaseNumber: true,
        status: true,
        expectedDate: true,

        supplier: {
          select: {
            name: true,
          },
        },

        items: {
          orderBy: {
            productCode: "asc",
          },

          select: {
            id: true,
            productId: true,
            productCode: true,
            productName: true,
            orderedQuantity: true,
            receivedQuantity: true,

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
    }),

    prisma.handlingUnit.findMany({
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
          select: {
            quantity: true,
          },
        },
      },
    }),
  ]);

  const purchaseOrderOptions =
    purchaseOrders.map(
      (purchaseOrder) => ({
        id: purchaseOrder.id,

        purchaseNumber:
          purchaseOrder.purchaseNumber,

        status:
          getPurchaseOrderStatusLabel(
            purchaseOrder.status
          ),

        supplierName:
          purchaseOrder.supplier.name,

        expectedDate:
          purchaseOrder.expectedDate
            ? purchaseOrder.expectedDate.toISOString()
            : null,

        items:
          purchaseOrder.items.map(
            (item) => ({
              id: item.id,

              productId:
                item.productId,

              productCode:
                item.productCode,

              productBarcode:
                item.product.barcode,

              productName:
                item.productName,

              orderedQuantity:
                item.orderedQuantity,

              receivedQuantity:
                item.receivedQuantity,

              remainingQuantity:
                Math.max(
                  0,
                  item.orderedQuantity -
                    item.receivedQuantity
                ),

              isActive:
                item.product.isActive,
            })
          ),
      })
    );

  const handlingUnitOptions =
    handlingUnits.map((unit) => {
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
          unit.unitType === "PALLET"
            ? "Palet"
            : "Koli",

        status:
          getHandlingUnitStatusLabel(
            unit.status
          ),

        warehouseCode:
          unit.warehouse?.code ?? "",

        locationCode,

        totalQuantity:
          unit.items.reduce(
            (total, item) =>
              total + item.quantity,
            0
          ),
      };
    });

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
            RF Operasyonu
          </p>

          <h1 className="mt-1 text-2xl font-black">
            Mal Kabul
          </h1>
        </div>

        <Link
          href="/rf"
          className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-bold shadow-sm"
        >
          ← Menü
        </Link>
      </div>

      <RFReceivingForm
        purchaseOrders={
          purchaseOrderOptions
        }
        handlingUnits={
          handlingUnitOptions
        }
      />

      <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-900">
        <p className="font-black">
          Seri Mal Kabul
        </p>

        <p className="mt-2 text-sm leading-6">
          Başarılı işlemden sonra satın alma
          siparişi ve hedef koli/palet ekranda
          kalır. Sıradaki ürünü doğrudan
          okutabilirsiniz.
        </p>
      </div>
    </section>
  );
}