import {
  FulfillmentProgressStatus,
  HandlingUnitPurpose,
  HandlingUnitStatus,
  OrderFulfillmentFlow,
  OrderStatus,
  OrderType,
  WaveStatus,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { ZonePickingService } from "@/lib/wms/zone-picking-service";
import { OrderPickingPreflightService } from "@/lib/wms/order-picking-preflight-service";

const ACTIVE_WAVE_STATUSES: WaveStatus[] = [
  WaveStatus.DRAFT,
  WaveStatus.READY,
  WaveStatus.RELEASED,
  WaveStatus.IN_PROGRESS,
  WaveStatus.PAUSED,
];

export type OrderGroupingFilter = {
  warehouseId?: number | null;
  orderType?: OrderType | null;
  search?: string;
  productCode?: string;
  lineCount?: number | null;
};

export class OrderGroupingService {
  static async getScreenData(filters: OrderGroupingFilter = {}) {
    const search = filters.search?.trim() ?? "";
    const productCode = filters.productCode?.trim() ?? "";

    const [orders, warehouses] = await Promise.all([
      prisma.order.findMany({
        where: {
          status: OrderStatus.APPROVED,
          pickingAssignment: null,
          waveOrders: {
            none: {
              wave: { status: { in: ACTIVE_WAVE_STATUSES } },
            },
          },
          ...(filters.warehouseId
            ? { fulfillmentWarehouseId: filters.warehouseId }
            : {}),
          ...(filters.orderType ? { orderType: filters.orderType } : {}),
          ...(productCode ? { items: { some: { productCode: { contains: productCode, mode: "insensitive" } } } } : {}),
          ...(search
            ? {
                OR: [
                  { orderNumber: { contains: search, mode: "insensitive" } },
                  { customer: { companyName: { contains: search, mode: "insensitive" } } },
                  { customer: { customerCode: { contains: search, mode: "insensitive" } } },
                ],
              }
            : {}),
        },
        orderBy: [{ requestedDate: "asc" }, { orderDate: "asc" }],
        take: 500,
        select: {
          id: true,
          orderNumber: true,
          orderType: true,
          orderDate: true,
          requestedDate: true,
          totalAmount: true,
          fulfillmentWarehouseId: true,
          fulfillmentWarehouse: { select: { id: true, code: true, name: true } },
          customer: { select: { customerCode: true, companyName: true } },
          carrier: { select: { code: true, name: true } },
          shippingAddress: { select: { city: true, district: true } },
          stockReserved: true,
          items: {
            select: {
              id: true,
              productId: true,
              productCode: true,
              productName: true,
              quantity: true,
              product: { select: { id: true, barcode: true } },
            },
            orderBy: { id: "asc" },
          },
          _count: { select: { items: true } },
        },
      }),
      prisma.warehouse.findMany({
        where: { isActive: true, code: { not: "KYP001" } },
        orderBy: { code: "asc" },
        select: { id: true, code: true, name: true },
      }),

    ]);

    const visibleOrders = orders.filter(
      (order) => !filters.lineCount || order._count.items === filters.lineCount
    );
    const productIds = Array.from(
      new Set(visibleOrders.flatMap((order) => order.items.map((item) => item.product.id)))
    );
    const warehouseIds = Array.from(
      new Set(
        visibleOrders
          .map((order) => order.fulfillmentWarehouseId)
          .filter((id): id is number => id !== null)
      )
    );

    const sourceRows =
      productIds.length > 0 && warehouseIds.length > 0
        ? await prisma.handlingUnitItem.findMany({
            where: {
              productId: { in: productIds },
              quantity: { gt: 0 },
              handlingUnit: {
                purpose: HandlingUnitPurpose.STOCK,
                assignedOrderId: null,
                assignedWaveId: null,
                warehouseId: { in: warehouseIds },
                status: {
                  in: [
                    HandlingUnitStatus.OPEN,
                    HandlingUnitStatus.CLOSED,
                    HandlingUnitStatus.STORED,
                  ],
                },
                warehouse: { isActive: true, code: { not: "KYP001" } },
                location: { is: { isActive: true } },
              },
            },
            select: {
              productId: true,
              quantity: true,
              reservedStock: true,
              handlingUnit: { select: { warehouseId: true } },
            },
          })
        : [];

    const availableByWarehouseProduct = new Map<string, number>();
    for (const row of sourceRows) {
      if (row.handlingUnit.warehouseId === null) continue;
      const key = `${row.handlingUnit.warehouseId}:${row.productId}`;
      availableByWarehouseProduct.set(
        key,
        (availableByWarehouseProduct.get(key) ?? 0) +
          Math.max(0, row.quantity - row.reservedStock)
      );
    }

    const screenOrders = visibleOrders.map((order) => {
      const warehouseId = order.fulfillmentWarehouseId;
      const items = order.items.map((item) => {
        const key = warehouseId === null ? "" : `${warehouseId}:${item.product.id}`;
        const available = key ? Math.max(0, availableByWarehouseProduct.get(key) ?? 0) : 0;
        const reservedQuantity = Math.min(item.quantity, available);
        if (key) availableByWarehouseProduct.set(key, available - reservedQuantity);
        return {
          ...item,
          reservedQuantity,
          reservationRate:
            item.quantity > 0 ? Math.round((reservedQuantity / item.quantity) * 100) : 100,
        };
      });
      const plannedQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
      const reservedQuantity = items.reduce((sum, item) => sum + item.reservedQuantity, 0);
      const reservationStatus: "FULL" | "PARTIAL" | "NONE" =
        plannedQuantity > 0 && reservedQuantity >= plannedQuantity
          ? "FULL"
          : reservedQuantity > 0
            ? "PARTIAL"
            : "NONE";

      return {
        ...order,
        items,
        plannedQuantity,
        reservedQuantity,
        reservationStatus,
      };
    });

    return { orders: screenOrders, warehouses };
  }


  static async returnUnstartedOrdersToGrouping(input: {
    orderIds: number[];
    actorId: string;
    actorName: string;
    preserveEmptyWaveAsCancelled?: boolean;
  }) {
    const orderIds = Array.from(new Set(input.orderIds));
    if (orderIds.length === 0) throw new Error("En az bir sipariş seçmelisiniz.");

    const orders = await prisma.order.findMany({
      where: { id: { in: orderIds } },
      select: {
        id: true,
        orderNumber: true,
        stockReserved: true,
        items: { select: { pickedQuantity: true, pickingShortages: { where: { status: "ACTIVE" }, select: { quantity: true } } } },
        zonePickTasks: {
          select: { lines: { select: { pickedQuantity: true } } },
        },
        waveOrders: {
          where: { wave: { status: { in: ACTIVE_WAVE_STATUSES } } },
          select: { waveId: true },
        },
      },
    });
    if (orders.length !== orderIds.length) throw new Error("Seçilen siparişlerden biri bulunamadı.");

    for (const order of orders) {
      const picked = order.items.reduce((sum, item) => sum + item.pickedQuantity, 0);
      const taskPicked = order.zonePickTasks.reduce(
        (sum, task) => sum + task.lines.reduce((lineSum, line) => lineSum + line.pickedQuantity, 0),
        0,
      );
      const shortage = order.items.reduce((sum, item) => sum + item.pickingShortages.reduce((s, row) => s + row.quantity, 0), 0);
      if (picked > 0 || taskPicked > 0 || shortage > 0) {
        throw new Error(`${order.orderNumber}: toplama veya eksik kapatma işlemi başladığı için gruplama havuzuna geri alınamaz.`);
      }
    }

    const affectedWaveIds = Array.from(new Set(orders.flatMap(order => order.waveOrders.map(row => row.waveId))));

    await prisma.$transaction(async (tx) => {
      for (const order of orders) {
        await ZonePickingService.releaseOrderPlan(tx, order.id);
        await tx.orderPickingAssignment.deleteMany({ where: { orderId: order.id } });
        await tx.orderFulfillment.deleteMany({ where: { orderId: order.id } });

        // WaveDistributionOrder.waveOrder uses onDelete: Restrict. Remove the
        // unstarted order from the distribution plan first; its distribution
        // lines are deleted by the relation cascade. The remaining Wave plan
        // is rebuilt after this transaction.
        await tx.waveDistributionOrder.deleteMany({ where: { orderId: order.id } });
        await tx.waveOrder.deleteMany({ where: { orderId: order.id } });
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.APPROVED,
            fulfillmentWarehouseId: null,
            stockReserved: order.stockReserved,
            statusHistory: {
              create: {
                status: OrderStatus.APPROVED,
                note: `Toplama başlamadan plan iptal edildi; sipariş ${input.actorName} tarafından Sipariş Gruplama havuzuna geri alındı.`,
                changedByUserId: input.actorId,
                changedByUsername: input.actorName,
                visibleToCustomer: false,
              },
            },
          },
        });
      }
    });

    for (const waveId of affectedWaveIds) {
      const remaining = await prisma.waveOrder.count({ where: { waveId } });
      if (remaining === 0) {
        if (input.preserveEmptyWaveAsCancelled) {
          await prisma.waveDistribution.deleteMany({ where: { waveId } });
          await prisma.wave.update({
            where: { id: waveId },
            data: {
              status: WaveStatus.CANCELLED,
              plannedOrderCount: 0,
              plannedLineCount: 0,
              plannedQuantity: 0,
              completedOrderCount: 0,
              completedLineCount: 0,
              completedQuantity: 0,
              pickingProgress: 0,
            },
          });
        } else {
          await prisma.wave.delete({ where: { id: waveId } });
        }
      } else {
        const { WaveDistributionService } = await import("@/modules/fulfillment/services/wave-distribution.service");
        await WaveDistributionService.createOrRefreshPlan(waveId, {
          userId: input.actorId,
          displayName: input.actorName,
        });
      }
    }

    return { count: orders.length };
  }

  static async startDirectPicking(input: {
    orderIds: number[];
    warehouseId: number;
    assignedById: string;
    assignedByName: string;
    allowPartialStock?: boolean;
  }) {
    const orderIds = Array.from(new Set(input.orderIds));
    if (orderIds.length === 0) throw new Error("En az bir sipariş seçmelisiniz.");

    return prisma.$transaction(async (tx) => {
      const [warehouse, orders] = await Promise.all([
        tx.warehouse.findFirst({
          where: { id: input.warehouseId, isActive: true, code: { not: "KYP001" } },
          select: { id: true, code: true, name: true },
        }),
        tx.order.findMany({
          where: { id: { in: orderIds } },
          select: {
            id: true,
            orderNumber: true,
            status: true,
            fulfillmentWarehouseId: true,
            items: { select: { quantity: true } },
            waveOrders: {
              where: { wave: { status: { in: ACTIVE_WAVE_STATUSES } } },
              select: { id: true },
            },
            pickingAssignment: { select: { id: true } },
          },
        }),
      ]);

      if (!warehouse) throw new Error("Seçilen depo aktif değil veya kullanılamıyor.");
      if (orders.length !== orderIds.length) throw new Error("Seçilen siparişlerden biri bulunamadı.");

      for (const order of orders) {
        if (order.status !== OrderStatus.APPROVED) {
          throw new Error(`${order.orderNumber} artık Onaylandı durumunda değil.`);
        }
        if (order.waveOrders.length > 0 || order.pickingAssignment) {
          throw new Error(`${order.orderNumber} için toplama akışı daha önce başlatılmış.`);
        }
        if (
          order.fulfillmentWarehouseId !== null &&
          order.fulfillmentWarehouseId !== warehouse.id
        ) {
          throw new Error(`${order.orderNumber} farklı bir depoya atanmış.`);
        }
      }

      const preflight = await OrderPickingPreflightService.check(tx, { orderIds, warehouseId: warehouse.id });
      if (preflight.shortages.length > 0 && !input.allowPartialStock) {
        const first = preflight.shortages[0];
        throw new Error(`${first.orderNumber}: ${first.productCode} - ${first.productName} için stok yetersiz. Gerekli: ${first.requestedQuantity}, toplanabilir: ${first.availableQuantity}, eksik: ${first.shortageQuantity}.`);
      }

      for (const order of orders) {
        // Defensive cleanup for legacy/orphan RF tasks left by a previously
        // cancelled picking plan. A freshly grouped order must start clean.
        await ZonePickingService.releaseOrderPlan(tx, order.id);

        const plannedQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);

        await tx.orderFulfillment.upsert({
          where: { orderId: order.id },
          create: {
            orderId: order.id,
            flowType: OrderFulfillmentFlow.DIRECT_ORDER,
            plannedQuantity,
            pickingStatus: FulfillmentProgressStatus.IN_PROGRESS,
            pickingStartedAt: new Date(),
          },
          update: {
            waveId: null,
            flowType: OrderFulfillmentFlow.DIRECT_ORDER,
            plannedQuantity,
            pickingStatus: FulfillmentProgressStatus.IN_PROGRESS,
            pickingStartedAt: new Date(),
          },
        });

        await tx.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.PREPARING,
            fulfillmentWarehouseId: warehouse.id,
            statusHistory: {
              create: {
                status: OrderStatus.PREPARING,
                note: `Sipariş bazlı toplama ${warehouse.code} deposunda ${input.assignedByName} tarafından başlatıldı.`,
                changedByUserId: input.assignedById,
                changedByUsername: input.assignedByName,
                visibleToCustomer: true,
              },
            },
          },
        });
      }

      const zonePlan = await ZonePickingService.buildTasksForOrders(tx, { orderIds, warehouseId: warehouse.id, allowPartialStock: input.allowPartialStock });
      if (input.allowPartialStock && preflight.shortages.length > 0) {
        await OrderPickingPreflightService.applyConfirmedShortages(tx, preflight.shortages, {
          userId: input.assignedById,
          userName: input.assignedByName,
          source: "ORDER_GROUPING_DIRECT",
        });
      }
      return { count: orders.length, warehouseCode: warehouse.code, ...zonePlan };
    });
  }
}

export const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  ECOMMERCE: "E-Ticaret",
  STORE: "Mağaza",
  CUSTOMER: "Müşteri",
  OTHER: "Diğer",
};
