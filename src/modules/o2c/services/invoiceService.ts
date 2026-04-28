import { api } from "@/services/api";
import type { Invoice } from "../types";

export async function getInvoiceByOrderId(orderId: number) {
  const { data } = await api.get<Invoice>(`/o2c/orders/${orderId}/invoice`);
  return data;
}

export async function createInvoice(orderId: number) {
  const { data } = await api.post<Invoice>(`/o2c/orders/${orderId}/invoice`);
  return data;
}

export async function markInvoicePaid(invoiceId: number) {
  const { data } = await api.post<Invoice>(`/o2c/invoices/${invoiceId}/pay`);
  return data;
}
