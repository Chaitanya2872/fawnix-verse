import { api, ensureApiSession, getApiErrorMessage } from "@/services/api-client";
import type { Account, AccountFormData, PaginatedAccounts } from "./types";

function rethrow(error: unknown, fallback: string): never {
  throw new Error(getApiErrorMessage(error, fallback));
}

export async function fetchAccounts(params: {
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedAccounts> {
  try {
    await ensureApiSession();
    const response = await api.get<PaginatedAccounts>("/accounts", { params });
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to load accounts.");
  }
}

export async function fetchAccount(id: string): Promise<Account> {
  try {
    await ensureApiSession();
    const response = await api.get<Account>(`/accounts/${id}`);
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to load account.");
  }
}

export async function createAccount(data: AccountFormData): Promise<Account> {
  try {
    await ensureApiSession();
    const response = await api.post<Account>("/accounts", data);
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to create account.");
  }
}

export async function updateAccount(id: string, data: AccountFormData): Promise<Account> {
  try {
    await ensureApiSession();
    const response = await api.patch<Account>(`/accounts/${id}`, data);
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to update account.");
  }
}

export async function deleteAccount(id: string): Promise<void> {
  try {
    await ensureApiSession();
    await api.delete(`/accounts/${id}`);
  } catch (error) {
    rethrow(error, "Failed to delete account.");
  }
}
