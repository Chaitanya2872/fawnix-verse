import { PERMISSIONS, type Permission } from "@/modules/auth/permissions";
import type { AccessControlCatalog, PermissionDefinition, PermissionModule, UserRole } from "./types";

export type PermissionOption = {
  value: string;
  label: string;
  description?: string;
};

export type PermissionModuleGroup = {
  key: string;
  label: string;
  module?: PermissionOption | null;
  pages: PermissionOption[];
  features: PermissionOption[];
};

const FALLBACK_PERMISSION_MODULE_GROUPS: PermissionModuleGroup[] = [
  {
    key: "inventory",
    label: "Inventory",
    module: { value: PERMISSIONS.MODULE_INVENTORY, label: "Inventory Module" },
    pages: [
      { value: PERMISSIONS.PAGE_INVENTORY_MANAGE, label: "Manage Inventory" },
      { value: PERMISSIONS.PAGE_INVENTORY_TRANSACTIONS, label: "Transactions" },
      { value: PERMISSIONS.PAGE_INVENTORY_INVOICES, label: "Bills & Invoices" },
      { value: PERMISSIONS.PAGE_SALES_ORDERS, label: "Orders" },
    ],
    features: [],
  },
  {
    key: "crm",
    label: "CRM",
    module: { value: PERMISSIONS.MODULE_CRM, label: "CRM Module" },
    pages: [
      { value: PERMISSIONS.PAGE_CRM_LEADS, label: "CRM Leads" },
      { value: PERMISSIONS.PAGE_CRM_ACCOUNTS, label: "CRM Accounts" },
      { value: PERMISSIONS.PAGE_CRM_PRESALES, label: "CRM Tasks" },
      { value: PERMISSIONS.PAGE_CRM_OPPORTUNITIES, label: "CRM Opportunities" },
    ],
    features: [],
  },
  {
    key: "sales",
    label: "Sales",
    module: { value: PERMISSIONS.MODULE_SALES, label: "Sales Module" },
    pages: [{ value: PERMISSIONS.PAGE_SALES, label: "Quotations" }],
    features: [],
  },
  {
    key: "purchases",
    label: "Purchases",
    module: { value: PERMISSIONS.MODULE_PURCHASES, label: "Purchases Module" },
    pages: [{ value: PERMISSIONS.PAGE_PURCHASES, label: "Purchases" }],
    features: [],
  },
  {
    key: "reports",
    label: "Reports",
    module: { value: PERMISSIONS.MODULE_REPORTS, label: "Reports Module" },
    pages: [
      { value: PERMISSIONS.PAGE_ACCOUNTING, label: "Accounting" },
      { value: PERMISSIONS.PAGE_REPORTS, label: "Reports" },
    ],
    features: [],
  },
  {
    key: "tasks",
    label: "Tasks",
    module: { value: PERMISSIONS.MODULE_TASKS, label: "Task Management Module" },
    pages: [{ value: PERMISSIONS.PAGE_TASKS, label: "Task Management" }],
    features: [],
  },
];

const FALLBACK_ROLE_DEFAULT_PERMISSIONS: Record<string, string[]> = {
  ROLE_MASTER: Object.values(PERMISSIONS),
  ROLE_ADMIN: [PERMISSIONS.MODULE_TASKS, PERMISSIONS.PAGE_TASKS],
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
  ROLE_VIEWER: [PERMISSIONS.MODULE_REPORTS, PERMISSIONS.PAGE_DASHBOARD, PERMISSIONS.PAGE_REPORTS],
};

export function uniquePermissions(list: string[]): string[] {
  return Array.from(new Set(list));
}

export function buildPermissionModuleGroups(catalog?: AccessControlCatalog | null): PermissionModuleGroup[] {
  if (!catalog?.modules?.length) {
    return FALLBACK_PERMISSION_MODULE_GROUPS;
  }

  return catalog.modules.map((module) => {
    const modulePermission = module.permissions.find((permission) => permission.level === "MODULE");
    return {
      key: module.key,
      label: module.label,
      module: modulePermission
        ? toPermissionOption(modulePermission)
        : null,
      pages: module.permissions.filter((permission) => permission.level === "PAGE").map(toPermissionOption),
      features: module.permissions.filter((permission) => permission.level === "FEATURE").map(toPermissionOption),
    };
  });
}

export function getRoleDefaultPermissions(catalog: AccessControlCatalog | null | undefined, role: UserRole): string[] {
  const backendValue = catalog?.roles.find((item) => item.key === role)?.defaultPermissions;
  if (backendValue?.length) {
    return uniquePermissions(backendValue);
  }
  return uniquePermissions(FALLBACK_ROLE_DEFAULT_PERMISSIONS[role] ?? []);
}

export function getPermissionLabel(catalog: AccessControlCatalog | null | undefined, permission: string): string {
  const match = catalog?.modules
    ?.flatMap((module) => module.permissions)
    .find((item) => item.key === permission);
  return match?.label ?? permission;
}

export function getRoleOptions(catalog: AccessControlCatalog | null | undefined): Array<{ value: UserRole; label: string }> {
  if (!catalog?.roles?.length) {
    return [
      { value: "ROLE_MASTER", label: "Master" },
      { value: "ROLE_ADMIN", label: "Admin" },
      { value: "ROLE_REPORTING_MANAGER", label: "Reporting Manager" },
      { value: "ROLE_SALES_MANAGER", label: "Manager" },
      { value: "ROLE_SALES_REP", label: "Employee" },
      { value: "ROLE_VIEWER", label: "Viewer" },
    ];
  }

  return catalog.roles.map((role) => ({
    value: role.key,
    label: role.label,
  }));
}

function toPermissionOption(permission: PermissionDefinition): PermissionOption {
  return {
    value: permission.key,
    label: permission.label,
    description: permission.description,
  };
}
