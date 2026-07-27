import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const permissions = [
  {
    code: "WMS_COMPANY_VIEW",
    name: "3PL Şirket Yapısını Görüntüleme",
    module: "WMS_STRUCTURE",
    description:
      "Stok sahibi şirketleri, lojistik merkezlerini ve depo bağlantılarını görüntüler.",
  },
  {
    code: "WMS_COMPANY_MANAGE",
    name: "3PL Şirket Yapısını Yönetme",
    module: "WMS_STRUCTURE",
    description:
      "Stok sahibi şirket, lojistik merkezi ve şirket-depo bağlantılarını yönetir.",
  },
  {
    code: "WMS_ACCESS_MANAGE",
    name: "Şirket ve Depo Erişimlerini Yönetme",
    module: "WMS_STRUCTURE",
    description:
      "Kullanıcılara stok sahibi şirket ve depo çalışma erişimi atar.",
  },
];

async function main() {
  console.log("3PL şirket yapısı yetkileri hazırlanıyor...");

  const savedPermissions = [];

  for (const permission of permissions) {
    const saved = await prisma.permission.upsert({
      where: { code: permission.code },
      update: {
        name: permission.name,
        module: permission.module,
        description: permission.description,
        isActive: true,
      },
      create: {
        ...permission,
        isActive: true,
      },
    });

    savedPermissions.push(saved);
  }

  const managerRole = await prisma.role.findUnique({
    where: { code: "WMS_MANAGER" },
    select: { id: true },
  });

  if (managerRole) {
    for (const permission of savedPermissions) {
      await prisma.rolePermission.upsert({
        where: {
          role_permission_unique: {
            roleId: managerRole.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: managerRole.id,
          permissionId: permission.id,
        },
      });
    }

    console.log("✓ Yetkiler WMS_MANAGER rolüne atandı.");
  } else {
    console.log("! WMS_MANAGER rolü bulunamadı; yalnızca yetki kayıtları oluşturuldu.");
  }

  console.log("✓ 3PL şirket yapısı yetkileri kaydedildi.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
