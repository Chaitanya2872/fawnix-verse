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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCurrentUser } from "@/modules/auth/hooks";
import { PERMISSIONS, hasPermission } from "@/modules/auth/permissions";
import { hasStoredSession } from "@/services/api-client";
import {
  useCreateUser,
  useDeleteUser,
  useUpdateUser,
  useUpdateUserStatus,
  useUsers,
} from "./hooks";
import {
  USER_ROLE_OPTIONS,
  USER_LANGUAGE_OPTIONS,
  getPrimaryRole,
  getRoleLabel,
  getRoleLabelFromValue,
  type CreateUserPayload,
  type UpdateUserPayload,
  type User,
  type UserRole,
} from "./types";
import { PERMISSION_GROUPS, ROLE_DEFAULT_PERMISSIONS, uniquePermissions } from "./permissions";

type UserFormState = {
  fullName: string;
  email: string;
  phoneNumber: string;
  language: string;
  password: string;
  role: UserRole;
  permissions: string[];
};

const EMPTY_FORM: UserFormState = {
  fullName: "",
  email: "",
  phoneNumber: "",
  language: "",
  password: "",
  role: "ROLE_SALES_REP",
  permissions: [],
};

const selectClassName =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

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

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={
        active
          ? "inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
          : "inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600"
      }
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function UserFormFields({
  form,
  onChange,
  onTogglePermission,
  onResetPermissions,
  passwordHint,
}: {
  form: UserFormState;
  onChange: <K extends keyof UserFormState>(field: K, value: UserFormState[K]) => void;
  onTogglePermission: (permission: string) => void;
  onResetPermissions: () => void;
  passwordHint?: string;
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="full-name">Full Name</Label>
        <Input
          id="full-name"
          value={form.fullName}
          onChange={(event) => onChange("fullName", event.target.value)}
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
          onChange={(event) => onChange("email", event.target.value)}
          placeholder="jane@fawnix.com"
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="phone-number">Phone Number</Label>
        <Input
          id="phone-number"
          value={form.phoneNumber}
          onChange={(event) => onChange("phoneNumber", event.target.value)}
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
          onChange={(event) => onChange("password", event.target.value)}
          placeholder="••••••••"
        />
        {passwordHint ? (
          <p className="text-xs text-slate-500">{passwordHint}</p>
        ) : null}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="role">Role</Label>
        <select
          id="role"
          className={selectClassName}
          value={form.role}
          onChange={(event) => onChange("role", event.target.value as UserRole)}
          required
        >
          {USER_ROLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="language">Language</Label>
        <select
          id="language"
          className={selectClassName}
          value={form.language}
          onChange={(event) => onChange("language", event.target.value)}
          required
        >
          <option value="">Select language</option>
          {USER_LANGUAGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
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
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-4">
          {PERMISSION_GROUPS.map((group) => (
            <div key={group.heading} className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {group.heading}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {group.options.map((option) => (
                  <label key={option.value} className="flex items-start gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-slate-300"
                      checked={form.permissions.includes(option.value)}
                      onChange={() => onTogglePermission(option.value)}
                    />
                    <span className="leading-5">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500">
          Master has full access. Other roles follow the selected module and page permissions.
        </p>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const { data: currentUser } = useCurrentUser({ enabled: hasStoredSession() });
  const isAdmin = hasPermission(currentUser, PERMISSIONS.PAGE_ADMIN_USERS);

  const usersQuery = useUsers({ enabled: Boolean(isAdmin) });
  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const updateStatusMutation = useUpdateUserStatus();
  const deleteUserMutation = useDeleteUser();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [activeUser, setActiveUser] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [formState, setFormState] = useState<UserFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const users = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);

  const handleFormChange = <K extends keyof UserFormState>(
    field: K,
    value: UserFormState[K]
  ) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleTogglePermission = (permission: string) => {
    setFormState((prev) => {
      const exists = prev.permissions.includes(permission);
      const next = exists
        ? prev.permissions.filter((item) => item !== permission)
        : [...prev.permissions, permission];
      return { ...prev, permissions: next };
    });
  };

  const resetPermissionsToRoleDefaults = () => {
    setFormState((prev) => ({
      ...prev,
      permissions: uniquePermissions(
        ROLE_DEFAULT_PERMISSIONS[prev.role] ?? []
      ),
    }));
  };

  const openCreateDialog = () => {
    setFormState({
      ...EMPTY_FORM,
      permissions: uniquePermissions(
        ROLE_DEFAULT_PERMISSIONS[EMPTY_FORM.role] ?? []
      ),
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

    if (formState.password.trim()) {
      payload.password = formState.password;
    }

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

  const closeDeleteDialog = () => {
    setDeleteTarget(null);
  };

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">User Management</h2>
          <p className="text-sm text-slate-600">
            Create users, assign roles, and manage account access.
          </p>
        </div>
        <Button onClick={openCreateDialog}>Add User</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Users</CardTitle>
          <CardDescription>Manage roles, status, and access control.</CardDescription>
        </CardHeader>
        <CardContent>
          {pageError ? (
            <div className="mb-4 rounded-md border border-red-100 bg-red-50 p-3 text-sm text-red-700">
              {pageError}
            </div>
          ) : null}
          {usersQuery.isLoading ? (
            <div className="rounded-lg border border-dashed border-slate-200 p-6 text-sm text-slate-500">
              Loading users...
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
                <thead className="text-xs uppercase text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Language</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {user.name}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{user.email}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {user.phoneNumber ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {getRoleLabel(user.roles)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {user.language ?? "-"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge active={user.active} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(user)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleStatus(user)}
                          >
                            {user.active ? "Deactivate" : "Activate"}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => openDeleteDialog(user)}
                          >
                            Delete
                          </Button>
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

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
            <DialogDescription>
              Add a new user and assign their role.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-5">
            <UserFormFields
              form={formState}
              onChange={handleFormChange}
              onTogglePermission={handleTogglePermission}
              onResetPermissions={resetPermissionsToRoleDefaults}
            />
            {formError ? (
              <div className="rounded-md border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                {formError}
              </div>
            ) : null}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createUserMutation.isPending}>
                {createUserMutation.isPending ? "Creating..." : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update profile details and access role.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-5">
            <UserFormFields
              form={formState}
              onChange={handleFormChange}
              onTogglePermission={handleTogglePermission}
              onResetPermissions={resetPermissionsToRoleDefaults}
              passwordHint="Leave blank to keep the current password."
            />
            {activeUser ? (
              <p className="text-xs text-slate-500">
                Current role: {getRoleLabelFromValue(getPrimaryRole(activeUser.roles))}
              </p>
            ) : null}
            {formError ? (
              <div className="rounded-md border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                {formError}
              </div>
            ) : null}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="ghost" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateUserMutation.isPending}>
                {updateUserMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => (!open ? closeDeleteDialog() : null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete User?</DialogTitle>
            <DialogDescription>
              {deleteTarget ? (
                <>
                  <span className="font-medium text-slate-900">{deleteTarget.name}</span> will be
                  permanently removed. This cannot be undone.
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          {deleteError ? (
            <div className="rounded-md border border-red-100 bg-red-50 p-3 text-sm text-red-700">
              {deleteError}
            </div>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={closeDeleteDialog}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDeleteUser}
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
