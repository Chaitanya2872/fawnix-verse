import { PERMISSIONS, type Permission } from "@/modules/auth/permissions";
import type { UserRole } from "./types";

export type PermissionOption = {
  value: Permission;
  label: string;
  description?: string;
};

export type PermissionGroup = {
  heading: string;
  options: PermissionOption[];
};

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    heading: "Modules",
    options: [
      { value: PERMISSIONS.MODULE_CRM, label: "CRM Module" },
      { value: PERMISSIONS.MODULE_INVENTORY, label: "Inventory Module" },
      { value: PERMISSIONS.MODULE_SALES, label: "Sales Module" },
      { value: PERMISSIONS.MODULE_PURCHASES, label: "Purchases Module" },
      { value: PERMISSIONS.MODULE_HRMS, label: "HRMS Module" },
      { value: PERMISSIONS.MODULE_REPORTS, label: "Reports Module" },
      { value: PERMISSIONS.MODULE_ADMIN, label: "Administration Module" },
      { value: PERMISSIONS.MODULE_RECRUITMENT, label: "Recruitment Module" },
      { value: PERMISSIONS.MODULE_FORMS, label: "Forms Module" },
      { value: PERMISSIONS.MODULE_APPROVALS, label: "Approvals Module" },
      { value: PERMISSIONS.MODULE_ORG, label: "Organization Module" },
      { value: PERMISSIONS.MODULE_INTEGRATIONS, label: "Integrations Module" },
      { value: PERMISSIONS.MODULE_ANALYTICS, label: "Analytics Module" },
      { value: PERMISSIONS.MODULE_NOTIFICATIONS, label: "Notifications Module" },
    ],
  },
  {
    heading: "Pages",
    options: [
      { value: PERMISSIONS.PAGE_DASHBOARD, label: "Dashboard" },
      { value: PERMISSIONS.PAGE_CRM_LEADS, label: "CRM Leads" },
      { value: PERMISSIONS.PAGE_CRM_ACCOUNTS, label: "CRM Accounts" },
      { value: PERMISSIONS.PAGE_CRM_PRESALES, label: "CRM Tasks" },
      { value: PERMISSIONS.PAGE_CRM_OPPORTUNITIES, label: "CRM Opportunities" },
      { value: PERMISSIONS.PAGE_INVENTORY, label: "Inventory" },
      { value: PERMISSIONS.PAGE_SALES, label: "Sales" },
      { value: PERMISSIONS.PAGE_PURCHASES, label: "Purchases" },
      { value: PERMISSIONS.PAGE_ACCOUNTING, label: "Accounting" },
      { value: PERMISSIONS.PAGE_HRMS, label: "HRMS" },
      { value: PERMISSIONS.PAGE_REPORTS, label: "Reports" },
      { value: PERMISSIONS.PAGE_ADMIN_USERS, label: "Users" },
      { value: PERMISSIONS.PAGE_ADMIN_SETTINGS, label: "Settings / Integrations" },
    ],
  },
];

export const ROLE_DEFAULT_PERMISSIONS: Record<UserRole, Permission[]> = {
  ROLE_MASTER: Object.values(PERMISSIONS),
  ROLE_ADMIN: [
    PERMISSIONS.MODULE_ADMIN,
    PERMISSIONS.PAGE_ADMIN_USERS,
    PERMISSIONS.PAGE_ADMIN_SETTINGS,
  ],
  ROLE_REPORTING_MANAGER: [
    PERMISSIONS.MODULE_REPORTS,
    PERMISSIONS.PAGE_REPORTS,
  ],
  ROLE_SALES_MANAGER: [
    PERMISSIONS.MODULE_CRM,
    PERMISSIONS.MODULE_REPORTS,
    PERMISSIONS.PAGE_DASHBOARD,
    PERMISSIONS.PAGE_CRM_LEADS,
    PERMISSIONS.PAGE_CRM_PRESALES,
    PERMISSIONS.PAGE_REPORTS,
  ],
  ROLE_SALES_REP: [
    PERMISSIONS.MODULE_CRM,
    PERMISSIONS.PAGE_DASHBOARD,
    PERMISSIONS.PAGE_CRM_LEADS,
    PERMISSIONS.PAGE_CRM_PRESALES,
  ],
  ROLE_VIEWER: [
    PERMISSIONS.MODULE_REPORTS,
    PERMISSIONS.PAGE_DASHBOARD,
    PERMISSIONS.PAGE_REPORTS,
  ],
};

export function uniquePermissions(list: Permission[]): Permission[] {
  return Array.from(new Set(list));
}
