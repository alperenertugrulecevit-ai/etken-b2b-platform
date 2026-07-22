import { prisma } from "@/lib/prisma";

type MappedPermission = {
  id: string;
  code: string;
  name: string;
  module: string;
};

export class AuthRepository {
  static async findUserByUsername(
    username: string
  ) {
    return prisma.user.findUnique({
      where: {
        username,
      },

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
    });
  }

  static async updateLastLogin(
    userId: string
  ) {
    return prisma.user.update({
      where: {
        id: userId,
      },

      data: {
        lastLoginAt: new Date(),
        failedLoginCount: 0,
        lastFailedLoginAt: null,
        lockedAt: null,
      },
    });
  }

  static async increaseFailedLogin(
    userId: string
  ) {
    return prisma.user.update({
      where: {
        id: userId,
      },

      data: {
        failedLoginCount: {
          increment: 1,
        },

        lastFailedLoginAt:
          new Date(),
      },
    });
  }

  static async lockUser(
    userId: string
  ) {
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

  static mapToAuthUser(
    user: Awaited<
      ReturnType<
        typeof AuthRepository.findUserByUsername
      >
    >
  ) {
    if (!user) {
      throw new Error(
        "User not found."
      );
    }

    const roles =
      user.userRoles.map(
        (item) => ({
          id: item.role.id,
          code: item.role.code,
          name: item.role.name,
          description:
            item.role.description,
        })
      );

    const permissionMap =
      new Map<
        string,
        MappedPermission
      >();

    for (
      const userRole of
      user.userRoles
    ) {
      for (
        const rolePermission of
        userRole.role
          .rolePermissions
      ) {
        const permission =
          rolePermission.permission;

        permissionMap.set(
          permission.id,
          {
            id: permission.id,
            code: permission.code,
            name: permission.name,
            module:
              permission.module,
          }
        );
      }
    }

    return {
      id: user.id,
      employeeId:
        user.employeeId,
      username: user.username,
      email: user.email,

      userType: user.userType,
      status: user.status,

      mustChangePassword:
        user.mustChangePassword,

      isRfUser: user.isRfUser,
      isAdminUser:
        user.isAdminUser,

      employee: user.employee
        ? {
            id: user.employee.id,

            employeeCode:
              user.employee
                .employeeCode,

            firstName:
              user.employee.firstName,

            lastName:
              user.employee.lastName,

            department:
              user.employee.department,

            title:
              user.employee.title,

            shiftCode:
              user.employee.shiftCode,
          }
        : null,

      roles,

      permissions: Array.from(
        permissionMap.values()
      ),
    };
  }
}