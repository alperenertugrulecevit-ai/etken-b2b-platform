"use server";

import {
  headers,
} from "next/headers";

import {
  PasswordResetService,
} from "@/modules/auth/services/password-reset.service";

function getClientIpAddress(
  requestHeaders: Headers,
) {
  const forwardedFor =
    requestHeaders.get(
      "x-forwarded-for",
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

export async function requestPasswordResetAction(
  identifier: string,
) {
  const requestHeaders =
    await headers();

  return PasswordResetService.requestReset({
    identifier,
    ipAddress:
      getClientIpAddress(
        requestHeaders,
      ),
    userAgent:
      requestHeaders
        .get("user-agent")
        ?.trim() || null,
  });
}
