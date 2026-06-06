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

export type PermissionModuleGroup = {
  module: PermissionOption;
  pages: PermissionOption[];
};

export const PERMISSION_MODULE_GROUPS: PermissionModuleGroup[] = [
  {
    module: { value: PERMISSIONS.MODULE_INVENTORY, label: "Inventory Module" },
    pages: [
      { value: PERMISSIONS.PAGE_INVENTORY_MANAGE, label: "Manage Inventory" },
      { value: PERMISSIONS.PAGE_INVENTORY_TRANSACTIONS, label: "Transactions" },
      { value: PERMISSIONS.PAGE_INVENTORY_BILLS, label: "Bills" },
      { value: PERMISSIONS.PAGE_INVENTORY_INVOICES, label: "Invoices" },
      { value: PERMISSIONS.PAGE_SALES_ORDERS, label: "Orders" },
    ],
  },
  {
    module: { value: PERMISSIONS.MODULE_CRM, label: "CRM Module" },
    pages: [
      { value: PERMISSIONS.PAGE_CRM_LEADS, label: "CRM Leads" },
      { value: PERMISSIONS.PAGE_CRM_ACCOUNTS, label: "CRM Accounts" },
      { value: PERMISSIONS.PAGE_CRM_PRESALES, label: "CRM Tasks" },
      { value: PERMISSIONS.PAGE_CRM_OPPORTUNITIES, label: "CRM Opportunities" },
    ],
  },
  {
    module: { value: PERMISSIONS.MODULE_SALES, label: "Sales Module" },
    pages: [
      { value: PERMISSIONS.PAGE_SALES, label: "Quotations" },
    ],
  },
  {
    module: { value: PERMISSIONS.MODULE_PURCHASES, label: "Purchases Module" },
    pages: [
      { value: PERMISSIONS.PAGE_PURCHASES, label: "Purchases" },
    ],
  },
  {
    module: { value: PERMISSIONS.MODULE_REPORTS, label: "Reports Module" },
    pages: [
      { value: PERMISSIONS.PAGE_ACCOUNTING, label: "Accounting" },
      { value: PERMISSIONS.PAGE_REPORTS, label: "Reports" },
    ],
  },
  {
    module: { value: PERMISSIONS.MODULE_TASKS, label: "Task Management Module" },
    pages: [
      { value: PERMISSIONS.PAGE_TASKS, label: "Task Management" },
    ],
  },
  {
    module: { value: PERMISSIONS.MODULE_HRMS, label: "HRMS Module" },
    pages: [
      { value: PERMISSIONS.PAGE_HRMS, label: "HRMS" },
    ],
  },
  {
    module: { value: PERMISSIONS.MODULE_ADMIN, label: "Administration Module" },
    pages: [
      { value: PERMISSIONS.PAGE_ADMIN_USERS, label: "Users" },
    ],
  },
  {
    module: { value: PERMISSIONS.MODULE_INTEGRATIONS, label: "Integrations Module" },
    pages: [
      { value: PERMISSIONS.PAGE_ADMIN_SETTINGS, label: "Settings / Integrations" },
    ],
  },
  {
    module: { value: PERMISSIONS.MODULE_RECRUITMENT, label: "Recruitment Module" },
    pages: [],
  },
  {
    module: { value: PERMISSIONS.MODULE_FORMS, label: "Forms Module" },
    pages: [],
  },
  {
    module: { value: PERMISSIONS.MODULE_APPROVALS, label: "Approvals Module" },
    pages: [],
  },
  {
    module: { value: PERMISSIONS.MODULE_ORG, label: "Organization Module" },
    pages: [],
  },
  {
    module: { value: PERMISSIONS.MODULE_ANALYTICS, label: "Analytics Module" },
    pages: [],
  },
  {
    module: { value: PERMISSIONS.MODULE_NOTIFICATIONS, label: "Notifications Module" },
    pages: [],
  },
];

export const STANDALONE_PAGE_OPTIONS: PermissionOption[] = [
  { value: PERMISSIONS.PAGE_DASHBOARD, label: "Dashboard" },
];

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    heading: "Modules",
    options: PERMISSION_MODULE_GROUPS.map((group) => group.module),
  },
  {
    heading: "Pages",
    options: [
      ...STANDALONE_PAGE_OPTIONS,
      ...PERMISSION_MODULE_GROUPS.flatMap((group) => group.pages),
      { value: PERMISSIONS.PAGE_INVENTORY, label: "Inventory (Legacy)" },
    ],
  },
];

export const ROLE_DEFAULT_PERMISSIONS: Record<UserRole, Permission[]> = {
  ROLE_MASTER: Object.values(PERMISSIONS),
  ROLE_ADMIN: [
    PERMISSIONS.MODULE_TASKS,
    PERMISSIONS.PAGE_TASKS,
  ],
  ROLE_REPORTING_MANAGER: [
    PERMISSIONS.MODULE_REPORTS,
    PERMISSIONS.PAGE_REPORTS,
    PERMISSIONS.MODULE_TASKS,
    PERMISSIONS.PAGE_TASKS,
  ],
  ROLE_SALES_MANAGER: [
    PERMISSIONS.MODULE_CRM,
    PERMISSIONS.MODULE_REPORTS,
    PERMISSIONS.MODULE_TASKS,
    PERMISSIONS.PAGE_DASHBOARD,
    PERMISSIONS.PAGE_CRM_LEADS,
    PERMISSIONS.PAGE_CRM_PRESALES,
    PERMISSIONS.PAGE_REPORTS,
    PERMISSIONS.PAGE_TASKS,
  ],
  ROLE_SALES_REP: [
    PERMISSIONS.MODULE_CRM,
    PERMISSIONS.MODULE_TASKS,
    PERMISSIONS.PAGE_DASHBOARD,
    PERMISSIONS.PAGE_CRM_LEADS,
    PERMISSIONS.PAGE_CRM_PRESALES,
    PERMISSIONS.PAGE_TASKS,
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
