import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createGoodsReceipt,
  createPurchaseOrder,
  createPurchaseRequisition,
  createVendor,
  deleteVendor,
  fetchGoodsReceipts,
  fetchProcurementProducts,
  fetchPurchaseOrders,
  fetchPurchaseRequisitions,
  fetchVendors,
  reviewPurchaseRequisition,
  submitPurchaseRequisition,
  updateVendor,
} from "./api";
import type {
  CreateGoodsReceiptPayload,
  CreatePurchaseOrderPayload,
  CreatePurchaseRequisitionPayload,
  CreateVendorPayload,
  ReviewPurchaseRequisitionPayload,
  UpdateVendorPayload,
} from "./types";

export const procurementKeys = {
  all: ["procurement"] as const,
  products: () => [...procurementKeys.all, "products"] as const,
  requisitions: () => [...procurementKeys.all, "requisitions"] as const,
  vendors: () => [...procurementKeys.all, "vendors"] as const,
  orders: () => [...procurementKeys.all, "orders"] as const,
  receipts: () => [...procurementKeys.all, "receipts"] as const,
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
