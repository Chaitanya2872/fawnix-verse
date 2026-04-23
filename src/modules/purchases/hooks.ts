import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createGoodsReceipt,
  createInvoice,
  createPayment,
  createPurchaseOrder,
  createPurchaseRequisition,
  createVendor,
  deleteVendor,
  deleteVendorDocument,
  fetchGoodsReceipts,
  fetchInvoices,
  fetchPayments,
  fetchProcurementProducts,
  fetchPurchaseOrders,
  fetchPurchaseRequisitions,
  fetchVendorDocuments,
  fetchVendors,
  reviewPurchaseRequisition,
  reviewInvoice,
  reviewPayment,
  submitPurchaseRequisition,
  uploadVendorDocument,
  updatePurchaseRequisitionEvaluation,
  updatePurchaseRequisitionNegotiation,
  updateVendor,
} from "./api";
import type {
  CreateGoodsReceiptPayload,
  CreateInvoicePayload,
  CreatePaymentPayload,
  CreatePurchaseOrderPayload,
  CreatePurchaseRequisitionPayload,
  CreateVendorPayload,
  ReviewPurchaseRequisitionPayload,
  UpdatePurchaseRequisitionEvaluationPayload,
  UpdatePurchaseRequisitionNegotiationPayload,
  UpdateVendorPayload,
} from "./types";

export const procurementKeys = {
  all: ["procurement"] as const,
  products: () => [...procurementKeys.all, "products"] as const,
  requisitions: () => [...procurementKeys.all, "requisitions"] as const,
  vendors: () => [...procurementKeys.all, "vendors"] as const,
  vendorDocuments: (vendorId: string) => [...procurementKeys.vendors(), vendorId, "documents"] as const,
  orders: () => [...procurementKeys.all, "orders"] as const,
  receipts: () => [...procurementKeys.all, "receipts"] as const,
  invoices: () => [...procurementKeys.all, "invoices"] as const,
  payments: () => [...procurementKeys.all, "payments"] as const,
};

export function useProcurementProducts() {
  return useQuery({
    queryKey: procurementKeys.products(),
    queryFn: fetchProcurementProducts,
    staleTime: 60_000,
  });
}

export function usePurchaseRequisitions() {
  return useQuery({
    queryKey: procurementKeys.requisitions(),
    queryFn: fetchPurchaseRequisitions,
  });
}

export function useCreatePurchaseRequisition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePurchaseRequisitionPayload) => createPurchaseRequisition(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: procurementKeys.requisitions() }),
  });
}

export function useSubmitPurchaseRequisition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, actorId }: { id: string; actorId: string }) => submitPurchaseRequisition(id, actorId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: procurementKeys.requisitions() }),
  });
}

export function useReviewPurchaseRequisition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ReviewPurchaseRequisitionPayload }) =>
      reviewPurchaseRequisition(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: procurementKeys.requisitions() }),
  });
}

export function useUpdatePurchaseRequisitionEvaluation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdatePurchaseRequisitionEvaluationPayload;
    }) => updatePurchaseRequisitionEvaluation(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: procurementKeys.requisitions() }),
  });
}

export function useUpdatePurchaseRequisitionNegotiation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdatePurchaseRequisitionNegotiationPayload;
    }) => updatePurchaseRequisitionNegotiation(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: procurementKeys.requisitions() }),
  });
}

export function useVendors() {
  return useQuery({
    queryKey: procurementKeys.vendors(),
    queryFn: fetchVendors,
  });
}

export function useCreateVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateVendorPayload) => createVendor(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: procurementKeys.vendors() }),
  });
}

export function useVendorDocuments(vendorId?: string) {
  return useQuery({
    queryKey: procurementKeys.vendorDocuments(vendorId ?? "unknown"),
    queryFn: () => fetchVendorDocuments(vendorId!),
    enabled: !!vendorId,
  });
}

export function useUploadVendorDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ vendorId, file }: { vendorId: string; file: File }) => uploadVendorDocument(vendorId, file),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: procurementKeys.vendorDocuments(variables.vendorId) });
    },
  });
}

export function useDeleteVendorDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ vendorId, documentId }: { vendorId: string; documentId: string }) =>
      deleteVendorDocument(vendorId, documentId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: procurementKeys.vendorDocuments(variables.vendorId) });
    },
  });
}

export function useUpdateVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateVendorPayload }) =>
      updateVendor(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: procurementKeys.vendors() }),
  });
}

export function useDeleteVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteVendor(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: procurementKeys.vendors() }),
  });
}

export function usePurchaseOrders() {
  return useQuery({
    queryKey: procurementKeys.orders(),
    queryFn: fetchPurchaseOrders,
  });
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      purchaseRequisitionId,
      payload,
    }: {
      purchaseRequisitionId: string;
      payload: CreatePurchaseOrderPayload;
    }) => createPurchaseOrder(purchaseRequisitionId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: procurementKeys.orders() });
      queryClient.invalidateQueries({ queryKey: procurementKeys.requisitions() });
    },
  });
}

export function useGoodsReceipts() {
  return useQuery({
    queryKey: procurementKeys.receipts(),
    queryFn: fetchGoodsReceipts,
  });
}

export function useCreateGoodsReceipt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateGoodsReceiptPayload) => createGoodsReceipt(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: procurementKeys.receipts() });
      queryClient.invalidateQueries({ queryKey: procurementKeys.orders() });
    },
  });
}

export function useInvoices() {
  return useQuery({
    queryKey: procurementKeys.invoices(),
    queryFn: fetchInvoices,
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateInvoicePayload) => createInvoice(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: procurementKeys.invoices() }),
  });
}

export function useReviewInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ReviewPurchaseRequisitionPayload }) =>
      reviewInvoice(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: procurementKeys.invoices() });
      queryClient.invalidateQueries({ queryKey: procurementKeys.payments() });
    },
  });
}

export function usePayments() {
  return useQuery({
    queryKey: procurementKeys.payments(),
    queryFn: fetchPayments,
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePaymentPayload) => createPayment(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: procurementKeys.payments() }),
  });
}

export function useReviewPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ReviewPurchaseRequisitionPayload }) =>
      reviewPayment(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: procurementKeys.payments() });
      queryClient.invalidateQueries({ queryKey: procurementKeys.invoices() });
    },
  });
}
