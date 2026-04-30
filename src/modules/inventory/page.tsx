"use client";

import React, { useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  AlertTriangle,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/services/api-client";
import {
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_GROUPS,
  ProductStatus,
  type Product,
  type ProductCategory,
  type ProductFilter,
  type ProductFormData,
} from "./types";
import {
  useConsumeStock,
  useCreateProduct,
  useInventoryOverview,
  useProducts,
  useReceiveStock,
  useUpdateProduct,
  useDeleteProduct,
} from "./hooks";
import { InventoryLayout } from "./layout";

type StockView = "items" | "categories";
type StockActionMode = "consume" | "receive";

type ExpandedActionState = {
  productId: string;
  mode: StockActionMode;
};

type AdjustmentFormState = {
  quantity: string;
  txnDate: string;
  notes: string;
};

const defaultFilter: ProductFilter = {
  search: "",
  category: "",
  brand: "",
  status: "ALL",
  page: 1,
  pageSize: 8,
};

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
  priceTier1: null,
  priceTier2: null,
  priceTier3: null,
  status: ProductStatus.IN_STOCK,
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value);
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function toNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function getTodayDateValue() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const localDate = new Date(now.getTime() - offset * 60_000);
  return localDate.toISOString().slice(0, 10);
}

function StatusBadge({ status }: { status: ProductStatus }) {
  const config: Record<ProductStatus, { label: string; cls: string }> = {
    [ProductStatus.IN_STOCK]: {
      label: "In Stock",
      cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    [ProductStatus.LOW_STOCK]: {
      label: "Low Stock",
      cls: "bg-amber-50 text-amber-700 border-amber-200",
    },
    [ProductStatus.OUT_OF_STOCK]: {
      label: "Out of Stock",
      cls: "bg-rose-50 text-rose-700 border-rose-200",
    },
  };

  const item = config[status];
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${item.cls}`}>
      {item.label}
    </span>
  );
}

function UnderlineTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border-b-2 px-1 pb-2 text-sm font-semibold transition-colors ${
        active
          ? "border-brand-600 text-brand-700"
          : "border-transparent text-slate-500 hover:text-slate-900"
      }`}
    >
      {children}
    </button>
  );
}

function ActionButton({
  children,
  tone = "default",
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  tone?: "default" | "brand" | "danger";
  onClick?: () => void;
  disabled?: boolean;
}) {
  const toneClass =
    tone === "brand"
      ? "border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100"
      : tone === "danger"
      ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${toneClass}`}
    >
      {children}
    </button>
  );
}

function ProductDialog({
  open,
  onClose,
  product,
  onSave,
  isLoading,
}: {
  open: boolean;
  onClose: () => void;
  product?: Product | null;
  onSave: (data: ProductFormData) => void;
  isLoading?: boolean;
}) {
  const [form, setForm] = useState<ProductFormData>(defaultForm);

  React.useEffect(() => {
    if (!open) return;
    setForm(
      product
        ? {
            name: product.name,
            sku: product.sku,
            category: product.category,
            subCategory: product.subCategory ?? "",
            brand: product.brand ?? "",
            unit: product.unit ?? "pcs",
            reorderLevel: toNumber(product.reorderLevel),
            description: product.description ?? "",
            hsnCode: product.hsnCode ?? "",
            notes: product.notes ?? "",
            stockQty: toNumber(product.stockQty),
            price: toNumber(product.price),
            priceTier1: product.priceTier1 ?? null,
            priceTier2: product.priceTier2 ?? null,
            priceTier3: product.priceTier3 ?? null,
            status: product.status,
          }
        : defaultForm
    );
  }, [open, product]);

  if (!open) return null;

  const subCategoryOptions =
    PRODUCT_CATEGORY_GROUPS[(form.category as ProductCategory) ?? "Smart Switches"] ?? [];

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100";

  function updateField<K extends keyof ProductFormData>(key: K, value: ProductFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    onSave(form);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{product ? "Edit Item" : "Add Item"}</h2>
            <p className="mt-1 text-sm text-slate-500">Keep pricing simple with one unit price and clean stock details.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Item Name
              </label>
              <input required value={form.name} onChange={(e) => updateField("name", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">SKU</label>
              <input required value={form.sku} onChange={(e) => updateField("sku", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Category</label>
              <select
                value={form.category}
                onChange={(e) => updateField("category", e.target.value)}
                className={inputClass}
              >
                {PRODUCT_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Sub Category</label>
              <input
                list="inventory-subcategory-options"
                value={form.subCategory ?? ""}
                onChange={(e) => updateField("subCategory", e.target.value)}
                className={inputClass}
              />
              <datalist id="inventory-subcategory-options">
                {subCategoryOptions.map((subCategory) => (
                  <option key={subCategory} value={subCategory} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Brand</label>
              <input value={form.brand ?? ""} onChange={(e) => updateField("brand", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Unit</label>
              <input value={form.unit ?? ""} onChange={(e) => updateField("unit", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Reorder Level</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.reorderLevel ?? 0}
                onChange={(e) => updateField("reorderLevel", Number(e.target.value) || 0)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Current Stock</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.stockQty}
                onChange={(e) => updateField("stockQty", Number(e.target.value) || 0)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Unit Price</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.price}
                onChange={(e) => updateField("price", Number(e.target.value) || 0)}
                className={inputClass}
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Description</label>
              <input value={form.description ?? ""} onChange={(e) => updateField("description", e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {product ? "Save Changes" : "Add Item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteDialog({
  open,
  product,
  onClose,
  onConfirm,
  isLoading,
}: {
  open: boolean;
  product: Product | null;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}) {
  if (!open || !product) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900">Delete item?</h3>
        <p className="mt-2 text-sm text-slate-500">
          <span className="font-semibold text-slate-900">{product.name}</span> will be removed from stock control.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function buildCategorySummary(products: Product[]) {
  const grouped = new Map<string, { itemCount: number; totalStock: number; low: number; out: number }>();

  for (const product of products) {
    const entry = grouped.get(product.category) ?? { itemCount: 0, totalStock: 0, low: 0, out: 0 };
    entry.itemCount += 1;
    entry.totalStock += toNumber(product.stockQty);
    if (product.status === ProductStatus.LOW_STOCK) entry.low += 1;
    if (product.status === ProductStatus.OUT_OF_STOCK) entry.out += 1;
    grouped.set(product.category, entry);
  }

  return Array.from(grouped.entries())
    .map(([category, stats]) => ({ category, ...stats }))
    .sort((a, b) => a.category.localeCompare(b.category));
}

export default function InventoryPage() {
  const [view, setView] = useState<StockView>("items");
  const [filter, setFilter] = useState<ProductFilter>(defaultFilter);
  const [addOpen, setAddOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
  const [expandedAction, setExpandedAction] = useState<ExpandedActionState | null>(null);
  const [adjustmentForm, setAdjustmentForm] = useState<AdjustmentFormState>({
    quantity: "",
    txnDate: getTodayDateValue(),
    notes: "",
  });

  const productsQuery = useProducts(filter);
  const overviewQuery = useInventoryOverview();
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct();
  const consumeMutation = useConsumeStock();
  const receiveMutation = useReceiveStock();

  const products = productsQuery.data?.data ?? [];
  const pageData = productsQuery.data;
  const categories = overviewQuery.data?.categories ?? buildCategorySummary(products).map((item) => ({
    category: item.category,
    productCount: item.itemCount,
    brandCount: 0,
    totalStockQty: item.totalStock,
    lowStockCount: item.low,
    outOfStockCount: item.out,
  }));

  const selectedCategory = filter.category;
  const activeAdjustmentMutation = expandedAction?.mode === "consume" ? consumeMutation : receiveMutation;

  const tableSummary = useMemo(() => {
    return {
      totalItems: pageData?.total ?? products.length,
      lowStock: products.filter((product) => product.status === ProductStatus.LOW_STOCK).length,
      outOfStock: products.filter((product) => product.status === ProductStatus.OUT_OF_STOCK).length,
    };
  }, [pageData?.total, products]);

  function resetAdjustmentForm() {
    setAdjustmentForm({ quantity: "", txnDate: getTodayDateValue(), notes: "" });
  }

  function openAction(productId: string, mode: StockActionMode) {
    setExpandedAction((current) =>
      current?.productId === productId && current.mode === mode ? null : { productId, mode }
    );
    resetAdjustmentForm();
  }

  function handleCreate(data: ProductFormData) {
    createMutation.mutate(data, {
      onSuccess: () => {
        toast.success("Inventory item created.");
        setAddOpen(false);
      },
      onError: (error) => {
        toast.error(getApiErrorMessage(error, "Failed to create inventory item."));
      },
    });
  }

  function handleUpdate(data: ProductFormData) {
    if (!editProduct) return;
    updateMutation.mutate(
      { id: editProduct.id, data },
      {
        onSuccess: () => {
          toast.success("Inventory item updated.");
          setEditProduct(null);
        },
        onError: (error) => {
          toast.error(getApiErrorMessage(error, "Failed to update inventory item."));
        },
      }
    );
  }

  function handleDelete() {
    if (!deleteProduct) return;
    deleteMutation.mutate(deleteProduct.id, {
      onSuccess: () => {
        toast.success("Inventory item deleted.");
        setDeleteProduct(null);
      },
      onError: (error) => {
        toast.error(getApiErrorMessage(error, "Failed to delete inventory item."));
      },
    });
  }

  function submitAdjustment(product: Product) {
    const quantity = Number(adjustmentForm.quantity);
    const txnDate = adjustmentForm.txnDate.trim();
    if (!expandedAction) return;
    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error("Enter a valid quantity greater than zero.");
      return;
    }
    if (!txnDate) {
      toast.error("Select a transaction date.");
      return;
    }
    if (expandedAction.mode === "consume" && quantity > toNumber(product.stockQty)) {
      toast.error("Consumed quantity cannot exceed available stock.");
      return;
    }

    const payload = {
      quantity,
      txnDate,
      notes: adjustmentForm.notes.trim() || undefined,
    };

    const mutation = expandedAction.mode === "consume" ? consumeMutation : receiveMutation;
    mutation.mutate(
      { productId: product.id, data: payload },
      {
        onSuccess: () => {
          toast.success(
            expandedAction.mode === "consume"
              ? "Consumption recorded successfully."
              : "Received stock recorded successfully."
          );
          setExpandedAction(null);
          resetAdjustmentForm();
        },
        onError: (error) => {
          toast.error(
            getApiErrorMessage(
              error,
              expandedAction.mode === "consume"
                ? "Failed to consume stock."
                : "Failed to receive stock."
            )
          );
        },
      }
    );
  }

  return (
    <>
      <InventoryLayout
        addProductButton={
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" />
            Add Item
          </button>
        }
      >
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-5 border-b border-slate-200">
                  <UnderlineTab active={view === "items"} onClick={() => setView("items")}>
                    Items
                  </UnderlineTab>
                  <UnderlineTab active={view === "categories"} onClick={() => setView("categories")}>
                    Category
                  </UnderlineTab>
                </div>
                <p className="text-sm text-slate-500">
                  Manage live stock with inline receive and consumption updates, without extra cards or modal flows.
                </p>
              </div>

              {view === "items" ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Items</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{tableSummary.totalItems}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Low Stock</p>
                    <p className="mt-1 text-2xl font-bold text-amber-700">{tableSummary.lowStock}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Out of Stock</p>
                    <p className="mt-1 text-2xl font-bold text-rose-700">{tableSummary.outOfStock}</p>
                  </div>
                  <NavLink
                    to="/inventory/transactions"
                    className="inline-flex items-center justify-center rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-100"
                  >
                    View Transactions
                  </NavLink>
                </div>
              ) : null}
            </div>
          </div>

          {view === "items" ? (
            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative w-full max-w-xl">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={filter.search}
                    onChange={(e) => setFilter((prev) => ({ ...prev, search: e.target.value, page: 1 }))}
                    placeholder="Search by item name or SKU"
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                  />
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <select
                    value={filter.category}
                    onChange={(e) => setFilter((prev) => ({ ...prev, category: e.target.value, page: 1 }))}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                  >
                    <option value="">All Categories</option>
                    {PRODUCT_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                  <select
                    value={filter.status}
                    onChange={(e) =>
                      setFilter((prev) => ({ ...prev, status: e.target.value as ProductFilter["status"], page: 1 }))
                    }
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                  >
                    <option value="ALL">All Status</option>
                    <option value={ProductStatus.IN_STOCK}>In Stock</option>
                    <option value={ProductStatus.LOW_STOCK}>Low Stock</option>
                    <option value={ProductStatus.OUT_OF_STOCK}>Out of Stock</option>
                  </select>
                </div>
              </div>

              {productsQuery.isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
                </div>
              ) : productsQuery.isError ? (
                <div className="p-6 text-sm text-rose-600">
                  {getApiErrorMessage(productsQuery.error, "Failed to load inventory items.")}
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[980px] text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/80">
                          {["Item", "Category", "Stock", "Unit Price", "Status", "Actions"].map((heading) => (
                            <th
                              key={heading}
                              className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                            >
                              {heading}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {products.length ? (
                          products.map((product) => {
                            const isExpanded = expandedAction?.productId === product.id;
                            const isConsuming = expandedAction?.mode === "consume";
                            const currentStock = toNumber(product.stockQty);
                            const inlineTitle = isConsuming ? "Consumption" : "Received Stock";

                            return (
                              <React.Fragment key={product.id}>
                                <tr className="border-b border-slate-100 align-top">
                                  <td className="px-5 py-4">
                                    <div className="flex items-start gap-3">
                                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                                        <Package className="h-5 w-5" />
                                      </div>
                                      <div>
                                        <p className="font-semibold text-slate-900">{product.name}</p>
                                        <p className="mt-1 text-xs text-slate-500">{product.sku}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-5 py-4 text-slate-600">
                                    <p>{product.category}</p>
                                    <p className="mt-1 text-xs text-slate-400">{product.subCategory ?? product.brand ?? "-"}</p>
                                  </td>
                                  <td className="px-5 py-4 font-semibold text-slate-900">{currentStock.toLocaleString("en-IN")}</td>
                                  <td className="px-5 py-4 font-semibold text-slate-900">{formatCurrency(toNumber(product.price))}</td>
                                  <td className="px-5 py-4">
                                    <StatusBadge status={product.status} />
                                  </td>
                                  <td className="px-5 py-4">
                                    <div className="flex items-center justify-end gap-2">
                                      <ActionButton onClick={() => setEditProduct(product)}>Edit</ActionButton>
                                      <ActionButton
                                        tone="brand"
                                        onClick={() => openAction(product.id, "consume")}
                                      >
                                        C
                                      </ActionButton>
                                      <ActionButton
                                        tone="brand"
                                        onClick={() => openAction(product.id, "receive")}
                                      >
                                        R
                                      </ActionButton>
                                      <ActionButton tone="danger" onClick={() => setDeleteProduct(product)}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </ActionButton>
                                    </div>
                                  </td>
                                </tr>
                                <tr className={isExpanded ? "border-b border-slate-100" : "hidden"}>
                                  <td colSpan={6} className="px-5 pb-4 pt-0">
                                    <div
                                      className={`overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 transition-all duration-300 ${
                                        isExpanded ? "max-h-[420px] opacity-100" : "max-h-0 opacity-0"
                                      }`}
                                    >
                                      <div className="grid gap-4 p-4 lg:grid-cols-[1.2fr,0.8fr]">
                                        <div>
                                          <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div>
                                              <h4 className="text-sm font-semibold text-slate-900">{inlineTitle}</h4>
                                              <p className="mt-1 text-sm text-slate-500">
                                                {isConsuming
                                                  ? "Record consumed quantity and reduce current stock immediately."
                                                  : "Record received quantity and add it to current stock immediately."}
                                              </p>
                                            </div>
                                            <button
                                              type="button"
                                              onClick={() => submitAdjustment(product)}
                                              disabled={activeAdjustmentMutation.isPending}
                                              aria-label={isConsuming ? "Save consumption" : "Save received stock"}
                                              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-200 bg-brand-50 text-brand-700 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-brand-100 hover:text-brand-800 active:translate-y-0 active:bg-brand-200 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                              {activeAdjustmentMutation.isPending ? (
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                              ) : (
                                                <Bookmark className="h-5 w-5" />
                                              )}
                                            </button>
                                          </div>
                                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                            <div>
                                              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                Quantity
                                              </label>
                                              <input
                                                type="number"
                                                min={0.01}
                                                step={0.01}
                                                value={adjustmentForm.quantity}
                                                onChange={(e) =>
                                                  setAdjustmentForm((prev) => ({ ...prev, quantity: e.target.value }))
                                                }
                                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                                                placeholder={isConsuming ? "Consumed quantity" : "Received quantity"}
                                              />
                                            </div>
                                            <div>
                                              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                Date
                                              </label>
                                              <input
                                                type="date"
                                                required
                                                value={adjustmentForm.txnDate}
                                                onChange={(e) =>
                                                  setAdjustmentForm((prev) => ({ ...prev, txnDate: e.target.value }))
                                                }
                                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                                              />
                                            </div>
                                            <div>
                                              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                Current Stock
                                              </label>
                                              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900">
                                                {currentStock.toLocaleString("en-IN")}
                                              </div>
                                            </div>
                                          </div>
                                          <div className="mt-3">
                                            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                              Notes
                                            </label>
                                            <textarea
                                              rows={3}
                                              value={adjustmentForm.notes}
                                              onChange={(e) =>
                                                setAdjustmentForm((prev) => ({ ...prev, notes: e.target.value }))
                                              }
                                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                                              placeholder="Optional transaction note"
                                            />
                                          </div>
                                        </div>
                                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Stock Preview</p>
                                          <p className="mt-2 text-sm text-slate-500">
                                            {isConsuming
                                              ? "Submitting this form reduces available stock."
                                              : "Submitting this form increases available stock."}
                                          </p>
                                          <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                                            <p className="text-xs uppercase tracking-wide text-slate-500">Projected Stock</p>
                                            <p className="mt-2 text-3xl font-bold text-slate-900">
                                              {(
                                                currentStock +
                                                (Number(adjustmentForm.quantity || 0) * (isConsuming ? -1 : 1))
                                              ).toLocaleString("en-IN")}
                                            </p>
                                          </div>
                                          <div className="mt-4 flex justify-end gap-3">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setExpandedAction(null);
                                                resetAdjustmentForm();
                                              }}
                                              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                                            >
                                              Cancel
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              </React.Fragment>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={6} className="px-5 py-16 text-center text-sm text-slate-500">
                              No inventory items matched your filters.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {pageData ? (
                    <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-slate-500">
                        Showing{" "}
                        <span className="font-semibold text-slate-900">
                          {(pageData.page - 1) * pageData.pageSize + 1}-
                          {Math.min(pageData.page * pageData.pageSize, pageData.total)}
                        </span>{" "}
                        of <span className="font-semibold text-slate-900">{pageData.total}</span> items
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={filter.page === 1}
                          onClick={() => setFilter((prev) => ({ ...prev, page: prev.page - 1 }))}
                          className="rounded-xl border border-slate-200 p-2 text-slate-500 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="text-sm font-semibold text-slate-700">
                          Page {pageData.page} of {Math.max(pageData.totalPages, 1)}
                        </span>
                        <button
                          type="button"
                          disabled={filter.page >= pageData.totalPages}
                          onClick={() => setFilter((prev) => ({ ...prev, page: prev.page + 1 }))}
                          className="rounded-xl border border-slate-200 p-2 text-slate-500 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 p-5">
                <h2 className="text-lg font-semibold text-slate-900">Category Summary</h2>
                <p className="mt-1 text-sm text-slate-500">A clean category view without brand filters or stock-control cards.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80">
                      {["Category", "Items", "Total Stock", "Low Stock", "Out of Stock"].map((heading) => (
                        <th
                          key={heading}
                          className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {categories.length ? (
                      categories.map((category) => (
                        <tr
                          key={category.category}
                          className={`border-b border-slate-100 ${selectedCategory === category.category ? "bg-brand-50/60" : ""}`}
                        >
                          <td className="px-5 py-4">
                            <button
                              type="button"
                              onClick={() => {
                                setView("items");
                                setFilter((prev) => ({ ...prev, category: category.category, page: 1 }));
                              }}
                              className="font-semibold text-brand-700 transition-colors hover:text-brand-800"
                            >
                              {category.category}
                            </button>
                          </td>
                          <td className="px-5 py-4 text-slate-600">{toNumber(category.productCount)}</td>
                          <td className="px-5 py-4 font-semibold text-slate-900">
                            {toNumber(category.totalStockQty).toLocaleString("en-IN")}
                          </td>
                          <td className="px-5 py-4 text-amber-700">{toNumber(category.lowStockCount)}</td>
                          <td className="px-5 py-4 text-rose-700">{toNumber(category.outOfStockCount)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-5 py-16 text-center text-sm text-slate-500">
                          No categories available yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </InventoryLayout>

      <ProductDialog open={addOpen} onClose={() => setAddOpen(false)} onSave={handleCreate} isLoading={createMutation.isPending} />
      <ProductDialog open={!!editProduct} onClose={() => setEditProduct(null)} product={editProduct} onSave={handleUpdate} isLoading={updateMutation.isPending} />
      <DeleteDialog open={!!deleteProduct} product={deleteProduct} onClose={() => setDeleteProduct(null)} onConfirm={handleDelete} isLoading={deleteMutation.isPending} />
    </>
  );
}
