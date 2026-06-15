import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  applySalesOrderApprovalAction,
  confirmSalesOrder,
  convertQuoteToOrder,
  createSalesDelivery,
  createSalesInvoice,
  createSalesOrder,
  createSalesPayment,
  createSalesReturn,
  fetchApprovalRules,
  fetchSalesDeliveries,
  fetchSalesInvoices,
  fetchSalesOrder,
  fetchSalesOrders,
  fetchSalesPayments,
  fetchSalesReportOverview,
  fetchSalesReturns,
  submitSalesOrder,
  updateSalesDeliveryStatus,
  updateSalesInvoiceStatus,
  updateSalesOrderStatus,
  updateSalesReturnStatus,
} from "./api";
import type {
  CreateSalesDeliveryInput,
  CreateSalesInvoiceInput,
  CreateSalesOrderInput,
  CreateSalesPaymentInput,
  CreateSalesReturnInput,
  SalesDeliveryStatus,
  SalesInvoiceStatus,
  SalesOrderFilter,
  SalesOrderStatus,
  SalesReturnStatus,
} from "./types";

export const salesOrderKeys = {
  all: ["sales", "orders"] as const,
  lists: () => [...salesOrderKeys.all, "list"] as const,
  list: (filter: SalesOrderFilter) => [...salesOrderKeys.lists(), filter] as const,
  detail: (id: string) => [...salesOrderKeys.all, "detail", id] as const,
  deliveries: (salesOrderId?: string) => ["sales", "deliveries", salesOrderId ?? "all"] as const,
  invoices: (salesOrderId?: string) => ["sales", "invoices", salesOrderId ?? "all"] as const,
  payments: (salesInvoiceId?: string) => ["sales", "payments", salesInvoiceId ?? "all"] as const,
  returns: (salesOrderId?: string) => ["sales", "returns", salesOrderId ?? "all"] as const,
  rules: () => ["sales", "approval-rules"] as const,
  reports: () => ["sales", "reports", "overview"] as const,
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

export function useApprovalRules() {
  return useQuery({
    queryKey: salesOrderKeys.rules(),
    queryFn: fetchApprovalRules,
    staleTime: 60_000,
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

export function useSalesPayments(salesInvoiceId?: string) {
  return useQuery({
    queryKey: salesOrderKeys.payments(salesInvoiceId),
    queryFn: () => fetchSalesPayments(salesInvoiceId),
    staleTime: 30_000,
  });
}

export function useSalesReturns(salesOrderId?: string) {
  return useQuery({
    queryKey: salesOrderKeys.returns(salesOrderId),
    queryFn: () => fetchSalesReturns(salesOrderId),
    staleTime: 30_000,
  });
}

export function useSalesReportOverview() {
  return useQuery({
    queryKey: salesOrderKeys.reports(),
    queryFn: fetchSalesReportOverview,
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
    mutationFn: ({ id, status, remarks }: { id: string; status: SalesOrderStatus; remarks?: string }) =>
      updateSalesOrderStatus(id, status, remarks),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: salesOrderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: salesOrderKeys.detail(updated.id) });
    },
  });
}

export function useSubmitSalesOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => submitSalesOrder(id),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: salesOrderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: salesOrderKeys.detail(updated.id) });
    },
  });
}

export function useConfirmSalesOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, confirmationAttachmentUrl, remarks }: { id: string; confirmationAttachmentUrl?: string; remarks?: string }) =>
      confirmSalesOrder(id, confirmationAttachmentUrl, remarks),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: salesOrderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: salesOrderKeys.detail(updated.id) });
    },
  });
}

export function useSalesOrderApprovalAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, remarks }: { id: string; action: "APPROVE" | "REJECT" | "SEND_BACK"; remarks?: string }) =>
      applySalesOrderApprovalAction(id, action, remarks),
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
      queryClient.invalidateQueries({ queryKey: salesOrderKeys.detail(created.salesOrderId) });
      queryClient.invalidateQueries({ queryKey: salesOrderKeys.lists() });
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
      queryClient.invalidateQueries({ queryKey: salesOrderKeys.detail(updated.salesOrderId) });
      queryClient.invalidateQueries({ queryKey: salesOrderKeys.lists() });
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
      queryClient.invalidateQueries({ queryKey: salesOrderKeys.detail(created.salesOrderId) });
      queryClient.invalidateQueries({ queryKey: salesOrderKeys.lists() });
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

export function useCreateSalesPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSalesPaymentInput) => createSalesPayment(payload),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: salesOrderKeys.payments() });
      queryClient.invalidateQueries({ queryKey: salesOrderKeys.payments(created.salesInvoiceId) });
      queryClient.invalidateQueries({ queryKey: salesOrderKeys.invoices() });
      queryClient.invalidateQueries({ queryKey: salesOrderKeys.lists() });
    },
  });
}

export function useCreateSalesReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSalesReturnInput) => createSalesReturn(payload),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: salesOrderKeys.returns() });
      queryClient.invalidateQueries({ queryKey: salesOrderKeys.returns(created.salesOrderId) });
    },
  });
}

export function useUpdateSalesReturnStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, approvedAmount, remarks }: { id: string; status: SalesReturnStatus; approvedAmount?: number; remarks?: string }) =>
      updateSalesReturnStatus(id, status, approvedAmount, remarks),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: salesOrderKeys.returns() });
      queryClient.invalidateQueries({ queryKey: salesOrderKeys.returns(updated.salesOrderId) });
      queryClient.invalidateQueries({ queryKey: salesOrderKeys.invoices() });
    },
  });
}
