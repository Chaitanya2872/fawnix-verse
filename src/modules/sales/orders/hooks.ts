import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { convertQuoteToOrder, fetchSalesOrder, fetchSalesOrders, updateSalesOrderStatus } from "./api";
import type { SalesOrderFilter, SalesOrderStatus } from "./types";

export const salesOrderKeys = {
  all: ["sales", "orders"] as const,
  lists: () => [...salesOrderKeys.all, "list"] as const,
  list: (filter: SalesOrderFilter) => [...salesOrderKeys.lists(), filter] as const,
  detail: (id: string) => [...salesOrderKeys.all, "detail", id] as const,
};

export function useSalesOrders(filter: SalesOrderFilter) {
  return useQuery({
    queryKey: salesOrderKeys.list(filter),
    queryFn: () => fetchSalesOrders(filter),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useSalesOrder(id: string) {
  return useQuery({
    queryKey: salesOrderKeys.detail(id),
    queryFn: () => fetchSalesOrder(id),
    enabled: Boolean(id),
  });
}

export function useConvertQuoteToOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (quoteId: string) => convertQuoteToOrder(quoteId),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: salesOrderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: salesOrderKeys.detail(created.id) });
    },
  });
}

export function useUpdateSalesOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: SalesOrderStatus }) => updateSalesOrderStatus(id, status),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: salesOrderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: salesOrderKeys.detail(updated.id) });
    },
  });
}
