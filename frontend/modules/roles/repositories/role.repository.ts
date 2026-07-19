import type {
  Prisma,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

import type {
  RoleDetail,
  RoleListItem,
  RolePermissionItem,
} from "@/modules/roles/types/role.types";

export class RoleRepository {
  static async listRoles(): Promise<RoleListItem[]> {
    const roles = await prisma.role.findMany({
      orderBy: [
        {
          isSystemRole: "desc",
        },
        {
          name: "asc",
        },
      ],
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        isSystemRole: true,
        isActive: true,
        updatedAt: true,
        _count: {
          select: {
            userRoles: true,
            rolePermissions: true,
          },
        },
      },
    });

    return roles.map((role) => ({
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description,
      isSystemRole: role.isSystemRole,
      isActive: role.isActive,
      userCount: role._count.userRoles,
      permissionCount: role._count.rolePermissions,
      updatedAt: role.updatedAt,
    }));
  }

  static async listActivePermissions(): Promise<
    RolePermissionItem[]
  > {
    return prisma.permission.findMany({
      where: {
        isActive: true,
      },
      orderBy: [
        {
          module: "asc",
        },
        {
          name: "asc",
        },
      ],
      select: {
        id: true,
        code: true,
        name: true,
        module: true,
        description: true,
      },
    });
  }

  static async findRoleDetail(
    roleId: string
  ): Promise<RoleDetail | null> {
    const role = await prisma.role.findUnique({
      where: {
        id: roleId,
      },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        isSystemRole: true,
        isActive: true,
        rolePermissions: {
          select: {
            permissionId: true,
          },
        },
        _count: {
          select: {
            userRoles: true,
          },
        },
      },
    });

    if (!role) {
      return null;
    }

    return {
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description,
      isSystemRole: role.isSystemRole,
      isActive: role.isActive,
      permissionIds: role.rolePermissions.map(
        (rolePermission) =>
          rolePermission.permissionId
      ),
      userCount: role._count.userRoles,
    };
  }

  static async findConflict(
    code: string,
    name: string,
    excludedRoleId?: string
  ) {
    return prisma.role.findFirst({
      where: {
        id: excludedRoleId
          ? {
              not: excludedRoleId,
            }
          : undefined,
        OR: [
          {
            code,
          },
          {
            name,
          },
        ],
      },
      select: {
        code: true,
        name: true,
      },
    });
  }

  static async countExistingPermissions(
    permissionIds: string[]
  ) {
    return prisma.permission.count({
      where: {
        id: {
          in: permissionIds,
        },
        isActive: true,
      },
    });
  }

  static async createRole(
    data: {
      code: string;
      name: string;
      description: string | null;
      permissionIds: string[];
    }
  ) {
    return prisma.$transaction(async (transaction) => {
      const role = await transaction.role.create({
        data: {
          code: data.code,
          name: data.name,
          description: data.description,
          isSystemRole: false,
          isActive: true,
        },
        select: {
          id: true,
          code: true,
          name: true,
        },
      });

      if (data.permissionIds.length > 0) {
        await transaction.rolePermission.createMany({
          data: data.permissionIds.map(
            (permissionId) => ({
              roleId: role.id,
              permissionId,
            })
          ),
        });
      }

      return role;
    });
  }

  static async updateRole(
    roleId: string,
    data: {
      code: string;
      name: string;
      description: string | null;
      permissionIds: string[];
    }
  ) {
    return prisma.$transaction(async (transaction) => {
      const existingRole =
        await transaction.role.findUnique({
          where: {
            id: roleId,
          },
          select: {
            id: true,
            isSystemRole: true,
          },
        });

      if (!existingRole) {
        throw new Error("Rol bulunamadı.");
      }

      if (existingRole.isSystemRole) {
        throw new Error(
          "Sistem rolü bu ekrandan değiştirilemez."
        );
      }

      const role = await transaction.role.update({
        where: {
          id: roleId,
        },
        data: {
          code: data.code,
          name: data.name,
          description: data.description,
        },
        select: {
          id: true,
          code: true,
          name: true,
        },
      });

      await transaction.rolePermission.deleteMany({
        where: {
          roleId,
        },
      });

      if (data.permissionIds.length > 0) {
        await transaction.rolePermission.createMany({
          data: data.permissionIds.map(
            (permissionId) => ({
              roleId,
              permissionId,
            })
          ),
        });
      }

      return role;
    });
  }

  static async setRoleStatus(
    roleId: string,
    isActive: boolean
  ) {
    return prisma.$transaction(async (transaction) => {
      const role = await transaction.role.findUnique({
        where: {
          id: roleId,
        },
        select: {
          id: true,
          code: true,
          name: true,
          isSystemRole: true,
        },
      });

      if (!role) {
        throw new Error("Rol bulunamadı.");
      }

      if (role.isSystemRole) {
        throw new Error(
          "Sistem rolü pasif veya aktif yapılamaz."
        );
      }

      await transaction.role.update({
        where: {
          id: roleId,
        },
        data: {
          isActive,
        },
      });

      return role;
    });
  }

  static async runTransaction<T>(
    callback: (
      transaction: Prisma.TransactionClient
    ) => Promise<T>
  ) {
    return prisma.$transaction(callback);
  }
}