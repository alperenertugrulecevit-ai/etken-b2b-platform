import { prisma } from "@/lib/prisma";

export class AuthRepository {
  static async findUserByUsername(username: string) {
    return prisma.user.findUnique({
      where: {
        username,
      },
      include: {
        employee: true,

        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  static async updateLastLogin(userId: string) {
    return prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        lastLoginAt: new Date(),
        failedLoginCount: 0,
      },
    });
  }

  static async increaseFailedLogin(userId: string) {
    return prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        failedLoginCount: {
          increment: 1,
        },
        lastFailedLoginAt: new Date(),
      },
    });
  }

  static async lockUser(userId: string) {
    return prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        status: "LOCKED",
        lockedAt: new Date(),
      },
    });
  }
}