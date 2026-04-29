"use client";

import React, { useState, useCallback } from "react";
import {
  Search,
  Plus,
  Download,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Package,
  AlertTriangle,
  X,
  Tags,
  Layers3,
  Factory,
  ChartColumnIncreasing,
} from "lucide-react";
import {
  type Product,
  type ProductFilter,
  type ProductFormData,
  PRODUCT_CATEGORY_GROUPS,
  ProductStatus,
  PRODUCT_CATEGORIES,
  type InventoryConsumptionItem,
} from "./types";
import {
  useInventoryOverview,
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

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function toNumber(value: number | string | null | undefined) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function buildConsumptionMap(consumption: InventoryConsumptionItem[] | undefined) {
  return (consumption ?? []).reduce<Record<string, { consumed: number; transactions: number; lastTxnDate?: string | null }>>(
    (accumulator, item) => {
      const existing = accumulator[item.sku] ?? { consumed: 0, transactions: 0, lastTxnDate: null };
      existing.consumed += toNumber(item.quantity);
      existing.transactions += 1;
      existing.lastTxnDate = item.txnDate;
      accumulator[item.sku] = existing;
      return accumulator;
    },
    {}
  );
}

function exportCSV(
  products: Product[],
  consumptionMap: Record<string, { consumed: number; transactions: number; lastTxnDate?: string | null }>
) {
  const headers = [
    "Name",
    "SKU",
    "Category",
    "Sub Category",
    "Brand",
    "Unit",
    "Reorder Level",
    "Current Stock",
    "Received Stock",
    "Consumed Stock",
    "Unit Price",
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
    p.stockQty + (consumptionMap[p.sku]?.consumed ?? 0),
    consumptionMap[p.sku]?.consumed ?? 0,
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
  priceTier1: null,
  priceTier2: null,
  priceTier3: null,
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
          priceTier1: product.priceTier1 ?? null,
          priceTier2: product.priceTier2 ?? null,
          priceTier3: product.priceTier3 ?? null,
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
              priceTier1: product.priceTier1 ?? null,
              priceTier2: product.priceTier2 ?? null,
              priceTier3: product.priceTier3 ?? null,
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

  const subCategoryOptions = PRODUCT_CATEGORY_GROUPS[
    form.category as keyof typeof PRODUCT_CATEGORY_GROUPS
  ] ?? [];

  const inputCls = "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring/30";
  const selectCls = "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-ring";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog panel */}
      <div className="relative z-10 max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl">
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
                placeholder="e.g. 4 Module With Edge"
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
                  list="inventory-subcategory-options"
                  type="text"
                  value={form.subCategory ?? ""}
                  onChange={(e) => handleChange("subCategory", e.target.value)}
                  placeholder="e.g. Touch Panel"
                  className={inputCls}
                />
                <datalist id="inventory-subcategory-options">
                  {subCategoryOptions.map((subCategory) => (
                    <option key={subCategory} value={subCategory} />
                  ))}
                </datalist>
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
                  Unit Price (INR)
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
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-md transition-opacity hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
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
  return (
    <div className="flex items-center justify-end gap-2">
      <button
        onClick={() => onEdit(product)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
      >
        <Pencil className="h-3.5 w-3.5" />
        Edit
      </button>
      <button
        onClick={() => onDelete(product)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete
      </button>
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

type InventoryView = "items" | "categories" | "brands" | "usage";

function ModuleTabs({
  value,
  onChange,
}: {
  value: InventoryView;
  onChange: (value: InventoryView) => void;
}) {
  const tabs: Array<{ id: InventoryView; label: string; icon: typeof Package }> = [
    { id: "items", label: "Manage Items", icon: Package },
    { id: "categories", label: "Manage Categories", icon: Layers3 },
    { id: "brands", label: "By Brand", icon: Factory },
    { id: "usage", label: "Transactions", icon: ChartColumnIncreasing },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = value === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="border-b border-border px-5 py-4">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

const PAGE_SIZE = 8;

export default function InventoryPage() {
  const [view, setView] = useState<InventoryView>("items");
  const [filter, setFilter] = useState<ProductFilter>({
    search: "",
    category: "",
    brand: "",
    status: "ALL",
    page: 1,
    pageSize: PAGE_SIZE,
  });

  const [addOpen, setAddOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);

  const { data, isLoading, isError } = useProducts(filter);
  const overviewQuery = useInventoryOverview();
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
  const overview = overviewQuery.data;
  const consumptionMap = React.useMemo(
    () => buildConsumptionMap(overview?.recentConsumption),
    [overview?.recentConsumption]
  );
  const fallbackCategories = PRODUCT_CATEGORIES.map((category) => {
    const matchingProducts = data?.data.filter((product) => product.category === category) ?? [];
    const brandCount = new Set(
      matchingProducts
        .map((product) => product.brand?.trim())
        .filter((brand): brand is string => Boolean(brand))
    ).size;

    return {
      category,
      productCount: matchingProducts.length,
      brandCount,
      totalStockQty: matchingProducts.reduce((sum, product) => sum + toNumber(product.stockQty), 0),
      lowStockCount: matchingProducts.filter((product) => product.status === ProductStatus.LOW_STOCK).length,
      outOfStockCount: matchingProducts.filter((product) => product.status === ProductStatus.OUT_OF_STOCK).length,
    };
  });
  const categorySummaries = overview?.categories ?? fallbackCategories;
  const fallbackBrands = Array.from(
    new Map(
      (data?.data ?? [])
        .filter((product) => product.brand && product.brand.trim())
        .map((product) => [
          product.brand!.trim(),
          {
            brand: product.brand!.trim(),
            productCount: 0,
            categoryCount: 0,
            totalStockQty: 0,
          },
        ])
    ).values()
  ).map((brandSummary) => {
    const matchingProducts = (data?.data ?? []).filter((product) => product.brand?.trim() === brandSummary.brand);
    return {
      brand: brandSummary.brand,
      productCount: matchingProducts.length,
      categoryCount: new Set(matchingProducts.map((product) => product.category)).size,
      totalStockQty: matchingProducts.reduce((sum, product) => sum + toNumber(product.stockQty), 0),
    };
  });
  const brandSummaries = overview?.brands ?? fallbackBrands;
  const brandOptions = brandSummaries.map((brand) => brand.brand);

  const AddButton = (
    <button
      onClick={() => setAddOpen(true)}
      className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-md transition-colors hover:bg-primary/90"
    >
      <Plus className="h-4 w-4" />
      Add Product
    </button>
  );

  return (
    <>
      <InventoryLayout addProductButton={AddButton}>
        <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
          <div className="rounded-[28px] border border-border bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.16),_transparent_36%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700/80">
                  Stock Control
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                  One place for items, stock movement, and replenishment decisions.
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Keep the catalog clean with a single price, watch received versus consumed stock per item,
                  and review transactions without jumping between screens.
                </p>
              </div>
              <div className="grid min-w-[240px] gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Tracked Units</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{overview?.totalStockQty ?? "-"}</p>
                </div>
                <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Transactions</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">
                    {overview?.consumption.outwardTransactionCount ?? 0}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-2">
            <StatCard label="Total Products" value={overview?.totalProducts ?? data?.total ?? "-"} />
            <StatCard label="Categories" value={overview?.totalCategories ?? "-"} />
            <StatCard label="Low Stock" value={lowStock} valueClass="text-amber-500" />
            <StatCard label="Out of Stock" value={outOfStock} valueClass="text-red-500" />
          </div>
        </div>

        <ModuleTabs value={view} onChange={setView} />

        {view === "items" ? (
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name or SKU..."
              value={filter.search}
              onChange={(e) => updateFilter({ search: e.target.value })}
              className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-4 text-sm text-foreground placeholder-muted-foreground outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring/30"
            />
          </div>

          {/* Category filter */}
          <select
            value={filter.category}
            onChange={(e) => updateFilter({ category: e.target.value })}
            className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-ring"
          >
            <option value="">All Categories</option>
            {PRODUCT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select
            value={filter.brand}
            onChange={(e) => updateFilter({ brand: e.target.value })}
            className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-ring"
          >
            <option value="">All Brands</option>
            {brandOptions.map((brand) => (
              <option key={brand} value={brand}>{brand}</option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={filter.status}
            onChange={(e) => updateFilter({ status: e.target.value as ProductFilter["status"] })}
            className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-ring"
          >
            <option value="ALL">All Statuses</option>
            <option value={ProductStatus.IN_STOCK}>In Stock</option>
            <option value={ProductStatus.LOW_STOCK}>Low Stock</option>
            <option value={ProductStatus.OUT_OF_STOCK}>Out of Stock</option>
          </select>

          {/* Export */}
          <button
            onClick={() => data?.data && exportCSV(data.data, consumptionMap)}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
        </div>
        ) : (
        <div className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          {view === "categories" && "Manage categories from the live item catalog and stock positions."}
          {view === "brands" && "Review brand coverage across categories and current inventory depth."}
          {view === "usage" && "Review inventory movements and latest outward stock transactions."}
        </div>
        )}

        {view === "items" ? (
        <div className="space-y-4">
          <SectionCard
            title="Item Movement Snapshot"
            subtitle="Received stock is estimated from current stock plus recorded outward consumption in the latest transaction feed."
          >
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-border bg-background px-4 py-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Current Stock</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{overview?.totalStockQty ?? 0}</p>
              </div>
              <div className="rounded-2xl border border-border bg-background px-4 py-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Consumed Stock</p>
                <p className="mt-2 text-2xl font-semibold text-amber-600">
                  {overview?.consumption.consumedQuantity ?? 0}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-background px-4 py-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Received Stock</p>
                <p className="mt-2 text-2xl font-semibold text-emerald-600">
                  {(overview?.totalStockQty ?? 0) + (overview?.consumption.consumedQuantity ?? 0)}
                </p>
              </div>
            </div>
          </SectionCard>

        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1420px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {[
                  "Product",
                  "SKU",
                  "Category",
                  "Sub Category",
                  "Brand",
                  "Unit",
                  "Reorder Level",
                  "Received",
                  "Consumed",
                  "Current Stock",
                  "Price",
                  "Status",
                  "",
                ].map((h) => (
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
                  <td colSpan={12} className="py-16 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                    <p className="mt-3 text-sm text-muted-foreground">Loading products...</p>
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={12} className="py-16 text-center text-sm text-red-500">
                    Failed to load products. Please try again.
                  </td>
                </tr>
              ) : data?.data.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-16 text-center">
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
                    <td className="px-5 py-4">
                      <div className="font-medium text-foreground">{product.name}</div>
                      {product.description ? (
                        <div className="mt-1 max-w-[280px] truncate text-xs text-muted-foreground">
                          {product.description}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-5 py-4">
                      <code className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {product.sku}
                      </code>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">{product.category}</td>
                    <td className="px-5 py-4 text-muted-foreground">{product.subCategory ?? "-"}</td>
                    <td className="px-5 py-4 text-muted-foreground">{product.brand ?? "-"}</td>
                    <td className="px-5 py-4 text-muted-foreground">{product.unit ?? "-"}</td>
                    <td className="px-5 py-4 tabular-nums text-muted-foreground">
                      {product.reorderLevel?.toLocaleString("en-IN") ?? "-"}
                    </td>
                    <td className="px-5 py-4 tabular-nums text-emerald-700">
                      {(product.stockQty + (consumptionMap[product.sku]?.consumed ?? 0)).toLocaleString("en-IN")}
                    </td>
                    <td className="px-5 py-4 tabular-nums text-amber-600">
                      {(consumptionMap[product.sku]?.consumed ?? 0).toLocaleString("en-IN")}
                    </td>
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
          </div>

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-5 py-3.5">
              <p className="text-xs text-muted-foreground">
                Showing{" "}
                <span className="font-medium text-foreground">
                  {(data.page - 1) * data.pageSize + 1}-{Math.min(data.page * data.pageSize, data.total)}
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
                        ? "bg-primary text-primary-foreground"
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
        </div>
        ) : null}

        {view === "categories" ? (
          <SectionCard
            title="Category Management"
            subtitle="Track inventory by category, low stock exposure, and how many brands sit under each category."
          >
            {overviewQuery.isLoading ? (
              <div className="py-12 text-center">
                <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
              </div>
            ) : overviewQuery.isError ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Live category summaries could not be loaded from the overview API. Showing a fallback summary from the
                  currently loaded item list instead.
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {categorySummaries.map((category) => (
                    <div key={category.category} className="rounded-xl border border-border bg-background p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{category.category}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {category.productCount} items across {category.brandCount} brands
                          </p>
                        </div>
                        <Tags className="h-4 w-4 text-primary" />
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                        <div className="rounded-lg bg-muted/50 px-3 py-2">
                          <p className="text-xs text-muted-foreground">Stock</p>
                          <p className="mt-1 text-sm font-semibold text-foreground">{category.totalStockQty}</p>
                        </div>
                        <div className="rounded-lg bg-amber-500/10 px-3 py-2">
                          <p className="text-xs text-amber-700">Low</p>
                          <p className="mt-1 text-sm font-semibold text-amber-700">{category.lowStockCount}</p>
                        </div>
                        <div className="rounded-lg bg-red-500/10 px-3 py-2">
                          <p className="text-xs text-red-600">Out</p>
                          <p className="mt-1 text-sm font-semibold text-red-600">{category.outOfStockCount}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : overview?.categories.length ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {categorySummaries.map((category) => (
                  <div key={category.category} className="rounded-xl border border-border bg-background p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{category.category}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {category.productCount} items across {category.brandCount} brands
                        </p>
                      </div>
                      <Tags className="h-4 w-4 text-primary" />
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                      <div className="rounded-lg bg-muted/50 px-3 py-2">
                        <p className="text-xs text-muted-foreground">Stock</p>
                        <p className="mt-1 text-sm font-semibold text-foreground">{category.totalStockQty}</p>
                      </div>
                      <div className="rounded-lg bg-amber-500/10 px-3 py-2">
                        <p className="text-xs text-amber-700">Low</p>
                        <p className="mt-1 text-sm font-semibold text-amber-700">{category.lowStockCount}</p>
                      </div>
                      <div className="rounded-lg bg-red-500/10 px-3 py-2">
                        <p className="text-xs text-red-600">Out</p>
                        <p className="mt-1 text-sm font-semibold text-red-600">{category.outOfStockCount}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {categorySummaries.map((category) => (
                  <div key={category.category} className="rounded-xl border border-border bg-background p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{category.category}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {category.productCount} items across {category.brandCount} brands
                        </p>
                      </div>
                      <Tags className="h-4 w-4 text-primary" />
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                      <div className="rounded-lg bg-muted/50 px-3 py-2">
                        <p className="text-xs text-muted-foreground">Stock</p>
                        <p className="mt-1 text-sm font-semibold text-foreground">{category.totalStockQty}</p>
                      </div>
                      <div className="rounded-lg bg-amber-500/10 px-3 py-2">
                        <p className="text-xs text-amber-700">Low</p>
                        <p className="mt-1 text-sm font-semibold text-amber-700">{category.lowStockCount}</p>
                      </div>
                      <div className="rounded-lg bg-red-500/10 px-3 py-2">
                        <p className="text-xs text-red-600">Out</p>
                        <p className="mt-1 text-sm font-semibold text-red-600">{category.outOfStockCount}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        ) : null}

        {view === "brands" ? (
          <SectionCard
            title="Brand Inventory"
            subtitle="See which brands are active in inventory and how broadly they are spread across categories."
          >
            {overviewQuery.isLoading ? (
              <div className="py-12 text-center">
                <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
              </div>
            ) : overviewQuery.isError ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Live brand summaries could not be loaded from the overview API. Showing a fallback summary from the
                  currently loaded item list instead.
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        {["Brand", "Items", "Categories", "Total Stock Qty"].map((heading) => (
                          <th
                            key={heading}
                            className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                          >
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {brandSummaries.map((brand) => (
                        <tr key={brand.brand} className="border-t border-border">
                          <td className="px-4 py-3 font-medium text-foreground">{brand.brand}</td>
                          <td className="px-4 py-3 text-muted-foreground">{brand.productCount}</td>
                          <td className="px-4 py-3 text-muted-foreground">{brand.categoryCount}</td>
                          <td className="px-4 py-3 text-muted-foreground">{brand.totalStockQty}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : brandSummaries.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      {["Brand", "Items", "Categories", "Total Stock Qty"].map((heading) => (
                        <th
                          key={heading}
                          className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {brandSummaries.map((brand) => (
                      <tr key={brand.brand} className="border-t border-border">
                        <td className="px-4 py-3 font-medium text-foreground">{brand.brand}</td>
                        <td className="px-4 py-3 text-muted-foreground">{brand.productCount}</td>
                        <td className="px-4 py-3 text-muted-foreground">{brand.categoryCount}</td>
                        <td className="px-4 py-3 text-muted-foreground">{brand.totalStockQty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No branded items found yet.</p>
            )}
          </SectionCard>
        ) : null}

        {view === "usage" ? (
          <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
            <SectionCard
            title="Consumption Summary"
            subtitle="Transactions are calculated from outward stock movements recorded in the inventory service."
            >
              {overviewQuery.isLoading ? (
                <div className="py-12 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-xl bg-muted/50 px-4 py-3">
                    <p className="text-xs text-muted-foreground">Outward Transactions</p>
                    <p className="mt-1 text-2xl font-bold text-foreground">
                      {overview?.consumption.outwardTransactionCount ?? 0}
                    </p>
                  </div>
                  <div className="rounded-xl bg-muted/50 px-4 py-3">
                    <p className="text-xs text-muted-foreground">Consumed Quantity</p>
                    <p className="mt-1 text-2xl font-bold text-foreground">
                      {overview?.consumption.consumedQuantity ?? 0}
                    </p>
                  </div>
                  <div className="rounded-xl bg-muted/50 px-4 py-3">
                    <p className="text-xs text-muted-foreground">Last Consumption</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {formatDate(overview?.consumption.lastConsumedOn)}
                    </p>
                  </div>
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Recent Transactions"
              subtitle="Latest outward stock issues by item, category, and issuing context."
            >
              {overviewQuery.isLoading ? (
                <div className="py-12 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                </div>
              ) : overview?.recentConsumption.length ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    {Object.entries(consumptionMap).slice(0, 6).map(([sku, movement]) => {
                      const product = data?.data.find((item) => item.sku === sku);
                      if (!product) return null;
                      return (
                        <div key={sku} className="rounded-2xl border border-border bg-background px-4 py-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-foreground">{product.name}</p>
                              <p className="mt-1 text-xs text-muted-foreground">{sku}</p>
                            </div>
                            <StatusBadge status={product.status} />
                          </div>
                          <div className="mt-4 grid grid-cols-3 gap-3">
                            <div className="rounded-xl bg-muted/50 px-3 py-2">
                              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Received</p>
                              <p className="mt-1 text-base font-semibold text-emerald-700">
                                {(product.stockQty + movement.consumed).toLocaleString("en-IN")}
                              </p>
                            </div>
                            <div className="rounded-xl bg-muted/50 px-3 py-2">
                              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Consumed</p>
                              <p className="mt-1 text-base font-semibold text-amber-600">
                                {movement.consumed.toLocaleString("en-IN")}
                              </p>
                            </div>
                            <div className="rounded-xl bg-muted/50 px-3 py-2">
                              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Current</p>
                              <p className="mt-1 text-base font-semibold text-foreground">
                                {product.stockQty.toLocaleString("en-IN")}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="overflow-x-auto">
                  <table className="w-full min-w-[920px] text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        {["Date", "Item", "Category", "Brand", "Qty", "Issued By", "Project"].map((heading) => (
                          <th
                            key={heading}
                            className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                          >
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {overview.recentConsumption.map((item) => (
                        <tr key={item.id} className="border-t border-border">
                          <td className="px-4 py-3 text-muted-foreground">{formatDate(item.txnDate)}</td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-foreground">{item.productName}</div>
                            <div className="mt-1 text-xs text-muted-foreground">{item.sku}</div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{item.category}</td>
                          <td className="px-4 py-3 text-muted-foreground">{item.brand ?? "-"}</td>
                          <td className="px-4 py-3 font-semibold text-foreground">{item.quantity}</td>
                          <td className="px-4 py-3 text-muted-foreground">{item.issuedBy ?? "-"}</td>
                          <td className="px-4 py-3 text-muted-foreground">{item.projectRef ?? "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No outward usage transactions recorded yet.</p>
              )}
            </SectionCard>
          </div>
        ) : null}
      </InventoryLayout>

      {/* Portaled dialogs stay outside the layout so they cover the full viewport. */}
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
