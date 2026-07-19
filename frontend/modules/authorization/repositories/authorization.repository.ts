import { prisma } from "@/lib/prisma";

import type {
  AuthorizationProfile,
} from "@/modules/authorization/types/authorization.types";

export class AuthorizationRepository {
  static async findAccessProfile(
    userId: string
  ): Promise<AuthorizationProfile | null> {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        username: true,
        status: true,
        isAdminUser: true,
        isRfUser: true,
        employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            isActive: true,
            canUseRf: true,
          },
        },
        userRoles: {
          where: {
            role: {
              isActive: true,
            },
          },
          select: {
            role: {
              select: {
                code: true,
                rolePermissions: {
                  where: {
                    permission: {
                      isActive: true,
                    },
                  },
                  select: {
                    permission: {
                      select: {
                        code: true,
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

    if (!user) {
      return null;
    }

    const roleCodes = new Set<string>();
    const permissionCodes = new Set<string>();

    for (const userRole of user.userRoles) {
      roleCodes.add(userRole.role.code);

      for (
        const rolePermission of
        userRole.role.rolePermissions
      ) {
        permissionCodes.add(
          rolePermission.permission.code
        );
      }
    }

    return {
      id: user.id,
      username: user.username,
      status: user.status,
      isAdminUser: user.isAdminUser,
      isRfUser: user.isRfUser,
      employee: user.employee,
      roleCodes: Array.from(roleCodes).sort(),
      permissionCodes:
        Array.from(permissionCodes).sort(),
    };
  }
}