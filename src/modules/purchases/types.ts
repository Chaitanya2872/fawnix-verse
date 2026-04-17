export type PurchaseRequisitionStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "PO_CREATED";

export type PurchaseOrderStatus = "CREATED" | "RECEIVED";
export type GoodsReceiptStatus = "RECEIVED";
export type ApprovalAction = "SUBMITTED" | "APPROVED" | "REJECTED";

export interface PurchaseRequisitionItem {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  category?: string | null;
  unit: string;
  quantity: number;
  estimatedUnitPrice: number;
  lineTotal: number;
  remarks?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseRequisition {
  id: string;
  prNumber: string;
  requesterId: string;
  department: string;
  purpose?: string | null;
  neededByDate?: string | null;
  status: PurchaseRequisitionStatus;
  currentStepOrder?: number | null;
  submittedAt?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  totalAmount: number;
  items: PurchaseRequisitionItem[];
  createdAt: string;
  updatedAt: string;
}

export interface Vendor {
  id: string;
  vendorCode: string;
  vendorName: string;
  email?: string | null;
  phone?: string | null;
  taxIdentifier?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderItem {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  category?: string | null;
  unit: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  purchaseRequisitionId: string;
  requisitionNumber: string;
  vendor: Vendor;
  orderDate: string;
  expectedDeliveryDate?: string | null;
  status: PurchaseOrderStatus;
  notes?: string | null;
  totalAmount: number;
  items: PurchaseOrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface GoodsReceipt {
  id: string;
  grnNumber: string;
  purchaseOrderId: string;
  poNumber: string;
  receiptDate: string;
  receivedBy: string;
  status: GoodsReceiptStatus;
  remarks?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePurchaseRequisitionPayload {
  requesterId: string;
  department: string;
  purpose?: string;
  neededByDate?: string;
  items: Array<{
    productId: string;
    quantity: number;
    remarks?: string;
  }>;
}

export interface ReviewPurchaseRequisitionPayload {
  action: "APPROVED" | "REJECTED";
  actorId: string;
  remarks?: string;
}

export interface CreateVendorPayload {
  vendorCode: string;
  vendorName: string;
  email?: string;
  phone?: string;
  taxIdentifier?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

export type UpdateVendorPayload = Omit<CreateVendorPayload, "vendorCode">;

export interface CreatePurchaseOrderPayload {
  vendorId: string;
  orderDate: string;
  expectedDeliveryDate?: string;
  notes?: string;
}

export interface CreateGoodsReceiptPayload {
  purchaseOrderId: string;
  receiptDate: string;
  receivedBy: string;
  remarks?: string;
}
