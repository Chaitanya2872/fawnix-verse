import { fetchProducts } from "@/modules/inventory/api";
import type { Product } from "@/modules/inventory/types";
import { api, ensureApiSession, getApiErrorMessage } from "@/services/api-client";
import type {
  CreateGoodsReceiptPayload,
  CreateInvoicePayload,
  CreatePaymentPayload,
  CreatePurchaseOrderPayload,
  CreatePurchaseRequisitionPayload,
  CreateVendorPayload,
  GoodsReceipt,
  Invoice,
  Payment,
  PurchaseOrder,
  PurchaseRequisition,
  ReviewPurchaseRequisitionPayload,
  UpdatePurchaseRequisitionEvaluationPayload,
  UpdatePurchaseRequisitionNegotiationPayload,
  UpdateVendorPayload,
  Vendor,
  VendorDocument,
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

export async function updatePurchaseRequisitionEvaluation(
  id: string,
  payload: UpdatePurchaseRequisitionEvaluationPayload
): Promise<PurchaseRequisition> {
  try {
    await ensureApiSession();
    const response = await api.post<PurchaseRequisition>(
      `/procurement/requisitions/${id}/evaluation`,
      payload
    );
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to save requisition evaluation.");
  }
}

export async function updatePurchaseRequisitionNegotiation(
  id: string,
  payload: UpdatePurchaseRequisitionNegotiationPayload
): Promise<PurchaseRequisition> {
  try {
    await ensureApiSession();
    const response = await api.post<PurchaseRequisition>(
      `/procurement/requisitions/${id}/negotiation`,
      payload
    );
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to save requisition negotiation.");
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

export async function fetchVendorDocuments(vendorId: string): Promise<VendorDocument[]> {
  try {
    await ensureApiSession();
    const response = await api.get<VendorDocument[]>(`/procurement/vendors/${vendorId}/documents`);
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to load vendor documents.");
  }
}

export async function uploadVendorDocument(vendorId: string, file: File): Promise<VendorDocument> {
  try {
    await ensureApiSession();
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post<VendorDocument>(`/procurement/vendors/${vendorId}/documents`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to upload vendor document.");
  }
}

export async function deleteVendorDocument(vendorId: string, documentId: string): Promise<void> {
  try {
    await ensureApiSession();
    await api.delete(`/procurement/vendors/${vendorId}/documents/${documentId}`);
  } catch (error) {
    rethrow(error, "Failed to delete vendor document.");
  }
}

export async function fetchVendorDocumentContent(vendorId: string, documentId: string): Promise<Blob> {
  try {
    await ensureApiSession();
    const response = await api.get(`/procurement/vendors/${vendorId}/documents/${documentId}/content`, {
      responseType: "blob",
    });
    return response.data as Blob;
  } catch (error) {
    rethrow(error, "Failed to load vendor document content.");
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

export async function fetchInvoices(): Promise<Invoice[]> {
  try {
    await ensureApiSession();
    const response = await api.get<Invoice[]>("/procurement/invoices");
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to load invoices.");
  }
}

export async function createInvoice(payload: CreateInvoicePayload): Promise<Invoice> {
  try {
    await ensureApiSession();
    const response = await api.post<Invoice>("/procurement/invoices", payload);
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to create invoice.");
  }
}

export async function reviewInvoice(
  id: string,
  payload: ReviewPurchaseRequisitionPayload
): Promise<Invoice> {
  try {
    await ensureApiSession();
    const response = await api.post<Invoice>(`/procurement/invoices/${id}/approval-actions`, payload);
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to review invoice.");
  }
}

export async function fetchPayments(): Promise<Payment[]> {
  try {
    await ensureApiSession();
    const response = await api.get<Payment[]>("/procurement/payments");
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to load payments.");
  }
}

export async function createPayment(payload: CreatePaymentPayload): Promise<Payment> {
  try {
    await ensureApiSession();
    const response = await api.post<Payment>("/procurement/payments", payload);
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to create payment request.");
  }
}

export async function reviewPayment(
  id: string,
  payload: ReviewPurchaseRequisitionPayload
): Promise<Payment> {
  try {
    await ensureApiSession();
    const response = await api.post<Payment>(`/procurement/payments/${id}/approval-actions`, payload);
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to review payment request.");
  }
}
