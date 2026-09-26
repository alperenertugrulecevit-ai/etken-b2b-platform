import Link from "next/link";
import { redirect } from "next/navigation";

import {
  HandlingUnitPurpose,
  HandlingUnitStatus,
  OrderStatus,
  ShippingHandlingUnitStatus,
  WaveStatus,
} from "@prisma/client";

import { ZonePickTaskStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

import RFPickingForm from "@/components/rf/RFPickingForm";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
import { claimZoneTaskById } from "@/app/rf/zone-picking/actions";

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

export default async function RFPickingPage({ searchParams }: { searchParams: Promise<{ zoneTaskId?: string }> }) {
  const currentUser = await AuthorizationService.requireRfAccess("PICKING_EXECUTE");
  const query = await searchParams;
  const zoneTaskId = String(query.zoneTaskId ?? "").trim();
  const requestedZoneTask = zoneTaskId ? await prisma.zonePickTask.findFirst({
    where: { id: zoneTaskId, claimedByUserId: currentUser.id },
    include: {
      zone: true,
      order: { select: { id: true, orderNumber: true } },
      warehouse: { select: { id: true, code: true } },
      lines: { orderBy: { sequence: "asc" }, include: { handlingUnitItem: { select: { handlingUnitId: true } } } },
    },
  }) : null;
  if (zoneTaskId && !requestedZoneTask) throw new Error("Zone görevi bulunamadı veya bu kullanıcıya ait değil.");
  if (requestedZoneTask?.status === ZonePickTaskStatus.COMPLETED) redirect("/rf/picking");
  if (requestedZoneTask && ![ZonePickTaskStatus.CLAIMED, ZonePickTaskStatus.IN_PROGRESS].includes(requestedZoneTask.status)) {
    redirect("/rf/picking");
  }
  const zoneTask = requestedZoneTask;
  const activeTaskLines = zoneTask ? zoneTask.lines.filter(line => line.pickedQuantity < line.plannedQuantity) : [];
  const plannedSourceUnitIds = Array.from(new Set(activeTaskLines.map(line => line.handlingUnitItem.handlingUnitId)));
  const plannedSourceItemIds = new Set(activeTaskLines.map(line => line.handlingUnitItemId));
  const plannedRemainingBySourceItem = new Map<number, number>();
  for (const line of activeTaskLines) {
    plannedRemainingBySourceItem.set(
      line.handlingUnitItemId,
      (plannedRemainingBySourceItem.get(line.handlingUnitItemId) ?? 0) + Math.max(0, line.plannedQuantity - line.pickedQuantity),
    );
  }
  const taskLineByOrderItem = new Map<number, { planned: number; picked: number; remaining: number; sequence: number }>();
  for (const line of activeTaskLines) {
    const current = taskLineByOrderItem.get(line.orderItemId);
    const remaining = Math.max(0, line.plannedQuantity - line.pickedQuantity);
    taskLineByOrderItem.set(line.orderItemId, {
      planned: (current?.planned ?? 0) + line.plannedQuantity,
      picked: (current?.picked ?? 0) + Math.min(line.pickedQuantity, line.plannedQuantity),
      remaining: (current?.remaining ?? 0) + remaining,
      sequence: Math.min(current?.sequence ?? Number.MAX_SAFE_INTEGER, line.sequence),
    });
  }

  const [
    orders,
    sourceUnits,
    targetUnits,
    openTasks,
  ] = await Promise.all([
    prisma.order.findMany({
      where: {
        ...(zoneTask ? { id: zoneTask.orderId } : {}),
        status: {
          in: [
            OrderStatus.APPROVED,
            OrderStatus.PREPARING,
            OrderStatus.PICKING,
          ],
        },

        stockReserved: true,
        stockDeducted: false,
        ...(zoneTask ? {} : { OR: [
          { pickingAssignment: { is: { userId: currentUser.id, completedAt: null, cancelledAt: null } } },
          { waveOrders: { some: { wave: { assignments: { some: { userId: currentUser.id, operationType: "PICKING", status: { in: ["ASSIGNED", "ACTIVE", "WAITING"] } } } } } } },
        ] }),
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

        waveOrders: {
          where: {
            isCompleted: false,

            wave: {
              status: {
                in: [
                  WaveStatus.READY,
                  WaveStatus.RELEASED,
                  WaveStatus.IN_PROGRESS,
                  WaveStatus.PAUSED,
                ],
              },
            },
          },

          orderBy: {
            createdAt: "desc",
          },

          take: 1,

          select: {
            waveId: true,

            wave: {
              select: {
                waveNo: true,
                status: true,
              },
            },
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
        ...(zoneTask ? { id: { in: plannedSourceUnitIds } } : {}),
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
          code: { not: "KYP001" },
        },

        location: {
          isActive: true,
          ...(zoneTask ? { zoneId: zoneTask.zoneId } : {}),
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
            zoneId: true,
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
     * Wave akışı için Toplama THM'leri,
     * doğrudan sipariş akışı için Sevk THM'leri.
     * Form seçilen siparişin akışına göre
     * uygun hedefleri ayrıca filtreler.
     */
    prisma.handlingUnit.findMany({
      where: {
        purpose: {
          in: [
            HandlingUnitPurpose.PICKING,
            HandlingUnitPurpose.SHIPPING,
          ],
        },

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
        purpose: true,
        status: true,
        assignedOrderId: true,
        assignedWaveId: true,

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

        assignedWave: {
          select: {
            waveNo: true,
          },
        },

        shippingProfile: {
          select: {
            status: true,
            packageSequence: true,
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
    prisma.zonePickTask.findMany({
      where: {
        OR: [
          { status: ZonePickTaskStatus.OPEN, claimedByUserId: null },
          {
            status: { in: [ZonePickTaskStatus.CLAIMED, ZonePickTaskStatus.IN_PROGRESS] },
            claimedByUserId: currentUser.id,
          },
        ],
        order: { status: { in: [OrderStatus.APPROVED, OrderStatus.PREPARING, OrderStatus.PICKING] }, stockReserved: true, stockDeducted: false },
      },
      select: {
        id: true,
        plannedLineCount: true,
        plannedQuantity: true,
        createdAt: true,
        warehouse: { select: { code: true, name: true } },
        zone: { select: { code: true, name: true, pickSequence: true } },
        order: { select: { orderNumber: true, customer: { select: { customerCode: true, companyName: true } } } },
        wave: { select: { waveNo: true } },
      },
      orderBy: [{ createdAt: "asc" }],
    })
  ]);

  const orderOptions = orders
    .map((order) => {
      const activeWaveOrder =
        order.waveOrders[0] ?? null;

      const isWaveFlow =
        activeWaveOrder !== null;

      const isFlowPickable =
        !activeWaveOrder ||
        activeWaveOrder.wave.status ===
          WaveStatus.RELEASED ||
        activeWaveOrder.wave.status ===
          WaveStatus.IN_PROGRESS;

      const items =
        order.items
          .filter(item => !zoneTask || taskLineByOrderItem.has(item.id))
          .sort((a, b) => zoneTask
            ? (taskLineByOrderItem.get(a.id)?.sequence ?? 0) - (taskLineByOrderItem.get(b.id)?.sequence ?? 0)
            : a.id - b.id)
          .map((item) => {
            const taskPlan = taskLineByOrderItem.get(item.id);
            const taskRemaining = taskPlan?.remaining ?? Math.max(0, item.quantity - item.pickedQuantity);
            const taskPlanned = zoneTask ? (taskPlan?.planned ?? taskRemaining) : item.quantity;
            return ({
          id: item.id,
          productId:
            item.productId,

          productCode:
            item.productCode,

          productBarcode:
            item.product.barcode,

          productName:
            item.productName,

          orderedQuantity: taskPlanned,
          pickedQuantity: zoneTask ? (taskPlan?.picked ?? 0) : item.pickedQuantity,
          remainingQuantity: taskRemaining,
          isActive: item.product.isActive,
        });
          });

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

        flowType:
          isWaveFlow
            ? ("WAVE" as const)
            : ("DIRECT_ORDER" as const),

        waveId:
          activeWaveOrder?.waveId ??
          null,

        waveNo:
          activeWaveOrder?.wave
            .waveNo ?? null,

        isFlowPickable,

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
        order.remainingQuantity > 0 &&
        order.isFlowPickable
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
          unit.items
            .filter(item => !zoneTask || plannedSourceItemIds.has(item.id))
            .map(
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
                  item.quantity - item.reservedStock + (zoneTask ? (plannedRemainingBySourceItem.get(item.id) ?? 0) : 0)
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

      purpose:
        unit.purpose ===
        HandlingUnitPurpose.SHIPPING
          ? ("SHIPPING" as const)
          : ("PICKING" as const),

      assignedOrderId:
        unit.assignedOrderId,

      assignedWaveId:
        unit.assignedWaveId,

      assignedOrderNumber:
        unit.assignedOrder
          ?.orderNumber ?? "",

      assignedCustomerName:
        unit.assignedOrder
          ?.customer.companyName ?? "",

      assignedWaveNo:
        unit.assignedWave
          ?.waveNo ?? "",

      shippingStatus:
        unit.shippingProfile
          ?.status ?? null,

      packageSequence:
        unit.shippingProfile
          ?.packageSequence ?? null,

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
    }))
    .filter(
      (unit) =>
        unit.purpose !==
          HandlingUnitPurpose.SHIPPING ||
        unit.shippingStatus === null ||
        unit.shippingStatus ===
          ShippingHandlingUnitStatus.OPEN
    );

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
            RF Operasyonu
          </p>

          <h1 className="mt-1 text-2xl font-black">
            {zoneTask ? `${zoneTask.zone.code} · ${zoneTask.zone.name} Toplama` : "Sipariş Toplama"}
          </h1>
        </div>

        <Link
          href="/rf"
          className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-bold shadow-sm"
        >
          ← Menü
        </Link>
      </div>

      {!zoneTask && openTasks.length > 0 && (
        <div className="mb-5 rounded-2xl border border-blue-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div><h2 className="text-lg font-black">Bekleyen Siparişler</h2><p className="mt-1 text-sm text-slate-600">Toplamak istediğiniz siparişi seçin. Görev size atanıp toplama ekranı açılır.</p></div>
            <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-black text-blue-900">{openTasks.length} görev</span>
          </div>
          <div className="mt-3 grid gap-2">
            {openTasks.map((task) => (
              <form key={task.id} action={claimZoneTaskById} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
                <input type="hidden" name="taskId" value={task.id} />
                <div>
                  <div className="font-black">{task.order.orderNumber} · {task.order.customer.companyName}</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">{task.warehouse.code} · {task.zone.code} {task.zone.name} · {task.plannedLineCount} kalem · {task.plannedQuantity} adet{task.wave ? ` · Wave ${task.wave.waveNo}` : " · Sipariş Bazlı"}</div>
                </div>
                <button className="shrink-0 rounded-xl bg-blue-900 px-4 py-3 font-black text-white">SEÇ</button>
              </form>
            ))}
          </div>
        </div>
      )}

      {zoneTask && <div className="mb-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-950"><b>Aktif Zone Görevi:</b> {zoneTask.zone.code} · {zoneTask.zone.name} · {zoneTask.order.orderNumber}. Yalnızca bu Zone içindeki kaynak lokasyonlardan toplama yapılabilir.</div>}

      <RFPickingForm
        orders={orderOptions}
        sourceUnits={
          sourceUnitOptions
        }
        targetUnits={
          targetUnitOptions
        }
        lockedOrderNumber={zoneTask?.order.orderNumber}
        zoneTaskId={zoneTask?.id}
      />

      <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-900">
        <p className="font-black">
          Güvenli Toplama Kuralı
        </p>

        <p className="mt-2 text-sm leading-6">
          Kaynak olarak yalnızca aktif
          lokasyona adreslenmiş planlanabilir
          stok THM’leri kullanılabilir. Hedef
          olarak Wave siparişlerinde ilgili
          Wave’e ait Toplama THM, doğrudan
          siparişlerde ise açık durumdaki Sevk
          THM kullanılır. Bir Sevk THM dolduğunda
          formdaki değiştir düğmesiyle yeni koliye
          geçilebilir.
        </p>
      </div>
    </section>
  );
}
