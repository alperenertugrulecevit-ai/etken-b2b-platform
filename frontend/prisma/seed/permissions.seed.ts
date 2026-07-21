import type {
  PrismaClient,
} from "@prisma/client";

import {
  PERMISSION_CATALOG,
} from "../../modules/authorization/permission-catalog";

export async function seedPermissions(
  prisma: PrismaClient
) {
  console.log(
    "Yetkiler oluşturuluyor..."
  );

  let createdCount = 0;
  let updatedCount = 0;

  for (
    const permission of
    PERMISSION_CATALOG
  ) {
    const existingPermission =
      await prisma.permission.findUnique({
        where: {
          code: permission.code,
        },

        select: {
          id: true,
        },
      });

    await prisma.permission.upsert({
      where: {
        code: permission.code,
      },

      create: {
        code: permission.code,
        name: permission.name,
        module: permission.module,
        description:
          permission.description,
        isActive: true,
      },

      update: {
        name: permission.name,
        module: permission.module,
        description:
          permission.description,
        isActive: true,
      },
    });

    if (existingPermission) {
      updatedCount += 1;
    } else {
      createdCount += 1;
    }
  }

  console.log(
    `Yetki seed tamamlandı: ${createdCount} yeni, ${updatedCount} güncellendi.`
  );
}