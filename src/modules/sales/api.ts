import { api } from "@/services/api-client";
import type {
  PaginatedQuotes,
  Quote,
  QuoteFilter,
  QuoteFormData,
  QuoteStatus,
} from "./types";

function toIsoOrNull(value: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function serializeForm(data: QuoteFormData) {
  return {
    leadId: data.leadId || null,
    customerName: data.customerName,
    company: data.company || null,
    email: data.email || null,
    phone: data.phone || null,
    billingAddress: data.billingAddress || null,
    shippingAddress: data.shippingAddress || null,
    currency: data.currency,
    status: data.status,
    discountType: data.discountType,
    discountValue: data.discountValue,
    taxRate: data.taxRate,
    validUntil: toIsoOrNull(data.validUntil),
    notes: data.notes || null,
    terms: data.terms || null,
    items: data.items.map((item) => ({
      inventoryProductId: item.inventoryProductId || null,
      name: item.name,
      make: item.make || null,
      description: item.description || null,
      utility: item.utility || null,
      quantity: item.quantity,
      unit: item.unit || null,
      unitPrice: item.unitPrice,
    })),
  };
}

export async function fetchQuotes(filter: QuoteFilter): Promise<PaginatedQuotes> {
  const response = await api.get<PaginatedQuotes>("/sales/quotes", {
    params: {
      search: filter.search,
      status: filter.status,
      page: filter.page,
      pageSize: filter.pageSize,
    },
  });
  return response.data;
}

export async function fetchQuote(id: string): Promise<Quote> {
  const response = await api.get<Quote>(`/sales/quotes/${id}`);
  return response.data;
}

export async function createQuote(data: QuoteFormData): Promise<Quote> {
  const response = await api.post<Quote>("/sales/quotes", serializeForm(data));
  return response.data;
}

export async function updateQuote(id: string, data: QuoteFormData): Promise<Quote> {
  const response = await api.patch<Quote>(`/sales/quotes/${id}`, serializeForm(data));
  return response.data;
}

export async function updateQuoteStatus(id: string, status: QuoteStatus): Promise<Quote> {
  const response = await api.patch<Quote>(`/sales/quotes/${id}/status`, { status });
  return response.data;
}

export async function deleteQuote(id: string): Promise<void> {
  await api.delete(`/sales/quotes/${id}`);
}
