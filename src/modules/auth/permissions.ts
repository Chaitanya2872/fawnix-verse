import type { CurrentUser } from "./types";

export const PERMISSIONS = {
  MODULE_CRM: "module.crm",
  MODULE_INVENTORY: "module.inventory",
  MODULE_SALES: "module.sales",
  MODULE_PURCHASES: "module.purchases",
  MODULE_HRMS: "module.hrms",
  MODULE_REPORTS: "module.reports",
  MODULE_ADMIN: "module.admin",
  MODULE_RECRUITMENT: "module.recruitment",
  MODULE_FORMS: "module.forms",
  MODULE_APPROVALS: "module.approvals",
  MODULE_ORG: "module.org",
  MODULE_INTEGRATIONS: "module.integrations",
  MODULE_ANALYTICS: "module.analytics",
  MODULE_NOTIFICATIONS: "module.notifications",
  PAGE_DASHBOARD: "page.dashboard",
  PAGE_CRM_LEADS: "page.crm.leads",
  PAGE_CRM_CONTACTS: "page.crm.contacts",
  PAGE_CRM_ACCOUNTS: "page.crm.accounts",
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
  purchases: PERMISSIONS.MODULE_PURCHASES,
  hrms: PERMISSIONS.MODULE_HRMS,
  reports: PERMISSIONS.MODULE_REPORTS,
  admin: PERMISSIONS.MODULE_ADMIN,
  recruitment: PERMISSIONS.MODULE_RECRUITMENT,
  forms: PERMISSIONS.MODULE_FORMS,
  approvals: PERMISSIONS.MODULE_APPROVALS,
  org: PERMISSIONS.MODULE_ORG,
  integrations: PERMISSIONS.MODULE_INTEGRATIONS,
  analytics: PERMISSIONS.MODULE_ANALYTICS,
  notifications: PERMISSIONS.MODULE_NOTIFICATIONS,
};

export function hasPermission(
  user: CurrentUser | null | undefined,
  permission: Permission
): boolean {
  if (!user) return false;
  if (user.roles?.includes("ROLE_MASTER")) {
    return true;
  }
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

export function getDefaultAuthorizedPath(
  user: CurrentUser | null | undefined
): string {
  if (!user) {
    return "/unauthorized";
  }

  const candidates: Array<{ path: string; permission: Permission }> = [
    { path: "/inventory", permission: PERMISSIONS.PAGE_INVENTORY },
    { path: "/sales", permission: PERMISSIONS.PAGE_SALES },
    { path: "/p2p/pr", permission: PERMISSIONS.PAGE_PURCHASES },
    { path: "/crm/leads", permission: PERMISSIONS.PAGE_CRM_LEADS },
    { path: "/crm/accounts", permission: PERMISSIONS.PAGE_CRM_ACCOUNTS },
    { path: "/crm/presales", permission: PERMISSIONS.PAGE_CRM_PRESALES },
    { path: "/crm/opportunities", permission: PERMISSIONS.PAGE_CRM_OPPORTUNITIES },
    { path: "/recruitment/hiring-requests", permission: PERMISSIONS.MODULE_RECRUITMENT },
    { path: "/forms", permission: PERMISSIONS.MODULE_FORMS },
    { path: "/approvals", permission: PERMISSIONS.MODULE_APPROVALS },
    { path: "/setup", permission: PERMISSIONS.MODULE_ORG },
    { path: "/settings", permission: PERMISSIONS.PAGE_ADMIN_SETTINGS },
    { path: "/reports", permission: PERMISSIONS.PAGE_REPORTS },
    { path: "/users", permission: PERMISSIONS.PAGE_ADMIN_USERS },
  ];

  const match = candidates.find((candidate) => hasPermission(user, candidate.permission));
  return match?.path ?? "/access/request";
}

function resolveModulePermission(permission: Permission): Permission | null {
  if (permission.startsWith("page.crm.")) return PERMISSIONS.MODULE_CRM;
  if (permission.startsWith("page.inventory")) return PERMISSIONS.MODULE_INVENTORY;
  if (permission.startsWith("page.sales")) return PERMISSIONS.MODULE_SALES;
  if (permission.startsWith("page.purchases")) return PERMISSIONS.MODULE_PURCHASES;
  if (permission.startsWith("page.hrms")) return PERMISSIONS.MODULE_HRMS;
  if (permission.startsWith("page.reports") || permission.startsWith("page.accounting")) {
    return PERMISSIONS.MODULE_REPORTS;
  }
  if (permission.startsWith("page.recruitment")) {
    return PERMISSIONS.MODULE_RECRUITMENT;
  }
  if (permission.startsWith("page.forms")) return PERMISSIONS.MODULE_FORMS;
  if (permission.startsWith("page.approvals")) return PERMISSIONS.MODULE_APPROVALS;
  if (permission.startsWith("page.org") || permission.startsWith("page.setup")) {
    return PERMISSIONS.MODULE_ORG;
  }
  if (permission.startsWith("page.integrations") || permission.startsWith("page.settings")) {
    return PERMISSIONS.MODULE_INTEGRATIONS;
  }
  if (permission.startsWith("page.analytics")) return PERMISSIONS.MODULE_ANALYTICS;
  if (permission.startsWith("page.notifications")) return PERMISSIONS.MODULE_NOTIFICATIONS;
  if (permission.startsWith("page.admin.")) return PERMISSIONS.MODULE_ADMIN;
  if (permission.startsWith("page.dashboard")) return null;
  return null;
}
