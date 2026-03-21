import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ContactFormData } from "./types";
import { createContact, deleteContact, fetchContact, fetchContacts, updateContact } from "./api";

export const contactKeys = {
  all: ["crm", "contacts"] as const,
  lists: () => [...contactKeys.all, "list"] as const,
  list: (filter: Record<string, unknown>) => [...contactKeys.lists(), filter] as const,
  detail: (id: string) => [...contactKeys.all, "detail", id] as const,
};

export function useContacts(filter: { search?: string; accountId?: string; page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: contactKeys.list(filter),
    queryFn: () => fetchContacts(filter),
    staleTime: 30_000,
  });
}

export function useContact(id: string | null) {
  return useQuery({
    queryKey: id ? contactKeys.detail(id) : contactKeys.detail("none"),
    queryFn: () => fetchContact(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ContactFormData) => createContact(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: contactKeys.lists() }),
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ContactFormData }) => updateContact(id, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: contactKeys.lists() });
      queryClient.invalidateQueries({ queryKey: contactKeys.detail(updated.id) });
    },
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteContact(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: contactKeys.lists() }),
  });
}
