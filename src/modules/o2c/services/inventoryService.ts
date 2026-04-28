import { api } from "@/services/api";
import type { InventoryCheckResult, Order } from "../types";

export async function checkInventory(orderId: number) {
  const { data } = await api.post<InventoryCheckResult>(
    `/o2c/orders/${orderId}/inventory-check`
  );
  return data;
}

export async function issueMaterial(orderId: number) {
  const { data } = await api.post<Order>(`/o2c/orders/${orderId}/issue-material`);
  return data;
}
