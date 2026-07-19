import type {
  UserStatus,
  UserType,
} from "@prisma/client";

export type UpdateUserFormValues = {
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  title: string;
  shiftCode: string;
  username: string;
  userType: UserType;
  status: UserStatus;
  isRfUser: boolean;
  isAdminUser: boolean;
  roleIds: string[];
};

export type UpdateUserInput =
  UpdateUserFormValues;

export type UserEditRole = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isSystemRole: boolean;
};

export type UserEditData = {
  id: string;
  employeeId: string | null;
  username: string;
  email: string;
  userType: UserType;
  status: UserStatus;
  isRfUser: boolean;
  isAdminUser: boolean;
  employeeCode: string;
  firstName: string;
  lastName: string;
  phone: string;
  department: string;
  title: string;
  shiftCode: string;
  roleIds: string[];
};

export type UserEditPageData = {
  user: UserEditData | null;
  roles: UserEditRole[];
};

export type UpdateUserActionState = {
  success: boolean;
  message: string;
  field: string | null;
  values: UpdateUserFormValues | null;
};

export const INITIAL_UPDATE_USER_ACTION_STATE: UpdateUserActionState =
  {
    success: false,
    message: "",
    field: null,
    values: null,
  };