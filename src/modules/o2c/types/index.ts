export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  price: number;
  stock_quantity: number;
}

export interface OrderItem {
  id: number;
  product_id: number;
  quantity: number;
  price: number;
  product?: Product;
}

export enum OrderStatus {
  CREATED = "CREATED",
  INVENTORY_CHECKED = "INVENTORY_CHECKED",
  MATERIAL_ISSUED = "MATERIAL_ISSUED",
  DC_CREATED = "DC_CREATED",
  INVOICED = "INVOICED",
  PAID = "PAID",
  CLOSED = "CLOSED",
}

export interface Order {
  id: number;
  customer_id: number;
  status: OrderStatus;
  total_amount: number;
  items: OrderItem[];
  created_at: string;
  customer?: Customer;
}

export enum InvoiceStatus {
  PENDING = "PENDING",
  PAID = "PAID",
}

export interface Invoice {
  id: number;
  order_id: number;
  invoice_number: string;
  amount: number;
  status: InvoiceStatus;
}

export interface Payment {
  id: number;
  invoice_id: number;
  amount: number;
  payment_mode: string;
  payment_date: string;
}

export enum InventoryCheckStatus {
  FULL = "FULL",
  PARTIAL = "PARTIAL",
  OUT_OF_STOCK = "OUT_OF_STOCK",
}

export interface InventoryCheckResult {
  status: InventoryCheckStatus;
  missingItems: OrderItem[];
}

export interface DeliveryChallan {
  id: number;
  order_id: number;
  dc_number: string;
  issued_at: string;
  status: "CREATED" | "DISPATCHED";
}

export interface OrderItemInput {
  product_id: number;
  quantity: number;
  price: number;
}

export interface CreateOrderPayload {
  customer_id?: number;
  customer: Customer;
  items: OrderItemInput[];
}

export interface PaymentInput {
  amount: number;
  payment_mode: string;
  payment_date: string;
}
