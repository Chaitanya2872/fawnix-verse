export const SalesOrderStatus = {
  DRAFT: "DRAFT",
  PENDING_APPROVAL: "PENDING_APPROVAL",
  APPROVED: "APPROVED",
  PROCESSING: "PROCESSING",
  PACKED: "PACKED",
  SHIPPED: "SHIPPED",
  DELIVERED: "DELIVERED",
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
  taxRate?: number;
  notes?: string;
  items: CreateSalesOrderLineItemInput[];
};

export type ManualOrderItemDraft = {
  key: string;
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
  taxRate: string;
  notes: string;
  items: ManualOrderItemDraft[];
};

export type SalesOrderSummary = {
  id: string;
  orderNumber: string;
  quoteId?: string | null;
  status: SalesOrderStatus;
  customerName: string;
  company: string | null;
  total: number;
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
  subtotal: number;
  taxRate: number;
  taxTotal: number;
  total: number;
  inventoryReserved: boolean;
  inventoryReservationMessage: string | null;
  inventoryReservedAt: string | null;
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

export type SalesDeliveryListResponse = {
  data: SalesDelivery[];
};

export type SalesInvoiceListResponse = {
  data: SalesInvoice[];
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
