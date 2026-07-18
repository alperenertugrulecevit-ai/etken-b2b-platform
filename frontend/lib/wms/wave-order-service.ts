import {
  OrderStatus,
  Prisma,
  WaveStatus,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

const EDITABLE_WAVE_STATUSES: WaveStatus[] = [
  WaveStatus.DRAFT,
  WaveStatus.READY,
];

const ACTIVE_WAVE_STATUSES: WaveStatus[] = [
  WaveStatus.DRAFT,
  WaveStatus.READY,
  WaveStatus.RELEASED,
  WaveStatus.IN_PROGRESS,
  WaveStatus.PAUSED,
];

const ELIGIBLE_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.APPROVED,
];

export type WaveOrderPoolItem = {
  id: number;
  orderNumber: string;
  status: OrderStatus;
  orderDate: Date;
  requestedDate: Date | null;

  customerCode: string;
  customerName: string;

  lineCount: number;
  plannedQuantity: number;
  totalAmount: number;
};

export type AssignedWaveOrderItem = {
  waveOrderId: string;
  orderId: number;
  orderNumber: string;

  customerCode: string | null;
  customerName: string | null;

  lineCount: number;
  plannedQuantity: number;
  completedQuantity: number;

  isCompleted: boolean;
  createdAt: Date;
};

type TransactionClient = Prisma.TransactionClient;

function normalizeSearch(search?: string) {
  return search?.trim() || "";
}

async function assertWaveEditable(
  tx: TransactionClient,
  waveId: string
) {
  const wave = await tx.wave.findUnique({
    where: {
      id: waveId,
    },

    select: {
      id: true,
      waveNo: true,
      status: true,
    },
  });

  if (!wave) {
    throw new Error("Wave kaydı bulunamadı.");
  }

  if (!EDITABLE_WAVE_STATUSES.includes(wave.status)) {
    throw new Error(
      `${wave.waveNo} numaralı Wave, ${wave.status} durumundayken siparişleri değiştirilemez.`
    );
  }

  return wave;
}

async function recalculateWaveKpis(
  tx: TransactionClient,
  waveId: string
) {
  const waveOrders = await tx.waveOrder.findMany({
    where: {
      waveId,
    },

    select: {
      lineCount: true,
      plannedQuantity: true,
      completedQuantity: true,
      isCompleted: true,
    },
  });

  const plannedOrderCount = waveOrders.length;

  const plannedLineCount = waveOrders.reduce(
    (total, waveOrder) =>
      total + waveOrder.lineCount,
    0
  );

  const plannedQuantity = waveOrders.reduce(
    (total, waveOrder) =>
      total + waveOrder.plannedQuantity,
    0
  );

  const completedOrders = waveOrders.filter(
    (waveOrder) => waveOrder.isCompleted
  );

  const completedOrderCount =
    completedOrders.length;

  const completedLineCount =
    completedOrders.reduce(
      (total, waveOrder) =>
        total + waveOrder.lineCount,
      0
    );

  const completedQuantity = waveOrders.reduce(
    (total, waveOrder) =>
      total + waveOrder.completedQuantity,
    0
  );

  const pickingProgress =
    plannedQuantity > 0
      ? Math.min(
          100,
          Math.round(
            (completedQuantity /
              plannedQuantity) *
              100
          )
        )
      : 0;

  await tx.wave.update({
    where: {
      id: waveId,
    },

    data: {
      plannedOrderCount,
      plannedLineCount,
      plannedQuantity,

      completedOrderCount,
      completedLineCount,
      completedQuantity,

      pickingProgress,
    },
  });
}

export async function getWaveOrderManagementData(
  waveId: string,
  search?: string
) {
  const normalizedSearch =
    normalizeSearch(search);

  const wave = await prisma.wave.findUnique({
    where: {
      id: waveId,
    },

    select: {
      id: true,
      waveNo: true,
      name: true,
      status: true,
      priority: true,
      type: true,

      plannedOrderCount: true,
      plannedLineCount: true,
      plannedQuantity: true,

      completedOrderCount: true,
      completedQuantity: true,

      orders: {
        orderBy: {
          createdAt: "desc",
        },

        select: {
          id: true,
          orderId: true,
          orderNumber: true,

          customerCode: true,
          customerName: true,

          lineCount: true,
          plannedQuantity: true,
          completedQuantity: true,

          isCompleted: true,
          createdAt: true,
        },
      },
    },
  });

  if (!wave) {
    return null;
  }

  const availableOrders =
    await prisma.order.findMany({
      where: {
        status: {
          in: ELIGIBLE_ORDER_STATUSES,
        },

        waveOrders: {
          none: {
            wave: {
              status: {
                in: ACTIVE_WAVE_STATUSES,
              },
            },
          },
        },

        ...(normalizedSearch
          ? {
              OR: [
                {
                  orderNumber: {
                    contains: normalizedSearch,
                    mode: "insensitive",
                  },
                },

                {
                  customer: {
                    customerCode: {
                      contains:
                        normalizedSearch,
                      mode: "insensitive",
                    },
                  },
                },

                {
                  customer: {
                    companyName: {
                      contains:
                        normalizedSearch,
                      mode: "insensitive",
                    },
                  },
                },
              ],
            }
          : {}),
      },

      orderBy: [
        {
          requestedDate: "asc",
        },
        {
          orderDate: "asc",
        },
      ],

      take: 100,

      select: {
        id: true,
        orderNumber: true,
        status: true,
        orderDate: true,
        requestedDate: true,
        totalAmount: true,

        customer: {
          select: {
            customerCode: true,
            companyName: true,
          },
        },

        items: {
          select: {
            quantity: true,
          },
        },

        _count: {
          select: {
            items: true,
          },
        },
      },
    });

  const orderPool: WaveOrderPoolItem[] =
    availableOrders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      orderDate: order.orderDate,
      requestedDate: order.requestedDate,

      customerCode:
        order.customer.customerCode,

      customerName:
        order.customer.companyName,

      lineCount: order._count.items,

      plannedQuantity: order.items.reduce(
        (total, item) =>
          total + item.quantity,
        0
      ),

      totalAmount: order.totalAmount,
    }));

  const assignedOrders: AssignedWaveOrderItem[] =
    wave.orders.map((waveOrder) => ({
      waveOrderId: waveOrder.id,
      orderId: waveOrder.orderId,
      orderNumber: waveOrder.orderNumber,

      customerCode:
        waveOrder.customerCode,

      customerName:
        waveOrder.customerName,

      lineCount: waveOrder.lineCount,
      plannedQuantity:
        waveOrder.plannedQuantity,

      completedQuantity:
        waveOrder.completedQuantity,

      isCompleted:
        waveOrder.isCompleted,

      createdAt: waveOrder.createdAt,
    }));

  return {
    wave: {
      id: wave.id,
      waveNo: wave.waveNo,
      name: wave.name,
      status: wave.status,
      priority: wave.priority,
      type: wave.type,

      plannedOrderCount:
        wave.plannedOrderCount,

      plannedLineCount:
        wave.plannedLineCount,

      plannedQuantity:
        wave.plannedQuantity,

      completedOrderCount:
        wave.completedOrderCount,

      completedQuantity:
        wave.completedQuantity,
    },

    orderPool,
    assignedOrders,
  };
}

export async function addOrdersToWave(
  waveId: string,
  orderIds: number[]
) {
  const uniqueOrderIds = [
    ...new Set(
      orderIds.filter(
        (orderId) =>
          Number.isInteger(orderId) &&
          orderId > 0
      )
    ),
  ];

  if (uniqueOrderIds.length === 0) {
    throw new Error(
      "Wave’e eklenecek en az bir sipariş seçmelisiniz."
    );
  }

  return prisma.$transaction(async (tx) => {
    await assertWaveEditable(tx, waveId);

    const eligibleOrders =
      await tx.order.findMany({
        where: {
          id: {
            in: uniqueOrderIds,
          },

          status: {
            in: ELIGIBLE_ORDER_STATUSES,
          },

          waveOrders: {
            none: {
              wave: {
                status: {
                  in: ACTIVE_WAVE_STATUSES,
                },
              },
            },
          },
        },

        select: {
          id: true,
          orderNumber: true,

          customer: {
            select: {
              customerCode: true,
              companyName: true,
            },
          },

          items: {
            select: {
              quantity: true,
            },
          },

          _count: {
            select: {
              items: true,
            },
          },
        },
      });

    if (
      eligibleOrders.length !==
      uniqueOrderIds.length
    ) {
      throw new Error(
        "Seçilen siparişlerden biri veya birkaçı Wave’e uygun değil, başka aktif bir Wave’e bağlı ya da durumu APPROVED değil."
      );
    }

    await tx.waveOrder.createMany({
      data: eligibleOrders.map((order) => ({
        waveId,
        orderId: order.id,

        orderNumber: order.orderNumber,

        customerCode:
          order.customer.customerCode,

        customerName:
          order.customer.companyName,

        lineCount: order._count.items,

        plannedQuantity:
          order.items.reduce(
            (total, item) =>
              total + item.quantity,
            0
          ),

        completedQuantity: 0,
        isCompleted: false,
      })),
    });

    await recalculateWaveKpis(tx, waveId);

    return {
      addedOrderCount:
        eligibleOrders.length,
    };
  });
}

export async function removeOrdersFromWave(
  waveId: string,
  waveOrderIds: string[]
) {
  const uniqueWaveOrderIds = [
    ...new Set(
      waveOrderIds
        .map((value) => value.trim())
        .filter(Boolean)
    ),
  ];

  if (uniqueWaveOrderIds.length === 0) {
    throw new Error(
      "Wave’den çıkarılacak en az bir sipariş seçmelisiniz."
    );
  }

  return prisma.$transaction(async (tx) => {
    await assertWaveEditable(tx, waveId);

    const selectedWaveOrders =
      await tx.waveOrder.findMany({
        where: {
          id: {
            in: uniqueWaveOrderIds,
          },

          waveId,
        },

        select: {
          id: true,
          isCompleted: true,
          completedQuantity: true,
        },
      });

    if (
      selectedWaveOrders.length !==
      uniqueWaveOrderIds.length
    ) {
      throw new Error(
        "Seçilen Wave siparişlerinden biri bulunamadı."
      );
    }

    const processedOrderExists =
      selectedWaveOrders.some(
        (waveOrder) =>
          waveOrder.isCompleted ||
          waveOrder.completedQuantity > 0
      );

    if (processedOrderExists) {
      throw new Error(
        "Toplama işlemi başlamış veya tamamlanmış sipariş Wave’den çıkarılamaz."
      );
    }

    const deleteResult =
      await tx.waveOrder.deleteMany({
        where: {
          id: {
            in: uniqueWaveOrderIds,
          },

          waveId,
        },
      });

    await recalculateWaveKpis(tx, waveId);

    return {
      removedOrderCount:
        deleteResult.count,
    };
  });
}