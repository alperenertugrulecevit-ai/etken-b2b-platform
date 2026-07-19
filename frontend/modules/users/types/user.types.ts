import type {
  UserStatus,
  UserType,
} from "@prisma/client";

export type UserListRole = {
  id: string;
  code: string;
  name: string;
};

export type UserListEmployee = {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  department: string | null;
  title: string | null;
};

export type UserListItem = {
  id: string;
  username: string;
  email: string | null;
  userType: UserType;
  status: UserStatus;
  mustChangePassword: boolean;
  isRfUser: boolean;
  isAdminUser: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  employee: UserListEmployee | null;
  roles: UserListRole[];
  activeSessionCount: number;
};

export type UserListFilters = {
  search?: string;
  status?: UserStatus | null;
  userType?: UserType | null;
  rfAccess?: "all" | "yes" | "no";
  page?: number;
  pageSize?: number;
};

export type UserListResult = {
  items: UserListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export const USER_STATUS_LABELS: Record<
  UserStatus,
  string
> = {
  ACTIVE: "Aktif",
  PASSIVE: "Pasif",
  LOCKED: "Kilitli",
  SUSPENDED: "Askıya Alındı",
};

export const USER_TYPE_LABELS: Record<
  UserType,
  string
> = {
  ADMIN: "Yönetici",
  OFFICE: "Ofis",
  WAREHOUSE: "Depo",
  RF_OPERATOR: "RF Operatörü",
  SYSTEM: "Sistem",
  API: "API",
};