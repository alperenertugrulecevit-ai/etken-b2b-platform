import "server-only";

import {
  AuthSessionType,
  UserStatus,
} from "@prisma/client";

import { SESSION_CONSTANTS } from "../constants/session.constants";
import {
  SessionRepository,
} from "../repositories/session.repository";
import type {
  AuthPermission,
  AuthRole,
  AuthUser,
} from "../types/auth.types";
import { CookieService } from "./cookie.service";
import { TokenService } from "./token.service";

export type CreateSessionInput = {
  userId: string;
  isRfLogin?: boolean;
  terminalCode?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export type CreatedSession = {
  id: string;
  token: string;
  expiresAt: Date;
  sessionType: AuthSessionType;
};

export class SessionService {
  static async createSession(
    input: CreateSessionInput
  ): Promise<CreatedSession> {
    const sessionType = input.isRfLogin
      ? AuthSessionType.RF
      : AuthSessionType.WEB;

    const expiresAt =
      SessionService.calculateExpirationDate(
        sessionType
      );

    const token =
      TokenService.generateSessionToken();

    const tokenHash =
      TokenService.hashSessionToken(token);

    const session =
      await SessionRepository.create({
        userId: input.userId,
        tokenHash,
        sessionType,
        expiresAt,
        terminalCode:
          input.terminalCode?.trim() || null,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      });

    return {
      id: session.id,
      token,
      expiresAt,
      sessionType,
    };
  }

  static async createSessionAndSetCookie(
    input: CreateSessionInput
  ): Promise<CreatedSession> {
    const session =
      await SessionService.createSession(input);

    await CookieService.setSessionCookie(
      session.token,
      session.expiresAt
    );

    return session;
  }

  static async getCurrentSession() {
    const token =
      await CookieService.getSessionToken();

    if (!token) {
      return null;
    }

    const tokenHash =
      TokenService.hashSessionToken(token);

    const session =
      await SessionRepository.findActiveByTokenHash(
        tokenHash
      );

    if (!session) {
      return null;
    }

    if (
      session.user.status !== UserStatus.ACTIVE
    ) {
      return null;
    }

    if (
      session.user.sessionInvalidatedAt &&
      session.createdAt <=
        session.user.sessionInvalidatedAt
    ) {
      return null;
    }

    return session;
  }

  static async getCurrentUser():
    Promise<AuthUser | null> {
    const session =
      await SessionService.getCurrentSession();

    if (!session) {
      return null;
    }

    const roles: AuthRole[] =
      session.user.userRoles.map(
        ({ role }) => ({
          id: role.id,
          code: role.code,
          name: role.name,
          description: role.description,
        })
      );

    const permissionMap =
      new Map<string, AuthPermission>();

    for (const userRole of session.user.userRoles) {
      for (
        const rolePermission
        of userRole.role.rolePermissions
      ) {
        const permission =
          rolePermission.permission;

        permissionMap.set(permission.id, {
          id: permission.id,
          code: permission.code,
          name: permission.name,
          module: permission.module,
        });
      }
    }

    return {
      id: session.user.id,
      employeeId:
        session.user.employeeId,
      username: session.user.username,
      email: session.user.email,

      userType: session.user.userType,
      status: session.user.status,

      mustChangePassword:
        session.user.mustChangePassword,
      isRfUser: session.user.isRfUser,
      isAdminUser:
        session.user.isAdminUser,

      employee: session.user.employee
        ? {
            id: session.user.employee.id,
            employeeCode:
              session.user.employee.employeeCode,
            firstName:
              session.user.employee.firstName,
            lastName:
              session.user.employee.lastName,
            department:
              session.user.employee.department,
            title:
              session.user.employee.title,
            shiftCode:
              session.user.employee.shiftCode,
          }
        : null,

      roles,
      permissions: Array.from(
        permissionMap.values()
      ),
    };
  }

  static async logout(): Promise<void> {
    const token =
      await CookieService.getSessionToken();

    if (token) {
      const tokenHash =
        TokenService.hashSessionToken(token);

      await SessionRepository.revokeByTokenHash(
        tokenHash,
        "USER_LOGOUT"
      );
    }

    await CookieService.deleteSessionCookie();
  }

  static async revokeAllUserSessions(
    userId: string,
    revokedById?: string | null
  ) {
    return SessionRepository.revokeAllUserSessions(
      userId,
      "ALL_SESSIONS_REVOKED",
      revokedById
    );
  }

  static async hasPermission(
    permissionCode: string
  ): Promise<boolean> {
    const user =
      await SessionService.getCurrentUser();

    if (!user) {
      return false;
    }

    if (user.isAdminUser) {
      return true;
    }

    return user.permissions.some(
      (permission) =>
        permission.code === permissionCode
    );
  }

  static async hasRole(
    roleCode: string
  ): Promise<boolean> {
    const user =
      await SessionService.getCurrentUser();

    if (!user) {
      return false;
    }

    if (user.isAdminUser) {
      return true;
    }

    return user.roles.some(
      (role) => role.code === roleCode
    );
  }

  private static calculateExpirationDate(
    sessionType: AuthSessionType
  ): Date {
    const expiresAt = new Date();

    if (sessionType === AuthSessionType.RF) {
      expiresAt.setHours(
        expiresAt.getHours() +
          SESSION_CONSTANTS
            .RF_SESSION_DURATION_HOURS
      );

      return expiresAt;
    }

    expiresAt.setDate(
      expiresAt.getDate() +
        SESSION_CONSTANTS
          .WEB_SESSION_DURATION_DAYS
    );

    return expiresAt;
  }
}