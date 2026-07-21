import {
  randomInt,
} from "node:crypto";

import {
  Prisma,
  UserStatus,
  UserType,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

import { PASSWORD_POLICY } from "@/modules/auth/constants/password-policy.constants";

import { PasswordService } from "@/modules/auth/services/password.service";

import type {
  AssignableRole,
  CreateUserInput,
  CreateUserResult,
} from "@/modules/users/types/create-user.types";

const USERNAME_PATTERN =
  /^[a-z0-9][a-z0-9._-]{2,49}$/;

const EMPLOYEE_CODE_PATTERN =
  /^[A-Z0-9][A-Z0-9_-]{1,29}$/;

const EMAIL_PATTERN =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class UserCreationError extends Error {
  constructor(
    message: string,
    public readonly field:
      string | null = null
  ) {
    super(message);

    this.name =
      "UserCreationError";
  }
}

function normalizeOptionalText(
  value: string
) {
  const normalized =
    value.trim();

  return normalized || null;
}

function pickCharacter(
  characters: string
) {
  return characters[
    randomInt(
      characters.length
    )
  ];
}

function shuffleCharacters(
  characters: string[]
) {
  for (
    let index =
      characters.length - 1;
    index > 0;
    index -= 1
  ) {
    const targetIndex =
      randomInt(index + 1);

    [
      characters[index],
      characters[targetIndex],
    ] = [
      characters[targetIndex],
      characters[index],
    ];
  }

  return characters;
}

export class UserCreationService {
  static async listAssignableRoles(): Promise<
    AssignableRole[]
  > {
    return prisma.role.findMany({
      where: {
        isActive: true,
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
    });
  }

  static generateTemporaryPassword(
    length = 14
  ) {
    const upper =
      "ABCDEFGHJKLMNPQRSTUVWXYZ";

    const lower =
      "abcdefghijkmnopqrstuvwxyz";

    const digits =
      "23456789";

    const special =
      "!@#$%*-_?";

    const all =
      `${upper}${lower}${digits}${special}`;

    const passwordCharacters = [
      pickCharacter(upper),
      pickCharacter(lower),
      pickCharacter(digits),
      pickCharacter(special),
    ];

    while (
      passwordCharacters.length <
      length
    ) {
      passwordCharacters.push(
        pickCharacter(all)
      );
    }

    return shuffleCharacters(
      passwordCharacters
    ).join("");
  }

  static validateTemporaryPassword(
    password: string
  ) {
    if (
      password.length <
        PASSWORD_POLICY.MIN_LENGTH ||
      password.length >
        PASSWORD_POLICY.MAX_LENGTH
    ) {
      throw new UserCreationError(
        `Geçici şifre ${PASSWORD_POLICY.MIN_LENGTH}-${PASSWORD_POLICY.MAX_LENGTH} karakter olmalıdır.`,
        "temporaryPassword"
      );
    }

    if (
      !/[A-Z]/.test(password)
    ) {
      throw new UserCreationError(
        "Geçici şifre en az bir büyük harf içermelidir.",
        "temporaryPassword"
      );
    }

    if (
      !/[a-z]/.test(password)
    ) {
      throw new UserCreationError(
        "Geçici şifre en az bir küçük harf içermelidir.",
        "temporaryPassword"
      );
    }

    if (
      !/[0-9]/.test(password)
    ) {
      throw new UserCreationError(
        "Geçici şifre en az bir rakam içermelidir.",
        "temporaryPassword"
      );
    }

    if (
      !/[^A-Za-z0-9]/.test(
        password
      )
    ) {
      throw new UserCreationError(
        "Geçici şifre en az bir özel karakter içermelidir.",
        "temporaryPassword"
      );
    }
  }

  static async createUser(
    input: CreateUserInput,
    createdById: string
  ): Promise<CreateUserResult> {
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

    if (
      !EMPLOYEE_CODE_PATTERN.test(
        employeeCode
      )
    ) {
      throw new UserCreationError(
        "Personel kodu 2-30 karakter olmalı; yalnızca harf, rakam, alt çizgi ve tire içermelidir.",
        "employeeCode"
      );
    }

    if (
      firstName.length < 2 ||
      firstName.length > 60
    ) {
      throw new UserCreationError(
        "Ad 2-60 karakter olmalıdır.",
        "firstName"
      );
    }

    if (
      lastName.length < 2 ||
      lastName.length > 60
    ) {
      throw new UserCreationError(
        "Soyad 2-60 karakter olmalıdır.",
        "lastName"
      );
    }

    if (
      !USERNAME_PATTERN.test(
        username
      )
    ) {
      throw new UserCreationError(
        "Kullanıcı adı 3-50 karakter olmalı; küçük harf, rakam, nokta, alt çizgi veya tire kullanılmalıdır.",
        "username"
      );
    }

    if (
      email &&
      !EMAIL_PATTERN.test(email)
    ) {
      throw new UserCreationError(
        "Geçerli bir e-posta adresi girin.",
        "email"
      );
    }

    if (
      !Object.values(
        UserType
      ).includes(
        input.userType
      )
    ) {
      throw new UserCreationError(
        "Geçersiz kullanıcı tipi seçildi.",
        "userType"
      );
    }

    const roleIds =
      Array.from(
        new Set(
          input.roleIds
            .map(
              (roleId) =>
                roleId.trim()
            )
            .filter(Boolean)
        )
      );

    if (
      input.isAdminUser &&
      roleIds.length === 0
    ) {
      throw new UserCreationError(
        "Yönetici kullanıcı için SYSTEM_ADMIN rolünü seçin.",
        "roleIds"
      );
    }

    const [
      existingEmployee,
      existingUser,
      selectedRoles,
    ] = await Promise.all([
      prisma.employee.findFirst({
        where: {
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

      prisma.user.findFirst({
        where: {
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

    if (existingEmployee) {
      throw new UserCreationError(
        existingEmployee
          .employeeCode ===
          employeeCode
          ? "Bu personel kodu zaten kullanılıyor."
          : "Bu e-posta adresine bağlı bir personel zaten var.",

        existingEmployee
          .employeeCode ===
          employeeCode
          ? "employeeCode"
          : "email"
      );
    }

    if (existingUser) {
      throw new UserCreationError(
        existingUser.username ===
          username
          ? "Bu kullanıcı adı zaten kullanılıyor."
          : "Bu e-posta adresine bağlı bir kullanıcı zaten var.",

        existingUser.username ===
          username
          ? "username"
          : "email"
      );
    }

    if (
      selectedRoles.length !==
      roleIds.length
    ) {
      throw new UserCreationError(
        "Seçilen rollerden biri bulunamadı veya pasif durumda.",
        "roleIds"
      );
    }

    if (
      input.isAdminUser &&
      !selectedRoles.some(
        (role) =>
          role.code ===
          "SYSTEM_ADMIN"
      )
    ) {
      throw new UserCreationError(
        "Yönetici kullanıcı için SYSTEM_ADMIN rolünü seçin.",
        "roleIds"
      );
    }

    if (
      !input.isAdminUser &&
      selectedRoles.some(
        (role) =>
          role.code ===
          "SYSTEM_ADMIN"
      )
    ) {
      throw new UserCreationError(
        "SYSTEM_ADMIN rolü yalnızca yönetici kullanıcıya atanabilir.",
        "roleIds"
      );
    }

    const temporaryPassword =
      input.temporaryPassword
        .trim() ||
      this.generateTemporaryPassword();

    this.validateTemporaryPassword(
      temporaryPassword
    );

    const passwordHash =
      await PasswordService.hash(
        temporaryPassword
      );

    try {
      return await prisma.$transaction(
        async (transaction) => {
          const employee =
            await transaction.employee.create({
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
                  input.isRfUser ||
                  input.userType ===
                    UserType.RF_OPERATOR,
              },
            });

          const user =
            await transaction.user.create({
              data: {
                employeeId:
                  employee.id,

                username,
                email,
                passwordHash,

                userType:
                  input.userType,

                status:
                  UserStatus.ACTIVE,

                mustChangePassword: true,
                failedLoginCount: 0,

                isRfUser:
                  input.isRfUser ||
                  input.userType ===
                    UserType.RF_OPERATOR,

                isAdminUser:
                  input.isAdminUser,

                createdById,
                updatedById:
                  createdById,
              },
            });

          if (
            selectedRoles.length >
            0
          ) {
            await transaction.userRole.createMany({
              data:
                selectedRoles.map(
                  (role) => ({
                    userId:
                      user.id,

                    roleId:
                      role.id,

                    assignedById:
                      createdById,
                  })
                ),
            });
          }

          return {
            userId:
              user.id,

            employeeId:
              employee.id,

            username:
              user.username,

            employeeCode:
              employee.employeeCode,

            fullName:
              `${employee.firstName} ${employee.lastName}`,

            temporaryPassword,
          };
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
        throw new UserCreationError(
          "Kullanıcı adı, personel kodu veya e-posta başka bir kayıtta kullanılıyor."
        );
      }

      throw error;
    }
  }
}