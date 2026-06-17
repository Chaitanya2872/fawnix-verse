export const SalesOrderStatus = {
  DRAFT: "DRAFT",
  SUBMITTED: "SUBMITTED",
  PENDING_APPROVAL: "PENDING_APPROVAL",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  CONFIRMED: "CONFIRMED",
  PARTIALLY_DELIVERED: "PARTIALLY_DELIVERED",
  DELIVERED: "DELIVERED",
  INVOICED: "INVOICED",
  PARTIALLY_PAID: "PARTIALLY_PAID",
  PAID: "PAID",
  CLOSED: "CLOSED",
  CANCELLED: "CANCELLED",
} as const;

export type SalesOrderStatus = (typeof SalesOrderStatus)[keyof typeof SalesOrderStatus];

export type SalesOrderLineItem = {
  id: string;
  inventoryProductId?: string | null;
  name: string;
  make?: string | null;
  description: string | null;
  utility?: string | null;
  quantity: number;
  unit: string | null;
  unitPrice: number;
  lineTotal: number;
};

export type CreateSalesOrderLineItemInput = {
  inventoryProductId?: string;
  name: string;
  make?: string;
  description?: string;
  utility?: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
};

export type CreateSalesOrderInput = {
  quoteId?: string;
  leadId?: string;
  customerName: string;
  company?: string;
  email?: string;
  phone?: string;
  billingAddress?: string;
  shippingAddress?: string;
  currency?: string;
  status?: SalesOrderStatus;
  deliveryDate?: string;
  paymentTerms?: string;
  customerPoNumber?: string;
  quotationReference?: string;
  paymentDueDays?: number;
  taxRate?: number;
  discountPercent?: number;
  customerCreditLimit?: number;
  customerOutstandingAmount?: number;
  confirmationAttachmentUrl?: string;
  notes?: string;
  items: CreateSalesOrderLineItemInput[];
};

export type ManualOrderItemDraft = {
  key: string;
  inventoryProductId?: string;
  name: string;
  make: string;
  description: string;
  utility: string;
  quantity: string;
  unit: string;
  unitPrice: string;
};

export type ManualOrderFormState = {
  customerName: string;
  company: string;
  email: string;
  phone: string;
  billingAddress: string;
  shippingAddress: string;
  currency: string;
  status: SalesOrderStatus;
  deliveryDate: string;
  paymentTerms: string;
  customerPoNumber: string;
  quotationReference: string;
  paymentDueDays: string;
  taxRate: string;
  discountPercent: string;
  customerCreditLimit: string;
  customerOutstandingAmount: string;
  confirmationAttachmentUrl: string;
  notes: string;
  items: ManualOrderItemDraft[];
};

export type SalesOrderValidation = {
  stockAvailable: boolean;
  creditLimitExceeded: boolean;
  duplicateOrder: boolean;
  riskyPaymentTerms: boolean;
  specialDiscount: boolean;
  summary: string;
  validatedAt: string | null;
};

export type SalesOrderApproval = {
  id: string;
  roleKey: string;
  roleLabel: string;
  sequenceNo: number;
  status: string;
  remarks: string | null;
  approverName: string | null;
  createdAt: string;
  decidedAt: string | null;
};

export type SalesOrderAuditLog = {
  id: string;
  actionType: string;
  actorName: string | null;
  details: string | null;
  createdAt: string;
};

export type SalesOrderApprovalRule = {
  id: string;
  roleKey: string;
  roleLabel: string;
  sequenceNo: number;
  minOrderValue: number | null;
  maxOrderValue: number | null;
  requireCreditLimitBreach: boolean;
  requireInventoryShortage: boolean;
  requireRiskyTerms: boolean;
  requireSpecialDiscount: boolean;
  active: boolean;
};

export type SalesOrderSummary = {
  id: string;
  orderNumber: string;
  quoteId?: string | null;
  status: SalesOrderStatus;
  customerName: string;
  company: string | null;
  total: number;
  paymentTerms: string | null;
  deliveryDate: string | null;
  creditLimitExceeded: boolean;
  stockAvailable: boolean;
  inventoryReserved: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SalesOrder = {
  id: string;
  orderNumber: string;
  quoteId?: string | null;
  leadId?: string | null;
  status: SalesOrderStatus;
  customerName: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  billingAddress: string | null;
  shippingAddress: string | null;
  currency: string;
  deliveryDate: string | null;
  paymentTerms: string | null;
  customerPoNumber: string | null;
  quotationReference: string | null;
  paymentDueDays: number | null;
  subtotal: number;
  taxRate: number;
  taxTotal: number;
  discountPercent: number;
  discountAmount: number;
  total: number;
  customerCreditLimit: number;
  customerOutstandingAmount: number;
  creditLimitExceeded: boolean;
  stockAvailable: boolean;
  duplicateOrderFlag: boolean;
  riskyPaymentTerms: boolean;
  specialDiscountFlag: boolean;
  validation: SalesOrderValidation;
  submittedAt: string | null;
  confirmedAt: string | null;
  confirmedByName: string | null;
  confirmationAttachmentUrl: string | null;
  inventoryReserved: boolean;
  inventoryReservationMessage: string | null;
  inventoryReservedAt: string | null;
  approvals: SalesOrderApproval[];
  auditLogs: SalesOrderAuditLog[];
  notes: string | null;
  items: SalesOrderLineItem[];
  createdAt: string;
  updatedAt: string;
};

export type SalesOrderFilter = {
  search: string;
  status: SalesOrderStatus | "ALL";
  page: number;
  pageSize: number;
};

export type PaginatedSalesOrders = {
  data: SalesOrderSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export const SalesDeliveryStatus = {
  DRAFT: "DRAFT",
  READY_TO_DISPATCH: "READY_TO_DISPATCH",
  DISPATCHED: "DISPATCHED",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
} as const;

export type SalesDeliveryStatus = (typeof SalesDeliveryStatus)[keyof typeof SalesDeliveryStatus];

export const SalesInvoiceStatus = {
  DRAFT: "DRAFT",
  ISSUED: "ISSUED",
  PARTIALLY_PAID: "PARTIALLY_PAID",
  PAID: "PAID",
  OVERDUE: "OVERDUE",
  CANCELLED: "CANCELLED",
} as const;

export type SalesInvoiceStatus = (typeof SalesInvoiceStatus)[keyof typeof SalesInvoiceStatus];

export const PaymentMode = {
  UPI: "UPI",
  BANK_TRANSFER: "BANK_TRANSFER",
  CHEQUE: "CHEQUE",
  CASH: "CASH",
} as const;

export type PaymentMode = (typeof PaymentMode)[keyof typeof PaymentMode];

export const SalesReturnStatus = {
  REQUESTED: "REQUESTED",
  PENDING_APPROVAL: "PENDING_APPROVAL",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  CREDIT_ISSUED: "CREDIT_ISSUED",
  CLOSED: "CLOSED",
} as const;

export type SalesReturnStatus = (typeof SalesReturnStatus)[keyof typeof SalesReturnStatus];

export type SalesDelivery = {
  id: string;
  deliveryNumber: string;
  salesOrderId: string;
  salesOrderNumber: string;
  customerName: string;
  company: string | null;
  shippingAddress: string | null;
  status: SalesDeliveryStatus;
  scheduledDate: string | null;
  dispatchedAt: string | null;
  deliveredAt: string | null;
  carrier: string | null;
  trackingNumber: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SalesInvoice = {
  id: string;
  invoiceNumber: string;
  salesOrderId: string;
  salesOrderNumber: string;
  customerName: string;
  company: string | null;
  billingAddress: string | null;
  currency: string;
  status: SalesInvoiceStatus;
  dueDate: string | null;
  issuedAt: string | null;
  paidAt: string | null;
  subtotal: number;
  taxTotal: number;
  total: number;
  balanceDue: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SalesPayment = {
  id: string;
  paymentNumber: string;
  salesInvoiceId: string;
  salesOrderId: string;
  customerName: string;
  currency: string;
  paymentMode: PaymentMode;
  paymentDate: string;
  amount: number;
  referenceNumber: string | null;
  remarks: string | null;
  createdAt: string;
};

export type SalesReturn = {
  id: string;
  returnNumber: string;
  salesOrderId: string;
  salesInvoiceId: string | null;
  customerName: string;
  status: SalesReturnStatus;
  returnReason: string;
  requestedAmount: number;
  approvedAmount: number;
  remarks: string | null;
  approvedByName: string | null;
  createdAt: string;
  approvedAt: string | null;
  creditNotes: SalesCreditNote[];
};

export type SalesCreditNote = {
  id: string;
  creditNoteNumber: string;
  salesReturnId: string;
  salesInvoiceId: string | null;
  customerName: string;
  currency: string;
  amount: number;
  remarks: string | null;
  createdAt: string;
};

export type SalesMetric = {
  label: string;
  key: string;
  value: number;
};

export type SalesCustomerReportRow = {
  customerName: string;
  totalSales: number;
  outstandingAmount: number;
};

export type SalesReportOverview = {
  metrics: SalesMetric[];
  customerSales: SalesCustomerReportRow[];
  overdueCustomers: SalesCustomerReportRow[];
};

export type SalesDeliveryListResponse = {
  data: SalesDelivery[];
};

export type SalesInvoiceListResponse = {
  data: SalesInvoice[];
};

export type SalesPaymentListResponse = {
  data: SalesPayment[];
};

export type SalesReturnListResponse = {
  data: SalesReturn[];
};

export type CreateSalesDeliveryInput = {
  salesOrderId: string;
  scheduledDate?: string;
  carrier?: string;
  trackingNumber?: string;
  notes?: string;
};

export type CreateSalesInvoiceInput = {
  salesOrderId: string;
  dueDate?: string;
  notes?: string;
};

export type CreateSalesPaymentInput = {
  salesInvoiceId: string;
  paymentDate: string;
  amount: number;
  paymentMode: PaymentMode;
  referenceNumber?: string;
  remarks?: string;
};

export type CreateSalesReturnInput = {
  salesOrderId: string;
  salesInvoiceId?: string;
  returnReason: string;
  requestedAmount: number;
  remarks?: string;
};
