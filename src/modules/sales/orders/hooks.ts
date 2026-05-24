import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  convertQuoteToOrder,
  createSalesDelivery,
  createSalesInvoice,
  createSalesOrder,
  fetchSalesDeliveries,
  fetchSalesInvoices,
  fetchSalesOrder,
  fetchSalesOrders,
  updateSalesDeliveryStatus,
  updateSalesInvoiceStatus,
  updateSalesOrderStatus,
} from "./api";
import type {
  CreateSalesDeliveryInput,
  CreateSalesInvoiceInput,
  CreateSalesOrderInput,
  SalesDeliveryStatus,
  SalesInvoiceStatus,
  SalesOrderFilter,
  SalesOrderStatus,
} from "./types";

export const salesOrderKeys = {
  all: ["sales", "orders"] as const,
  lists: () => [...salesOrderKeys.all, "list"] as const,
  list: (filter: SalesOrderFilter) => [...salesOrderKeys.lists(), filter] as const,
  detail: (id: string) => [...salesOrderKeys.all, "detail", id] as const,
  deliveries: (salesOrderId?: string) => ["sales", "deliveries", salesOrderId ?? "all"] as const,
  invoices: (salesOrderId?: string) => ["sales", "invoices", salesOrderId ?? "all"] as const,
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

export function useSalesDeliveries(salesOrderId?: string) {
  return useQuery({
    queryKey: salesOrderKeys.deliveries(salesOrderId),
    queryFn: () => fetchSalesDeliveries(salesOrderId),
    staleTime: 30_000,
  });
}

export function useSalesInvoices(salesOrderId?: string) {
  return useQuery({
    queryKey: salesOrderKeys.invoices(salesOrderId),
    queryFn: () => fetchSalesInvoices(salesOrderId),
    staleTime: 30_000,
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

export function useCreateSalesOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSalesOrderInput) => createSalesOrder(payload),
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

export function useCreateSalesDelivery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSalesDeliveryInput) => createSalesDelivery(payload),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: salesOrderKeys.deliveries() });
      queryClient.invalidateQueries({ queryKey: salesOrderKeys.deliveries(created.salesOrderId) });
    },
  });
}

export function useUpdateSalesDeliveryStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: SalesDeliveryStatus }) => updateSalesDeliveryStatus(id, status),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: salesOrderKeys.deliveries() });
      queryClient.invalidateQueries({ queryKey: salesOrderKeys.deliveries(updated.salesOrderId) });
    },
  });
}

export function useCreateSalesInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSalesInvoiceInput) => createSalesInvoice(payload),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: salesOrderKeys.invoices() });
      queryClient.invalidateQueries({ queryKey: salesOrderKeys.invoices(created.salesOrderId) });
    },
  });
}

export function useUpdateSalesInvoiceStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, balanceDue }: { id: string; status: SalesInvoiceStatus; balanceDue?: number }) =>
      updateSalesInvoiceStatus(id, status, balanceDue),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: salesOrderKeys.invoices() });
      queryClient.invalidateQueries({ queryKey: salesOrderKeys.invoices(updated.salesOrderId) });
    },
  });
}
