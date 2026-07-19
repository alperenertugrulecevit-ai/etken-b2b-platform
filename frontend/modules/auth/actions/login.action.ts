"use server";

import { AuthService } from "../services/auth.service";
import { SessionService } from "../services/session.service";
import type {
  LoginResult,
} from "../types/auth.types";

export async function loginAction(
  username: string,
  password: string,
  isRfLogin = false,
): Promise<LoginResult> {
  const result = await AuthService.login(
    username,
    password,
    isRfLogin,
  );

  if (result.success === false) {
    return result;
  }

  await SessionService.createSessionAndSetCookie({
    userId: result.user.id,
    isRfLogin,
  });

  return {
    success: true,
    user: result.user,
  };
}