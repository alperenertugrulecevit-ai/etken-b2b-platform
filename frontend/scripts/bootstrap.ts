import {
  Prisma,
  PrismaClient,
  UserStatus,
  UserType,
} from "@prisma/client";

import { PasswordService } from "../modules/auth/services/password.service";

const prisma = new PrismaClient();

const BOOTSTRAP_CONFIG = {
  employee: {
    employeeCode: "EMP0001",
    firstName: "Sistem",
    lastName: "Yöneticisi",
    email: "admin@etkenofis.com",
    department: "Bilgi Teknolojileri",
    title: "Sistem Yöneticisi",
    shiftCode: null,
    isActive: true,
    canUseRf: true,
  },

  user: {
    username: "admin",
    email: "admin@etkenofis.com",
    password: "Admin123!",
    userType: UserType.ADMIN,
    status: UserStatus.ACTIVE,
    mustChangePassword: true,
    isAdminUser: true,
    isRfUser: true,
  },

  role: {
    code: "SYSTEM_ADMIN",
    name: "Sistem Yöneticisi",
    description:
      "Sistemdeki tüm yönetim ve depo operasyonlarına erişebilen sistem rolü.",
    isSystemRole: true,
    isActive: true,
  },

  permission: {
    code: "ALL_ACCESS",
    name: "Tüm Sisteme Erişim",
    module: "SYSTEM",
    description:
      "Sistem yöneticisine tüm modüllerde tam erişim sağlayan başlangıç izni.",
    isActive: true,
  },
} as const;

async function bootstrap() {
  console.log("");
  console.log("========================================");
  console.log("ETKEN WMS ilk kurulum işlemi başlatıldı.");
  console.log("========================================");
  console.log("");

  const existingAdmin = await prisma.user.findUnique({
    where: {
      username: BOOTSTRAP_CONFIG.user.username,
    },
    select: {
      id: true,
      username: true,
      status: true,
      isAdminUser: true,
      isRfUser: true,
    },
  });

  const passwordHash = existingAdmin
    ? null
    : await PasswordService.hash(
        BOOTSTRAP_CONFIG.user.password,
      );

  const result = await prisma.$transaction(
    async (transaction) => {
      const employee =
        await transaction.employee.upsert({
          where: {
            employeeCode:
              BOOTSTRAP_CONFIG.employee.employeeCode,
          },
          update: {
            firstName:
              BOOTSTRAP_CONFIG.employee.firstName,
            lastName:
              BOOTSTRAP_CONFIG.employee.lastName,
            department:
              BOOTSTRAP_CONFIG.employee.department,
            title: BOOTSTRAP_CONFIG.employee.title,
            shiftCode:
              BOOTSTRAP_CONFIG.employee.shiftCode,
            isActive:
              BOOTSTRAP_CONFIG.employee.isActive,
            canUseRf:
              BOOTSTRAP_CONFIG.employee.canUseRf,
          },
          create: {
            employeeCode:
              BOOTSTRAP_CONFIG.employee.employeeCode,
            firstName:
              BOOTSTRAP_CONFIG.employee.firstName,
            lastName:
              BOOTSTRAP_CONFIG.employee.lastName,
            email:
              BOOTSTRAP_CONFIG.employee.email,
            department:
              BOOTSTRAP_CONFIG.employee.department,
            title: BOOTSTRAP_CONFIG.employee.title,
            shiftCode:
              BOOTSTRAP_CONFIG.employee.shiftCode,
            isActive:
              BOOTSTRAP_CONFIG.employee.isActive,
            canUseRf:
              BOOTSTRAP_CONFIG.employee.canUseRf,
          },
        });

      const role = await transaction.role.upsert({
        where: {
          code: BOOTSTRAP_CONFIG.role.code,
        },
        update: {
          name: BOOTSTRAP_CONFIG.role.name,
          description:
            BOOTSTRAP_CONFIG.role.description,
          isSystemRole:
            BOOTSTRAP_CONFIG.role.isSystemRole,
          isActive:
            BOOTSTRAP_CONFIG.role.isActive,
        },
        create: {
          code: BOOTSTRAP_CONFIG.role.code,
          name: BOOTSTRAP_CONFIG.role.name,
          description:
            BOOTSTRAP_CONFIG.role.description,
          isSystemRole:
            BOOTSTRAP_CONFIG.role.isSystemRole,
          isActive:
            BOOTSTRAP_CONFIG.role.isActive,
        },
      });

      const permission =
        await transaction.permission.upsert({
          where: {
            code: BOOTSTRAP_CONFIG.permission.code,
          },
          update: {
            name: BOOTSTRAP_CONFIG.permission.name,
            module:
              BOOTSTRAP_CONFIG.permission.module,
            description:
              BOOTSTRAP_CONFIG.permission.description,
            isActive:
              BOOTSTRAP_CONFIG.permission.isActive,
          },
          create: {
            code: BOOTSTRAP_CONFIG.permission.code,
            name: BOOTSTRAP_CONFIG.permission.name,
            module:
              BOOTSTRAP_CONFIG.permission.module,
            description:
              BOOTSTRAP_CONFIG.permission.description,
            isActive:
              BOOTSTRAP_CONFIG.permission.isActive,
          },
        });

      await transaction.rolePermission.upsert({
        where: {
          role_permission_unique: {
            roleId: role.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permission.id,
        },
      });

      let user;

      if (existingAdmin) {
        user = await transaction.user.update({
          where: {
            id: existingAdmin.id,
          },
          data: {
            employeeId: employee.id,
            email: BOOTSTRAP_CONFIG.user.email,
            userType:
              BOOTSTRAP_CONFIG.user.userType,
            status: BOOTSTRAP_CONFIG.user.status,
            isAdminUser:
              BOOTSTRAP_CONFIG.user.isAdminUser,
            isRfUser:
              BOOTSTRAP_CONFIG.user.isRfUser,
            failedLoginCount: 0,
            lockedAt: null,
            lastFailedLoginAt: null,
            sessionInvalidatedAt: null,
          },
        });
      } else {
        if (!passwordHash) {
          throw new Error(
            "Başlangıç kullanıcı şifresi oluşturulamadı.",
          );
        }

        user = await transaction.user.create({
          data: {
            employeeId: employee.id,
            username:
              BOOTSTRAP_CONFIG.user.username,
            email: BOOTSTRAP_CONFIG.user.email,
            passwordHash,
            userType:
              BOOTSTRAP_CONFIG.user.userType,
            status: BOOTSTRAP_CONFIG.user.status,
            mustChangePassword:
              BOOTSTRAP_CONFIG.user
                .mustChangePassword,
            isAdminUser:
              BOOTSTRAP_CONFIG.user.isAdminUser,
            isRfUser:
              BOOTSTRAP_CONFIG.user.isRfUser,
            failedLoginCount: 0,
          },
        });
      }

      await transaction.userRole.upsert({
        where: {
          user_role_unique: {
            userId: user.id,
            roleId: role.id,
          },
        },
        update: {},
        create: {
          userId: user.id,
          roleId: role.id,
        },
      });

      return {
        employee,
        user,
        role,
        permission,
        adminAlreadyExisted: Boolean(existingAdmin),
      };
    },
    {
      isolationLevel:
        Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 10_000,
      timeout: 30_000,
    },
  );

  console.log("Employee kaydı hazır:");
  console.log(
    `  ${result.employee.employeeCode} - ${result.employee.firstName} ${result.employee.lastName}`,
  );
  console.log("");

  console.log("Sistem rolü hazır:");
  console.log(
    `  ${result.role.code} - ${result.role.name}`,
  );
  console.log("");

  console.log("Başlangıç izni hazır:");
  console.log(
    `  ${result.permission.code} - ${result.permission.name}`,
  );
  console.log("");

  if (result.adminAlreadyExisted) {
    console.log(
      "Admin kullanıcısı daha önce oluşturulmuş.",
    );
    console.log(
      "Mevcut şifre değiştirilmeden rol ve kullanıcı bilgileri doğrulandı.",
    );
  } else {
    console.log(
      "İlk sistem yöneticisi başarıyla oluşturuldu.",
    );
    console.log("");
    console.log(
      `Kullanıcı adı : ${BOOTSTRAP_CONFIG.user.username}`,
    );
    console.log(
      `Geçici şifre  : ${BOOTSTRAP_CONFIG.user.password}`,
    );
  }

  console.log("");
  console.log(
    "Admin paneli : http://localhost:3000/login",
  );
  console.log(
    "RF terminali : http://localhost:3000/rf/login",
  );
  console.log("");
  console.log("========================================");
  console.log("ETKEN WMS ilk kurulum işlemi tamamlandı.");
  console.log("========================================");
}

bootstrap()
  .catch((error: unknown) => {
    console.error("");
    console.error("Bootstrap işlemi başarısız oldu.");

    if (error instanceof Error) {
      console.error(error.message);
      console.error(error.stack);
    } else {
      console.error(error);
    }

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });