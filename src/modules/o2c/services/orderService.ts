import { api } from "@/services/api";
import type { CreateOrderPayload, DeliveryChallan, Order, OrderStatus } from "../types";

export async function listOrders() {
  const { data } = await api.get<Order[]>("/o2c/orders");
  return data;
}

export async function getOrder(orderId: number) {
  const { data } = await api.get<Order>(`/o2c/orders/${orderId}`);
  return data;
}

export async function createOrder(payload: CreateOrderPayload) {
  const { data } = await api.post<Order>("/o2c/orders", payload);
  return data;
}

export async function updateOrderStatus(orderId: number, status: OrderStatus) {
  const { data } = await api.patch<Order>(`/o2c/orders/${orderId}`, { status });
  return data;
}

export async function createDeliveryChallan(orderId: number) {
  const { data } = await api.post<DeliveryChallan>(
    `/o2c/orders/${orderId}/delivery-challan`
  );
  return data;
}
