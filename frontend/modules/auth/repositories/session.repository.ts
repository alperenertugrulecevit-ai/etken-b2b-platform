import {
  AuthSessionType,
  Prisma,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type CreateSessionRepositoryInput = {
  userId: string;
  tokenHash: string;
  sessionType: AuthSessionType;
  expiresAt: Date;
  terminalCode?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export class SessionRepository {
  static async create(
    input: CreateSessionRepositoryInput
  ) {
    return prisma.authSession.create({
      data: {
        userId: input.userId,
        tokenHash: input.tokenHash,
        sessionType: input.sessionType,
        expiresAt: input.expiresAt,
        terminalCode: input.terminalCode ?? null,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  }

  static async findActiveByTokenHash(
    tokenHash: string
  ) {
    return prisma.authSession.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: {
          include: {
            employee: true,
            userRoles: {
              where: {
                role: {
                  isActive: true,
                },
              },
              include: {
                role: {
                  include: {
                    rolePermissions: {
                      where: {
                        permission: {
                          isActive: true,
                        },
                      },
                      include: {
                        permission: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  static async updateLastActivity(
    sessionId: string
  ) {
    return prisma.authSession.update({
      where: {
        id: sessionId,
      },
      data: {
        lastActivityAt: new Date(),
      },
    });
  }

  static async revokeByTokenHash(
    tokenHash: string,
    reason = "USER_LOGOUT"
  ) {
    return prisma.authSession.updateMany({
      where: {
        tokenHash,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
        revokeReason: reason,
      },
    });
  }

  static async revokeById(
    sessionId: string,
    reason: string,
    revokedById?: string | null
  ) {
    return prisma.authSession.updateMany({
      where: {
        id: sessionId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
        revokeReason: reason,
        revokedById: revokedById ?? null,
      },
    });
  }

  static async revokeAllUserSessions(
    userId: string,
    reason: string,
    revokedById?: string | null
  ) {
    return prisma.$transaction([
      prisma.authSession.updateMany({
        where: {
          userId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
          revokeReason: reason,
          revokedById: revokedById ?? null,
        },
      }),

      prisma.user.update({
        where: {
          id: userId,
        },
        data: {
          sessionInvalidatedAt: new Date(),
        },
      }),
    ]);
  }

  static async deleteExpiredSessions() {
    return prisma.authSession.deleteMany({
      where: {
        OR: [
          {
            expiresAt: {
              lte: new Date(),
            },
          },
          {
            revokedAt: {
              not: null,
            },
          },
        ],
      },
    });
  }

  static async findUserSessions(
    userId: string
  ) {
    return prisma.authSession.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        sessionType: true,
        terminalCode: true,
        ipAddress: true,
        userAgent: true,
        expiresAt: true,
        lastActivityAt: true,
        revokedAt: true,
        revokeReason: true,
        createdAt: true,
      },
    });
  }
}

export type ActiveSessionRecord =
  Prisma.PromiseReturnType<
    typeof SessionRepository.findActiveByTokenHash
  >;