export type UserRole = string;

export type User = {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  language: string | null;
  active: boolean;
  roles: string[];
  permissions: string[];
  createdAt: string;
  updatedAt: string;
};

export type CreateUserPayload = {
  fullName: string;
  email: string;
  phoneNumber: string;
  language: string;
  password: string;
  role: UserRole;
  permissions: string[];
};

export type UpdateUserPayload = {
  fullName: string;
  email: string;
  phoneNumber: string;
  language: string;
  password?: string;
  role: UserRole;
  permissions: string[];
};

export type PermissionLevel = "MODULE" | "PAGE" | "FEATURE";

export type RoleOption = {
  key: string;
  label: string;
  defaultPermissions: string[];
};

export type RoleRecord = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  active: boolean;
  systemDefined: boolean;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
};

export type CreateRolePayload = {
  name: string;
  description?: string;
  permissions: string[];
};

export type UpdateRolePayload = CreateRolePayload;

export type PermissionRecord = {
  key: string;
  label: string;
  moduleKey: string;
  description: string | null;
  active: boolean;
  systemDefined: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreatePermissionPayload = {
  key: string;
  label: string;
  moduleKey: string;
  description?: string;
};

export type UpdatePermissionPayload = {
  key: string;
  label: string;
  moduleKey: string;
  description?: string;
  active: boolean;
};

export type PermissionDefinition = {
  key: string;
  label: string;
  description: string;
  moduleKey: string;
  level: PermissionLevel;
};

export type PermissionModule = {
  key: string;
  label: string;
  permissions: PermissionDefinition[];
};

export type AccessControlCatalog = {
  roles: RoleOption[];
  modules: PermissionModule[];
  allPermissions: string[];
};

export const USER_LANGUAGE_OPTIONS: { value: string; label: string }[] = [
  { value: "English", label: "English" },
  { value: "Telugu", label: "Telugu" },
  { value: "Hindi", label: "Hindi" },
];

export function getPrimaryRole(roles: string[] | null | undefined): UserRole {
  return roles?.[0] ?? "";
}

export function getRoleLabel(roles: string[] | null | undefined): string {
  const role = getPrimaryRole(roles);
  return getRoleLabelFromValue(role);
}

export function getRoleLabelFromValue(role: string): string {
  if (!role) {
    return "Unassigned";
  }

  return role
    .replace(/^ROLE_/i, "")
    .replace(/[_\-.]+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
