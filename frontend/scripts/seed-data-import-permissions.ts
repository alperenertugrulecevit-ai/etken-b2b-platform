import {
  PrismaClient,
} from "@prisma/client";

const prisma =
  new PrismaClient();

const permissions = [
  {
    code:
      "DATA_IMPORT_VIEW",

    name:
      "Excel Aktarımlarını Görüntüleme",

    module:
      "DATA_IMPORT",

    description:
      "Excel veri aktarım geçmişini, ön izlemeleri ve hata raporlarını görüntüler.",
  },
  {
    code:
      "DATA_IMPORT_MANAGE",

    name:
      "Excel Veri Aktarımı",

    module:
      "DATA_IMPORT",

    description:
      "Excel şablonlarını indirir, dosyaları doğrular ve onaylanan kayıtları sisteme aktarır.",
  },
];

async function main() {
  console.log(
    "Excel veri aktarım yetkileri hazırlanıyor..."
  );

  const permissionIds:
    string[] = [];

  for (
    const definition
    of permissions
  ) {
    const permission =
      await prisma.permission
        .upsert({
          where: {
            code:
              definition.code,
          },

          create: {
            ...definition,

            isActive:
              true,
          },

          update: {
            name:
              definition.name,

            module:
              definition.module,

            description:
              definition.description,

            isActive:
              true,
          },

          select: {
            id: true,
          },
        });

    permissionIds.push(
      permission.id
    );
  }

  const wmsManager =
    await prisma.role
      .findUnique({
        where: {
          code:
            "WMS_MANAGER",
        },

        select: {
          id: true,
        },
      });

  if (wmsManager) {
    await prisma.rolePermission
      .createMany({
        data:
          permissionIds.map(
            (
              permissionId
            ) => ({
              roleId:
                wmsManager.id,

              permissionId,
            })
          ),

        skipDuplicates:
          true,
      });

    console.log(
      "✓ Yetkiler WMS_MANAGER rolüne atandı."
    );
  } else {
    console.log(
      "Bilgi: WMS_MANAGER rolü bulunamadı; yetkiler rol yönetiminden atanabilir."
    );
  }

  console.log(
    "✓ Excel veri aktarım yetkileri kaydedildi."
  );
}

main()
  .catch(
    (error) => {
      console.error(
        "Yetki işlemi başarısız:",
        error
      );

      process.exitCode =
        1;
    }
  )
  .finally(
    async () => {
      await prisma
        .$disconnect();
    }
  );
