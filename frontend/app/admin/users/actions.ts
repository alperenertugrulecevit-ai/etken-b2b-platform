"use server";

import {
  UserStatus,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { SessionService } from "@/modules/auth/services/session.service";

const USERS_PATH = "/admin/users";

async function requireAdminUser() {
  const currentUser =
    await SessionService.getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (!currentUser.isAdminUser) {
    redirect("/admin");
  }

  return currentUser;
}

function readRequiredText(
  formData: FormData,
  fieldName: string
) {
  const value = String(
    formData.get(fieldName) ?? ""
  ).trim();

  if (!value) {
    throw new Error(
      "İşlem için gerekli kullanıcı bilgisi eksik."
    );
  }

  return value;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "İşlem tamamlanamadı.";
}

function createResultUrl(
  type: "success" | "error",
  message: string
) {
  const params = new URLSearchParams({
    [type]: message,
  });

  return `${USERS_PATH}?${params.toString()}`;
}

export async function setUserStatusAction(
  formData: FormData
): Promise<void> {
  const currentUser = await requireAdminUser();
  let successMessage = "";

  try {
    const userId = readRequiredText(
      formData,
      "userId"
    );

    const statusValue = readRequiredText(
      formData,
      "status"
    );

    if (
      statusValue !== UserStatus.ACTIVE &&
      statusValue !== UserStatus.PASSIVE
    ) {
      throw new Error(
        "Geçersiz kullanıcı durumu seçildi."
      );
    }

    if (
      currentUser.id === userId &&
      statusValue !== UserStatus.ACTIVE
    ) {
      throw new Error(
        "Kendi yönetici hesabınızı pasif yapamazsınız."
      );
    }

    const now = new Date();

    const targetUser = await prisma.$transaction(
      async (transaction) => {
        const user =
          await transaction.user.findUnique({
            where: {
              id: userId,
            },
            select: {
              id: true,
              username: true,
            },
          });

        if (!user) {
          throw new Error(
            "Kullanıcı bulunamadı."
          );
        }

        await transaction.user.update({
          where: {
            id: userId,
          },
          data: {
            status: statusValue,
            failedLoginCount:
              statusValue === UserStatus.ACTIVE
                ? 0
                : undefined,
            lockedAt:
              statusValue === UserStatus.ACTIVE
                ? null
                : undefined,
            sessionInvalidatedAt:
              statusValue === UserStatus.ACTIVE
                ? null
                : now,
          },
        });

        if (
          statusValue !== UserStatus.ACTIVE
        ) {
          await transaction.authSession.updateMany({
            where: {
              userId,
              revokedAt: null,
            },
            data: {
              revokedAt: now,
              revokeReason:
                "Kullanıcı hesabı pasif yapıldı.",
              revokedById: currentUser.id,
            },
          });
        }

        return user;
      }
    );

    successMessage =
      `${targetUser.username} kullanıcısı ${
        statusValue === UserStatus.ACTIVE
          ? "aktif"
          : "pasif"
      } yapıldı.`;
  } catch (error) {
    redirect(
      createResultUrl(
        "error",
        getErrorMessage(error)
      )
    );
  }

  revalidatePath(USERS_PATH);
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
  await requireAdminUser();
  let successMessage = "";

  try {
    const userId = readRequiredText(
      formData,
      "userId"
    );

    const enabledValue = readRequiredText(
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

    const isRfUser = enabledValue === "true";

    const user = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        isRfUser,
      },
      select: {
        username: true,
      },
    });

    successMessage =
      `${user.username} kullanıcısının RF erişimi ${
        isRfUser ? "açıldı" : "kapatıldı"
      }.`;
  } catch (error) {
    redirect(
      createResultUrl(
        "error",
        getErrorMessage(error)
      )
    );
  }

  revalidatePath(USERS_PATH);
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
  const currentUser = await requireAdminUser();
  let successMessage = "";

  try {
    const userId = readRequiredText(
      formData,
      "userId"
    );

    if (currentUser.id === userId) {
      throw new Error(
        "Bu ekrandan kendi oturumlarınızı sonlandıramazsınız."
      );
    }

    const now = new Date();

    const result = await prisma.$transaction(
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
              revokedById: currentUser.id,
            },
          });

        await transaction.user.update({
          where: {
            id: userId,
          },
          data: {
            sessionInvalidatedAt: now,
          },
        });

        return {
          username: user.username,
          revokedCount: revoked.count,
        };
      }
    );

    successMessage =
      `${result.username} kullanıcısının ${result.revokedCount} aktif oturumu sonlandırıldı.`;
  } catch (error) {
    redirect(
      createResultUrl(
        "error",
        getErrorMessage(error)
      )
    );
  }

  revalidatePath(USERS_PATH);
  redirect(
    createResultUrl(
      "success",
      successMessage
    )
  );
}