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

export const USER_ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "ROLE_MASTER", label: "Master" },
  { value: "ROLE_ADMIN", label: "Admin" },
  { value: "ROLE_REPORTING_MANAGER", label: "Reporting Manager" },
  { value: "ROLE_SALES_MANAGER", label: "Manager" },
  { value: "ROLE_SALES_REP", label: "Employee" },
  { value: "ROLE_VIEWER", label: "Viewer" },
];

export const USER_LANGUAGE_OPTIONS: { value: string; label: string }[] = [
  { value: "English", label: "English" },
  { value: "Telugu", label: "Telugu" },
  { value: "Hindi", label: "Hindi" },
];

const ROLE_LABELS: Record<string, string> = {
  ROLE_MASTER: "Master",
  ROLE_ADMIN: "Admin",
  ROLE_REPORTING_MANAGER: "Reporting Manager",
  ROLE_SALES_MANAGER: "Manager",
  ROLE_SALES_REP: "Employee",
  ROLE_VIEWER: "Viewer",
  ROLE_HR_MANAGER: "HR Manager",
  ROLE_RECRUITER: "Recruiter",
  ROLE_HIRING_MANAGER: "Hiring Manager",
  ROLE_INTERVIEWER: "Interviewer",
  ROLE_EMPLOYEE: "Employee",
};

export function getPrimaryRole(roles: string[] | null | undefined): UserRole {
  if (!roles || roles.length === 0) {
    return "ROLE_VIEWER";
  }
  if (roles.includes("ROLE_MASTER")) return "ROLE_MASTER";
  if (roles.includes("ROLE_ADMIN")) return "ROLE_ADMIN";
  if (roles.includes("ROLE_REPORTING_MANAGER")) return "ROLE_REPORTING_MANAGER";
  if (roles.includes("ROLE_SALES_MANAGER")) return "ROLE_SALES_MANAGER";
  if (roles.includes("ROLE_SALES_REP")) return "ROLE_SALES_REP";
  if (roles.includes("ROLE_VIEWER")) return "ROLE_VIEWER";
  if (roles.includes("ROLE_HR_MANAGER")) return "ROLE_HR_MANAGER";
  if (roles.includes("ROLE_RECRUITER")) return "ROLE_RECRUITER";
  if (roles.includes("ROLE_HIRING_MANAGER")) return "ROLE_HIRING_MANAGER";
  if (roles.includes("ROLE_INTERVIEWER")) return "ROLE_INTERVIEWER";
  if (roles.includes("ROLE_EMPLOYEE")) return "ROLE_EMPLOYEE";
  return "ROLE_VIEWER";
}

export function getRoleLabel(roles: string[] | null | undefined): string {
  const role = getPrimaryRole(roles);
  return ROLE_LABELS[role] ?? "Unknown";
}

export function getRoleLabelFromValue(role: string): string {
  return ROLE_LABELS[role] ?? role;
}
