"use server";

import {
  headers,
} from "next/headers";

import { AuthService } from "@/modules/auth/services/auth.service";
import { ClientIpService } from "@/modules/auth/services/client-ip.service";
import { LoginRateLimitService } from "@/modules/auth/services/login-rate-limit.service";
import { SessionService } from "@/modules/auth/services/session.service";

export type CustomerLoginResult =
  | {
      success: true;
      mustChangePassword: boolean;
    }
  | {
      success: false;
      message: string;
    };

const RATE_LIMIT_MESSAGE =
  "Çok fazla giriş denemesi yapıldı. Lütfen bir süre sonra tekrar deneyin.";

export async function customerLoginAction(
  username: string,
  password: string,
): Promise<CustomerLoginResult> {
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
      false,
      true,
    );

  if (!result.success) {
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

  await SessionService
    .createSessionAndSetCookie({
      userId:
        result.user.id,

      isRfLogin: false,

      ipAddress,

      userAgent:
        requestHeaders
          .get("user-agent")
          ?.trim() || null,
    });

  return {
    success: true,

    mustChangePassword:
      result.user
        .mustChangePassword,
  };
}