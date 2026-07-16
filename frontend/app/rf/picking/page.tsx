import Link from "next/link";

import {
  HandlingUnitPurpose,
  HandlingUnitStatus,
  OrderStatus,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

import RFPickingForm from "@/components/rf/RFPickingForm";

function getOrderStatusLabel(
  status: string
) {
  const labels: Record<string, string> = {
    DRAFT: "Taslak",
    PENDING: "Bekliyor",
    APPROVED: "Onaylandı",
    PREPARING: "Hazırlanıyor",
    PICKING: "Toplanıyor",
    PACKING: "Paketleniyor",
    READY_TO_SHIP: "Sevke Hazır",
    SHIPPED: "Sevk Edildi",
    DELIVERED: "Teslim Edildi",
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

function getHandlingUnitTypeLabel(
  unitType: string
) {
  return unitType === "PALLET"
    ? "Palet"
    : "Koli";
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

export default async function RFPickingPage() {
  const [
    orders,
    sourceUnits,
    targetUnits,
  ] = await Promise.all([
    prisma.order.findMany({
      where: {
        status: {
          in: [
            OrderStatus.APPROVED,
            OrderStatus.PREPARING,
            OrderStatus.PICKING,
          ],
        },

        stockReserved: true,
        stockDeducted: false,
      },

      orderBy: [
        {
          requestedDate: "asc",
        },
        {
          orderDate: "asc",
        },
        {
          orderNumber: "asc",
        },
      ],

      select: {
        id: true,
        orderNumber: true,
        status: true,
        orderDate: true,
        requestedDate: true,

        customer: {
          select: {
            customerCode: true,
            companyName: true,
          },
        },

        items: {
          orderBy: {
            id: "asc",
          },

          select: {
            id: true,
            productId: true,
            productCode: true,
            productName: true,
            quantity: true,
            pickedQuantity: true,

            product: {
              select: {
                barcode: true,
                isActive: true,
              },
            },
          },
        },
      },
    }),

    /*
     * Yalnızca planlanabilir kaynak stoklar.
     */
    prisma.handlingUnit.findMany({
      where: {
        purpose:
          HandlingUnitPurpose.STOCK,

        assignedOrderId: null,

        warehouseId: {
          not: null,
        },

        locationId: {
          not: null,
        },

        warehouse: {
          isActive: true,
        },

        location: {
          isActive: true,
        },

        status: {
          in: [
            HandlingUnitStatus.OPEN,
            HandlingUnitStatus.CLOSED,
            HandlingUnitStatus.STORED,
          ],
        },

        items: {
          some: {
            quantity: {
              gt: 0,
            },
          },
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
            sortOrder: "asc",
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
            id: true,
            code: true,
            name: true,
          },
        },

        location: {
          select: {
            id: true,
            code: true,
            section: true,
            level: true,
            bin: true,
            sortOrder: true,
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
            productId: true,
            quantity: true,
            reservedStock: true,

            product: {
              select: {
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

    /*
     * Yalnızca toplama amacıyla oluşturulan
     * ve bağımsız olan hedef THM'ler.
     *
     * Form seçili siparişe göre ayrıca filtreler.
     */
    prisma.handlingUnit.findMany({
      where: {
        purpose:
          HandlingUnitPurpose.PICKING,

        parentUnitId: null,

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
        assignedOrderId: true,

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

  const orderOptions = orders
    .map((order) => {
      const items =
        order.items.map((item) => ({
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
            item.quantity,

          pickedQuantity:
            item.pickedQuantity,

          remainingQuantity:
            Math.max(
              0,
              item.quantity -
                item.pickedQuantity
            ),

          isActive:
            item.product.isActive,
        }));

      const totalQuantity =
        items.reduce(
          (total, item) =>
            total +
            item.orderedQuantity,
          0
        );

      const pickedQuantity =
        items.reduce(
          (total, item) =>
            total +
            Math.min(
              item.pickedQuantity,
              item.orderedQuantity
            ),
          0
        );

      return {
        id: order.id,
        orderNumber:
          order.orderNumber,

        status:
          getOrderStatusLabel(
            order.status
          ),

        customerCode:
          order.customer.customerCode,

        customerName:
          order.customer.companyName,

        orderDate:
          order.orderDate.toISOString(),

        requestedDate:
          order.requestedDate
            ? order.requestedDate.toISOString()
            : null,

        totalQuantity,
        pickedQuantity,

        remainingQuantity:
          Math.max(
            0,
            totalQuantity -
              pickedQuantity
          ),

        items,
      };
    })
    .filter(
      (order) =>
        order.remainingQuantity > 0
    );

  const sourceUnitOptions =
    sourceUnits
      .filter(
        (unit) =>
          unit.warehouse !== null &&
          unit.location !== null
      )
      .map((unit) => ({
        id: unit.id,
        barcode: unit.barcode,

        unitType:
          getHandlingUnitTypeLabel(
            unit.unitType
          ),

        status:
          getHandlingUnitStatusLabel(
            unit.status
          ),

        warehouseCode:
          unit.warehouse!.code,

        warehouseName:
          unit.warehouse!.name,

        locationId:
          unit.location!.id,

        locationCode:
          createFullLocationCode({
            code:
              unit.location!.code,

            section:
              unit.location!.section,

            level:
              unit.location!.level,

            bin:
              unit.location!.bin,
          }),

        locationSortOrder:
          unit.location!.sortOrder,

        totalQuantity:
          unit.items.reduce(
            (total, item) =>
              total + item.quantity,
            0
          ),

        products:
          unit.items.map(
            (item) => ({
              itemId: item.id,
              productId:
                item.productId,

              productCode:
                item.product.code,

              productBarcode:
                item.product.barcode,

              productName:
                item.product.name,

              quantity:
                item.quantity,

              reservedStock:
                item.reservedStock,

              availableQuantity:
                Math.max(
                  0,
                  item.quantity -
                    item.reservedStock
                ),

              isActive:
                item.product.isActive,
            })
          ),
      }));

  const targetUnitOptions =
    targetUnits.map((unit) => ({
      id: unit.id,
      barcode: unit.barcode,

      unitType:
        getHandlingUnitTypeLabel(
          unit.unitType
        ),

      status:
        getHandlingUnitStatusLabel(
          unit.status
        ),

      assignedOrderId:
        unit.assignedOrderId,

      assignedOrderNumber:
        unit.assignedOrder
          ?.orderNumber ?? "",

      assignedCustomerName:
        unit.assignedOrder
          ?.customer.companyName ?? "",

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
    }));

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
            RF Operasyonu
          </p>

          <h1 className="mt-1 text-2xl font-black">
            Sipariş Toplama
          </h1>
        </div>

        <Link
          href="/rf"
          className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-bold shadow-sm"
        >
          ← Menü
        </Link>
      </div>

      <RFPickingForm
        orders={orderOptions}
        sourceUnits={
          sourceUnitOptions
        }
        targetUnits={
          targetUnitOptions
        }
      />

      <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-900">
        <p className="font-black">
          Güvenli Toplama Kuralı
        </p>

        <p className="mt-2 text-sm leading-6">
          Kaynak olarak yalnızca aktif
          lokasyona adreslenmiş planlanabilir
          stok THM’leri kullanılabilir. Hedef
          olarak yalnızca toplama amacıyla
          oluşturulmuş ve seçilen siparişe
          ait THM kullanılabilir.
        </p>
      </div>
    </section>
  );
}