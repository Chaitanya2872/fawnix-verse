import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import type { QuoteFilter, QuoteFormData, QuoteStatus } from "./types";
import {
  createQuote,
  deleteQuote,
  fetchQuote,
  fetchQuotes,
  updateQuote,
  updateQuoteStatus,
} from "./api";

export const salesKeys = {
  all: ["sales", "quotes"] as const,
  lists: () => [...salesKeys.all, "list"] as const,
  list: (filter: QuoteFilter) => [...salesKeys.lists(), filter] as const,
  detail: (id: string) => [...salesKeys.all, "detail", id] as const,
};

export function useQuotes(filter: QuoteFilter) {
  return useQuery({
    queryKey: salesKeys.list(filter),
    queryFn: () => fetchQuotes(filter),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useQuote(id: string) {
  return useQuery({
    queryKey: salesKeys.detail(id),
    queryFn: () => fetchQuote(id),
    enabled: Boolean(id),
  });
}

export function useCreateQuote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: QuoteFormData) => createQuote(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salesKeys.lists() });
    },
  });
}

export function useUpdateQuote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: QuoteFormData }) => updateQuote(id, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: salesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: salesKeys.detail(updated.id) });
    },
  });
}

export function useUpdateQuoteStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: QuoteStatus }) =>
      updateQuoteStatus(id, status),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: salesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: salesKeys.detail(updated.id) });
    },
  });
}

export function useDeleteQuote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteQuote(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salesKeys.lists() });
    },
  });
}
