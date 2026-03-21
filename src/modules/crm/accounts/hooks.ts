import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AccountFormData } from "./types";
import { createAccount, deleteAccount, fetchAccount, fetchAccounts, updateAccount } from "./api";

export const accountKeys = {
  all: ["crm", "accounts"] as const,
  lists: () => [...accountKeys.all, "list"] as const,
  list: (filter: Record<string, unknown>) => [...accountKeys.lists(), filter] as const,
  detail: (id: string) => [...accountKeys.all, "detail", id] as const,
};

export function useAccounts(filter: { search?: string; page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: accountKeys.list(filter),
    queryFn: () => fetchAccounts(filter),
    staleTime: 30_000,
  });
}

export function useAccount(id: string | null) {
  return useQuery({
    queryKey: id ? accountKeys.detail(id) : accountKeys.detail("none"),
    queryFn: () => fetchAccount(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AccountFormData) => createAccount(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: accountKeys.lists() }),
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AccountFormData }) => updateAccount(id, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: accountKeys.lists() });
      queryClient.invalidateQueries({ queryKey: accountKeys.detail(updated.id) });
    },
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAccount(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: accountKeys.lists() }),
  });
}
