export type UserRole =
  | "ROLE_ADMIN"
  | "ROLE_SALES_MANAGER"
  | "ROLE_SALES_REP"
  | "ROLE_VIEWER";

export type User = {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  language: string | null;
  active: boolean;
  roles: string[];
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
};

export type UpdateUserPayload = {
  fullName: string;
  email: string;
  phoneNumber: string;
  language: string;
  password?: string;
  role: UserRole;
};

export const USER_ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "ROLE_ADMIN", label: "Admin" },
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
  ROLE_ADMIN: "Admin",
  ROLE_SALES_MANAGER: "Manager",
  ROLE_SALES_REP: "Employee",
  ROLE_VIEWER: "Viewer",
};

export function getPrimaryRole(roles: string[] | null | undefined): UserRole {
  if (!roles || roles.length === 0) {
    return "ROLE_VIEWER";
  }
  if (roles.includes("ROLE_ADMIN")) return "ROLE_ADMIN";
  if (roles.includes("ROLE_SALES_MANAGER")) return "ROLE_SALES_MANAGER";
  if (roles.includes("ROLE_SALES_REP")) return "ROLE_SALES_REP";
  if (roles.includes("ROLE_VIEWER")) return "ROLE_VIEWER";
  return "ROLE_VIEWER";
}

export function getRoleLabel(roles: string[] | null | undefined): string {
  const role = getPrimaryRole(roles);
  return ROLE_LABELS[role] ?? "Unknown";
}

export function getRoleLabelFromValue(role: string): string {
  return ROLE_LABELS[role] ?? role;
}
