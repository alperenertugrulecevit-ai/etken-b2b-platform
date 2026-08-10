import {
  UserStatus,
  UserType,
} from "@prisma/client";

import {
  AUTH_CONSTANTS,
  AUTH_ERROR_MESSAGES,
} from "../constants/auth.constants";

import { AuthRepository } from "../repositories/auth.repository";

import type {
  LoginResult,
} from "../types/auth.types";

import { PasswordService } from "./password.service";

function hasDurationElapsed(
  date: Date | null,
  minutes: number,
) {
  if (!date) {
    return false;
  }

  const durationMs =
    minutes * 60 * 1000;

  return (
    Date.now() -
      date.getTime() >=
    durationMs
  );
}

export class AuthService {
  static async login(
    username: string,
    password: string,
    isRfLogin = false,
    isCustomerLogin = false,
  ): Promise<LoginResult> {
    const normalizedUsername =
      username
        .trim()
        .toLowerCase();

    if (
      !normalizedUsername ||
      !password
    ) {
      return {
        success: false,
        message:
          AUTH_ERROR_MESSAGES
            .INVALID_CREDENTIALS,
      };
    }

    let user =
      await AuthRepository
        .findUserByUsername(
          normalizedUsername,
        );

    if (!user) {
      return {
        success: false,
        message:
          AUTH_ERROR_MESSAGES
            .INVALID_CREDENTIALS,
      };
    }

    /*
     * Geçici hesap kilidi:
     * LOCKED durumundaki kullanıcı,
     * kilit süresi dolmuşsa otomatik
     * olarak tekrar ACTIVE yapılır.
     */
    if (
      user.status ===
      UserStatus.LOCKED
    ) {
      const lockExpired =
        hasDurationElapsed(
          user.lockedAt,
          AUTH_CONSTANTS
            .ACCOUNT_LOCK_MINUTES,
        );

      if (!lockExpired) {
        return {
          success: false,
          message:
            AUTH_ERROR_MESSAGES
              .USER_LOCKED,
        };
      }

      await AuthRepository
        .unlockUser(
          user.id,
        );

      user =
        await AuthRepository
          .findUserByUsername(
            normalizedUsername,
          );

      if (!user) {
        return {
          success: false,
          message:
            AUTH_ERROR_MESSAGES
              .INVALID_CREDENTIALS,
        };
      }
    }

    if (
      user.status ===
      UserStatus.PASSIVE
    ) {
      return {
        success: false,
        message:
          AUTH_ERROR_MESSAGES
            .USER_PASSIVE,
      };
    }

    if (
      user.status ===
      UserStatus.SUSPENDED
    ) {
      return {
        success: false,
        message:
          AUTH_ERROR_MESSAGES
            .USER_SUSPENDED,
      };
    }

    if (
      user.status !==
      UserStatus.ACTIVE
    ) {
      return {
        success: false,
        message:
          AUTH_ERROR_MESSAGES
            .INVALID_CREDENTIALS,
      };
    }

    /*
     * Eski başarısız giriş denemelerini
     * sonsuza kadar biriktirmiyoruz.
     *
     * Son başarısız denemenin üzerinden
     * hesap kilit süresi kadar zaman
     * geçmişse sayaç sıfırlanır.
     */
    if (
      user.failedLoginCount > 0 &&
      hasDurationElapsed(
        user.lastFailedLoginAt,
        AUTH_CONSTANTS
          .ACCOUNT_LOCK_MINUTES,
      )
    ) {
      await AuthRepository
        .resetFailedLoginState(
          user.id,
        );

      user =
        await AuthRepository
          .findUserByUsername(
            normalizedUsername,
          );

      if (!user) {
        return {
          success: false,
          message:
            AUTH_ERROR_MESSAGES
              .INVALID_CREDENTIALS,
        };
      }
    }

    if (isCustomerLogin) {
      if (
        user.userType !==
          UserType.CUSTOMER ||
        !user.customer ||
        !user.customer.isActive
      ) {
        return {
          success: false,
          message:
            AUTH_ERROR_MESSAGES
              .INVALID_CREDENTIALS,
        };
      }
    } else if (
      user.userType ===
      UserType.CUSTOMER
    ) {
      return {
        success: false,
        message:
          AUTH_ERROR_MESSAGES
            .INVALID_CREDENTIALS,
      };
    }

    const passwordValid =
      await PasswordService.verify(
        password,
        user.passwordHash,
      );

    if (!passwordValid) {
      const failedLoginCount =
        user.failedLoginCount + 1;

      await AuthRepository
        .increaseFailedLogin(
          user.id,
        );

      if (
        failedLoginCount >=
        AUTH_CONSTANTS
          .MAX_FAILED_LOGIN_COUNT
      ) {
        await AuthRepository
          .lockUser(
            user.id,
          );
      }

      return {
        success: false,
        message:
          AUTH_ERROR_MESSAGES
            .INVALID_CREDENTIALS,
      };
    }

    if (isRfLogin) {
      if (!user.isRfUser) {
        return {
          success: false,
          message:
            "RF terminal kullanım yetkiniz bulunmuyor.",
        };
      }

      if (!user.employee) {
        return {
          success: false,
          message:
            "RF terminal kullanımı için aktif bir personel kaydı gereklidir.",
        };
      }

      if (
        !user.employee.isActive
      ) {
        return {
          success: false,
          message:
            "Bağlı personel kaydı pasif durumda olduğu için RF terminale giriş yapılamaz.",
        };
      }

      if (
        !user.employee.canUseRf
      ) {
        return {
          success: false,
          message:
            "Personel kaydınız için RF terminal izni verilmemiş.",
        };
      }
    }

    await AuthRepository
      .updateLastLogin(
        user.id,
      );

    const authUser =
      AuthRepository
        .mapToAuthUser(
          user,
        );

    return {
      success: true,
      user: authUser,
    };
  }
}