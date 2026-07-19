export type RolePermissionItem = {
  id: string;
  code: string;
  name: string;
  module: string;
  description: string | null;
};

export type PermissionGroup = {
  module: string;
  moduleLabel: string;
  permissions: RolePermissionItem[];
};

export type RoleListItem = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isSystemRole: boolean;
  isActive: boolean;
  userCount: number;
  permissionCount: number;
  updatedAt: Date;
};

export type RoleDetail = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isSystemRole: boolean;
  isActive: boolean;
  permissionIds: string[];
  userCount: number;
};

export type RoleFormValues = {
  code: string;
  name: string;
  description: string;
  permissionIds: string[];
};

export type RoleFormActionState = {
  success: boolean;
  message: string;
  field: string | null;
  values: RoleFormValues | null;
};

export type RolePageData = {
  roles: RoleListItem[];
  permissionGroups: PermissionGroup[];
  permissionCount: number;
  activeRoleCount: number;
  assignedUserCount: number;
  catalogIsComplete: boolean;
};