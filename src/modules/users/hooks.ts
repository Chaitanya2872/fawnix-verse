import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cloneRole,
  createPermission,
  createRole,
  createUser,
  deletePermission,
  deleteRole,
  deleteUser,
  fetchPermissions,
  fetchRoles,
  fetchUserAssignees,
  fetchAccessControlCatalog,
  fetchUsers,
  updatePermission,
  updateRole,
  updateRoleStatus,
  updateUser,
  updateUserStatus,
} from "./api";
import type {
  AccessControlCatalog,
  CreatePermissionPayload,
  CreateRolePayload,
  CreateUserPayload,
  PermissionRecord,
  RoleRecord,
  UpdatePermissionPayload,
  UpdateRolePayload,
  UpdateUserPayload,
  UserAssignee,
  User,
} from "./types";

export const usersKeys = {
  all: ["users"] as const,
  list: () => [...usersKeys.all, "list"] as const,
  assignees: () => [...usersKeys.all, "assignees"] as const,
  accessCatalog: () => [...usersKeys.all, "access-catalog"] as const,
  roles: () => [...usersKeys.all, "roles"] as const,
  permissions: () => [...usersKeys.all, "permissions"] as const,
};

export function useUsers(options?: { enabled?: boolean }) {
  return useQuery<User[]>({
    queryKey: usersKeys.list(),
    queryFn: fetchUsers,
    staleTime: 30_000,
    enabled: options?.enabled ?? true,
  });
}

export function useUserAssignees(options?: { enabled?: boolean }) {
  return useQuery<UserAssignee[]>({
    queryKey: usersKeys.assignees(),
    queryFn: fetchUserAssignees,
    staleTime: 30_000,
    enabled: options?.enabled ?? true,
  });
}

export function useAccessControlCatalog(options?: { enabled?: boolean }) {
  return useQuery<AccessControlCatalog>({
    queryKey: usersKeys.accessCatalog(),
    queryFn: fetchAccessControlCatalog,
    staleTime: 60_000,
    enabled: options?.enabled ?? true,
  });
}

export function useRoles(options?: { enabled?: boolean }) {
  return useQuery<RoleRecord[]>({
    queryKey: usersKeys.roles(),
    queryFn: fetchRoles,
    staleTime: 30_000,
    enabled: options?.enabled ?? true,
  });
}

export function usePermissions(options?: { enabled?: boolean }) {
  return useQuery<PermissionRecord[]>({
    queryKey: usersKeys.permissions(),
    queryFn: fetchPermissions,
    staleTime: 30_000,
    enabled: options?.enabled ?? true,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateUserPayload) => createUser(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersKeys.list() });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateUserPayload }) =>
      updateUser(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersKeys.list() });
    },
  });
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      updateUserStatus(id, active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersKeys.list() });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersKeys.list() });
    },
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateRolePayload) => createRole(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersKeys.roles() });
      queryClient.invalidateQueries({ queryKey: usersKeys.accessCatalog() });
    },
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateRolePayload }) => updateRole(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersKeys.roles() });
      queryClient.invalidateQueries({ queryKey: usersKeys.accessCatalog() });
      queryClient.invalidateQueries({ queryKey: usersKeys.list() });
    },
  });
}

export function useCloneRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => cloneRole(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersKeys.roles() });
      queryClient.invalidateQueries({ queryKey: usersKeys.accessCatalog() });
    },
  });
}

export function useUpdateRoleStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => updateRoleStatus(id, active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersKeys.roles() });
      queryClient.invalidateQueries({ queryKey: usersKeys.accessCatalog() });
      queryClient.invalidateQueries({ queryKey: usersKeys.list() });
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersKeys.roles() });
      queryClient.invalidateQueries({ queryKey: usersKeys.accessCatalog() });
      queryClient.invalidateQueries({ queryKey: usersKeys.list() });
    },
  });
}

export function useCreatePermission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePermissionPayload) => createPermission(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersKeys.permissions() });
      queryClient.invalidateQueries({ queryKey: usersKeys.accessCatalog() });
    },
  });
}

export function useUpdatePermission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, payload }: { key: string; payload: UpdatePermissionPayload }) => updatePermission(key, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersKeys.permissions() });
      queryClient.invalidateQueries({ queryKey: usersKeys.accessCatalog() });
      queryClient.invalidateQueries({ queryKey: usersKeys.list() });
    },
  });
}

export function useDeletePermission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (key: string) => deletePermission(key),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersKeys.permissions() });
      queryClient.invalidateQueries({ queryKey: usersKeys.accessCatalog() });
      queryClient.invalidateQueries({ queryKey: usersKeys.list() });
    },
  });
}
