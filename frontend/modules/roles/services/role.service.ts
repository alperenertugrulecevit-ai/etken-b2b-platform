import {
  Prisma,
} from "@prisma/client";

import {
  DEFAULT_ROLE_CATALOG,
  PERMISSION_CATALOG,
  PERMISSION_MODULE_LABELS,
} from "@/modules/authorization/permission-catalog";
import { RoleRepository } from "@/modules/roles/repositories/role.repository";

import type {
  PermissionGroup,
  RoleFormValues,
  RolePageData,
} from "@/modules/roles/types/role.types";

const ROLE_CODE_PATTERN = /^[A-Z][A-Z0-9_]{2,49}$/;

export class RoleManagementError extends Error {
  constructor(
    message: string,
    public readonly field: string | null = null
  ) {
    super(message);
    this.name = "RoleManagementError";
  }
}

function normalizeDescription(value: string) {
  const description = value.trim();
  return description || null;
}

function createPermissionGroups(
  permissions: Awaited<
    ReturnType<
      typeof RoleRepository.listActivePermissions
    >
  >
): PermissionGroup[] {
  const groups = new Map<string, PermissionGroup>();

  for (const permission of permissions) {
    const existingGroup = groups.get(
      permission.module
    );

    if (existingGroup) {
      existingGroup.permissions.push(permission);
      continue;
    }

    groups.set(permission.module, {
      module: permission.module,
      moduleLabel:
        PERMISSION_MODULE_LABELS[
          permission.module
        ] ?? permission.module,
      permissions: [permission],
    });
  }

  return Array.from(groups.values());
}

export class RoleService {
  static async getRolePageData(): Promise<RolePageData> {
    const [roles, permissions] = await Promise.all([
      RoleRepository.listRoles(),
      RoleRepository.listActivePermissions(),
    ]);

    const catalogCodes = new Set(
      PERMISSION_CATALOG.map(
        (permission) => permission.code
      )
    );

    const existingCatalogCodeCount =
      permissions.filter((permission) =>
        catalogCodes.has(permission.code)
      ).length;

    return {
      roles,
      permissionGroups:
        createPermissionGroups(permissions),
      permissionCount: permissions.length,
      activeRoleCount: roles.filter(
        (role) => role.isActive
      ).length,
      assignedUserCount: roles.reduce(
        (total, role) => total + role.userCount,
        0
      ),
      catalogIsComplete:
        existingCatalogCodeCount ===
        PERMISSION_CATALOG.length,
    };
  }

  static async getRoleEditorData(roleId?: string) {
    const [permissions, role] = await Promise.all([
      RoleRepository.listActivePermissions(),
      roleId
        ? RoleRepository.findRoleDetail(roleId)
        : Promise.resolve(null),
    ]);

    return {
      permissionGroups:
        createPermissionGroups(
          permissions.filter(
            (permission) =>
              permission.code !== "ALL_ACCESS"
          )
        ),
      role,
    };
  }

  static async synchronizeCatalog() {
    return RoleRepository.runTransaction(
      async (transaction) => {
        for (const permission of PERMISSION_CATALOG) {
          await transaction.permission.upsert({
            where: {
              code: permission.code,
            },
            update: {
              name: permission.name,
              module: permission.module,
              description:
                permission.description,
              isActive: true,
            },
            create: {
              code: permission.code,
              name: permission.name,
              module: permission.module,
              description:
                permission.description,
              isActive: true,
            },
          });
        }

        const permissions =
          await transaction.permission.findMany({
            where: {
              code: {
                in: PERMISSION_CATALOG.map(
                  (permission) =>
                    permission.code
                ),
              },
            },
            select: {
              id: true,
              code: true,
            },
          });

        const permissionIdByCode = new Map(
          permissions.map((permission) => [
            permission.code,
            permission.id,
          ])
        );

        const systemAdmin =
          await transaction.role.findUnique({
            where: {
              code: "SYSTEM_ADMIN",
            },
            select: {
              id: true,
            },
          });

        if (systemAdmin) {
          await transaction.role.update({
            where: {
              id: systemAdmin.id,
            },
            data: {
              isSystemRole: true,
              isActive: true,
            },
          });

          await transaction.rolePermission.createMany({
            data: permissions.map((permission) => ({
              roleId: systemAdmin.id,
              permissionId: permission.id,
            })),
            skipDuplicates: true,
          });
        }

        let createdRoleCount = 0;

        for (
          const defaultRole of DEFAULT_ROLE_CATALOG
        ) {
          const existingRole =
            await transaction.role.findFirst({
              where: {
                OR: [
                  {
                    code: defaultRole.code,
                  },
                  {
                    name: defaultRole.name,
                  },
                ],
              },
              select: {
                id: true,
              },
            });

          let roleId = existingRole?.id;

          if (!roleId) {
            const role =
              await transaction.role.create({
                data: {
                  code: defaultRole.code,
                  name: defaultRole.name,
                  description:
                    defaultRole.description,
                  isSystemRole: false,
                  isActive: true,
                },
                select: {
                  id: true,
                },
              });

            roleId = role.id;
            createdRoleCount += 1;
          }

          const permissionIds =
            defaultRole.permissionCodes
              .map((permissionCode) =>
                permissionIdByCode.get(
                  permissionCode
                )
              )
              .filter(
                (
                  permissionId
                ): permissionId is string =>
                  Boolean(permissionId)
              );

          if (permissionIds.length > 0) {
            await transaction.rolePermission.createMany({
              data: permissionIds.map(
                (permissionId) => ({
                  roleId,
                  permissionId,
                })
              ),
              skipDuplicates: true,
            });
          }
        }

        return {
          permissionCount: permissions.length,
          createdRoleCount,
        };
      }
    );
  }

  static async createRole(values: RoleFormValues) {
    const normalized =
      await this.validateRoleValues(values);

    try {
      return await RoleRepository.createRole(
        normalized
      );
    } catch (error) {
      if (
        error instanceof
          Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new RoleManagementError(
          "Rol kodu veya rol adı başka bir kayıtta kullanılıyor."
        );
      }

      throw error;
    }
  }

  static async updateRole(
    roleId: string,
    values: RoleFormValues
  ) {
    if (!roleId.trim()) {
      throw new RoleManagementError(
        "Güncellenecek rol bilgisi eksik."
      );
    }

    const normalized =
      await this.validateRoleValues(
        values,
        roleId
      );

    try {
      return await RoleRepository.updateRole(
        roleId,
        normalized
      );
    } catch (error) {
      if (
        error instanceof
          Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new RoleManagementError(
          "Rol kodu veya rol adı başka bir kayıtta kullanılıyor."
        );
      }

      throw error;
    }
  }

  static async setRoleStatus(
    roleId: string,
    isActive: boolean
  ) {
    if (!roleId.trim()) {
      throw new RoleManagementError(
        "Rol bilgisi eksik."
      );
    }

    return RoleRepository.setRoleStatus(
      roleId,
      isActive
    );
  }

  private static async validateRoleValues(
    values: RoleFormValues,
    excludedRoleId?: string
  ) {
    const code = values.code.trim().toUpperCase();
    const name = values.name.trim();
    const description = normalizeDescription(
      values.description
    );

    const permissionIds = Array.from(
      new Set(
        values.permissionIds
          .map((permissionId) =>
            permissionId.trim()
          )
          .filter(Boolean)
      )
    );

    if (!ROLE_CODE_PATTERN.test(code)) {
      throw new RoleManagementError(
        "Rol kodu 3-50 karakter olmalı; büyük harf, rakam ve alt çizgi kullanılmalıdır.",
        "code"
      );
    }

    if (name.length < 3 || name.length > 80) {
      throw new RoleManagementError(
        "Rol adı 3-80 karakter olmalıdır.",
        "name"
      );
    }

    if (
      description &&
      description.length > 300
    ) {
      throw new RoleManagementError(
        "Açıklama en fazla 300 karakter olabilir.",
        "description"
      );
    }

    if (permissionIds.length === 0) {
      throw new RoleManagementError(
        "Rol için en az bir yetki seçin.",
        "permissionIds"
      );
    }

    const [conflict, permissionCount] =
      await Promise.all([
        RoleRepository.findConflict(
          code,
          name,
          excludedRoleId
        ),
        RoleRepository.countExistingPermissions(
          permissionIds
        ),
      ]);

    if (conflict) {
      throw new RoleManagementError(
        conflict.code === code
          ? "Bu rol kodu zaten kullanılıyor."
          : "Bu rol adı zaten kullanılıyor.",
        conflict.code === code ? "code" : "name"
      );
    }

    if (permissionCount !== permissionIds.length) {
      throw new RoleManagementError(
        "Seçilen yetkilerden biri bulunamadı veya pasif durumda.",
        "permissionIds"
      );
    }

    return {
      code,
      name,
      description,
      permissionIds,
    };
  }
}