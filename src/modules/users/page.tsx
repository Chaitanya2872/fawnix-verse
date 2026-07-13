import { useMemo, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Sheet, 
  SheetContent,
   SheetDescription, 
   SheetFooter,
    SheetHeader, 
    SheetTitle,
   } from "@/components/ui/sheet"; 
import { Pencil, Trash2, Copy, } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCurrentUser } from "@/modules/auth/hooks";
import { PERMISSIONS, hasPermission } from "@/modules/auth/permissions";
import { hasStoredSession } from "@/services/api-client";
import {
  useAccessControlCatalog,
  useCloneRole,
  useCreatePermission,
  useCreateRole,
  useCreateUser,
  useDeletePermission,
  useDeleteRole,
  useDeleteUser,
  usePermissions,
  useRoles,
  useUpdatePermission,
  useUpdateRole,
  useUpdateRoleStatus,
  useUpdateUser,
  useUpdateUserStatus,
  useUsers,
} from "./hooks";
import {
  USER_LANGUAGE_OPTIONS,
  type CreatePermissionPayload,
  type CreateRolePayload,
  type PermissionRecord,
  type RoleRecord,
  getPrimaryRole,
  getRoleLabel,
  type CreateUserPayload,
  type UpdateUserPayload,
  type User,
  type UserRole,
} from "./types";
import { PermissionSelector } from "./PermissionSelector";
import {
  buildPermissionModuleGroups,
  getRoleDefaultPermissions,
  getRoleOptions,
  uniquePermissions,
} from "./permissions";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "all-users" | "role-management" | "permission-management";
type UserFormState = {
  fullName: string;
  email: string;
  phoneNumber: string;
  language: string;
  password: string;
  role: UserRole;
  permissions: string[];
};

type RoleFormState = {
  name: string;
  description: string;
  permissions: string[];
};

type PermissionFormState = {
  key: string;
  label: string;
  moduleKey: string;
  description: string;
  active: boolean;
};

const EMPTY_FORM: UserFormState = {
  fullName: "",
  email: "",
  phoneNumber: "",
  language: "",
  password: "",
  role: "",
  permissions: [],
};

const EMPTY_ROLE_FORM: RoleFormState = {
  name: "",
  description: "",
  permissions: [],
};

const EMPTY_PERMISSION_FORM: PermissionFormState = {
  key: "",
  label: "",
  moduleKey: "",
  description: "",
  active: true,
};

const selectClassName =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildFormFromUser(user: User): UserFormState {
  return {
    fullName: user.name ?? "",
    email: user.email ?? "",
    phoneNumber: user.phoneNumber ?? "",
    language: user.language ?? "",
    password: "",
    role: getPrimaryRole(user.roles),
    permissions: user.permissions ?? [],
  };
}

function avatarColor(name: string): string {
  const colors = [
    "#6366f1", "#8b5cf6", "#ec4899", "#f59e0b",
    "#10b981", "#3b82f6", "#ef4444", "#14b8a6",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function initials(name: string): string {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

// ─── Small components ─────────────────────────────────────────────────────────

function Avatar({ name }: { name: string }) {
  return (
    <span
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
      style={{ backgroundColor: avatarColor(name) }}
    >
      {initials(name)}
    </span>
  );
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${active ? "bg-emerald-500" : "bg-slate-400"}`} />
      <span className={`text-xs font-medium ${active ? "text-emerald-700" : "text-slate-500"}`}>
        {active ? "Active" : "Inactive"}
      </span>
    </span>
  );
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const tabs: { key: Tab; label: string }[] = [
    { key: "all-users", label: "All Users" },
    { key: "role-management", label: "Role Management" },
    { key: "permission-management", label: "Permission Management" },
  ];
  return (
    <div className="flex gap-1 border-b border-slate-200">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none ${
            active === tab.key
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ─── User form fields ─────────────────────────────────────────────────────────

function UserFormFields({
  form,
  roleOptions,
  onChange,
  onTogglePermission,
  onResetPermissions,
  permissionGroups,
  passwordHint,
}: {
  form: UserFormState;
  roleOptions: { value: UserRole; label: string }[];
  onChange: <K extends keyof UserFormState>(field: K, value: UserFormState[K]) => void;
  onTogglePermission: (permission: string) => void;
  onResetPermissions: () => void;
  permissionGroups: ReturnType<typeof buildPermissionModuleGroups>;
  passwordHint?: string;
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="full-name">Full Name</Label>
        <Input
          id="full-name"
          value={form.fullName}
          onChange={(e) => onChange("fullName", e.target.value)}
          placeholder="Jane Cooper"
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={form.email}
          onChange={(e) => onChange("email", e.target.value)}
          placeholder="jane@fawnix.com"
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="phone-number">Phone Number</Label>
        <Input
          id="phone-number"
          value={form.phoneNumber}
          onChange={(e) => onChange("phoneNumber", e.target.value)}
          placeholder="+1 (555) 123-4567"
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={form.password}
          onChange={(e) => onChange("password", e.target.value)}
          placeholder="••••••••"
        />
        {passwordHint && <p className="text-xs text-slate-500">{passwordHint}</p>}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="role">Role</Label>
        <select
          id="role"
          className={selectClassName}
          value={form.role}
          onChange={(e) => onChange("role", e.target.value as UserRole)}
          required
        >
          <option value="">Select role</option>
          {roleOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="language">Language</Label>
        <select
          id="language"
          className={selectClassName}
          value={form.language}
          onChange={(e) => onChange("language", e.target.value)}
          required
        >
          <option value="">Select language</option>
          {USER_LANGUAGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-3">
          <Label>Permissions</Label>
          <Button type="button" variant="outline" size="sm" onClick={onResetPermissions}>
            Reset to Role Defaults
          </Button>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <PermissionSelector
            selectedPermissions={form.permissions}
            onTogglePermission={onTogglePermission}
            permissionGroups={permissionGroups}
            idPrefix="user-permission"
          />
        </div>
        <p className="text-xs text-slate-500">
          Role defaults come from the backend catalog and can be refined at module, page, and feature level.
        </p>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const { data: currentUser } = useCurrentUser({ enabled: hasStoredSession() });
  const isAdmin = hasPermission(currentUser, PERMISSIONS.PAGE_ADMIN_USERS);

  const usersQuery = useUsers({ enabled: Boolean(isAdmin) });
  const accessCatalogQuery = useAccessControlCatalog({ enabled: Boolean(isAdmin) });
  const rolesQuery = useRoles({ enabled: Boolean(isAdmin) });
  const permissionsQuery = usePermissions({ enabled: Boolean(isAdmin) });
  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const updateStatusMutation = useUpdateUserStatus();
  const deleteUserMutation = useDeleteUser();
  const createRoleMutation = useCreateRole();
  const updateRoleMutation = useUpdateRole();
  const cloneRoleMutation = useCloneRole();
  const updateRoleStatusMutation = useUpdateRoleStatus();
  const deleteRoleMutation = useDeleteRole();
  const createPermissionMutation = useCreatePermission();
  const updatePermissionMutation = useUpdatePermission();
  const deletePermissionMutation = useDeletePermission();

  const [activeTab, setActiveTab] = useState<Tab>("all-users");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [isPermissionDialogOpen, setIsPermissionDialogOpen] = useState(false);
  const [activeUser, setActiveUser] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [activeRole, setActiveRole] = useState<RoleRecord | null>(null);
  const [activePermission, setActivePermission] = useState<PermissionRecord | null>(null);
  const [roleCloneTarget, setRoleCloneTarget] = useState<RoleRecord | null>(null);
  const [formState, setFormState] = useState<UserFormState>(EMPTY_FORM);
  const [roleFormState, setRoleFormState] = useState<RoleFormState>(EMPTY_ROLE_FORM);
  const [permissionFormState, setPermissionFormState] = useState<PermissionFormState>(EMPTY_PERMISSION_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [roleFormError, setRoleFormError] = useState<string | null>(null);
  const [permissionFormError, setPermissionFormError] = useState<string | null>(null);

  const users = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);
  const roles = useMemo(() => rolesQuery.data ?? [], [rolesQuery.data]);
  const permissions = useMemo(() => permissionsQuery.data ?? [], [permissionsQuery.data]);
  const permissionGroups = useMemo(
    () => buildPermissionModuleGroups(accessCatalogQuery.data),
    [accessCatalogQuery.data]
  );
  const roleOptions = useMemo(
    () => getRoleOptions(accessCatalogQuery.data),
    [accessCatalogQuery.data]
  );
  const permissionModuleOptions = useMemo(
    () =>
      Array.from(new Set(permissions.map((p) => p.moduleKey))).sort((a, b) => a.localeCompare(b)),
    [permissions]
  );

  const resolveRoleLabel = (roleKeys: string[]) => {
    const key = roleKeys[0];
    return roleOptions.find((opt) => opt.value === key)?.label ?? getRoleLabel(roleKeys);
  };

  // ── Form handlers ──────────────────────────────────────────────────────────

  const handleFormChange = <K extends keyof UserFormState>(field: K, value: UserFormState[K]) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleTogglePermission = (permission: string) => {
    setFormState((prev) => {
      const exists = prev.permissions.includes(permission);
      return {
        ...prev,
        permissions: exists
          ? prev.permissions.filter((p) => p !== permission)
          : [...prev.permissions, permission],
      };
    });
  };

  const resetPermissionsToRoleDefaults = () => {
    setFormState((prev) => ({
      ...prev,
      permissions: uniquePermissions(getRoleDefaultPermissions(accessCatalogQuery.data, prev.role)),
    }));
  };

  const handleRoleFormChange = <K extends keyof RoleFormState>(field: K, value: RoleFormState[K]) => {
    setRoleFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handlePermissionFormChange = <K extends keyof PermissionFormState>(
    field: K,
    value: PermissionFormState[K]
  ) => {
    setPermissionFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleToggleRolePermission = (permission: string) => {
    setRoleFormState((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((p) => p !== permission)
        : [...prev.permissions, permission],
    }));
  };

  // ── Dialog openers ─────────────────────────────────────────────────────────

  const openCreateDialog = () => {
    const defaultRole = roleOptions[0]?.value ?? "";
    setFormState({
      ...EMPTY_FORM,
      role: defaultRole,
      permissions: uniquePermissions(getRoleDefaultPermissions(accessCatalogQuery.data, defaultRole)),
    });
    setFormError(null);
    setPageError(null);
    setIsCreateOpen(true);
  };

  const openEditDialog = (user: User) => {
    setActiveUser(user);
    setFormState(buildFormFromUser(user));
    setFormError(null);
    setPageError(null);
    setIsEditOpen(true);
  };

  const openCreateRoleDialog = () => {
    setActiveRole(null);
    setRoleCloneTarget(null);
    setRoleFormState(EMPTY_ROLE_FORM);
    setRoleFormError(null);
    setIsRoleDialogOpen(true);
  };

  const openEditRoleDialog = (role: RoleRecord) => {
    setActiveRole(role);
    setRoleCloneTarget(null);
    setRoleFormState({
      name: role.name,
      description: role.description ?? "",
      permissions: role.permissions ?? [],
    });
    setRoleFormError(null);
    setIsRoleDialogOpen(true);
  };

  const openCloneRoleDialog = (role: RoleRecord) => {
    setRoleCloneTarget(role);
    setActiveRole(null);
    setRoleFormState({
      name: `${role.name} Copy`,
      description: role.description ?? "",
      permissions: role.permissions ?? [],
    });
    setRoleFormError(null);
    setIsRoleDialogOpen(true);
  };

  const openCreatePermissionDialog = () => {
    setActivePermission(null);
    setPermissionFormState(EMPTY_PERMISSION_FORM);
    setPermissionFormError(null);
    setIsPermissionDialogOpen(true);
  };

  const openEditPermissionDialog = (permission: PermissionRecord) => {
    setActivePermission(permission);
    setPermissionFormState({
      key: permission.key,
      label: permission.label,
      moduleKey: permission.moduleKey,
      description: permission.description ?? "",
      active: permission.active,
    });
    setPermissionFormError(null);
    setIsPermissionDialogOpen(true);
  };

  // ── Submit handlers ────────────────────────────────────────────────────────

  const handleCreateSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    const payload: CreateUserPayload = {
      fullName: formState.fullName.trim(),
      email: formState.email.trim(),
      phoneNumber: formState.phoneNumber.trim(),
      password: formState.password,
      role: formState.role,
      language: formState.language,
      permissions: formState.permissions,
    };
    try {
      await createUserMutation.mutateAsync(payload);
      setIsCreateOpen(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Failed to create user.");
    }
  };

  const handleEditSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!activeUser) return;
    setFormError(null);
    const payload: UpdateUserPayload = {
      fullName: formState.fullName.trim(),
      email: formState.email.trim(),
      phoneNumber: formState.phoneNumber.trim(),
      role: formState.role,
      language: formState.language,
      permissions: formState.permissions,
    };
    if (formState.password.trim()) payload.password = formState.password;
    try {
      await updateUserMutation.mutateAsync({ id: activeUser.id, payload });
      setIsEditOpen(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Failed to update user.");
    }
  };

  const handleToggleStatus = async (user: User) => {
    setPageError(null);
    try {
      await updateStatusMutation.mutateAsync({ id: user.id, active: !user.active });
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to update status.");
    }
  };

  const openDeleteDialog = (user: User) => {
    setDeleteError(null);
    setPageError(null);
    setDeleteTarget(user);
  };

  const closeDeleteDialog = () => setDeleteTarget(null);

  const handleConfirmDeleteUser = async () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    setPageError(null);
    try {
      await deleteUserMutation.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete user.";
      setDeleteError(message);
      setPageError(message);
    }
  };

  const handleRoleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setRoleFormError(null);
    const payload: CreateRolePayload = {
      name: roleFormState.name.trim(),
      description: roleFormState.description.trim() || undefined,
      permissions: roleFormState.permissions,
    };
    try {
      if (roleCloneTarget) {
        await cloneRoleMutation.mutateAsync({ id: roleCloneTarget.id, name: payload.name });
      } else if (activeRole) {
        await updateRoleMutation.mutateAsync({ id: activeRole.id, payload });
      } else {
        await createRoleMutation.mutateAsync(payload);
      }
      setIsRoleDialogOpen(false);
    } catch (error) {
      setRoleFormError(error instanceof Error ? error.message : "Failed to save role.");
    }
  };

  const handlePermissionSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setPermissionFormError(null);
    const createPayload: CreatePermissionPayload = {
      key: permissionFormState.key.trim(),
      label: permissionFormState.label.trim(),
      moduleKey: permissionFormState.moduleKey.trim(),
      description: permissionFormState.description.trim() || undefined,
    };
    try {
      if (activePermission) {
        await updatePermissionMutation.mutateAsync({
          key: activePermission.key,
          payload: { ...createPayload, active: permissionFormState.active },
        });
      } else {
        await createPermissionMutation.mutateAsync(createPayload);
      }
      setIsPermissionDialogOpen(false);
    } catch (error) {
      setPermissionFormError(error instanceof Error ? error.message : "Failed to save permission.");
    }
  };

  // ── Access guard ───────────────────────────────────────────────────────────

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Restricted Access</CardTitle>
          <CardDescription>
            You do not have permission to view user management.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">User Management</h2>
          <p className="text-sm text-slate-500">
            Create users, assign roles, and manage account access.
          </p>
        </div>
        {activeTab === "all-users" && (
          <Button onClick={openCreateDialog}>Add User</Button>
        )}
        {activeTab === "role-management" && (
          <Button onClick={openCreateRoleDialog}>Create Role</Button>
        )}
        {activeTab === "permission-management" && (
          <Button onClick={openCreatePermissionDialog}>Create Permission</Button>
        )}
      </div>

      {/* Tab navigation */}
      <TabBar active={activeTab} onChange={setActiveTab} />

      {/* ── All Users tab ──────────────────────────────────────────────────── */}
      {activeTab === "all-users" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">All Users</CardTitle>
            <CardDescription>Manage roles, status, and access control.</CardDescription>
          </CardHeader>
          <CardContent>
            {pageError && (
              <div className="mb-4 rounded-md border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                {pageError}
              </div>
            )}
            {usersQuery.isLoading || accessCatalogQuery.isLoading ? (
              <div className="rounded-lg border border-dashed border-slate-200 p-6 text-sm text-slate-500">
                Loading users…
              </div>
            ) : accessCatalogQuery.isError ? (
              <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                {(accessCatalogQuery.error as Error)?.message ?? "Failed to load access control catalog."}
              </div>
            ) : usersQuery.isError ? (
              <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                {(usersQuery.error as Error)?.message ?? "Failed to load users."}
              </div>
            ) : users.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 p-6 text-sm text-slate-500">
                No users found yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs text-slate-400 border-b border-slate-100">
                      <th className="px-4 py-3 font-medium uppercase tracking-wide">Name</th>
                      <th className="px-4 py-3 font-medium uppercase tracking-wide">Email</th>
                      <th className="px-4 py-3 font-medium uppercase tracking-wide">Phone</th>
                      <th className="px-4 py-3 font-medium uppercase tracking-wide">Role</th>
                      <th className="px-4 py-3 font-medium uppercase tracking-wide">Language</th>
                      <th className="px-4 py-3 font-medium uppercase tracking-wide">Status</th>
                      <th className="px-4 py-3 font-medium uppercase tracking-wide text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={user.name ?? "?"} />
                            <span className="font-medium text-slate-900">{user.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-blue-600 underline underline-offset-2">
                          <a href={`mailto:${user.email}`}>{user.email}</a>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{user.phoneNumber ?? "—"}</td>
                        <td className="px-4 py-3 text-slate-600">{resolveRoleLabel(user.roles)}</td>
                        <td className="px-4 py-3 text-slate-600">{user.language ?? "—"}</td>
                        <td className="px-4 py-3">
                          <StatusDot active={user.active} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                           <Button variant="ghost" size="icon" className="text-slate-600 hover:text-slate-900" onClick={() => openEditDialog(user)} > <Pencil className="h-4 w-4" /> </Button> <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => openDeleteDialog(user)} > <Trash2 className="h-4 w-4" /> </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Role Management tab ────────────────────────────────────────────── */}
      {activeTab === "role-management" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Role Management</CardTitle>
            <CardDescription>
              Create dynamic roles, assign permissions, clone roles, and control activation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {rolesQuery.isLoading ? (
              <div className="rounded-lg border border-dashed border-slate-200 p-6 text-sm text-slate-500">
                Loading roles…
              </div>
            ) : rolesQuery.isError ? (
              <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                {(rolesQuery.error as Error)?.message ?? "Failed to load roles."}
              </div>
            ) : roles.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 p-6 text-sm text-slate-500">
                No roles created yet.
              </div>
            ) : (
              <div className="space-y-3">
                {roles.map((role) => (
                  <div key={role.id} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900">{role.name}</p>
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                            {role.key}
                          </span>
                          <span
                            className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                              role.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {role.active ? "Active" : "Inactive"}
                          </span>
                        </div>
                        {role.description && (
                          <p className="mt-2 text-sm text-slate-600">{role.description}</p>
                        )}
                        <p className="mt-2 text-xs text-slate-500">
                          {role.permissions.length} permission(s) assigned
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
  <Button
    variant="ghost"
    size="icon"
    onClick={() => openEditRoleDialog(role)}
  >
    <Pencil className="h-4 w-4" />
  </Button>

  <Button
    variant="ghost"
    size="icon"
    onClick={() => openCloneRoleDialog(role)}
  >
    <Copy className="h-4 w-4" />
  </Button>

  <Button
    variant="outline"
    size="sm"
    onClick={() =>
      updateRoleStatusMutation.mutate({
        id: role.id,
        active: !role.active,
      })
    }
    disabled={
      updateRoleStatusMutation.isPending ||
      role.systemDefined
    }
  >
    {role.active ? "Deactivate" : "Activate"}
  </Button>

  <Button
    variant="ghost"
    size="icon"
    className="text-red-500 hover:text-red-700 hover:bg-red-50"
    onClick={() => deleteRoleMutation.mutate(role.id)}
    disabled={
      deleteRoleMutation.isPending ||
      role.systemDefined
    }
  >
    <Trash2 className="h-4 w-4" />
  </Button>

                       
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Permission Management tab ──────────────────────────────────────── */}
      {activeTab === "permission-management" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Permission Management</CardTitle>
            <CardDescription>
              Create and maintain database-driven permissions grouped by module.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {permissionsQuery.isLoading ? (
              <div className="rounded-lg border border-dashed border-slate-200 p-6 text-sm text-slate-500">
                Loading permissions…
              </div>
            ) : permissionsQuery.isError ? (
              <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                {(permissionsQuery.error as Error)?.message ?? "Failed to load permissions."}
              </div>
            ) : permissions.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 p-6 text-sm text-slate-500">
                No permissions created yet.
              </div>
            ) : (
              <div className="space-y-3">
                {permissions.map((permission) => (
                  <div key={permission.key} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900">{permission.label}</p>
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                            {permission.key}
                          </span>
                          <span className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700">
                            {permission.moduleKey}
                          </span>
                        </div>
                        {permission.description && (
                          <p className="mt-2 text-sm text-slate-600">{permission.description}</p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditPermissionDialog(permission)} > <Pencil className="h-4 w-4" /> </Button> <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => deletePermissionMutation.mutate(permission.key)} disabled={deletePermissionMutation.isPending || permission.systemDefined} > <Trash2 className="h-4 w-4" /> </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Create User dialog ─────────────────────────────────────────────── */}
      <Sheet open={isCreateOpen} onOpenChange={setIsCreateOpen}> <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto" > <SheetHeader> <SheetTitle>Create User</SheetTitle> <SheetDescription> Add a new user and assign their role. </SheetDescription> </SheetHeader> <form onSubmit={handleCreateSubmit} className="space-y-5 mt-6"> <UserFormFields form={formState} roleOptions={roleOptions} onChange={handleFormChange} onTogglePermission={handleTogglePermission} onResetPermissions={resetPermissionsToRoleDefaults} permissionGroups={permissionGroups} /> {formError && ( <div className="rounded-md border border-red-100 bg-red-50 p-3 text-sm text-red-700"> {formError} </div> )} <SheetFooter> <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)} > Cancel </Button> <Button type="submit" disabled={createUserMutation.isPending} > {createUserMutation.isPending ? "Creating..." : "Create User"} </Button> </SheetFooter> </form> </SheetContent> </Sheet>

      {/* ── Edit User dialog ───────────────────────────────────────────────── */}
      <Sheet open={isEditOpen} onOpenChange={setIsEditOpen}>
        <SheetContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit User</SheetTitle>
            <SheetDescription>Update profile details and access role.</SheetDescription>
          </SheetHeader>
          <form onSubmit={handleEditSubmit} className="space-y-5">
            <UserFormFields
              form={formState}
              roleOptions={roleOptions}
              onChange={handleFormChange}
              onTogglePermission={handleTogglePermission}
              onResetPermissions={resetPermissionsToRoleDefaults}
              permissionGroups={permissionGroups}
              passwordHint="Leave blank to keep the current password."
            />
            {activeUser && (
              <p className="text-xs text-slate-500">
                Current role: {resolveRoleLabel(activeUser.roles)}
              </p>
            )}
            {formError && (
              <div className="rounded-md border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                {formError}
              </div>
            )}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="ghost" onClick={() => setIsEditOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={updateUserMutation.isPending}>
                {updateUserMutation.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* ── Role dialog (create / edit / clone) ───────────────────────────── */}
      <Sheet
  open={isRoleDialogOpen}
  onOpenChange={setIsRoleDialogOpen}
>
  <SheetContent
    side="right"
    className="w-full sm:max-w-2xl p-0"
  >
    <div className="flex h-full flex-col">

      <SheetHeader className="border-b px-6 py-4">
        <SheetTitle>
          {roleCloneTarget
            ? "Clone Role"
            : activeRole
            ? "Edit Role"
            : "Create Role"}
        </SheetTitle>

        <SheetDescription>
          Manage dynamic roles and assign database-driven permissions.
        </SheetDescription>
      </SheetHeader>

      <form
        onSubmit={handleRoleSubmit}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <div className="flex-1 overflow-y-auto px-6 py-6">

          <div className="grid gap-4">

            <div className="grid gap-2">
              <Label htmlFor="role-name">
                Role Name
              </Label>

              <Input
                id="role-name"
                value={roleFormState.name}
                onChange={(e) =>
                  handleRoleFormChange(
                    "name",
                    e.target.value
                  )
                }
                placeholder="Procurement Manager"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="role-description">
                Description
              </Label>

              <textarea
                id="role-description"
                value={roleFormState.description}
                onChange={(e) =>
                  handleRoleFormChange(
                    "description",
                    e.target.value
                  )
                }
                rows={3}
                placeholder="Describe what this role is allowed to do."
                className="
                  min-h-24
                  rounded-md
                  border
                  border-slate-300
                  bg-white
                  px-3
                  py-2
                  text-sm
                  text-slate-900
                  outline-none
                  transition
                  focus:border-blue-500
                  focus:ring-2
                  focus:ring-blue-100
                "
              />
            </div>

            <div className="grid gap-2">

              <div className="flex items-center justify-between">
                <Label>Permissions</Label>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleRoleFormChange(
                      "permissions",
                      []
                    )
                  }
                >
                  Clear
                </Button>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <PermissionSelector
                  selectedPermissions={
                    roleFormState.permissions
                  }
                  onTogglePermission={
                    handleToggleRolePermission
                  }
                  permissionGroups={
                    permissionGroups
                  }
                  idPrefix="role-permission"
                />
              </div>

            </div>

          </div>

          {roleFormError && (
            <div className="mt-4 rounded-md border border-red-100 bg-red-50 p-3 text-sm text-red-700">
              {roleFormError}
            </div>
          )}

        </div>

        <SheetFooter className="border-t px-6 py-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() =>
              setIsRoleDialogOpen(false)
            }
          >
            Cancel
          </Button>

          <Button
            type="submit"
            disabled={
              createRoleMutation.isPending ||
              updateRoleMutation.isPending ||
              cloneRoleMutation.isPending
            }
          >
            {createRoleMutation.isPending ||
            updateRoleMutation.isPending ||
            cloneRoleMutation.isPending
              ? "Saving..."
              : roleCloneTarget
              ? "Clone Role"
              : activeRole
              ? "Save Role"
              : "Create Role"}
          </Button>
        </SheetFooter>

      </form>

    </div>
  </SheetContent>
</Sheet>

      {/* ── Permission dialog (create / edit) ─────────────────────────────── */}
      <Sheet open={isPermissionDialogOpen} onOpenChange={setIsPermissionDialogOpen}>
        <SheetContent className="sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{activePermission ? "Edit Permission" : "Create Permission"}</SheetTitle>
            <SheetDescription>
              Configure permission keys without shipping code changes.
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handlePermissionSubmit} className="space-y-5">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="permission-key">Permission Key</Label>
                <Input
                  id="permission-key"
                  value={permissionFormState.key}
                  onChange={(e) => handlePermissionFormChange("key", e.target.value)}
                  placeholder="vendor.create"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="permission-label">Label</Label>
                <Input
                  id="permission-label"
                  value={permissionFormState.label}
                  onChange={(e) => handlePermissionFormChange("label", e.target.value)}
                  placeholder="Create Vendor"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="permission-module">Module</Label>
                <Input
                  id="permission-module"
                  list="permission-module-options"
                  value={permissionFormState.moduleKey}
                  onChange={(e) => handlePermissionFormChange("moduleKey", e.target.value)}
                  placeholder="purchases"
                  required
                />
                <datalist id="permission-module-options">
                  {permissionModuleOptions.map((opt) => (
                    <option key={opt} value={opt} />
                  ))}
                </datalist>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="permission-description">Description</Label>
                <textarea
                  id="permission-description"
                  value={permissionFormState.description}
                  onChange={(e) => handlePermissionFormChange("description", e.target.value)}
                  rows={3}
                  placeholder="Describe what the permission unlocks."
                  className="min-h-24 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              {activePermission && (
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={permissionFormState.active}
                    onChange={(e) => handlePermissionFormChange("active", e.target.checked)}
                  />
                  Permission is active
                </label>
              )}
            </div>
            {permissionFormError && (
              <div className="rounded-md border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                {permissionFormError}
              </div>
            )}
            <SheetFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="ghost" onClick={() => setIsPermissionDialogOpen(false)}>Cancel</Button>
              <Button
                type="submit"
                disabled={createPermissionMutation.isPending || updatePermissionMutation.isPending}
              >
                {createPermissionMutation.isPending || updatePermissionMutation.isPending
                  ? "Saving…"
                  : activePermission ? "Save Permission" : "Create Permission"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* ── Delete User dialog ─────────────────────────────────────────────── */}
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => (!open ? closeDeleteDialog() : undefined)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete User?</DialogTitle>
            <DialogDescription>
              {deleteTarget && (
                <>
                  <span className="font-medium text-slate-900">{deleteTarget.name}</span> will be
                  permanently removed. This cannot be undone.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <div className="rounded-md border border-red-100 bg-red-50 p-3 text-sm text-red-700">
              {deleteError}
            </div>
          )}
          <SheetFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={closeDeleteDialog}>Cancel</Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDeleteUser}
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending ? "Deleting…" : "Delete"}
            </Button>
          </SheetFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}