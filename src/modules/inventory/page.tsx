"use client";

import React, { useState, useCallback } from "react";
import {
  Search,
  Plus,
  Download,
  MoreHorizontal,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Package,
  AlertTriangle,
  X,
} from "lucide-react";
import {
  type Product,
  type ProductFilter,
  type ProductFormData,
  ProductStatus,
  PRODUCT_CATEGORIES,
} from "./types";
import {
  useProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
} from "./hooks";
import { InventoryLayout } from "./layout";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value);
}

function exportCSV(products: Product[]) {
  const headers = [
    "Name",
    "SKU",
    "Category",
    "Sub Category",
    "Brand",
    "Unit",
    "Reorder Level",
    "Stock Qty",
    "Price",
    "Status",
  ];
  const rows = products.map((p) => [
    `"${p.name}"`,
    p.sku,
    p.category,
    p.subCategory ?? "",
    p.brand ?? "",
    p.unit ?? "",
    p.reorderLevel ?? "",
    p.stockQty,
    p.price,
    p.status,
  ]);
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "inventory.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Status Badge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: ProductStatus }) {
  const config: Record<ProductStatus, { label: string; cls: string; dot: string }> = {
    [ProductStatus.IN_STOCK]: {
      label: "In Stock",
      cls: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
      dot: "bg-emerald-500",
    },
    [ProductStatus.LOW_STOCK]: {
      label: "Low Stock",
      cls: "bg-amber-500/10 text-amber-500 border-amber-500/20",
      dot: "bg-amber-500",
    },
    [ProductStatus.OUT_OF_STOCK]: {
      label: "Out of Stock",
      cls: "bg-red-500/10 text-red-500 border-red-500/20",
      dot: "bg-red-500",
    },
  };

  const { label, cls, dot } = config[status];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Product Dialog (Add / Edit)
// ---------------------------------------------------------------------------

interface ProductDialogProps {
  open: boolean;
  onClose: () => void;
  product?: Product | null;
  onSave: (data: ProductFormData) => void;
  isLoading?: boolean;
}

const defaultForm: ProductFormData = {
  name: "",
  sku: "",
  category: "Smart Switches",
  subCategory: "",
  brand: "",
  unit: "pcs",
  reorderLevel: 0,
  description: "",
  hsnCode: "",
  notes: "",
  stockQty: 0,
  price: 0,
  status: ProductStatus.IN_STOCK,
};

function ProductDialog({ open, onClose, product, onSave, isLoading }: ProductDialogProps) {
  const [form, setForm] = useState<ProductFormData>(
    product
      ? {
          name: product.name,
          sku: product.sku,
          category: product.category,
          subCategory: product.subCategory ?? "",
          brand: product.brand ?? "",
          unit: product.unit ?? "pcs",
          reorderLevel: product.reorderLevel ?? 0,
          description: product.description ?? "",
          hsnCode: product.hsnCode ?? "",
          notes: product.notes ?? "",
          stockQty: product.stockQty,
          price: product.price,
          status: product.status,
        }
      : defaultForm
  );

  React.useEffect(() => {
    if (open) {
      setForm(
        product
          ? {
              name: product.name,
              sku: product.sku,
              category: product.category,
              subCategory: product.subCategory ?? "",
              brand: product.brand ?? "",
              unit: product.unit ?? "pcs",
              reorderLevel: product.reorderLevel ?? 0,
              description: product.description ?? "",
              hsnCode: product.hsnCode ?? "",
              notes: product.notes ?? "",
              stockQty: product.stockQty,
              price: product.price,
              status: product.status,
            }
          : defaultForm
      );
    }
  }, [open, product]);

  if (!open) return null;

  function handleChange<K extends keyof ProductFormData>(key: K, value: ProductFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(form);
  }

  const inputCls = "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground outline-none transition-colors focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30";
  const selectCls = "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-violet-500";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog panel */}
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold text-card-foreground">
            {product ? "Edit Product" : "Add New Product"}
          </h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="text"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="e.g. Wireless Headphones"
                className={inputCls}
              />
            </div>

            {/* SKU + Category */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  SKU <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={form.sku}
                  onChange={(e) => handleChange("sku", e.target.value)}
                  placeholder="e.g. ELC-001"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Category
                </label>
                <select
                  value={form.category}
                  onChange={(e) => handleChange("category", e.target.value)}
                  className={selectCls}
                >
                  {PRODUCT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sub Category + Brand */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Sub Category
                </label>
                <input
                  type="text"
                  value={form.subCategory ?? ""}
                  onChange={(e) => handleChange("subCategory", e.target.value)}
                  placeholder="e.g. Touch Panel"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Brand / Make
                </label>
                <input
                  type="text"
                  value={form.brand ?? ""}
                  onChange={(e) => handleChange("brand", e.target.value)}
                  placeholder="e.g. IOTIQ"
                  className={inputCls}
                />
              </div>
            </div>

            {/* Unit + Reorder Level */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Unit
                </label>
                <input
                  type="text"
                  value={form.unit ?? ""}
                  onChange={(e) => handleChange("unit", e.target.value)}
                  placeholder="pcs / mtrs / sets"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Reorder Level
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.reorderLevel ?? 0}
                  onChange={(e) => handleChange("reorderLevel", parseFloat(e.target.value) || 0)}
                  className={inputCls}
                />
              </div>
            </div>

            {/* Stock + Price */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Stock Qty
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.stockQty}
                  onChange={(e) => handleChange("stockQty", parseInt(e.target.value) || 0)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Price (INR)
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.price}
                  onChange={(e) => handleChange("price", parseFloat(e.target.value) || 0)}
                  className={inputCls}
                />
              </div>
            </div>

            {/* HSN + Description */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  HSN Code
                </label>
                <input
                  type="text"
                  value={form.hsnCode ?? ""}
                  onChange={(e) => handleChange("hsnCode", e.target.value)}
                  placeholder="e.g. 8536"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Description
                </label>
                <input
                  type="text"
                  value={form.description ?? ""}
                  onChange={(e) => handleChange("description", e.target.value)}
                  placeholder="Short product description"
                  className={inputCls}
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Notes
              </label>
              <input
                type="text"
                value={form.notes ?? ""}
                onChange={(e) => handleChange("notes", e.target.value)}
                placeholder="Optional notes"
                className={inputCls}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2 text-sm font-semibold text-white shadow-md transition-opacity hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {product ? "Save Changes" : "Add Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Delete Confirm Dialog
// ---------------------------------------------------------------------------

interface DeleteDialogProps {
  open: boolean;
  product: Product | null;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

function DeleteDialog({ open, product, onClose, onConfirm, isLoading }: DeleteDialogProps) {
  if (!open || !product) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
          <AlertTriangle className="h-5 w-5 text-red-500" />
        </div>
        <h3 className="mb-1 text-base font-semibold text-card-foreground">Delete Product?</h3>
        <p className="mb-6 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{product.name}</span> will be permanently
          removed from your inventory. This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-border py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white transition-opacity hover:bg-red-700 disabled:opacity-50"
          >
            {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Row Actions Dropdown
// ---------------------------------------------------------------------------

function RowActions({ product, onEdit, onDelete }: { product: Product; onEdit: (p: Product) => void; onDelete: (p: Product) => void }) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative flex justify-end">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-20 w-36 overflow-hidden rounded-xl border border-border bg-popover shadow-xl">
          <button
            onClick={() => { setOpen(false); onEdit(product); }}
            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-popover-foreground transition-colors hover:bg-accent"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
          <div className="mx-2 border-t border-border" />
          <button
            onClick={() => { setOpen(false); onDelete(product); }}
            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-red-500 transition-colors hover:bg-red-500/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

function StatCard({ label, value, valueClass = "text-foreground" }: { label: string; value: number | string; valueClass?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-5 py-4">
      <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${valueClass}`}>{value}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

const PAGE_SIZE = 8;

export default function InventoryPage() {
  const [filter, setFilter] = useState<ProductFilter>({
    search: "",
    category: "",
    status: "ALL",
    page: 1,
    pageSize: PAGE_SIZE,
  });

  const [addOpen, setAddOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);

  const { data, isLoading, isError } = useProducts(filter);
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct();

  const updateFilter = useCallback((partial: Partial<ProductFilter>) => {
    setFilter((prev) => ({ ...prev, ...partial, page: 1 }));
  }, []);

  function handleCreate(formData: ProductFormData) {
    createMutation.mutate(formData, { onSuccess: () => setAddOpen(false) });
  }

  function handleUpdate(formData: ProductFormData) {
    if (!editProduct) return;
    updateMutation.mutate({ id: editProduct.id, data: formData }, { onSuccess: () => setEditProduct(null) });
  }

  function handleDelete() {
    if (!deleteProduct) return;
    deleteMutation.mutate(deleteProduct.id, { onSuccess: () => setDeleteProduct(null) });
  }

  const lowStock = data?.data.filter((p) => p.status === ProductStatus.LOW_STOCK).length ?? 0;
  const outOfStock = data?.data.filter((p) => p.status === ProductStatus.OUT_OF_STOCK).length ?? 0;

  const AddButton = (
    <button
      onClick={() => setAddOpen(true)}
      className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-violet-700"
    >
      <Plus className="h-4 w-4" />
      Add Product
    </button>
  );

  return (
    <>
      <InventoryLayout addProductButton={AddButton}>
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Total Products" value={data?.total ?? "—"} />
          <StatCard label="Low Stock" value={lowStock} valueClass="text-amber-500" />
          <StatCard label="Out of Stock" value={outOfStock} valueClass="text-red-500" />
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name or SKU…"
              value={filter.search}
              onChange={(e) => updateFilter({ search: e.target.value })}
              className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-4 text-sm text-foreground placeholder-muted-foreground outline-none transition-colors focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30"
            />
          </div>

          {/* Category filter */}
          <select
            value={filter.category}
            onChange={(e) => updateFilter({ category: e.target.value })}
            className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-violet-500"
          >
            <option value="">All Categories</option>
            {PRODUCT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={filter.status}
            onChange={(e) => updateFilter({ status: e.target.value as ProductFilter["status"] })}
            className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-violet-500"
          >
            <option value="ALL">All Statuses</option>
            <option value={ProductStatus.IN_STOCK}>In Stock</option>
            <option value={ProductStatus.LOW_STOCK}>Low Stock</option>
            <option value={ProductStatus.OUT_OF_STOCK}>Out of Stock</option>
          </select>

          {/* Export */}
          <button
            onClick={() => data?.data && exportCSV(data.data)}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {["Product", "SKU", "Category", "Stock Qty", "Price", "Status", ""].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-violet-500" />
                    <p className="mt-3 text-sm text-muted-foreground">Loading products…</p>
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-sm text-red-500">
                    Failed to load products. Please try again.
                  </td>
                </tr>
              ) : data?.data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <Package className="mx-auto h-8 w-8 text-muted-foreground/30" />
                    <p className="mt-3 text-sm text-muted-foreground">No products found</p>
                  </td>
                </tr>
              ) : (
                data?.data.map((product, idx) => (
                  <tr
                    key={product.id}
                    className={`transition-colors hover:bg-muted/40 ${idx !== 0 ? "border-t border-border" : ""}`}
                  >
                    <td className="px-5 py-4 font-medium text-foreground">{product.name}</td>
                    <td className="px-5 py-4">
                      <code className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {product.sku}
                      </code>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">{product.category}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`tabular-nums font-semibold ${
                          product.stockQty === 0
                            ? "text-red-500"
                            : product.stockQty <= 10
                            ? "text-amber-500"
                            : "text-foreground"
                        }`}
                      >
                        {product.stockQty.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-5 py-4 tabular-nums text-muted-foreground">
                      {formatCurrency(product.price)}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={product.status} />
                    </td>
                    <td className="px-5 py-4">
                      <RowActions product={product} onEdit={setEditProduct} onDelete={setDeleteProduct} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-5 py-3.5">
              <p className="text-xs text-muted-foreground">
                Showing{" "}
                <span className="font-medium text-foreground">
                  {(data.page - 1) * data.pageSize + 1}–{Math.min(data.page * data.pageSize, data.total)}
                </span>{" "}
                of <span className="font-medium text-foreground">{data.total}</span> products
              </p>

              <div className="flex items-center gap-1">
                <button
                  disabled={filter.page === 1}
                  onClick={() => setFilter((prev) => ({ ...prev, page: prev.page - 1 }))}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {Array.from({ length: data.totalPages }, (_, i) => i + 1).map((pg) => (
                  <button
                    key={pg}
                    onClick={() => setFilter((prev) => ({ ...prev, page: pg }))}
                    className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-medium transition-colors ${
                      pg === filter.page
                        ? "bg-violet-600 text-white"
                        : "text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {pg}
                  </button>
                ))}

                <button
                  disabled={filter.page === data.totalPages}
                  onClick={() => setFilter((prev) => ({ ...prev, page: prev.page + 1 }))}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </InventoryLayout>

      {/* ── Portaled Dialogs (outside layout so they cover the full viewport) ── */}
      <ProductDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={handleCreate}
        isLoading={createMutation.isPending}
      />

      <ProductDialog
        open={!!editProduct}
        product={editProduct}
        onClose={() => setEditProduct(null)}
        onSave={handleUpdate}
        isLoading={updateMutation.isPending}
      />

      <DeleteDialog
        open={!!deleteProduct}
        product={deleteProduct}
        onClose={() => setDeleteProduct(null)}
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />
    </>
  );
}
