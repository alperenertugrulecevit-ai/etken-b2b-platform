import {
  Prisma,
  UserStatus,
  WaveAssignmentStatus,
  WaveStatus,
  WmsOperationType,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

const ASSIGNABLE_WAVE_STATUSES: WaveStatus[] = [
  WaveStatus.DRAFT,
  WaveStatus.READY,
  WaveStatus.RELEASED,
  WaveStatus.IN_PROGRESS,
  WaveStatus.PAUSED,
];

const BUSY_ASSIGNMENT_STATUSES: WaveAssignmentStatus[] = [
  WaveAssignmentStatus.ASSIGNED,
  WaveAssignmentStatus.ACTIVE,
  WaveAssignmentStatus.WAITING,
];

type TransactionClient = Prisma.TransactionClient;

export type CreateWaveAssignmentInput = {
  waveId: string;

  /**
   * Yeni yapıda Wave ataması doğrudan User kaydı üzerinden yapılır.
   */
  userId?: string;

  /**
   * Login sistemi tamamlanınca atamayı yapan kullanıcının kimliği
   * buraya gönderilecektir.
   */
  assignedById?: string;

  operationType?: WmsOperationType;

  /**
   * Eski ekran geçici olarak çalışmaya devam edebilsin diye tutuluyor.
   * Yeni ekran tamamlandığında kaldırılacaktır.
   */
  operatorName?: string;

  /**
   * Terminal artık WaveAssignment kaydına bağlanmaz.
   * Eski formdan gelirse dikkate alınmaz.
   */
  terminalCode?: string;
};

function normalizeText(value?: string | null): string {
  return value?.trim() || "";
}

function buildOperatorName(user: {
  username: string;
  employee: {
    firstName: string;
    lastName: string;
  } | null;
}): string {
  if (user.employee) {
    const fullName =
      `${user.employee.firstName} ${user.employee.lastName}`.trim();

    if (fullName) {
      return fullName;
    }
  }

  return user.username;
}

async function assertWaveAssignable(
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

  if (!ASSIGNABLE_WAVE_STATUSES.includes(wave.status)) {
    throw new Error(
      `${wave.waveNo} numaralı Wave, ${wave.status} durumundayken kullanıcı ataması değiştirilemez.`
    );
  }

  return wave;
}

async function assertAssignmentBelongsToWave(
  tx: TransactionClient,
  waveId: string,
  assignmentId: string
) {
  const assignment = await tx.waveAssignment.findFirst({
    where: {
      id: assignmentId,
      waveId,
    },

    select: {
      id: true,
      waveId: true,
      userId: true,
      operationType: true,
      status: true,

      user: {
        select: {
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

  if (!assignment) {
    throw new Error("Kullanıcı atama kaydı bulunamadı.");
  }

  return assignment;
}

async function assertAssignableUser(
  tx: TransactionClient,
  userId: string
) {
  const user = await tx.user.findUnique({
    where: {
      id: userId,
    },

    select: {
      id: true,
      username: true,
      status: true,
      isRfUser: true,

      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          isActive: true,
          canUseRf: true,
        },
      },
    },
  });

  if (!user) {
    throw new Error("Atanmak istenen kullanıcı bulunamadı.");
  }

  if (user.status !== UserStatus.ACTIVE) {
    throw new Error(
      `${user.username} kullanıcısı aktif durumda değildir.`
    );
  }

  if (!user.isRfUser) {
    throw new Error(
      `${user.username} kullanıcısının RF kullanım yetkisi bulunmuyor.`
    );
  }

  if (!user.employee) {
    throw new Error(
      `${user.username} kullanıcısına bağlı bir personel kartı bulunmuyor.`
    );
  }

  if (!user.employee.isActive) {
    throw new Error(
      `${buildOperatorName(user)} personel kartı aktif değildir.`
    );
  }

  if (!user.employee.canUseRf) {
    throw new Error(
      `${buildOperatorName(user)} personelinin RF kullanım izni bulunmuyor.`
    );
  }

  return user;
}

/**
 * Eski ekran operatorName gönderdiğinde kullanıcıyı bulmaya çalışır.
 *
 * Yeni kullanıcı seçim ekranı tamamlandıktan sonra bu fonksiyon ve
 * operatorName uyumluluğu kaldırılacaktır.
 */
async function resolveLegacyOperatorUserId(
  tx: TransactionClient,
  operatorName: string
): Promise<string | null> {
  const normalizedOperatorName = normalizeText(operatorName);

  if (!normalizedOperatorName) {
    return null;
  }

  const directUser = await tx.user.findFirst({
    where: {
      OR: [
        {
          username: {
            equals: normalizedOperatorName,
            mode: "insensitive",
          },
        },
        {
          email: {
            equals: normalizedOperatorName,
            mode: "insensitive",
          },
        },
      ],
    },

    select: {
      id: true,
    },
  });

  if (directUser) {
    return directUser.id;
  }

  const nameParts = normalizedOperatorName
    .split(/\s+/)
    .filter(Boolean);

  if (nameParts.length < 2) {
    return null;
  }

  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(" ");

  const employeeUser = await tx.user.findFirst({
    where: {
      employee: {
        is: {
          firstName: {
            equals: firstName,
            mode: "insensitive",
          },

          lastName: {
            equals: lastName,
            mode: "insensitive",
          },
        },
      },
    },

    select: {
      id: true,
    },
  });

  return employeeUser?.id ?? null;
}

export async function getWaveAssignmentManagementData(
  waveId: string
) {
  const [wave, availableUsers] = await Promise.all([
    prisma.wave.findUnique({
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

        assignments: {
          orderBy: [
            {
              status: "asc",
            },
            {
              assignedAt: "desc",
            },
          ],

          select: {
            id: true,
            waveId: true,
            userId: true,
            assignedById: true,
            operationType: true,
            status: true,

            assignedAt: true,
            startedAt: true,
            completedAt: true,
            lastActivityAt: true,
            createdAt: true,
            updatedAt: true,

            user: {
              select: {
                id: true,
                username: true,
                email: true,
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
                    isActive: true,
                    canUseRf: true,
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
        },
      },
    }),

    prisma.user.findMany({
      where: {
        status: UserStatus.ACTIVE,
        isRfUser: true,

        employee: {
          is: {
            isActive: true,
            canUseRf: true,
          },
        },
      },

      orderBy: [
        {
          employee: {
            firstName: "asc",
          },
        },
        {
          username: "asc",
        },
      ],

      select: {
        id: true,
        username: true,
        email: true,
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
            isActive: true,
            canUseRf: true,
          },
        },
      },
    }),
  ]);

  if (!wave) {
    return null;
  }

  /*
   * Eski assignments ekranı henüz operatorName alanını kullanıyor olabilir.
   * Veritabanında bu alan artık yoktur; burada yalnızca ekran uyumluluğu
   * için kullanıcı/personel bilgilerinden üretilir.
   */
  const assignments = wave.assignments.map(
    (assignment) => ({
      ...assignment,

      operatorName: buildOperatorName(
        assignment.user
      ),

      /**
       * Terminal Wave atamasına ait değildir.
       * RF oturum modeline taşınacaktır.
       */
      terminalCode: null as string | null,

      assignedByName: assignment.assignedBy
        ? buildOperatorName(assignment.assignedBy)
        : null,
    })
  );

  const activeAssignmentCount = assignments.filter(
    (assignment) =>
      assignment.status ===
      WaveAssignmentStatus.ACTIVE
  ).length;

  const waitingAssignmentCount = assignments.filter(
    (assignment) =>
      assignment.status ===
      WaveAssignmentStatus.WAITING
  ).length;

  const assignedAssignmentCount = assignments.filter(
    (assignment) =>
      assignment.status ===
      WaveAssignmentStatus.ASSIGNED
  ).length;

  const completedAssignmentCount =
    assignments.filter(
      (assignment) =>
        assignment.status ===
        WaveAssignmentStatus.COMPLETED
    ).length;

  const cancelledAssignmentCount =
    assignments.filter(
      (assignment) =>
        assignment.status ===
        WaveAssignmentStatus.CANCELLED
    ).length;

  return {
    wave: {
      ...wave,
      assignments,
    },

    availableUsers: availableUsers.map((user) => ({
      ...user,
      displayName: buildOperatorName(user),
    })),

    summary: {
      total: assignments.length,
      active: activeAssignmentCount,
      waiting: waitingAssignmentCount,
      assigned: assignedAssignmentCount,
      completed: completedAssignmentCount,
      cancelled: cancelledAssignmentCount,
    },
  };
}

export async function createWaveAssignment(
  input: CreateWaveAssignmentInput
) {
  const waveId = normalizeText(input.waveId);
  const assignedById =
    normalizeText(input.assignedById) || null;

  if (!waveId) {
    throw new Error("Wave kimliği bulunamadı.");
  }

  return prisma.$transaction(async (tx) => {
    await assertWaveAssignable(tx, waveId);

    let userId = normalizeText(input.userId);

    /*
     * Eski form operatorName gönderiyorsa geçici olarak kullanıcı
     * kaydına dönüştürülür.
     */
    if (!userId) {
      userId =
        (await resolveLegacyOperatorUserId(
          tx,
          input.operatorName || ""
        )) || "";
    }

    if (!userId) {
      throw new Error(
        "Atanacak kullanıcı seçilmelidir. Eski operatör adıyla eşleşen bir kullanıcı bulunamadı."
      );
    }

    const user = await assertAssignableUser(
      tx,
      userId
    );

    if (assignedById) {
      const assigningUser =
        await tx.user.findUnique({
          where: {
            id: assignedById,
          },

          select: {
            id: true,
            status: true,
          },
        });

      if (!assigningUser) {
        throw new Error(
          "Atamayı yapan kullanıcı bulunamadı."
        );
      }

      if (
        assigningUser.status !== UserStatus.ACTIVE
      ) {
        throw new Error(
          "Atamayı yapan kullanıcı aktif değildir."
        );
      }
    }

    const operationType =
      input.operationType ||
      WmsOperationType.PICKING;

    const sameWaveAssignment =
      await tx.waveAssignment.findFirst({
        where: {
          waveId,
          userId,
          operationType,

          status: {
            in: BUSY_ASSIGNMENT_STATUSES,
          },
        },

        select: {
          id: true,
          status: true,
        },
      });

    if (sameWaveAssignment) {
      throw new Error(
        `${buildOperatorName(user)} zaten bu Wave içerisinde ${operationType} operasyonuna atanmış.`
      );
    }

    const existingBusyAssignment =
      await tx.waveAssignment.findFirst({
        where: {
          userId,

          status: {
            in: BUSY_ASSIGNMENT_STATUSES,
          },

          NOT: {
            waveId,
          },
        },

        select: {
          id: true,
          operationType: true,
          status: true,

          wave: {
            select: {
              id: true,
              waveNo: true,
            },
          },
        },
      });

    if (existingBusyAssignment) {
      throw new Error(
        `${buildOperatorName(user)}, ${existingBusyAssignment.wave.waveNo} numaralı aktif Wave’e atanmış durumda.`
      );
    }

    return tx.waveAssignment.create({
      data: {
        waveId,
        userId,
        assignedById,
        operationType,
        status: WaveAssignmentStatus.ASSIGNED,
        assignedAt: new Date(),
      },

      select: {
        id: true,
        waveId: true,
        userId: true,
        assignedById: true,
        operationType: true,
        status: true,
        assignedAt: true,
        startedAt: true,
        completedAt: true,
        lastActivityAt: true,
        createdAt: true,
        updatedAt: true,

        user: {
          select: {
            id: true,
            username: true,

            employee: {
              select: {
                employeeCode: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });
  });
}

const ALLOWED_STATUS_TRANSITIONS: Record<
  WaveAssignmentStatus,
  WaveAssignmentStatus[]
> = {
  ASSIGNED: [
    WaveAssignmentStatus.ACTIVE,
    WaveAssignmentStatus.WAITING,
    WaveAssignmentStatus.CANCELLED,
  ],

  ACTIVE: [
    WaveAssignmentStatus.WAITING,
    WaveAssignmentStatus.COMPLETED,
    WaveAssignmentStatus.CANCELLED,
  ],

  WAITING: [
    WaveAssignmentStatus.ACTIVE,
    WaveAssignmentStatus.COMPLETED,
    WaveAssignmentStatus.CANCELLED,
  ],

  COMPLETED: [],

  CANCELLED: [],
};

export async function updateWaveAssignmentStatus(
  waveId: string,
  assignmentId: string,
  targetStatus: WaveAssignmentStatus
) {
  const normalizedWaveId = normalizeText(waveId);
  const normalizedAssignmentId =
    normalizeText(assignmentId);

  if (!normalizedWaveId) {
    throw new Error("Wave kimliği bulunamadı.");
  }

  if (!normalizedAssignmentId) {
    throw new Error(
      "Atama kaydı kimliği bulunamadı."
    );
  }

  return prisma.$transaction(async (tx) => {
    await assertWaveAssignable(
      tx,
      normalizedWaveId
    );

    const assignment =
      await assertAssignmentBelongsToWave(
        tx,
        normalizedWaveId,
        normalizedAssignmentId
      );

    const allowedStatuses =
      ALLOWED_STATUS_TRANSITIONS[
        assignment.status
      ];

    if (!allowedStatuses.includes(targetStatus)) {
      throw new Error(
        `${assignment.status} durumundaki atama, ${targetStatus} durumuna geçirilemez.`
      );
    }

    const now = new Date();

    const updateData: Prisma.WaveAssignmentUpdateInput =
      {
        status: targetStatus,
        lastActivityAt: now,
      };

    if (
      targetStatus ===
      WaveAssignmentStatus.ACTIVE
    ) {
      updateData.startedAt =
        assignment.status ===
          WaveAssignmentStatus.ASSIGNED
          ? now
          : undefined;

      updateData.completedAt = null;
    }

    if (
      targetStatus ===
        WaveAssignmentStatus.COMPLETED ||
      targetStatus ===
        WaveAssignmentStatus.CANCELLED
    ) {
      updateData.completedAt = now;
    }

    return tx.waveAssignment.update({
      where: {
        id: normalizedAssignmentId,
      },

      data: updateData,

      select: {
        id: true,
        waveId: true,
        userId: true,
        assignedById: true,
        operationType: true,
        status: true,
        assignedAt: true,
        startedAt: true,
        completedAt: true,
        lastActivityAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  });
}

export async function deleteWaveAssignment(
  waveId: string,
  assignmentId: string
) {
  const normalizedWaveId = normalizeText(waveId);
  const normalizedAssignmentId =
    normalizeText(assignmentId);

  if (!normalizedWaveId) {
    throw new Error("Wave kimliği bulunamadı.");
  }

  if (!normalizedAssignmentId) {
    throw new Error(
      "Atama kaydı kimliği bulunamadı."
    );
  }

  return prisma.$transaction(async (tx) => {
    await assertWaveAssignable(
      tx,
      normalizedWaveId
    );

    const assignment =
      await assertAssignmentBelongsToWave(
        tx,
        normalizedWaveId,
        normalizedAssignmentId
      );

    if (
      assignment.status ===
      WaveAssignmentStatus.ACTIVE
    ) {
      throw new Error(
        "Aktif çalışan kullanıcı doğrudan silinemez. Önce beklemeye alın veya iptal edin."
      );
    }

    if (
      assignment.status ===
      WaveAssignmentStatus.COMPLETED
    ) {
      throw new Error(
        "Tamamlanmış kullanıcı ataması silinemez."
      );
    }

    await tx.waveAssignment.delete({
      where: {
        id: normalizedAssignmentId,
      },
    });

    return {
      deletedAssignmentId:
        normalizedAssignmentId,
    };
  });
}