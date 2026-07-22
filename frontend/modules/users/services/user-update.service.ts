import {
  Prisma,
  UserStatus,
  UserType,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

import type {
  UpdateUserInput,
  UserEditPageData,
} from "@/modules/users/types/update-user.types";

const USERNAME_PATTERN =
  /^[a-z0-9][a-z0-9._-]{2,49}$/;

const EMPLOYEE_CODE_PATTERN =
  /^[A-Z0-9][A-Z0-9_-]{1,29}$/;

const EMAIL_PATTERN =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class UserUpdateError extends Error {
  constructor(
    message: string,
    public readonly field:
      string | null = null
  ) {
    super(message);
    this.name = "UserUpdateError";
  }
}

function normalizeOptionalText(
  value: string
) {
  const normalized =
    value.trim();

  return normalized || null;
}

function haveSameValues(
  firstValues: string[],
  secondValues: string[]
) {
  if (
    firstValues.length !==
    secondValues.length
  ) {
    return false;
  }

  const firstValueSet =
    new Set(firstValues);

  return secondValues.every(
    (value) =>
      firstValueSet.has(value)
  );
}

export class UserUpdateService {
  static async getEditPageData(
    userId: string
  ): Promise<UserEditPageData> {
    const [user, roles] =
      await Promise.all([
        prisma.user.findUnique({
          where: {
            id: userId,
          },

          select: {
            id: true,
            employeeId: true,
            username: true,
            email: true,
            userType: true,
            status: true,
            isRfUser: true,
            isAdminUser: true,

            employee: {
              select: {
                employeeCode: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                department: true,
                title: true,
                shiftCode: true,
              },
            },

            userRoles: {
              select: {
                roleId: true,
              },
            },
          },
        }),

        prisma.role.findMany({
          where: {
            OR: [
              {
                isActive: true,
              },
              {
                userRoles: {
                  some: {
                    userId,
                  },
                },
              },
            ],
          },

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
          },
        }),
      ]);

    if (!user) {
      return {
        user: null,
        roles,
      };
    }

    return {
      user: {
        id: user.id,

        employeeId:
          user.employeeId,

        username:
          user.username,

        email:
          user.email ??
          user.employee?.email ??
          "",

        userType:
          user.userType,

        status:
          user.status,

        isRfUser:
          user.isRfUser,

        isAdminUser:
          user.isAdminUser,

        employeeCode:
          user.employee
            ?.employeeCode ?? "",

        firstName:
          user.employee
            ?.firstName ?? "",

        lastName:
          user.employee
            ?.lastName ?? "",

        phone:
          user.employee?.phone ??
          "",

        department:
          user.employee
            ?.department ?? "",

        title:
          user.employee?.title ??
          "",

        shiftCode:
          user.employee
            ?.shiftCode ?? "",

        roleIds:
          user.userRoles.map(
            (userRole) =>
              userRole.roleId
          ),
      },

      roles,
    };
  }

  static async updateUser(
    userId: string,
    input: UpdateUserInput,
    updatedById: string
  ) {
    const normalizedUserId =
      userId.trim();

    const employeeCode =
      input.employeeCode
        .trim()
        .toUpperCase();

    const firstName =
      input.firstName.trim();

    const lastName =
      input.lastName.trim();

    const username =
      input.username
        .trim()
        .toLowerCase();

    const email =
      normalizeOptionalText(
        input.email
      )?.toLowerCase() ?? null;

    if (!normalizedUserId) {
      throw new UserUpdateError(
        "Güncellenecek kullanıcı bilgisi eksik."
      );
    }

    if (
      !EMPLOYEE_CODE_PATTERN.test(
        employeeCode
      )
    ) {
      throw new UserUpdateError(
        "Personel kodu 2-30 karakter olmalı; yalnızca harf, rakam, alt çizgi ve tire içermelidir.",
        "employeeCode"
      );
    }

    if (
      firstName.length < 2 ||
      firstName.length > 60
    ) {
      throw new UserUpdateError(
        "Ad 2-60 karakter olmalıdır.",
        "firstName"
      );
    }

    if (
      lastName.length < 2 ||
      lastName.length > 60
    ) {
      throw new UserUpdateError(
        "Soyad 2-60 karakter olmalıdır.",
        "lastName"
      );
    }

    if (
      !USERNAME_PATTERN.test(
        username
      )
    ) {
      throw new UserUpdateError(
        "Kullanıcı adı 3-50 karakter olmalı; küçük harf, rakam, nokta, alt çizgi veya tire kullanılmalıdır.",
        "username"
      );
    }

    if (
      email &&
      !EMAIL_PATTERN.test(email)
    ) {
      throw new UserUpdateError(
        "Geçerli bir e-posta adresi girin.",
        "email"
      );
    }

    if (
      !Object.values(
        UserType
      ).includes(input.userType)
    ) {
      throw new UserUpdateError(
        "Geçersiz kullanıcı tipi seçildi.",
        "userType"
      );
    }

    if (
      !Object.values(
        UserStatus
      ).includes(input.status)
    ) {
      throw new UserUpdateError(
        "Geçersiz kullanıcı durumu seçildi.",
        "status"
      );
    }

    const roleIds =
      Array.from(
        new Set(
          input.roleIds
            .map((roleId) =>
              roleId.trim()
            )
            .filter(Boolean)
        )
      );

    const targetUser =
      await prisma.user.findUnique({
        where: {
          id: normalizedUserId,
        },

        select: {
          id: true,
          employeeId: true,
          username: true,
          userType: true,
          status: true,
          isRfUser: true,
          isAdminUser: true,

          employee: {
            select: {
              canUseRf: true,
            },
          },

          userRoles: {
            select: {
              roleId: true,
            },
          },
        },
      });

    if (!targetUser) {
      throw new UserUpdateError(
        "Güncellenecek kullanıcı bulunamadı."
      );
    }

    if (
      targetUser.id ===
        updatedById &&
      input.status !==
        UserStatus.ACTIVE
    ) {
      throw new UserUpdateError(
        "Kendi hesabınızın durumunu aktif dışında bir değere çeviremezsiniz.",
        "status"
      );
    }

    if (
      targetUser.id ===
        updatedById &&
      targetUser.isAdminUser &&
      !input.isAdminUser
    ) {
      throw new UserUpdateError(
        "Kendi yönetici yetkinizi kaldıramazsınız.",
        "isAdminUser"
      );
    }

    const employeeExclusion =
      targetUser.employeeId
        ? {
            id: {
              not:
                targetUser.employeeId,
            },
          }
        : {};

    const [
      existingUser,
      existingEmployee,
      selectedRoles,
    ] = await Promise.all([
      prisma.user.findFirst({
        where: {
          id: {
            not:
              normalizedUserId,
          },

          OR: [
            {
              username,
            },

            ...(email
              ? [
                  {
                    email,
                  },
                ]
              : []),
          ],
        },

        select: {
          username: true,
          email: true,
        },
      }),

      prisma.employee.findFirst({
        where: {
          ...employeeExclusion,

          OR: [
            {
              employeeCode,
            },

            ...(email
              ? [
                  {
                    email,
                  },
                ]
              : []),
          ],
        },

        select: {
          employeeCode: true,
          email: true,
        },
      }),

      prisma.role.findMany({
        where: {
          id: {
            in: roleIds,
          },

          isActive: true,
        },

        select: {
          id: true,
          code: true,
        },
      }),
    ]);

    if (existingUser) {
      throw new UserUpdateError(
        existingUser.username ===
          username
          ? "Bu kullanıcı adı başka bir kullanıcı tarafından kullanılıyor."
          : "Bu e-posta adresi başka bir kullanıcı tarafından kullanılıyor.",

        existingUser.username ===
          username
          ? "username"
          : "email"
      );
    }

    if (existingEmployee) {
      throw new UserUpdateError(
        existingEmployee.employeeCode ===
          employeeCode
          ? "Bu personel kodu başka bir personel tarafından kullanılıyor."
          : "Bu e-posta adresi başka bir personel tarafından kullanılıyor.",

        existingEmployee.employeeCode ===
          employeeCode
          ? "employeeCode"
          : "email"
      );
    }

    if (
      selectedRoles.length !==
      roleIds.length
    ) {
      throw new UserUpdateError(
        "Seçilen rollerden biri bulunamadı veya pasif durumda.",
        "roleIds"
      );
    }

    const hasSystemAdminRole =
      selectedRoles.some(
        (role) =>
          role.code ===
          "SYSTEM_ADMIN"
      );

    if (
      input.isAdminUser &&
      !hasSystemAdminRole
    ) {
      throw new UserUpdateError(
        "Yönetici kullanıcı için SYSTEM_ADMIN rolünü seçin.",
        "roleIds"
      );
    }

    if (
      !input.isAdminUser &&
      hasSystemAdminRole
    ) {
      throw new UserUpdateError(
        "SYSTEM_ADMIN rolü yalnızca yönetici kullanıcıya atanabilir.",
        "roleIds"
      );
    }

    const isRfUser =
      input.isRfUser ||
      input.userType ===
        UserType.RF_OPERATOR;

    const selectedRoleIds =
      selectedRoles.map(
        (role) => role.id
      );

    const currentRoleIds =
      targetUser.userRoles.map(
        (userRole) =>
          userRole.roleId
      );

    const accessChanged =
      targetUser.status !==
        input.status ||
      targetUser.userType !==
        input.userType ||
      targetUser.isRfUser !==
        isRfUser ||
      targetUser.isAdminUser !==
        input.isAdminUser ||
      Boolean(
        targetUser.employee
          ?.canUseRf
      ) !== isRfUser ||
      !haveSameValues(
        currentRoleIds,
        selectedRoleIds
      );

    const now = new Date();

    try {
      return await prisma.$transaction(
        async (transaction) => {
          const employee =
            targetUser.employeeId
              ? await transaction.employee.update({
                  where: {
                    id:
                      targetUser.employeeId,
                  },

                  data: {
                    employeeCode,
                    firstName,
                    lastName,
                    email,

                    phone:
                      normalizeOptionalText(
                        input.phone
                      ),

                    department:
                      normalizeOptionalText(
                        input.department
                      ),

                    title:
                      normalizeOptionalText(
                        input.title
                      ),

                    shiftCode:
                      normalizeOptionalText(
                        input.shiftCode
                      ),

                    canUseRf:
                      isRfUser,
                  },

                  select: {
                    id: true,
                  },
                })
              : await transaction.employee.create({
                  data: {
                    employeeCode,
                    firstName,
                    lastName,
                    email,

                    phone:
                      normalizeOptionalText(
                        input.phone
                      ),

                    department:
                      normalizeOptionalText(
                        input.department
                      ),

                    title:
                      normalizeOptionalText(
                        input.title
                      ),

                    shiftCode:
                      normalizeOptionalText(
                        input.shiftCode
                      ),

                    isActive: true,

                    canUseRf:
                      isRfUser,
                  },

                  select: {
                    id: true,
                  },
                });

          const user =
            await transaction.user.update({
              where: {
                id:
                  normalizedUserId,
              },

              data: {
                employeeId:
                  employee.id,

                username,
                email,

                userType:
                  input.userType,

                status:
                  input.status,

                isRfUser,

                isAdminUser:
                  input.isAdminUser,

                failedLoginCount:
                  input.status ===
                  UserStatus.ACTIVE
                    ? 0
                    : undefined,

                lockedAt:
                  input.status ===
                  UserStatus.ACTIVE
                    ? null
                    : undefined,

                sessionInvalidatedAt:
                  accessChanged
                    ? now
                    : undefined,

                updatedById,
              },

              select: {
                id: true,
                username: true,
              },
            });

          await transaction.userRole.deleteMany({
            where: {
              userId:
                normalizedUserId,
            },
          });

          if (
            selectedRoles.length > 0
          ) {
            await transaction.userRole.createMany({
              data:
                selectedRoles.map(
                  (role) => ({
                    userId:
                      normalizedUserId,

                    roleId:
                      role.id,

                    assignedById:
                      updatedById,
                  })
                ),
            });
          }

          if (accessChanged) {
            await transaction.authSession.updateMany({
              where: {
                userId:
                  normalizedUserId,

                revokedAt: null,
              },

              data: {
                revokedAt: now,

                revokeReason:
                  "Kullanıcının durum, rol veya erişim bilgileri değiştirildi.",

                revokedById:
                  updatedById,
              },
            });
          }

          return user;
        },
        {
          maxWait: 10000,
          timeout: 20000,
        }
      );
    } catch (error) {
      if (
        error instanceof
          Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new UserUpdateError(
          "Kullanıcı adı, personel kodu veya e-posta başka bir kayıtta kullanılıyor."
        );
      }

      throw error;
    }
  }
}