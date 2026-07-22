"use server";

import {
  UserStatus,
  UserType,
} from "@prisma/client";

import {
  revalidatePath,
} from "next/cache";

import {
  redirect,
} from "next/navigation";

import { prisma } from "@/lib/prisma";

import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

const USERS_PATH =
  "/admin/users";

async function requireUserManager() {
  return AuthorizationService.requirePermission(
    "USER_MANAGE"
  );
}

function readRequiredText(
  formData: FormData,
  fieldName: string
) {
  const value =
    String(
      formData.get(fieldName) ??
        ""
    ).trim();

  if (!value) {
    throw new Error(
      "İşlem için gerekli kullanıcı bilgisi eksik."
    );
  }

  return value;
}

function getErrorMessage(
  error: unknown
) {
  return error instanceof Error
    ? error.message
    : "İşlem tamamlanamadı.";
}

function createResultUrl(
  type: "success" | "error",
  message: string
) {
  const params =
    new URLSearchParams({
      [type]: message,
    });

  return `${USERS_PATH}?${params.toString()}`;
}

export async function setUserStatusAction(
  formData: FormData
): Promise<void> {
  const currentUser =
    await requireUserManager();

  let successMessage = "";

  try {
    const userId =
      readRequiredText(
        formData,
        "userId"
      );

    const statusValue =
      readRequiredText(
        formData,
        "status"
      );

    if (
      statusValue !==
        UserStatus.ACTIVE &&
      statusValue !==
        UserStatus.PASSIVE
    ) {
      throw new Error(
        "Geçersiz kullanıcı durumu seçildi."
      );
    }

    if (
      currentUser.id === userId &&
      statusValue !==
        UserStatus.ACTIVE
    ) {
      throw new Error(
        "Kendi yönetici hesabınızı pasif yapamazsınız."
      );
    }

    const now = new Date();

    const targetUser =
      await prisma.$transaction(
        async (transaction) => {
          const user =
            await transaction.user.findUnique({
              where: {
                id: userId,
              },

              select: {
                id: true,
                username: true,
                status: true,
              },
            });

          if (!user) {
            throw new Error(
              "Kullanıcı bulunamadı."
            );
          }

          const statusChanged =
            user.status !==
            statusValue;

          if (!statusChanged) {
            return user;
          }

          await transaction.user.update({
            where: {
              id: userId,
            },

            data: {
              status:
                statusValue,

              failedLoginCount:
                statusValue ===
                UserStatus.ACTIVE
                  ? 0
                  : undefined,

              lockedAt:
                statusValue ===
                UserStatus.ACTIVE
                  ? null
                  : undefined,

              sessionInvalidatedAt:
                now,

              updatedById:
                currentUser.id,
            },
          });

          await transaction.authSession.updateMany({
            where: {
              userId,
              revokedAt: null,
            },

            data: {
              revokedAt: now,

              revokeReason:
                statusValue ===
                UserStatus.ACTIVE
                  ? "Kullanıcı hesabı yeniden aktif edildi."
                  : "Kullanıcı hesabı pasif yapıldı.",

              revokedById:
                currentUser.id,
            },
          });

          return user;
        },
        {
          maxWait: 10000,
          timeout: 20000,
        }
      );

    successMessage =
      `${targetUser.username} kullanıcısı ` +
      (
        statusValue ===
        UserStatus.ACTIVE
          ? "aktif"
          : "pasif"
      ) +
      " yapıldı.";
  } catch (error) {
    redirect(
      createResultUrl(
        "error",
        getErrorMessage(error)
      )
    );
  }

  revalidatePath(
    USERS_PATH
  );

  redirect(
    createResultUrl(
      "success",
      successMessage
    )
  );
}

export async function setRfAccessAction(
  formData: FormData
): Promise<void> {
  const currentUser =
    await requireUserManager();

  let successMessage = "";

  try {
    const userId =
      readRequiredText(
        formData,
        "userId"
      );

    const enabledValue =
      readRequiredText(
        formData,
        "enabled"
      );

    if (
      enabledValue !== "true" &&
      enabledValue !== "false"
    ) {
      throw new Error(
        "Geçersiz RF erişim değeri."
      );
    }

    const isRfUser =
      enabledValue === "true";

    const now = new Date();

    const user =
      await prisma.$transaction(
        async (transaction) => {
          const targetUser =
            await transaction.user.findUnique({
              where: {
                id: userId,
              },

              select: {
                id: true,
                username: true,
                employeeId: true,
                userType: true,
                isRfUser: true,
              },
            });

          if (!targetUser) {
            throw new Error(
              "Kullanıcı bulunamadı."
            );
          }

          if (
            !isRfUser &&
            targetUser.userType ===
              UserType.RF_OPERATOR
          ) {
            throw new Error(
              "RF_OPERATOR kullanıcı tipindeki kişinin RF erişimi kapatılamaz. Önce kullanıcı düzenleme ekranından kullanıcı tipini değiştirin."
            );
          }

          if (
            isRfUser &&
            !targetUser.employeeId
          ) {
            throw new Error(
              "RF erişimi açmak için kullanıcıya bağlı bir personel kaydı bulunmalıdır."
            );
          }

          if (
            targetUser.isRfUser ===
            isRfUser
          ) {
            return targetUser;
          }

          await transaction.user.update({
            where: {
              id: userId,
            },

            data: {
              isRfUser,

              sessionInvalidatedAt:
                now,

              updatedById:
                currentUser.id,
            },
          });

          if (
            targetUser.employeeId
          ) {
            await transaction.employee.update({
              where: {
                id:
                  targetUser.employeeId,
              },

              data: {
                canUseRf:
                  isRfUser,
              },
            });
          }

          await transaction.authSession.updateMany({
            where: {
              userId,
              revokedAt: null,
            },

            data: {
              revokedAt: now,

              revokeReason:
                isRfUser
                  ? "Kullanıcının RF terminal erişimi açıldı."
                  : "Kullanıcının RF terminal erişimi kapatıldı.",

              revokedById:
                currentUser.id,
            },
          });

          return targetUser;
        },
        {
          maxWait: 10000,
          timeout: 20000,
        }
      );

    successMessage =
      `${user.username} kullanıcısının RF erişimi ` +
      (
        isRfUser
          ? "açıldı"
          : "kapatıldı"
      ) +
      ". Açık oturumları sonlandırıldı.";
  } catch (error) {
    redirect(
      createResultUrl(
        "error",
        getErrorMessage(error)
      )
    );
  }

  revalidatePath(
    USERS_PATH
  );

  redirect(
    createResultUrl(
      "success",
      successMessage
    )
  );
}

export async function revokeUserSessionsAction(
  formData: FormData
): Promise<void> {
  const currentUser =
    await requireUserManager();

  let successMessage = "";

  try {
    const userId =
      readRequiredText(
        formData,
        "userId"
      );

    if (
      currentUser.id ===
      userId
    ) {
      throw new Error(
        "Bu ekrandan kendi oturumlarınızı sonlandıramazsınız."
      );
    }

    const now = new Date();

    const result =
      await prisma.$transaction(
        async (transaction) => {
          const user =
            await transaction.user.findUnique({
              where: {
                id: userId,
              },

              select: {
                username: true,
              },
            });

          if (!user) {
            throw new Error(
              "Kullanıcı bulunamadı."
            );
          }

          const revoked =
            await transaction.authSession.updateMany({
              where: {
                userId,
                revokedAt: null,

                expiresAt: {
                  gt: now,
                },
              },

              data: {
                revokedAt: now,

                revokeReason:
                  "Yönetici tarafından sonlandırıldı.",

                revokedById:
                  currentUser.id,
              },
            });

          await transaction.user.update({
            where: {
              id: userId,
            },

            data: {
              sessionInvalidatedAt:
                now,

              updatedById:
                currentUser.id,
            },
          });

          return {
            username:
              user.username,

            revokedCount:
              revoked.count,
          };
        },
        {
          maxWait: 10000,
          timeout: 20000,
        }
      );

    successMessage =
      `${result.username} kullanıcısının ` +
      `${result.revokedCount} aktif oturumu sonlandırıldı.`;
  } catch (error) {
    redirect(
      createResultUrl(
        "error",
        getErrorMessage(error)
      )
    );
  }

  revalidatePath(
    USERS_PATH
  );

  redirect(
    createResultUrl(
      "success",
      successMessage
    )
  );
}