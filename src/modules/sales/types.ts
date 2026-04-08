export const QuoteStatus = {
  DRAFT: "DRAFT",
  SENT: "SENT",
  ACCEPTED: "ACCEPTED",
  REJECTED: "REJECTED",
  EXPIRED: "EXPIRED",
} as const;

export type QuoteStatus = (typeof QuoteStatus)[keyof typeof QuoteStatus];

export const DiscountType = {
  PERCENT: "PERCENT",
  AMOUNT: "AMOUNT",
} as const;

export type DiscountType = (typeof DiscountType)[keyof typeof DiscountType];

export type QuoteLineItem = {
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

export type QuoteSummary = {
  id: string;
  quoteNumber: string;
  status: QuoteStatus;
  customerName: string;
  company: string | null;
  total: number;
  createdAt: string;
  updatedAt: string;
};

export type Quote = {
  id: string;
  quoteNumber: string;
  status: QuoteStatus;
  leadId?: string | null;
  customerName: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  billingAddress: string | null;
  shippingAddress: string | null;
  currency: string;
  discountType: DiscountType | null;
  discountValue: number;
  subtotal: number;
  discountTotal: number;
  taxRate: number;
  taxTotal: number;
  total: number;
  validUntil: string | null;
  notes: string | null;
  terms: string | null;
  items: QuoteLineItem[];
  createdAt: string;
  updatedAt: string;
};

export type QuoteFormItem = {
  clientId?: string;
  inventoryProductId?: string;
  name: string;
  make: string;
  description: string;
  utility: string;
  quantity: number;
  unit: string;
  unitPrice: number;
};

export type QuoteFormData = {
  leadId?: string;
  customerName: string;
  company: string;
  email: string;
  phone: string;
  billingAddress: string;
  shippingAddress: string;
  currency: string;
  status: QuoteStatus;
  discountType: DiscountType;
  discountValue: number;
  taxRate: number;
  validUntil: string;
  notes: string;
  terms: string;
  items: QuoteFormItem[];
};

export type QuoteFilter = {
  search: string;
  status: QuoteStatus | "ALL";
  page: number;
  pageSize: number;
};

export type PaginatedQuotes = {
  data: QuoteSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
