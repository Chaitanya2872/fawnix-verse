export type PurchaseRequisitionStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "PO_CREATED";
export type PurchaseRequisitionType =
  | "INTERNAL_USE"
  | "FOR_SALE"
  | "CUSTOMER"
  | "SELF"
  | "DEMO"
  | "OTHER";

export type PurchaseOrderStatus = "CREATED" | "RECEIVED";
export type GoodsReceiptStatus = "RECEIVED";
export type ApprovalAction = "SUBMITTED" | "APPROVED" | "REJECTED";
export type InvoiceStatus = "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "PAID";
export type PaymentStatus = "PENDING_APPROVAL" | "REJECTED" | "PAID";

export interface PurchaseRequisitionItem {
  id: string;
  productId?: string | null;
  sku?: string | null;
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
  requestType: PurchaseRequisitionType;
  department: string;
  purpose?: string | null;
  neededByDate?: string | null;
  status: PurchaseRequisitionStatus;
  currentStepOrder?: number | null;
  submittedAt?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  evaluationDecision?: string | null;
  evaluationNotes?: string | null;
  evaluationUpdatedAt?: string | null;
  negotiationVendorId?: string | null;
  negotiatedAmount?: number | null;
  negotiationNotes?: string | null;
  negotiationUpdatedAt?: string | null;
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

export interface VendorDocument {
  id: string;
  fileName: string;
  contentType?: string | null;
  fileSize: number;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderItem {
  id: string;
  productId?: string | null;
  sku?: string | null;
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

export interface Invoice {
  id: string;
  invoiceNumber: string;
  purchaseOrderId: string;
  poNumber: string;
  vendor: Vendor;
  invoiceDate: string;
  dueDate?: string | null;
  amount: number;
  matchingStatus: "MATCHED" | "MISMATCH" | "PENDING_GRN";
  matchingNotes: string;
  status: InvoiceStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  paymentNumber: string;
  invoiceId: string;
  invoiceNumber: string;
  vendor: Vendor;
  paymentDate?: string | null;
  requestedBy: string;
  approvedBy?: string | null;
  amount: number;
  status: PaymentStatus;
  remarks?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePurchaseRequisitionPayload {
  requesterId: string;
  requestType: PurchaseRequisitionType;
  department: string;
  purpose?: string;
  neededByDate?: string;
  items: Array<{
    productId?: string;
    sku?: string;
    productName?: string;
    category?: string;
    unit?: string;
    quantity: number;
    estimatedUnitPrice: number;
    remarks?: string;
  }>;
}

export interface ReviewPurchaseRequisitionPayload {
  action: "APPROVED" | "REJECTED";
  actorId: string;
  remarks?: string;
}

export interface UpdatePurchaseRequisitionEvaluationPayload {
  decision?: string;
  notes?: string;
}

export interface UpdatePurchaseRequisitionNegotiationPayload {
  vendorId?: string;
  negotiatedAmount?: number;
  notes?: string;
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

export interface CreateInvoicePayload {
  invoiceNumber: string;
  purchaseOrderId: string;
  invoiceDate: string;
  dueDate?: string;
  amount: number;
}

export interface CreatePaymentPayload {
  invoiceId: string;
  requestedBy: string;
  paymentDate?: string;
  remarks?: string;
}
