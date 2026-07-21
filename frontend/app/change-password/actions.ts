"use server";

import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

import { PASSWORD_POLICY } from "@/modules/auth/constants/password-policy.constants";

import { PasswordService } from "@/modules/auth/services/password.service";

import { SessionService } from "@/modules/auth/services/session.service";

export type ChangePasswordState = {
  success: boolean;
  message: string;
};

function validateNewPassword(
  password: string
) {
  if (
    password.length <
      PASSWORD_POLICY.MIN_LENGTH ||
    password.length >
      PASSWORD_POLICY.MAX_LENGTH
  ) {
    return `Yeni şifre ${PASSWORD_POLICY.MIN_LENGTH}-${PASSWORD_POLICY.MAX_LENGTH} karakter olmalıdır.`;
  }

  if (!/[A-Z]/.test(password)) {
    return "Yeni şifre en az bir büyük harf içermelidir.";
  }

  if (!/[a-z]/.test(password)) {
    return "Yeni şifre en az bir küçük harf içermelidir.";
  }

  if (!/[0-9]/.test(password)) {
    return "Yeni şifre en az bir rakam içermelidir.";
  }

  if (
    !/[^A-Za-z0-9]/.test(password)
  ) {
    return "Yeni şifre en az bir özel karakter içermelidir.";
  }

  return null;
}

function getSafeReturnPath(
  value:
    FormDataEntryValue | null
) {
  const returnPath = String(
    value ?? ""
  ).trim();

  if (returnPath === "/rf") {
    return "/rf";
  }

  return "/admin";
}

export async function changePasswordAction(
  _previousState: ChangePasswordState,
  formData: FormData
): Promise<ChangePasswordState> {
  const currentUser =
    await AuthorizationService.requireAuthenticated();

  const currentPassword = String(
    formData.get(
      "currentPassword"
    ) ?? ""
  );

  const newPassword = String(
    formData.get(
      "newPassword"
    ) ?? ""
  ).trim();

  const confirmPassword = String(
    formData.get(
      "confirmPassword"
    ) ?? ""
  ).trim();

  const returnPath =
    getSafeReturnPath(
      formData.get("returnTo")
    );

  if (!currentPassword) {
    return {
      success: false,
      message:
        "Mevcut şifrenizi girin.",
    };
  }

  const passwordError =
    validateNewPassword(
      newPassword
    );

  if (passwordError) {
    return {
      success: false,
      message: passwordError,
    };
  }

  if (
    newPassword !==
    confirmPassword
  ) {
    return {
      success: false,
      message:
        "Yeni şifre ve şifre tekrarı eşleşmiyor.",
    };
  }

  if (
    currentPassword ===
    newPassword
  ) {
    return {
      success: false,
      message:
        "Yeni şifre mevcut şifreden farklı olmalıdır.",
    };
  }

  try {
    const user =
      await prisma.user.findUnique({
        where: {
          id: currentUser.id,
        },

        select: {
          id: true,
          passwordHash: true,
        },
      });

    if (!user) {
      return {
        success: false,
        message:
          "Kullanıcı hesabı bulunamadı.",
      };
    }

    const currentPasswordIsValid =
      await PasswordService.verify(
        currentPassword,
        user.passwordHash
      );

    if (
      !currentPasswordIsValid
    ) {
      return {
        success: false,
        message:
          "Mevcut şifre doğru değil.",
      };
    }

    const newPasswordHash =
      await PasswordService.hash(
        newPassword
      );

    await prisma.user.update({
      where: {
        id: user.id,
      },

      data: {
        passwordHash:
          newPasswordHash,

        mustChangePassword: false,
      },
    });

    await SessionService.revokeAllUserSessions(
      user.id,
      user.id
    );

    await SessionService.logout();
  } catch (error) {
    console.error(
      "Şifre değiştirme hatası:",
      error
    );

    return {
      success: false,
      message:
        "Şifre değiştirilemedi. Lütfen yeniden deneyin.",
    };
  }

  const loginPath =
    returnPath === "/rf"
      ? "/rf/login"
      : "/login";

  redirect(
    `${loginPath}?passwordChanged=true`
  );
}