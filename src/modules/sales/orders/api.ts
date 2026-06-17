import { api } from "@/services/api-client";
import type {
  CreateSalesDeliveryInput,
  CreateSalesInvoiceInput,
  CreateSalesOrderInput,
  CreateSalesPaymentInput,
  CreateSalesReturnInput,
  PaginatedSalesOrders,
  SalesDelivery,
  SalesDeliveryListResponse,
  SalesDeliveryStatus,
  SalesInvoice,
  SalesInvoiceListResponse,
  SalesInvoiceStatus,
  SalesOrder,
  SalesOrderApprovalRule,
  SalesOrderFilter,
  SalesOrderStatus,
  SalesPayment,
  SalesPaymentListResponse,
  SalesReportOverview,
  SalesReturn,
  SalesReturnListResponse,
  SalesReturnStatus,
  UpdateSalesOrderInput,
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

export async function updateSalesOrder(id: string, payload: UpdateSalesOrderInput): Promise<SalesOrder> {
  const response = await api.patch<SalesOrder>(`/sales/orders/${id}`, payload);
  return response.data;
}

export async function convertQuoteToOrder(id: string): Promise<SalesOrder> {
  const response = await api.post<SalesOrder>(`/sales/quotes/${id}/convert-to-order`);
  return response.data;
}

export async function updateSalesOrderStatus(id: string, status: SalesOrderStatus, remarks?: string): Promise<SalesOrder> {
  const response = await api.patch<SalesOrder>(`/sales/orders/${id}/status`, { status, remarks });
  return response.data;
}

export async function submitSalesOrder(id: string): Promise<SalesOrder> {
  const response = await api.post<SalesOrder>(`/sales/orders/${id}/submit`);
  return response.data;
}

export async function confirmSalesOrder(id: string, confirmationAttachmentUrl?: string, remarks?: string): Promise<SalesOrder> {
  const response = await api.post<SalesOrder>(`/sales/orders/${id}/confirm`, { confirmationAttachmentUrl, remarks });
  return response.data;
}

export async function applySalesOrderApprovalAction(
  id: string,
  action: "APPROVE" | "REJECT" | "SEND_BACK",
  remarks?: string
): Promise<SalesOrder> {
  const response = await api.post<SalesOrder>(`/sales/orders/${id}/approval-action`, { action, remarks });
  return response.data;
}

export async function fetchApprovalRules(): Promise<SalesOrderApprovalRule[]> {
  const response = await api.get<SalesOrderApprovalRule[]>("/sales/orders/approval-rules");
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

export async function fetchSalesPayments(salesInvoiceId?: string): Promise<SalesPaymentListResponse> {
  const response = await api.get<SalesPaymentListResponse>("/sales/payments", {
    params: salesInvoiceId ? { salesInvoiceId } : undefined,
  });
  return response.data;
}

export async function createSalesPayment(payload: CreateSalesPaymentInput): Promise<SalesPayment> {
  const response = await api.post<SalesPayment>("/sales/payments", payload);
  return response.data;
}

export async function fetchSalesReturns(salesOrderId?: string): Promise<SalesReturnListResponse> {
  const response = await api.get<SalesReturnListResponse>("/sales/returns", {
    params: salesOrderId ? { salesOrderId } : undefined,
  });
  return response.data;
}

export async function createSalesReturn(payload: CreateSalesReturnInput): Promise<SalesReturn> {
  const response = await api.post<SalesReturn>("/sales/returns", payload);
  return response.data;
}

export async function updateSalesReturnStatus(id: string, status: SalesReturnStatus, approvedAmount?: number, remarks?: string): Promise<SalesReturn> {
  const response = await api.patch<SalesReturn>(`/sales/returns/${id}/status`, { status, approvedAmount, remarks });
  return response.data;
}

export async function fetchSalesReportOverview(): Promise<SalesReportOverview> {
  const response = await api.get<SalesReportOverview>("/sales/reports/overview");
  return response.data;
}
