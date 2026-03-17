import type { CurrentUser } from "./types";

export const PERMISSIONS = {
  MODULE_CRM: "module.crm",
  MODULE_INVENTORY: "module.inventory",
  MODULE_SALES: "module.sales",
  MODULE_HRMS: "module.hrms",
  MODULE_REPORTS: "module.reports",
  MODULE_ADMIN: "module.admin",
  PAGE_DASHBOARD: "page.dashboard",
  PAGE_CRM_LEADS: "page.crm.leads",
  PAGE_CRM_PRESALES: "page.crm.presales",
  PAGE_CRM_OPPORTUNITIES: "page.crm.opportunities",
  PAGE_INVENTORY: "page.inventory",
  PAGE_SALES: "page.sales",
  PAGE_PURCHASES: "page.purchases",
  PAGE_ACCOUNTING: "page.accounting",
  PAGE_HRMS: "page.hrms",
  PAGE_REPORTS: "page.reports",
  PAGE_ADMIN_USERS: "page.admin.users",
  PAGE_ADMIN_SETTINGS: "page.admin.settings",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const MODULE_PERMISSION_MAP: Record<string, Permission> = {
  crm: PERMISSIONS.MODULE_CRM,
  inventory: PERMISSIONS.MODULE_INVENTORY,
  sales: PERMISSIONS.MODULE_SALES,
  hrms: PERMISSIONS.MODULE_HRMS,
  reports: PERMISSIONS.MODULE_REPORTS,
  admin: PERMISSIONS.MODULE_ADMIN,
};

export function hasPermission(
  user: CurrentUser | null | undefined,
  permission: Permission
): boolean {
  if (!user) return false;
  if (user.roles?.includes("ROLE_ADMIN")) return true;
  const permissions = user.permissions ?? [];
  if (permissions.includes(permission)) return true;

  const modulePermission = resolveModulePermission(permission);
  if (modulePermission && permissions.includes(modulePermission)) {
    return true;
  }

  return false;
}

export function hasAnyPermission(
  user: CurrentUser | null | undefined,
  permissions: Permission[]
): boolean {
  return permissions.some((permission) => hasPermission(user, permission));
}

function resolveModulePermission(permission: Permission): Permission | null {
  if (permission.startsWith("page.crm.")) return PERMISSIONS.MODULE_CRM;
  if (permission.startsWith("page.inventory")) return PERMISSIONS.MODULE_INVENTORY;
  if (permission.startsWith("page.sales") || permission.startsWith("page.purchases")) {
    return PERMISSIONS.MODULE_SALES;
  }
  if (permission.startsWith("page.hrms")) return PERMISSIONS.MODULE_HRMS;
  if (permission.startsWith("page.reports") || permission.startsWith("page.accounting")) {
    return PERMISSIONS.MODULE_REPORTS;
  }
  if (permission.startsWith("page.admin.")) return PERMISSIONS.MODULE_ADMIN;
  if (permission.startsWith("page.dashboard")) return null;
  return null;
}
