import { api } from "@/services/api";
import type { Payment, PaymentInput } from "../types";

export async function listPayments(invoiceId: number) {
  const { data } = await api.get<Payment[]>(`/o2c/invoices/${invoiceId}/payments`);
  return data;
}

export async function recordPayment(invoiceId: number, payload: PaymentInput) {
  const { data } = await api.post<Payment>(
    `/o2c/invoices/${invoiceId}/payments`,
    payload
  );
  return data;
}
