import { fetchProducts } from "@/modules/inventory/api";
import type { Product } from "@/modules/inventory/types";
import { api, ensureApiSession, getApiErrorMessage } from "@/services/api-client";
import type {
  CreateGoodsReceiptPayload,
  CreatePurchaseOrderPayload,
  CreatePurchaseRequisitionPayload,
  CreateVendorPayload,
  GoodsReceipt,
  PurchaseOrder,
  PurchaseRequisition,
  ReviewPurchaseRequisitionPayload,
  UpdateVendorPayload,
  Vendor,
} from "./types";

function rethrow(error: unknown, fallback: string): never {
  throw new Error(getApiErrorMessage(error, fallback));
}

export async function fetchProcurementProducts(): Promise<Product[]> {
  try {
    await ensureApiSession();
    const response = await fetchProducts({
      search: "",
      category: "",
      brand: "",
      status: "ALL",
      page: 1,
      pageSize: 100,
    });
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to load inventory products.");
  }
}

export async function fetchPurchaseRequisitions(): Promise<PurchaseRequisition[]> {
  try {
    await ensureApiSession();
    const response = await api.get<PurchaseRequisition[]>("/procurement/requisitions");
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to load purchase requisitions.");
  }
}

export async function createPurchaseRequisition(
  payload: CreatePurchaseRequisitionPayload
): Promise<PurchaseRequisition> {
  try {
    await ensureApiSession();
    const response = await api.post<PurchaseRequisition>("/procurement/requisitions", payload);
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to create purchase requisition.");
  }
}

export async function submitPurchaseRequisition(
  id: string,
  actorId: string
): Promise<PurchaseRequisition> {
  try {
    await ensureApiSession();
    const response = await api.post<PurchaseRequisition>(
      `/procurement/requisitions/${id}/submit`,
      null,
      { params: { actorId } }
    );
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to submit purchase requisition.");
  }
}

export async function reviewPurchaseRequisition(
  id: string,
  payload: ReviewPurchaseRequisitionPayload
): Promise<PurchaseRequisition> {
  try {
    await ensureApiSession();
    const response = await api.post<PurchaseRequisition>(
      `/procurement/requisitions/${id}/approval-actions`,
      payload
    );
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to review purchase requisition.");
  }
}

export async function fetchVendors(): Promise<Vendor[]> {
  try {
    await ensureApiSession();
    const response = await api.get<Vendor[]>("/procurement/vendors");
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to load vendors.");
  }
}

export async function createVendor(payload: CreateVendorPayload): Promise<Vendor> {
  try {
    await ensureApiSession();
    const response = await api.post<Vendor>("/procurement/vendors", payload);
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to create vendor.");
  }
}

export async function updateVendor(id: string, payload: UpdateVendorPayload): Promise<Vendor> {
  try {
    await ensureApiSession();
    const response = await api.put<Vendor>(`/procurement/vendors/${id}`, payload);
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to update vendor.");
  }
}

export async function deleteVendor(id: string): Promise<void> {
  try {
    await ensureApiSession();
    await api.delete(`/procurement/vendors/${id}`);
  } catch (error) {
    rethrow(error, "Failed to delete vendor.");
  }
}

export async function fetchPurchaseOrders(): Promise<PurchaseOrder[]> {
  try {
    await ensureApiSession();
    const response = await api.get<PurchaseOrder[]>("/procurement/purchase-orders");
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to load purchase orders.");
  }
}

export async function createPurchaseOrder(
  purchaseRequisitionId: string,
  payload: CreatePurchaseOrderPayload
): Promise<PurchaseOrder> {
  try {
    await ensureApiSession();
    const response = await api.post<PurchaseOrder>(
      `/procurement/purchase-orders/from-requisition/${purchaseRequisitionId}`,
      payload
    );
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to create purchase order.");
  }
}

export async function fetchGoodsReceipts(): Promise<GoodsReceipt[]> {
  try {
    await ensureApiSession();
    const response = await api.get<GoodsReceipt[]>("/procurement/goods-receipts");
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to load goods receipts.");
  }
}

export async function createGoodsReceipt(
  payload: CreateGoodsReceiptPayload
): Promise<GoodsReceipt> {
  try {
    await ensureApiSession();
    const response = await api.post<GoodsReceipt>("/procurement/goods-receipts", payload);
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to create goods receipt.");
  }
}
