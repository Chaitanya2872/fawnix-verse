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
