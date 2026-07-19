import { UserStatus } from "@prisma/client";

import {
  AUTH_CONSTANTS,
  AUTH_ERROR_MESSAGES,
} from "../constants/auth.constants";
import { AuthRepository } from "../repositories/auth.repository";
import type { LoginResult } from "../types/auth.types";
import { PasswordService } from "./password.service";

export class AuthService {
  static async login(
    username: string,
    password: string,
    isRfLogin = false,
  ): Promise<LoginResult> {
    const normalizedUsername = username
      .trim()
      .toLowerCase();

    const user =
      await AuthRepository.findUserByUsername(
        normalizedUsername,
      );

    if (!user) {
      return {
        success: false,
        message:
          AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS,
      };
    }

    if (user.status !== UserStatus.ACTIVE) {
      return {
        success: false,
        message:
          AUTH_ERROR_MESSAGES.USER_PASSIVE,
      };
    }

    if (isRfLogin && !user.isRfUser) {
      return {
        success: false,
        message:
          "RF terminal kullanım yetkiniz bulunmuyor.",
      };
    }

    const passwordValid =
      await PasswordService.verify(
        password,
        user.passwordHash,
      );

    if (!passwordValid) {
      await AuthRepository.increaseFailedLogin(
        user.id,
      );

      if (
        user.failedLoginCount + 1 >=
        AUTH_CONSTANTS.MAX_FAILED_LOGIN_COUNT
      ) {
        await AuthRepository.lockUser(
          user.id,
        );
      }

      return {
        success: false,
        message:
          AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS,
      };
    }

    await AuthRepository.updateLastLogin(
      user.id,
    );

    const authUser =
      AuthRepository.mapToAuthUser(user);

    return {
      success: true,
      user: authUser,
    };
  }
}