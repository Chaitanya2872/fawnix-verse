import { useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import type { DealFormData, PaginatedDeals } from "./types";
import { createDeal, deleteDeal, fetchDeal, fetchDeals, updateDeal, updateDealStage } from "./api";

export const dealKeys = {
  all: ["crm", "deals"] as const,
  lists: () => [...dealKeys.all, "list"] as const,
  list: (filter: Record<string, unknown>) => [...dealKeys.lists(), filter] as const,
  detail: (id: string) => [...dealKeys.all, "detail", id] as const,
};

export function useDeals(filter: { search?: string; stage?: string; ownerUserId?: string; page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: dealKeys.list(filter),
    queryFn: () => fetchDeals(filter),
    staleTime: 30_000,
  });
}

export function useDeal(id: string | null) {
  return useQuery({
    queryKey: id ? dealKeys.detail(id) : dealKeys.detail("none"),
    queryFn: () => fetchDeal(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateDeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: DealFormData) => createDeal(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: dealKeys.lists() }),
  });
}

export function useUpdateDeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: DealFormData }) => updateDeal(id, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: dealKeys.lists() });
      queryClient.invalidateQueries({ queryKey: dealKeys.detail(updated.id) });
    },
  });
}

type ListQueryData = [QueryKey, PaginatedDeals | undefined];

interface UpdateStageContext {
  previousQueries?: ListQueryData[];
}

export function useUpdateDealStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: string }) => updateDealStage(id, stage),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: dealKeys.lists(), exact: false });
      const previousQueries = queryClient.getQueriesData({
        queryKey: dealKeys.lists(),
        exact: false,
      }) as ListQueryData[];
      previousQueries.forEach(([queryKey, data]) => {
        if (!data) return;
        queryClient.setQueryData<PaginatedDeals>(queryKey, {
          ...data,
          data: data.data.map((deal) =>
            deal.id === variables.id ? { ...deal, stage: variables.stage } : deal
          ),
        });
      });
      return { previousQueries };
    },
    onError: (_error, _variables, context) => {
      context?.previousQueries?.forEach(([key, data]) => {
        if (data) {
          queryClient.setQueryData(key, data);
        }
      });
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: dealKeys.detail(updated.id) });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: dealKeys.lists(), exact: false });
    },
  });
}

export function useDeleteDeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDeal(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: dealKeys.lists() }),
  });
}
