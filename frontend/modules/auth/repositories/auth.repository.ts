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

  static mapToAuthUser(
    user: Awaited<
      ReturnType<typeof AuthRepository.findUserByUsername>
    >
  ) {
    if (!user) {
      throw new Error("User not found.");
    }

    const roles = user.userRoles.map((item) => ({
      id: item.role.id,
      code: item.role.code,
      name: item.role.name,
      description: item.role.description,
    }));

    const permissionMap = new Map();

    for (const userRole of user.userRoles) {
      for (const rolePermission of userRole.role.rolePermissions) {
        permissionMap.set(rolePermission.permission.id, {
          id: rolePermission.permission.id,
          code: rolePermission.permission.code,
          name: rolePermission.permission.name,
          module: rolePermission.permission.module,
        });
      }
    }

    return {
      id: user.id,
      employeeId: user.employeeId,
      username: user.username,
      email: user.email,

      userType: user.userType,
      status: user.status,

      mustChangePassword: user.mustChangePassword,

      isRfUser: user.isRfUser,
      isAdminUser: user.isAdminUser,

      employee: user.employee
        ? {
            id: user.employee.id,
            employeeCode: user.employee.employeeCode,
            firstName: user.employee.firstName,
            lastName: user.employee.lastName,
            department: user.employee.department,
            title: user.employee.title,
            shiftCode: user.employee.shiftCode,
          }
        : null,

      roles,

      permissions: [...permissionMap.values()],
    };
  }
}