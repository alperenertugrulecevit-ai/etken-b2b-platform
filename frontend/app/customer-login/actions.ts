"use server";

import {
  headers,
} from "next/headers";

import { AuthService } from "@/modules/auth/services/auth.service";
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

function getClientIpAddress(
  requestHeaders: Headers
) {
  const forwardedFor =
    requestHeaders.get(
      "x-forwarded-for"
    );

  if (forwardedFor) {
    const firstAddress =
      forwardedFor
        .split(",")[0]
        ?.trim();

    if (firstAddress) {
      return firstAddress;
    }
  }

  return (
    requestHeaders
      .get("x-real-ip")
      ?.trim() || null
  );
}

export async function customerLoginAction(
  username: string,
  password: string
): Promise<CustomerLoginResult> {
  const result =
    await AuthService.login(
      username,
      password,
      false,
      true
    );

  if (!result.success) {
    return result;
  }

  const requestHeaders =
    await headers();

  await SessionService.createSessionAndSetCookie({
    userId: result.user.id,
    isRfLogin: false,
    ipAddress:
      getClientIpAddress(
        requestHeaders
      ),
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
