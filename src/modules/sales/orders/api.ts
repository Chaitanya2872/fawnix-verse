import { api } from "@/services/api-client";
import type {
  CreateSalesOrderInput,
  PaginatedSalesOrders,
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
