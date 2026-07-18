import { UserStatus } from "@prisma/client";

import { AUTH_CONSTANTS } from "../constants/auth.constants";
import { AUTH_ERROR_MESSAGES } from "../constants/auth.constants";
import { AuthRepository } from "../repositories/auth.repository";
import { PasswordService } from "./password.service";

export class AuthService {
  static async login(username: string, password: string) {
    const user = await AuthRepository.findUserByUsername(username);

    if (!user) {
      return {
        success: false,
        message: AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS,
      };
    }

    if (user.status !== UserStatus.ACTIVE) {
      return {
        success: false,
        message: AUTH_ERROR_MESSAGES.USER_PASSIVE,
      };
    }

    const passwordValid =
      await PasswordService.verify(
        password,
        user.passwordHash
      );

    if (!passwordValid) {
      await AuthRepository.increaseFailedLogin(user.id);

      if (
        user.failedLoginCount + 1 >=
        AUTH_CONSTANTS.MAX_FAILED_LOGIN_COUNT
      ) {
        await AuthRepository.lockUser(user.id);
      }

      return {
        success: false,
        message: AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS,
      };
    }

    await AuthRepository.updateLastLogin(user.id);

    return {
      success: true,
      user,
    };
  }
}