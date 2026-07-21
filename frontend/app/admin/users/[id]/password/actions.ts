"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";

import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

import { PASSWORD_POLICY } from "@/modules/auth/constants/password-policy.constants";

import { PasswordService } from "@/modules/auth/services/password.service";

import { SessionService } from "@/modules/auth/services/session.service";

export type ResetUserPasswordState = {
  success: boolean;
  message: string;
};

function validatePassword(
  password: string
) {
  if (
    password.length <
      PASSWORD_POLICY.MIN_LENGTH ||
    password.length >
      PASSWORD_POLICY.MAX_LENGTH
  ) {
    return `Şifre ${PASSWORD_POLICY.MIN_LENGTH}-${PASSWORD_POLICY.MAX_LENGTH} karakter olmalıdır.`;
  }

  if (!/[A-Z]/.test(password)) {
    return "Şifre en az bir büyük harf içermelidir.";
  }

  if (!/[a-z]/.test(password)) {
    return "Şifre en az bir küçük harf içermelidir.";
  }

  if (!/[0-9]/.test(password)) {
    return "Şifre en az bir rakam içermelidir.";
  }

  if (
    !/[^A-Za-z0-9]/.test(password)
  ) {
    return "Şifre en az bir özel karakter içermelidir.";
  }

  return null;
}

export async function resetUserPasswordAction(
  userId: string,
  _previousState: ResetUserPasswordState,
  formData: FormData
): Promise<ResetUserPasswordState> {
  const currentUser =
    await AuthorizationService.requirePermission(
      "USER_MANAGE"
    );

  const normalizedUserId =
    userId.trim();

  if (!normalizedUserId) {
    return {
      success: false,
      message:
        "Şifresi sıfırlanacak kullanıcı bulunamadı.",
    };
  }

  const temporaryPassword = String(
    formData.get(
      "temporaryPassword"
    ) ?? ""
  ).trim();

  const confirmPassword = String(
    formData.get(
      "confirmPassword"
    ) ?? ""
  ).trim();

  const passwordError =
    validatePassword(
      temporaryPassword
    );

  if (passwordError) {
    return {
      success: false,
      message: passwordError,
    };
  }

  if (
    temporaryPassword !==
    confirmPassword
  ) {
    return {
      success: false,
      message:
        "Şifre ve şifre tekrarı eşleşmiyor.",
    };
  }

  try {
    const user =
      await prisma.user.findUnique({
        where: {
          id: normalizedUserId,
        },

        select: {
          id: true,
          username: true,
          status: true,
        },
      });

    if (!user) {
      return {
        success: false,
        message:
          "Şifresi sıfırlanacak kullanıcı bulunamadı.",
      };
    }

    const passwordHash =
      await PasswordService.hash(
        temporaryPassword
      );

    await prisma.user.update({
      where: {
        id: user.id,
      },

      data: {
        passwordHash,

        /*
         * Kullanıcı ilk girişinde
         * kendi şifresini belirlemelidir.
         */
        mustChangePassword: true,
      },
    });

    await SessionService.revokeAllUserSessions(
      user.id,
      currentUser.id
    );

    revalidatePath(
      "/admin/users"
    );

    revalidatePath(
      `/admin/users/${user.id}`
    );

    revalidatePath(
      `/admin/users/${user.id}/password`
    );

    return {
      success: true,
      message:
        `${user.username} kullanıcısının şifresi sıfırlandı. Açık oturumları kapatıldı ve bir sonraki girişte şifre değiştirmesi zorunlu hale getirildi.`,
    };
  } catch (error) {
    console.error(
      "Kullanıcı şifresi sıfırlanamadı:",
      error
    );

    return {
      success: false,
      message:
        "Kullanıcı şifresi sıfırlanamadı. Lütfen yeniden deneyin.",
    };
  }
}