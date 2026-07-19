import type {
  UserStatus,
} from "@prisma/client";

export type AuthorizationEmployee = {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  canUseRf: boolean;
};

export type AuthorizationProfile = {
  id: string;
  username: string;
  status: UserStatus;
  isAdminUser: boolean;
  isRfUser: boolean;
  employee: AuthorizationEmployee | null;
  roleCodes: string[];
  permissionCodes: string[];
};

export type AuthorizationRedirectOptions = {
  loginPath?: string;
  forbiddenPath?: string;
};