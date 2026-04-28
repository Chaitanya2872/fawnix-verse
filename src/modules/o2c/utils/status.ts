import { InventoryCheckStatus, InvoiceStatus, OrderStatus } from "../types";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.CREATED]: "Created",
  [OrderStatus.INVENTORY_CHECKED]: "Inventory Checked",
  [OrderStatus.MATERIAL_ISSUED]: "Material Issued",
  [OrderStatus.DC_CREATED]: "Delivery Challan",
  [OrderStatus.INVOICED]: "Invoiced",
  [OrderStatus.PAID]: "Paid",
  [OrderStatus.CLOSED]: "Closed",
};

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  OrderStatus.CREATED,
  OrderStatus.INVENTORY_CHECKED,
  OrderStatus.MATERIAL_ISSUED,
  OrderStatus.DC_CREATED,
  OrderStatus.INVOICED,
  OrderStatus.PAID,
  OrderStatus.CLOSED,
];

export const ORDER_STEP_LABELS = [
  "Order",
  "Inventory",
  "Material Issue",
  "DC",
  "Invoice",
  "Payment",
  "Closed",
];

export const INVENTORY_STATUS_LABELS: Record<InventoryCheckStatus, string> = {
  [InventoryCheckStatus.FULL]: "Full Stock",
  [InventoryCheckStatus.PARTIAL]: "Partial Stock",
  [InventoryCheckStatus.OUT_OF_STOCK]: "Out of Stock",
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  [InvoiceStatus.PENDING]: "Pending",
  [InvoiceStatus.PAID]: "Paid",
};
