"use server";

import {
  headers,
} from "next/headers";

import { AuthService } from "../services/auth.service";

import { SessionService } from "../services/session.service";

import type {
  LoginResult,
} from "../types/auth.types";

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

  const realIp =
    requestHeaders
      .get("x-real-ip")
      ?.trim();

  return realIp || null;
}

export async function loginAction(
  username: string,
  password: string,
  isRfLogin = false,
): Promise<LoginResult> {
  const result =
    await AuthService.login(
      username,
      password,
      isRfLogin,
    );

  if (
    result.success === false
  ) {
    return result;
  }

  const requestHeaders =
    await headers();

  const ipAddress =
    getClientIpAddress(
      requestHeaders
    );

  const userAgent =
    requestHeaders
      .get("user-agent")
      ?.trim() || null;

  await SessionService.createSessionAndSetCookie({
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