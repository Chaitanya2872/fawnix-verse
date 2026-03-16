import { api, ensureApiSession, getApiErrorMessage } from "@/services/api-client";
import type { CreateUserPayload, UpdateUserPayload, User } from "./types";

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
