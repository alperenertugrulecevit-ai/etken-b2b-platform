import type {
  UserType,
} from "@prisma/client";

export type AssignableRole = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isSystemRole: boolean;
};

export type CreateUserInput = {
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
  isRfUser: boolean;
  isAdminUser: boolean;
  roleIds: string[];
  temporaryPassword: string;
};

export type CreateUserResult = {
  userId: string;
  employeeId: string;
  username: string;
  employeeCode: string;
  fullName: string;
  temporaryPassword: string;
};

export type CreateUserFormValues = Omit<
  CreateUserInput,
  "temporaryPassword"
>;

export type CreateUserActionState = {
  success: boolean;
  message: string;
  field: string | null;
  result: CreateUserResult | null;
  values: CreateUserFormValues | null;
};