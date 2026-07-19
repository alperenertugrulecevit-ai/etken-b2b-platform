import { UserStatus } from "@prisma/client";
import { redirect } from "next/navigation";

import { AuthorizationRepository } from "@/modules/authorization/repositories/authorization.repository";
import { SessionService } from "@/modules/auth/services/session.service";

import type {
  AuthorizationProfile,
  AuthorizationRedirectOptions,
} from "@/modules/authorization/types/authorization.types";

const ALL_ACCESS_PERMISSION = "ALL_ACCESS";
const ADMIN_PORTAL_PERMISSION =
  "ADMIN_PORTAL_ACCESS";

const DEFAULT_ADMIN_LOGIN_PATH = "/login";
const DEFAULT_ADMIN_FORBIDDEN_PATH =
  "/access-denied?area=admin";

const DEFAULT_RF_LOGIN_PATH = "/rf/login";
const DEFAULT_RF_FORBIDDEN_PATH =
  "/access-denied?area=rf";

function resolveOptions(
  options: AuthorizationRedirectOptions = {}
) {
  return {
    loginPath:
      options.loginPath ??
      DEFAULT_ADMIN_LOGIN_PATH,
    forbiddenPath:
      options.forbiddenPath ??
      DEFAULT_ADMIN_FORBIDDEN_PATH,
  };
}

export class AuthorizationService {
  static async getCurrentProfile(): Promise<
    AuthorizationProfile | null
  > {
    const currentUser =
      await SessionService.getCurrentUser();

    if (!currentUser) {
      return null;
    }

    const profile =
      await AuthorizationRepository.findAccessProfile(
        currentUser.id
      );

    if (
      !profile ||
      profile.status !== UserStatus.ACTIVE
    ) {
      return null;
    }

    return profile;
  }

  static hasPermission(
    profile: AuthorizationProfile,
    permissionCode: string
  ) {
    return (
      profile.isAdminUser ||
      profile.permissionCodes.includes(
        ALL_ACCESS_PERMISSION
      ) ||
      profile.permissionCodes.includes(
        permissionCode
      )
    );
  }

  static hasAnyPermission(
    profile: AuthorizationProfile,
    permissionCodes: string[]
  ) {
    return (
      profile.isAdminUser ||
      profile.permissionCodes.includes(
        ALL_ACCESS_PERMISSION
      ) ||
      permissionCodes.some((permissionCode) =>
        profile.permissionCodes.includes(
          permissionCode
        )
      )
    );
  }

  static async requireAuthenticated(
    options: AuthorizationRedirectOptions = {}
  ): Promise<AuthorizationProfile> {
    const { loginPath } = resolveOptions(options);
    const profile = await this.getCurrentProfile();

    if (!profile) {
      redirect(loginPath);
    }

    return profile;
  }

  static async requireAdminPortalAccess(): Promise<
    AuthorizationProfile
  > {
    const profile =
      await this.requireAuthenticated();

    if (
      !this.hasPermission(
        profile,
        ADMIN_PORTAL_PERMISSION
      )
    ) {
      redirect(DEFAULT_ADMIN_FORBIDDEN_PATH);
    }

    return profile;
  }

  static async requirePermission(
    permissionCode: string,
    options: AuthorizationRedirectOptions = {}
  ): Promise<AuthorizationProfile> {
    const resolvedOptions = resolveOptions(options);
    const profile =
      await this.requireAuthenticated(
        resolvedOptions
      );

    if (
      !this.hasPermission(
        profile,
        permissionCode
      )
    ) {
      redirect(resolvedOptions.forbiddenPath);
    }

    return profile;
  }

  static async requireAnyPermission(
    permissionCodes: string[],
    options: AuthorizationRedirectOptions = {}
  ): Promise<AuthorizationProfile> {
    const resolvedOptions = resolveOptions(options);
    const profile =
      await this.requireAuthenticated(
        resolvedOptions
      );

    if (
      !this.hasAnyPermission(
        profile,
        permissionCodes
      )
    ) {
      redirect(resolvedOptions.forbiddenPath);
    }

    return profile;
  }

  static async requireRfAccess(
    permissionCode?: string
  ): Promise<AuthorizationProfile> {
    const profile =
      await this.requireAuthenticated({
        loginPath: DEFAULT_RF_LOGIN_PATH,
        forbiddenPath: DEFAULT_RF_FORBIDDEN_PATH,
      });

    const employeeCanUseRf = Boolean(
      profile.employee?.isActive &&
        profile.employee.canUseRf
    );

    if (!profile.isRfUser || !employeeCanUseRf) {
      redirect(DEFAULT_RF_FORBIDDEN_PATH);
    }

    if (
      permissionCode &&
      !this.hasPermission(profile, permissionCode)
    ) {
      redirect(DEFAULT_RF_FORBIDDEN_PATH);
    }

    return profile;
  }
}