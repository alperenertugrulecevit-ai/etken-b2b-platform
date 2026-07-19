import "server-only";

import { cookies } from "next/headers";

import { SESSION_CONSTANTS } from "../constants/session.constants";

export class CookieService {
  static async setSessionCookie(
    token: string,
    expiresAt: Date
  ): Promise<void> {
    const cookieStore = await cookies();

    cookieStore.set({
      name: SESSION_CONSTANTS.COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: SESSION_CONSTANTS.COOKIE_SAME_SITE,
      path: SESSION_CONSTANTS.COOKIE_PATH,
      expires: expiresAt,
    });
  }

  static async getSessionToken():
    Promise<string | null> {
    const cookieStore = await cookies();

    return (
      cookieStore.get(
        SESSION_CONSTANTS.COOKIE_NAME
      )?.value ?? null
    );
  }

  static async deleteSessionCookie():
    Promise<void> {
    const cookieStore = await cookies();

    cookieStore.set({
      name: SESSION_CONSTANTS.COOKIE_NAME,
      value: "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: SESSION_CONSTANTS.COOKIE_SAME_SITE,
      path: SESSION_CONSTANTS.COOKIE_PATH,
      expires: new Date(0),
      maxAge: 0,
    });
  }
}