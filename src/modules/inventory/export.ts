import { type InventoryTransaction, type Product } from "./types";

function escapeCsvValue(value: unknown) {
  const normalized = value == null ? "" : String(value);
  const escaped = normalized.replace(/"/g, '""');
  return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
}

function downloadCsv(filename: string, headers: string[], rows: Array<Array<unknown>>) {
  const csv = [headers, ...rows]
    .map((row) => row.map((value) => escapeCsvValue(value)).join(","))
    .join("\r\n");

  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function formatDate(value?: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatCurrency(value?: number | null) {
  if (value == null) return "";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value);
}

export function exportProductsCsv(products: Product[]) {
  downloadCsv(
    `inventory-items-${new Date().toISOString().slice(0, 10)}.csv`,
    [
      "Name",
      "SKU",
      "Category",
      "Sub Category",
      "Brand",
      "Unit",
      "Status",
      "Stock Qty",
      "Reorder Level",
      "Unit Price",
      "Price Tier 1",
      "Price Tier 2",
      "Price Tier 3",
      "HSN Code",
      "Description",
      "Notes",
      "Created At",
      "Updated At",
    ],
    products.map((product) => [
      product.name,
      product.sku,
      product.category,
      product.subCategory ?? "",
      product.brand ?? "",
      product.unit ?? "",
      product.status,
      product.stockQty,
      product.reorderLevel ?? "",
      formatCurrency(product.price),
      formatCurrency(product.priceTier1),
      formatCurrency(product.priceTier2),
      formatCurrency(product.priceTier3),
      product.hsnCode ?? "",
      product.description ?? "",
      product.notes ?? "",
      formatDate(product.createdAt),
      formatDate(product.updatedAt),
    ])
  );
}

export function exportTransactionsCsv(transactions: InventoryTransaction[]) {
  downloadCsv(
    `inventory-transactions-${new Date().toISOString().slice(0, 10)}.csv`,
    [
      "Date",
      "Transaction Ref",
      "Type",
      "Item",
      "SKU",
      "Quantity",
      "Unit Price",
      "Line Total",
      "Vendor",
      "Project",
      "Issued By",
      "Notes",
      "Created At",
    ],
    transactions.map((transaction) => [
      formatDate(transaction.txnDate),
      transaction.txnRef,
      transaction.txnType,
      transaction.productName,
      transaction.sku,
      transaction.quantity,
      formatCurrency(transaction.unitPrice),
      formatCurrency(transaction.lineTotal),
      transaction.vendorName ?? "",
      transaction.projectRef ?? "",
      transaction.issuedBy ?? "",
      transaction.notes ?? "",
      formatDate(transaction.createdAt),
    ])
  );
}
