import "server-only";

import {
  createHash,
  randomBytes,
} from "node:crypto";

import {
  UserStatus,
  UserType,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

import {
  PASSWORD_POLICY,
} from "@/modules/auth/constants/password-policy.constants";
import {
  PASSWORD_RESET_CONSTANTS,
} from "@/modules/auth/constants/password-reset.constants";
import {
  PasswordService,
} from "@/modules/auth/services/password.service";

type RequestPasswordResetInput = {
  identifier: string;
  ipAddress: string | null;
  userAgent: string | null;
};

type RequestPasswordResetResult = {
  success: true;
  message: string;
  developmentResetUrl?: string;
};

type ResetPasswordInput = {
  token: string;
  newPassword: string;
  confirmPassword: string;
};

type ResetPasswordResult =
  | {
      success: true;
      message: string;
    }
  | {
      success: false;
      message: string;
    };

function hashToken(
  token: string,
) {
  return createHash(
    "sha256",
  )
    .update(token)
    .digest("hex");
}

function validateNewPassword(
  password: string,
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
    !/[^A-Za-z0-9]/.test(
      password,
    )
  ) {
    return "Şifre en az bir özel karakter içermelidir.";
  }

  return null;
}

function getTrustedBaseUrl() {
  const configuredBaseUrl =
    process.env
      .NEXT_PUBLIC_APP_URL
      ?.trim()
      .replace(/\/$/, "");

  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  if (
    process.env.NODE_ENV !==
    "production"
  ) {
    return "http://localhost:3000";
  }

  return null;
}

export class PasswordResetService {
  static async requestReset(
    input:
      RequestPasswordResetInput,
  ): Promise<RequestPasswordResetResult> {
    const genericResult:
      RequestPasswordResetResult = {
        success: true,
        message:
          PASSWORD_RESET_CONSTANTS
            .GENERIC_REQUEST_MESSAGE,
      };

    const identifier =
      input.identifier
        .trim()
        .toLowerCase();

    if (!identifier) {
      return genericResult;
    }

    const user =
      await prisma.user.findFirst({
        where: {
          userType:
            UserType.CUSTOMER,
          status: {
            in: [
              UserStatus.ACTIVE,
              UserStatus.LOCKED,
            ],
          },
          customer: {
            isActive: true,
          },
          OR: [
            {
              username:
                identifier,
            },
            {
              email: {
                equals:
                  identifier,
                mode: "insensitive",
              },
            },
          ],
        },
        select: {
          id: true,
          email: true,
        },
      });

    if (!user) {
      return genericResult;
    }

    const oneHourAgo =
      new Date(
        Date.now() -
          60 * 60 * 1000,
      );

    const recentRequestCount =
      await prisma
        .passwordResetToken
        .count({
          where: {
            userId: user.id,
            createdAt: {
              gte: oneHourAgo,
            },
          },
        });

    if (
      recentRequestCount >=
      PASSWORD_RESET_CONSTANTS
        .MAX_REQUESTS_PER_HOUR
    ) {
      return genericResult;
    }

    const baseUrl =
      getTrustedBaseUrl();

    if (!baseUrl) {
      console.error(
        "Şifre sıfırlama bağlantısı oluşturulamadı: NEXT_PUBLIC_APP_URL tanımlı değil.",
      );
      return genericResult;
    }

    const rawToken =
      randomBytes(
        PASSWORD_RESET_CONSTANTS
          .TOKEN_BYTE_LENGTH,
      ).toString("base64url");

    const tokenHash =
      hashToken(rawToken);

    const expiresAt =
      new Date(
        Date.now() +
          PASSWORD_RESET_CONSTANTS
            .TOKEN_DURATION_MINUTES *
            60 *
            1000,
      );

    const now = new Date();

    await prisma.$transaction([
      prisma.passwordResetToken.updateMany({
        where: {
          userId: user.id,
          usedAt: null,
        },
        data: {
          usedAt: now,
        },
      }),
      prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
          requestedIpAddress:
            input.ipAddress,
          requestedUserAgent:
            input.userAgent,
        },
      }),
    ]);

    const resetUrl =
      `${baseUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;

    if (
      process.env.NODE_ENV !==
      "production"
    ) {
      return {
        ...genericResult,
        developmentResetUrl:
          resetUrl,
      };
    }

    /*
     * Production e-posta hesabı alındığında gönderim
     * adaptörü burada çağrılacaktır. Token veya bağlantı
     * production yanıtında ve loglarında gösterilmez.
     */
    if (!user.email) {
      console.error(
        "Şifre sıfırlama e-postası gönderilemedi: müşteri kullanıcısında e-posta yok.",
      );
    } else {
      console.error(
        "Şifre sıfırlama e-postası gönderilemedi: e-posta servisi henüz yapılandırılmadı.",
      );
    }

    return genericResult;
  }

  static async resetPassword(
    input:
      ResetPasswordInput,
  ): Promise<ResetPasswordResult> {
    const token =
      input.token.trim();

    if (
      token.length < 32 ||
      token.length > 200
    ) {
      return {
        success: false,
        message:
          "Şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş.",
      };
    }

    const newPassword =
      input.newPassword.trim();
    const confirmPassword =
      input.confirmPassword.trim();

    const passwordError =
      validateNewPassword(
        newPassword,
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

    const tokenHash =
      hashToken(token);

    const resetToken =
      await prisma
        .passwordResetToken
        .findUnique({
          where: {
            tokenHash,
          },
          include: {
            user: {
              include: {
                customer: true,
              },
            },
          },
        });

    const now = new Date();

    if (
      !resetToken ||
      resetToken.usedAt ||
      resetToken.expiresAt <=
        now ||
      resetToken.user
          .userType !==
        UserType.CUSTOMER ||
      !resetToken.user
        .customer?.isActive ||
      !(resetToken.user.status === UserStatus.ACTIVE || resetToken.user.status === UserStatus.LOCKED)
    ) {
      return {
        success: false,
        message:
          "Şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş.",
      };
    }

    const sameAsCurrent =
      await PasswordService.verify(
        newPassword,
        resetToken.user
          .passwordHash,
      );

    if (sameAsCurrent) {
      return {
        success: false,
        message:
          "Yeni şifre mevcut şifrenizden farklı olmalıdır.",
      };
    }

    const passwordHash =
      await PasswordService.hash(
        newPassword,
      );

    try {
      await prisma.$transaction(
        async (transaction) => {
          const consumed =
            await transaction
              .passwordResetToken
              .updateMany({
                where: {
                  id: resetToken.id,
                  usedAt: null,
                  expiresAt: {
                    gt: now,
                  },
                },
                data: {
                  usedAt: now,
                },
              });

          if (
            consumed.count !== 1
          ) {
            throw new Error(
              "RESET_TOKEN_ALREADY_USED",
            );
          }

          await transaction
            .passwordResetToken
            .updateMany({
              where: {
                userId:
                  resetToken.userId,
                usedAt: null,
              },
              data: {
                usedAt: now,
              },
            });

          await transaction
            .authSession
            .updateMany({
              where: {
                userId:
                  resetToken.userId,
                revokedAt: null,
              },
              data: {
                revokedAt: now,
                revokeReason:
                  "PASSWORD_RESET",
              },
            });

          await transaction
            .user.update({
              where: {
                id:
                  resetToken.userId,
              },
              data: {
                passwordHash,
                passwordChangedAt:
                  now,
                mustChangePassword:
                  false,
                failedLoginCount: 0,
                lastFailedLoginAt:
                  null,
                lockedAt: null,
                status:
                  UserStatus.ACTIVE,
                sessionInvalidatedAt:
                  now,
              },
            });
        },
      );
    } catch (error) {
      if (
        error instanceof Error &&
        error.message ===
          "RESET_TOKEN_ALREADY_USED"
      ) {
        return {
          success: false,
          message:
            "Şifre sıfırlama bağlantısı daha önce kullanılmış.",
        };
      }

      console.error(
        "Şifre sıfırlama hatası:",
        error,
      );

      return {
        success: false,
        message:
          "Şifre sıfırlanamadı. Lütfen yeniden deneyin.",
      };
    }

    return {
      success: true,
      message:
        "Şifreniz güvenli şekilde değiştirildi.",
    };
  }
}
