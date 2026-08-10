"use server";

import {
  headers,
} from "next/headers";

import { AuthService } from "../services/auth.service";
import { ClientIpService } from "../services/client-ip.service";
import { LoginRateLimitService } from "../services/login-rate-limit.service";
import { SessionService } from "../services/session.service";

import type {
  LoginResult,
} from "../types/auth.types";

const RATE_LIMIT_MESSAGE =
  "Çok fazla giriş denemesi yapıldı. Lütfen bir süre sonra tekrar deneyin.";

export async function loginAction(
  username: string,
  password: string,
  isRfLogin = false,
): Promise<LoginResult> {
  const requestHeaders =
    await headers();

  const ipAddress =
    ClientIpService
      .getFromHeaders(
        requestHeaders,
      );

  const rateLimit =
    await LoginRateLimitService
      .check(
        ipAddress,
        username,
      );

  if (!rateLimit.allowed) {
    return {
      success: false,
      message:
        RATE_LIMIT_MESSAGE,
    };
  }

  const result =
    await AuthService.login(
      username,
      password,
      isRfLogin,
    );

  if (
    result.success === false
  ) {
    await LoginRateLimitService
      .recordFailure(
        ipAddress,
        username,
      );

    return result;
  }

  await LoginRateLimitService
    .recordSuccess(
      ipAddress,
      username,
    );

  const userAgent =
    requestHeaders
      .get("user-agent")
      ?.trim() || null;

  await SessionService
    .createSessionAndSetCookie({
      userId:
        result.user.id,

      isRfLogin,

      ipAddress,

      userAgent,
    });

  return {
    success: true,
    user: result.user,
  };
}