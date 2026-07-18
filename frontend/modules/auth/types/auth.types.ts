import type {
  Permission,
  Role,
  UserStatus,
  UserType,
} from "@prisma/client";

export type LoginInput = {
  username: string;
  password: string;
  isRfLogin?: boolean;
};

export type AuthEmployee = {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  department: string | null;
  title: string | null;
  shiftCode: string | null;
};

export type AuthRole = Pick<
  Role,
  "id" | "code" | "name" | "description"
>;

export type AuthPermission = Pick<
  Permission,
  "id" | "code" | "name" | "module"
>;

export type AuthUser = {
  id: string;
  employeeId: string | null;
  username: string;
  email: string | null;

  userType: UserType;
  status: UserStatus;

  mustChangePassword: boolean;
  isRfUser: boolean;
  isAdminUser: boolean;

  employee: AuthEmployee | null;
  roles: AuthRole[];
  permissions: AuthPermission[];
};

export type LoginResult =
  | {
      success: true;
      user: AuthUser;
    }
  | {
      success: false;
      message: string;
    };