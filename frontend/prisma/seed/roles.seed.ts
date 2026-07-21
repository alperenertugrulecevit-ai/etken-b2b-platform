import type {
  PrismaClient,
} from "@prisma/client";

import {
  DEFAULT_ROLE_CATALOG,
} from "../../modules/authorization/permission-catalog";

export async function seedRoles(
  prisma: PrismaClient
) {
  console.log(
    "Varsayılan roller oluşturuluyor..."
  );

  let createdRoleCount = 0;
  let updatedRoleCount = 0;
  let assignedPermissionCount = 0;

  for (
    const roleDefinition of
    DEFAULT_ROLE_CATALOG
  ) {
    const existingRole =
      await prisma.role.findUnique({
        where: {
          code: roleDefinition.code,
        },

        select: {
          id: true,
        },
      });

    const permissions =
      await prisma.permission.findMany({
        where: {
          code: {
            in:
              roleDefinition.permissionCodes,
          },

          isActive: true,
        },

        select: {
          id: true,
          code: true,
        },
      });

    const foundPermissionCodes =
      new Set(
        permissions.map(
          (permission) =>
            permission.code
        )
      );

    const missingPermissionCodes =
      roleDefinition.permissionCodes.filter(
        (permissionCode) =>
          !foundPermissionCodes.has(
            permissionCode
          )
      );

    if (
      missingPermissionCodes.length > 0
    ) {
      throw new Error(
        `${roleDefinition.code} rolü için bazı yetkiler bulunamadı: ${missingPermissionCodes.join(
          ", "
        )}. Önce yetki seed işlemini çalıştırın.`
      );
    }

    await prisma.$transaction(
      async (tx) => {
        const role =
          await tx.role.upsert({
            where: {
              code:
                roleDefinition.code,
            },

            create: {
              code:
                roleDefinition.code,

              name:
                roleDefinition.name,

              description:
                roleDefinition.description,

              isSystemRole: true,
              isActive: true,
            },

            update: {
              name:
                roleDefinition.name,

              description:
                roleDefinition.description,

              isSystemRole: true,
              isActive: true,
            },

            select: {
              id: true,
            },
          });

        const permissionIds =
          permissions.map(
            (permission) =>
              permission.id
          );

        await tx.rolePermission.deleteMany({
          where: {
            roleId: role.id,

            permissionId: {
              notIn: permissionIds,
            },
          },
        });

        if (
          permissionIds.length > 0
        ) {
          await tx.rolePermission.createMany({
            data:
              permissionIds.map(
                (permissionId) => ({
                  roleId: role.id,
                  permissionId,
                })
              ),

            skipDuplicates: true,
          });
        }
      },
      {
        maxWait: 10000,
        timeout: 20000,
      }
    );

    assignedPermissionCount +=
      permissions.length;

    if (existingRole) {
      updatedRoleCount += 1;
    } else {
      createdRoleCount += 1;
    }
  }

  console.log(
    `Rol seed tamamlandı: ${createdRoleCount} yeni, ${updatedRoleCount} güncellendi.`
  );

  console.log(
    `${assignedPermissionCount} rol-yetki eşleştirmesi doğrulandı.`
  );
}