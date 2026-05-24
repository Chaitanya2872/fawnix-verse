import { api } from "@/services/api-client";
import type {
  CreateSalesDeliveryInput,
  CreateSalesInvoiceInput,
  CreateSalesOrderInput,
  PaginatedSalesOrders,
  SalesDelivery,
  SalesDeliveryListResponse,
  SalesDeliveryStatus,
  SalesInvoice,
  SalesInvoiceListResponse,
  SalesInvoiceStatus,
  SalesOrder,
  SalesOrderFilter,
  SalesOrderStatus,
} from "./types";

export async function fetchSalesOrders(filter: SalesOrderFilter): Promise<PaginatedSalesOrders> {
  const response = await api.get<PaginatedSalesOrders>("/sales/orders", {
    params: {
      search: filter.search,
      status: filter.status,
      page: filter.page,
      pageSize: filter.pageSize,
    },
  });
  return response.data;
}

export async function fetchSalesOrder(id: string): Promise<SalesOrder> {
  const response = await api.get<SalesOrder>(`/sales/orders/${id}`);
  return response.data;
}

export async function createSalesOrder(payload: CreateSalesOrderInput): Promise<SalesOrder> {
  const response = await api.post<SalesOrder>("/sales/orders", payload);
  return response.data;
}

export async function convertQuoteToOrder(id: string): Promise<SalesOrder> {
  const response = await api.post<SalesOrder>(`/sales/quotes/${id}/convert-to-order`);
  return response.data;
}

export async function updateSalesOrderStatus(id: string, status: SalesOrderStatus): Promise<SalesOrder> {
  const response = await api.patch<SalesOrder>(`/sales/orders/${id}/status`, { status });
  return response.data;
}

export async function fetchSalesDeliveries(salesOrderId?: string): Promise<SalesDeliveryListResponse> {
  const response = await api.get<SalesDeliveryListResponse>("/sales/deliveries", {
    params: salesOrderId ? { salesOrderId } : undefined,
  });
  return response.data;
}

export async function createSalesDelivery(payload: CreateSalesDeliveryInput): Promise<SalesDelivery> {
  const response = await api.post<SalesDelivery>("/sales/deliveries", payload);
  return response.data;
}

export async function updateSalesDeliveryStatus(id: string, status: SalesDeliveryStatus): Promise<SalesDelivery> {
  const response = await api.patch<SalesDelivery>(`/sales/deliveries/${id}/status`, { status });
  return response.data;
}

export async function fetchSalesInvoices(salesOrderId?: string): Promise<SalesInvoiceListResponse> {
  const response = await api.get<SalesInvoiceListResponse>("/sales/invoices", {
    params: salesOrderId ? { salesOrderId } : undefined,
  });
  return response.data;
}

export async function createSalesInvoice(payload: CreateSalesInvoiceInput): Promise<SalesInvoice> {
  const response = await api.post<SalesInvoice>("/sales/invoices", payload);
  return response.data;
}

export async function updateSalesInvoiceStatus(
  id: string,
  status: SalesInvoiceStatus,
  balanceDue?: number
): Promise<SalesInvoice> {
  const response = await api.patch<SalesInvoice>(`/sales/invoices/${id}/status`, { status, balanceDue });
  return response.data;
}
