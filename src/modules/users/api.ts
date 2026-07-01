import { api, ensureApiSession, getApiErrorMessage } from "@/services/api-client";
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

function rethrowApiError(error: unknown, fallback: string): never {
  throw new Error(getApiErrorMessage(error, fallback));
}

export async function fetchUsers(): Promise<User[]> {
  try {
    await ensureApiSession();
    const response = await api.get<User[]>("/users");
    return response.data ?? [];
  } catch (error) {
    rethrowApiError(error, "Failed to load users.");
  }
}

export async function fetchUserAssignees(): Promise<UserAssignee[]> {
  try {
    await ensureApiSession();
    const response = await api.get<UserAssignee[]>("/users/assignees");
    return response.data ?? [];
  } catch (error) {
    rethrowApiError(error, "Failed to load user assignees.");
  }
}

export async function fetchAccessControlCatalog(): Promise<AccessControlCatalog> {
  try {
    await ensureApiSession();
    const response = await api.get<AccessControlCatalog>("/users/access-control/catalog");
    return response.data;
  } catch (error) {
    rethrowApiError(error, "Failed to load access control catalog.");
  }
}

export async function fetchRoles(): Promise<RoleRecord[]> {
  try {
    await ensureApiSession();
    const response = await api.get<RoleRecord[]>("/roles");
    return response.data ?? [];
  } catch (error) {
    rethrowApiError(error, "Failed to load roles.");
  }
}

export async function createRole(payload: CreateRolePayload): Promise<RoleRecord> {
  try {
    await ensureApiSession();
    const response = await api.post<RoleRecord>("/roles", payload);
    return response.data;
  } catch (error) {
    rethrowApiError(error, "Failed to create role.");
  }
}

export async function updateRole(id: string, payload: UpdateRolePayload): Promise<RoleRecord> {
  try {
    await ensureApiSession();
    const response = await api.patch<RoleRecord>(`/roles/${id}`, payload);
    return response.data;
  } catch (error) {
    rethrowApiError(error, "Failed to update role.");
  }
}

export async function cloneRole(id: string, name: string): Promise<RoleRecord> {
  try {
    await ensureApiSession();
    const response = await api.post<RoleRecord>(`/roles/${id}/clone`, { name });
    return response.data;
  } catch (error) {
    rethrowApiError(error, "Failed to clone role.");
  }
}

export async function updateRoleStatus(id: string, active: boolean): Promise<RoleRecord> {
  try {
    await ensureApiSession();
    const response = await api.patch<RoleRecord>(`/roles/${id}/status`, { active });
    return response.data;
  } catch (error) {
    rethrowApiError(error, "Failed to update role status.");
  }
}

export async function deleteRole(id: string): Promise<void> {
  try {
    await ensureApiSession();
    await api.delete(`/roles/${id}`);
  } catch (error) {
    rethrowApiError(error, "Failed to delete role.");
  }
}

export async function fetchPermissions(): Promise<PermissionRecord[]> {
  try {
    await ensureApiSession();
    const response = await api.get<PermissionRecord[]>("/permissions");
    return response.data ?? [];
  } catch (error) {
    rethrowApiError(error, "Failed to load permissions.");
  }
}

export async function createPermission(payload: CreatePermissionPayload): Promise<PermissionRecord> {
  try {
    await ensureApiSession();
    const response = await api.post<PermissionRecord>("/permissions", payload);
    return response.data;
  } catch (error) {
    rethrowApiError(error, "Failed to create permission.");
  }
}

export async function updatePermission(key: string, payload: UpdatePermissionPayload): Promise<PermissionRecord> {
  try {
    await ensureApiSession();
    const response = await api.patch<PermissionRecord>(`/permissions/${encodeURIComponent(key)}`, payload);
    return response.data;
  } catch (error) {
    rethrowApiError(error, "Failed to update permission.");
  }
}

export async function deletePermission(key: string): Promise<void> {
  try {
    await ensureApiSession();
    await api.delete(`/permissions/${encodeURIComponent(key)}`);
  } catch (error) {
    rethrowApiError(error, "Failed to delete permission.");
  }
}

export async function createUser(payload: CreateUserPayload): Promise<User> {
  try {
    await ensureApiSession();
    const response = await api.post<User>("/users", payload);
    return response.data;
  } catch (error) {
    rethrowApiError(error, "Failed to create user.");
  }
}

export async function updateUser(id: string, payload: UpdateUserPayload): Promise<User> {
  try {
    await ensureApiSession();
    const response = await api.patch<User>(`/users/${id}`, payload);
    return response.data;
  } catch (error) {
    rethrowApiError(error, "Failed to update user.");
  }
}

export async function updateUserStatus(id: string, active: boolean): Promise<User> {
  try {
    await ensureApiSession();
    const response = await api.patch<User>(`/users/${id}/status`, { active });
    return response.data;
  } catch (error) {
    rethrowApiError(error, "Failed to update user status.");
  }
}

export async function deleteUser(id: string): Promise<void> {
  try {
    await ensureApiSession();
    await api.delete(`/users/${id}`);
  } catch (error) {
    rethrowApiError(error, "Failed to delete user.");
  }
}
