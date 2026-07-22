import {
  UserStatus,
} from "@prisma/client";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import { SESSION_CONSTANTS } from "@/modules/auth/constants/session.constants";

import { SessionRepository } from "@/modules/auth/repositories/session.repository";

import { TokenService } from "@/modules/auth/services/token.service";

const ADMIN_PORTAL_PERMISSION =
  "ADMIN_PORTAL_ACCESS";

const ALL_ACCESS_PERMISSION =
  "ALL_ACCESS";

function createLoginResponse(
  request: NextRequest,
  loginPath: string
) {
  const loginUrl =
    new URL(
      loginPath,
      request.url
    );

  const response =
    NextResponse.redirect(
      loginUrl
    );

  response.cookies.delete(
    SESSION_CONSTANTS.COOKIE_NAME
  );

  return response;
}

function createAccessDeniedResponse(
  request: NextRequest,
  area: "admin" | "rf"
) {
  const accessDeniedUrl =
    new URL(
      `/access-denied?area=${area}`,
      request.url
    );

  return NextResponse.redirect(
    accessDeniedUrl
  );
}

function hasPermission(
  session: NonNullable<
    Awaited<
      ReturnType<
        typeof SessionRepository.findActiveByTokenHash
      >
    >
  >,
  permissionCode: string
) {
  if (
    session.user.isAdminUser
  ) {
    return true;
  }

  return session.user.userRoles.some(
    ({ role }) =>
      role.rolePermissions.some(
        ({ permission }) =>
          permission.code ===
            ALL_ACCESS_PERMISSION ||
          permission.code ===
            permissionCode
      )
  );
}

export async function proxy(
  request: NextRequest
) {
  const { pathname } =
    request.nextUrl;

  /*
   * RF giriş ekranı anonim
   * olarak açılabilir.
   */
  if (
    pathname === "/rf/login"
  ) {
    return NextResponse.next();
  }

  const isAdminPath =
    pathname === "/admin" ||
    pathname.startsWith(
      "/admin/"
    );

  const isRfPath =
    pathname === "/rf" ||
    pathname.startsWith(
      "/rf/"
    );

  const isChangePasswordPath =
    pathname ===
    "/change-password";

  const loginPath =
    isRfPath
      ? "/rf/login"
      : "/login";

  const sessionToken =
    request.cookies.get(
      SESSION_CONSTANTS.COOKIE_NAME
    )?.value;

  if (!sessionToken) {
    return createLoginResponse(
      request,
      loginPath
    );
  }

  const tokenHash =
    TokenService.hashSessionToken(
      sessionToken
    );

  const session =
    await SessionRepository.findActiveByTokenHash(
      tokenHash
    );

  if (!session) {
    return createLoginResponse(
      request,
      loginPath
    );
  }

  if (
    session.user.status !==
    UserStatus.ACTIVE
  ) {
    return createLoginResponse(
      request,
      loginPath
    );
  }

  if (
    session.user
      .sessionInvalidatedAt &&
    session.createdAt <=
      session.user
        .sessionInvalidatedAt
  ) {
    return createLoginResponse(
      request,
      loginPath
    );
  }

  /*
   * Geçici şifresi bulunan
   * kullanıcı önce kendi
   * şifresini değiştirmelidir.
   */
  if (
    session.user
      .mustChangePassword &&
    !isChangePasswordPath
  ) {
    const returnTo =
      `${pathname}${request.nextUrl.search}`;

    const changePasswordUrl =
      new URL(
        "/change-password",
        request.url
      );

    changePasswordUrl.searchParams.set(
      "returnTo",
      returnTo
    );

    return NextResponse.redirect(
      changePasswordUrl
    );
  }

  /*
   * Şifre değiştirme ekranında
   * geçerli oturum yeterlidir.
   */
  if (isChangePasswordPath) {
    return NextResponse.next();
  }

  if (isAdminPath) {
    const canOpenAdmin =
      hasPermission(
        session,
        ADMIN_PORTAL_PERMISSION
      );

    if (!canOpenAdmin) {
      return createAccessDeniedResponse(
        request,
        "admin"
      );
    }
  }

  if (isRfPath) {
    const canOpenRf =
      Boolean(
        session.user.isRfUser &&
          session.user.employee
            ?.isActive &&
          session.user.employee
            .canUseRf
      );

    if (!canOpenRf) {
      return createAccessDeniedResponse(
        request,
        "rf"
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/rf/:path*",
    "/change-password",
  ],
};