import {
  type Customer,
  type Order,
  type OrderItem,
  OrderStatus,
  type Product,
} from "../types";

export const seedCustomers: Customer[] = [
  {
    id: 1,
    name: "Nimbus Medical",
    email: "ops@nimbusmed.com",
    phone: "+1 408-555-0193",
    address: "82 Market St, San Francisco, CA",
  },
  {
    id: 2,
    name: "Atlas Retail Co",
    email: "purchasing@atlasretail.com",
    phone: "+1 312-555-0144",
    address: "410 W Lake St, Chicago, IL",
  },
  {
    id: 3,
    name: "Solace Hospitality",
    email: "finance@solacehotels.com",
    phone: "+1 646-555-0188",
    address: "205 W 46th St, New York, NY",
  },
];

export const seedProducts: Product[] = [
  {
    id: 101,
    name: "POS Terminal X2",
    sku: "POS-X2",
    price: 899,
    stock_quantity: 18,
  },
  {
    id: 102,
    name: "Inventory Scanner",
    sku: "INV-SCAN-4",
    price: 249,
    stock_quantity: 45,
  },
  {
    id: 103,
    name: "Thermal Printer Pro",
    sku: "PRINT-TP",
    price: 329,
    stock_quantity: 23,
  },
  {
    id: 104,
    name: "POS Software License",
    sku: "LIC-POS",
    price: 1200,
    stock_quantity: 999,
  },
];

function buildItem(id: number, product: Product, quantity: number): OrderItem {
  return {
    id,
    product_id: product.id,
    quantity,
    price: product.price,
    product,
  };
}

function calculateTotal(items: OrderItem[]) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export const seedOrders: Order[] = [
  (() => {
    const items = [buildItem(1, seedProducts[0], 4), buildItem(2, seedProducts[3], 4)];
    return {
      id: 1001,
      customer_id: seedCustomers[0].id,
      status: OrderStatus.CREATED,
      total_amount: calculateTotal(items),
      items,
      created_at: new Date().toISOString(),
      customer: seedCustomers[0],
    };
  })(),
  (() => {
    const items = [buildItem(3, seedProducts[1], 12), buildItem(4, seedProducts[2], 8)];
    return {
      id: 1002,
      customer_id: seedCustomers[1].id,
      status: OrderStatus.INVENTORY_CHECKED,
      total_amount: calculateTotal(items),
      items,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
      customer: seedCustomers[1],
    };
  })(),
  (() => {
    const items = [buildItem(5, seedProducts[0], 2), buildItem(6, seedProducts[2], 2)];
    return {
      id: 1003,
      customer_id: seedCustomers[2].id,
      status: OrderStatus.INVOICED,
      total_amount: calculateTotal(items),
      items,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
      customer: seedCustomers[2],
    };
  })(),
];
