import {
  FulfillmentProgressStatus,
  OrderFulfillmentFlow,
  OrderStatus,
  OrderType,
  UserStatus,
  WaveStatus,
  WmsOperationType,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

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
};

export class OrderGroupingService {
  static async getScreenData(filters: OrderGroupingFilter = {}) {
    const search = filters.search?.trim() ?? "";

    const [orders, warehouses, pickers] = await Promise.all([
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
          items: { select: { quantity: true } },
          _count: { select: { items: true } },
        },
      }),
      prisma.warehouse.findMany({
        where: { isActive: true, code: { not: "KYP001" } },
        orderBy: { code: "asc" },
        select: { id: true, code: true, name: true },
      }),
      prisma.user.findMany({
        where: {
          status: UserStatus.ACTIVE,
          isRfUser: true,
          employee: { is: { isActive: true, canUseRf: true } },
        },
        orderBy: [{ fullName: "asc" }, { username: "asc" }],
        select: {
          id: true,
          username: true,
          fullName: true,
          employee: { select: { firstName: true, lastName: true, employeeCode: true } },
        },
      }),
    ]);

    return {
      orders: orders.map((order) => ({
        ...order,
        plannedQuantity: order.items.reduce((sum, item) => sum + item.quantity, 0),
      })),
      warehouses,
      pickers,
    };
  }

  static async startDirectPicking(input: {
    orderIds: number[];
    warehouseId: number;
    pickerUserId: string;
    assignedById: string;
    assignedByName: string;
  }) {
    const orderIds = Array.from(new Set(input.orderIds));
    if (orderIds.length === 0) throw new Error("En az bir sipariş seçmelisiniz.");

    return prisma.$transaction(async (tx) => {
      const [warehouse, picker, orders] = await Promise.all([
        tx.warehouse.findFirst({
          where: { id: input.warehouseId, isActive: true, code: { not: "KYP001" } },
          select: { id: true, code: true, name: true },
        }),
        tx.user.findFirst({
          where: {
            id: input.pickerUserId,
            status: UserStatus.ACTIVE,
            isRfUser: true,
            employee: { is: { isActive: true, canUseRf: true } },
          },
          select: { id: true },
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
      if (!picker) throw new Error("Seçilen toplama personeli aktif bir RF kullanıcısı değil.");
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

      for (const order of orders) {
        const plannedQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);

        await tx.orderPickingAssignment.create({
          data: {
            orderId: order.id,
            userId: input.pickerUserId,
            warehouseId: warehouse.id,
            assignedById: input.assignedById,
            startedAt: new Date(),
          },
        });

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

      return { count: orders.length, warehouseCode: warehouse.code };
    });
  }
}

export const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  ECOMMERCE: "E-Ticaret",
  STORE: "Mağaza",
  CUSTOMER: "Müşteri",
  OTHER: "Diğer",
};
