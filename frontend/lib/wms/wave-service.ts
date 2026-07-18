import {
  Prisma,
  UserStatus,
  WaveAssignmentStatus,
  WavePriority,
  WaveStatus,
  WaveType,
  WmsOperationType,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { generateNextWaveNo } from "@/lib/wms/generate-next-wave-no";

export type CreateWaveOrderData = {
  orderNumber: string;
  customerCode?: string | null;
  customerName?: string | null;
  storeCode?: string | null;
  storeName?: string | null;
  lineCount?: number;
  plannedQuantity?: number;
};

export type CreateWaveData = {
  name?: string | null;
  type?: WaveType;
  priority?: WavePriority;
  plannedStartAt?: Date | null;
  plannedFinishAt?: Date | null;
  notes?: string | null;
  createdBy?: string | null;
  orders?: CreateWaveOrderData[];
};

export type AssignUserToWaveInput = {
  waveId: string;
  userId: string;
  assignedById?: string | null;
  operationType?: WmsOperationType | null;
};

export type UpdateWaveProgressInput = {
  waveId: string;
  pickingProgress?: number;
  transferProgress?: number;
  consolidationProgress?: number;
  packingProgress?: number;
  shippingProgress?: number;
  completedOrderCount?: number;
  completedLineCount?: number;
  completedQuantity?: number;
};

function clampProgress(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeOptionalText(
  value: string | null | undefined
): string | null {
  const normalizedValue = value?.trim();

  return normalizedValue ? normalizedValue : null;
}

export async function createWave(data: CreateWaveData) {
  const incomingOrders = data.orders ?? [];

  const normalizedOrders = incomingOrders.map((order) => ({
    orderNumber: order.orderNumber.trim(),
    customerCode: normalizeOptionalText(order.customerCode),
    customerName: normalizeOptionalText(order.customerName),
    storeCode: normalizeOptionalText(order.storeCode),
    storeName: normalizeOptionalText(order.storeName),
    lineCount: Math.max(0, order.lineCount ?? 0),
    plannedQuantity: Math.max(
      0,
      order.plannedQuantity ?? 0
    ),
  }));

  const emptyOrderNumberExists = normalizedOrders.some(
    (order) => order.orderNumber.length === 0
  );

  if (emptyOrderNumberExists) {
    throw new Error(
      "Wave'e eklenecek siparişlerin sipariş numarası zorunludur."
    );
  }

  const uniqueOrderNumbers = new Set(
    normalizedOrders.map((order) => order.orderNumber)
  );

  if (uniqueOrderNumbers.size !== normalizedOrders.length) {
    throw new Error(
      "Wave içinde yinelenen sipariş numarası bulunuyor."
    );
  }

  return prisma.$transaction(async (transaction) => {
    const waveNo = await generateNextWaveNo(transaction);

    const orderNumbers = normalizedOrders.map(
      (order) => order.orderNumber
    );

    const databaseOrders =
      orderNumbers.length > 0
        ? await transaction.order.findMany({
            where: {
              orderNumber: {
                in: orderNumbers,
              },
            },
            select: {
              id: true,
              orderNumber: true,
            },
          })
        : [];

    const databaseOrderMap = new Map(
      databaseOrders.map((order) => [
        order.orderNumber,
        order,
      ])
    );

    const missingOrderNumbers = orderNumbers.filter(
      (orderNumber) => !databaseOrderMap.has(orderNumber)
    );

    if (missingOrderNumbers.length > 0) {
      throw new Error(
        `Aşağıdaki siparişler sistemde bulunamadı: ${missingOrderNumbers.join(
          ", "
        )}`
      );
    }

    const waveOrders: Prisma.WaveOrderCreateWithoutWaveInput[] =
      normalizedOrders.map((order) => {
        const databaseOrder = databaseOrderMap.get(
          order.orderNumber
        );

        if (!databaseOrder) {
          throw new Error(
            `${order.orderNumber} numaralı sipariş bulunamadı.`
          );
        }

        return {
          order: {
            connect: {
              id: databaseOrder.id,
            },
          },
          orderNumber: order.orderNumber,
          customerCode: order.customerCode,
          customerName: order.customerName,
          storeCode: order.storeCode,
          storeName: order.storeName,
          lineCount: order.lineCount,
          plannedQuantity: order.plannedQuantity,
        };
      });

    return transaction.wave.create({
      data: {
        waveNo,
        name: normalizeOptionalText(data.name),
        type: data.type ?? WaveType.MIXED,
        priority: data.priority ?? WavePriority.NORMAL,
        status: WaveStatus.DRAFT,
        plannedStartAt: data.plannedStartAt ?? null,
        plannedFinishAt: data.plannedFinishAt ?? null,
        notes: normalizeOptionalText(data.notes),
        createdBy: normalizeOptionalText(data.createdBy),

        plannedOrderCount: waveOrders.length,

        plannedLineCount: normalizedOrders.reduce(
          (total, order) => total + order.lineCount,
          0
        ),

        plannedQuantity: normalizedOrders.reduce(
          (total, order) =>
            total + order.plannedQuantity,
          0
        ),

        orders: {
          create: waveOrders,
        },
      },

      include: {
        orders: {
          include: {
            order: true,
          },
        },
        assignments: {
          include: {
            user: {
              include: {
                employee: true,
              },
            },
            assignedBy: {
              include: {
                employee: true,
              },
            },
          },
        },
      },
    });
  });
}

export async function changeWaveStatus(
  waveId: string,
  nextStatus: WaveStatus,
  updatedBy?: string | null
) {
  const wave = await prisma.wave.findUnique({
    where: {
      id: waveId,
    },
  });

  if (!wave) {
    throw new Error("Wave bulunamadı.");
  }

  const allowedTransitions: Record<
    WaveStatus,
    WaveStatus[]
  > = {
    [WaveStatus.DRAFT]: [
      WaveStatus.READY,
      WaveStatus.CANCELLED,
    ],

    [WaveStatus.READY]: [
      WaveStatus.RELEASED,
      WaveStatus.DRAFT,
      WaveStatus.CANCELLED,
    ],

    [WaveStatus.RELEASED]: [
      WaveStatus.IN_PROGRESS,
      WaveStatus.PAUSED,
      WaveStatus.CANCELLED,
    ],

    [WaveStatus.IN_PROGRESS]: [
      WaveStatus.PAUSED,
      WaveStatus.COMPLETED,
      WaveStatus.CANCELLED,
    ],

    [WaveStatus.PAUSED]: [
      WaveStatus.IN_PROGRESS,
      WaveStatus.CANCELLED,
    ],

    [WaveStatus.COMPLETED]: [],

    [WaveStatus.CANCELLED]: [],
  };

  if (
    !allowedTransitions[wave.status].includes(nextStatus)
  ) {
    throw new Error(
      `${wave.status} durumundan ${nextStatus} durumuna geçiş yapılamaz.`
    );
  }

  const now = new Date();

  const updateData: Prisma.WaveUpdateInput = {
    status: nextStatus,
    updatedBy: normalizeOptionalText(updatedBy),
  };

  if (nextStatus === WaveStatus.RELEASED) {
    updateData.releasedAt = now;
  }

  if (nextStatus === WaveStatus.IN_PROGRESS) {
    updateData.startedAt = wave.startedAt ?? now;
    updateData.pausedAt = null;
  }

  if (nextStatus === WaveStatus.PAUSED) {
    updateData.pausedAt = now;
  }

  if (nextStatus === WaveStatus.COMPLETED) {
    updateData.completedAt = now;
    updateData.pickingProgress = 100;
    updateData.transferProgress = 100;
    updateData.consolidationProgress = 100;
    updateData.packingProgress = 100;
    updateData.shippingProgress = 100;
  }

  if (nextStatus === WaveStatus.CANCELLED) {
    updateData.cancelledAt = now;
  }

  return prisma.wave.update({
    where: {
      id: waveId,
    },
    data: updateData,
  });
}

export async function assignUserToWave(
  input: AssignUserToWaveInput
) {
  const [wave, user] = await Promise.all([
    prisma.wave.findUnique({
      where: {
        id: input.waveId,
      },
      select: {
        id: true,
        status: true,
      },
    }),

    prisma.user.findUnique({
      where: {
        id: input.userId,
      },
      select: {
        id: true,
        status: true,
        isRfUser: true,
        employee: {
          select: {
            isActive: true,
          },
        },
      },
    }),
  ]);

  if (!wave) {
    throw new Error("Wave bulunamadı.");
  }

  if (
    wave.status === WaveStatus.COMPLETED ||
    wave.status === WaveStatus.CANCELLED
  ) {
    throw new Error(
      "Tamamlanmış veya iptal edilmiş wave'e kullanıcı atanamaz."
    );
  }

  if (!user) {
    throw new Error("Atanacak kullanıcı bulunamadı.");
  }

  if (user.status !== UserStatus.ACTIVE) {
    throw new Error(
      "Yalnızca aktif kullanıcılar wave'e atanabilir."
    );
  }

  if (
    user.employee &&
    user.employee.isActive === false
  ) {
    throw new Error(
      "Personel kaydı pasif olan kullanıcı wave'e atanamaz."
    );
  }

  if (input.assignedById) {
    const assignedByUser = await prisma.user.findUnique({
      where: {
        id: input.assignedById,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!assignedByUser) {
      throw new Error(
        "Atamayı gerçekleştiren kullanıcı bulunamadı."
      );
    }

    if (assignedByUser.status !== UserStatus.ACTIVE) {
      throw new Error(
        "Pasif bir kullanıcı wave ataması gerçekleştiremez."
      );
    }
  }

  const existingAssignment =
    await prisma.waveAssignment.findFirst({
      where: {
        waveId: input.waveId,
        userId: input.userId,
        operationType: input.operationType ?? null,
      },
      select: {
        id: true,
        status: true,
      },
    });

  if (existingAssignment) {
    throw new Error(
      "Bu kullanıcı aynı operasyon tipi için wave'e zaten atanmış."
    );
  }

  return prisma.waveAssignment.create({
    data: {
      waveId: input.waveId,
      userId: input.userId,
      assignedById: input.assignedById ?? null,
      operationType: input.operationType ?? null,
      status: WaveAssignmentStatus.ASSIGNED,
    },

    include: {
      wave: {
        select: {
          id: true,
          waveNo: true,
          name: true,
          status: true,
        },
      },

      user: {
        select: {
          id: true,
          username: true,
          userType: true,
          status: true,
          isRfUser: true,

          employee: {
            select: {
              id: true,
              employeeCode: true,
              firstName: true,
              lastName: true,
              department: true,
              title: true,
              shiftCode: true,
            },
          },
        },
      },

      assignedBy: {
        select: {
          id: true,
          username: true,

          employee: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    },
  });
}

/**
 * Eski fonksiyon adını kullanan ekranlar geçici olarak hata vermesin diye
 * aynı fonksiyonu alias olarak dışa aktarıyoruz.
 *
 * Eski çağrıların input alanları yine userId kullanmalıdır.
 */
export const assignOperatorToWave = assignUserToWave;

export async function updateWaveProgress(
  input: UpdateWaveProgressInput
) {
  const wave = await prisma.wave.findUnique({
    where: {
      id: input.waveId,
    },
    select: {
      id: true,
      status: true,
      plannedOrderCount: true,
      plannedLineCount: true,
      plannedQuantity: true,
    },
  });

  if (!wave) {
    throw new Error("Wave bulunamadı.");
  }

  if (wave.status === WaveStatus.CANCELLED) {
    throw new Error(
      "İptal edilmiş wave'in ilerleme bilgisi güncellenemez."
    );
  }

  const completedOrderCount =
    input.completedOrderCount !== undefined
      ? Math.min(
          wave.plannedOrderCount,
          Math.max(0, input.completedOrderCount)
        )
      : undefined;

  const completedLineCount =
    input.completedLineCount !== undefined
      ? Math.min(
          wave.plannedLineCount,
          Math.max(0, input.completedLineCount)
        )
      : undefined;

  const completedQuantity =
    input.completedQuantity !== undefined
      ? Math.min(
          wave.plannedQuantity,
          Math.max(0, input.completedQuantity)
        )
      : undefined;

  return prisma.wave.update({
    where: {
      id: input.waveId,
    },

    data: {
      ...(input.pickingProgress !== undefined
        ? {
            pickingProgress: clampProgress(
              input.pickingProgress
            ),
          }
        : {}),

      ...(input.transferProgress !== undefined
        ? {
            transferProgress: clampProgress(
              input.transferProgress
            ),
          }
        : {}),

      ...(input.consolidationProgress !== undefined
        ? {
            consolidationProgress: clampProgress(
              input.consolidationProgress
            ),
          }
        : {}),

      ...(input.packingProgress !== undefined
        ? {
            packingProgress: clampProgress(
              input.packingProgress
            ),
          }
        : {}),

      ...(input.shippingProgress !== undefined
        ? {
            shippingProgress: clampProgress(
              input.shippingProgress
            ),
          }
        : {}),

      ...(completedOrderCount !== undefined
        ? {
            completedOrderCount,
          }
        : {}),

      ...(completedLineCount !== undefined
        ? {
            completedLineCount,
          }
        : {}),

      ...(completedQuantity !== undefined
        ? {
            completedQuantity,
          }
        : {}),
    },
  });
}