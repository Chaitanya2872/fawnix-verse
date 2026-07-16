"use client";

import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Bookmark,
  Boxes,
  Building2,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  IndianRupee,
  Loader2,
  Package,
  Pencil,
  Plus,
  Search,
  Tags,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/services/api-client";
import {
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_GROUPS,
  ProductStatus,
  type InventoryCategorySummary,
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
  useWarehouses,
} from "./hooks";
import { InventoryLayout } from "./layout";
import { exportProductsCsv } from "./export";

type StockView = "items" | "categories";
type StockActionMode = "consume" | "receive";
type CategoryMetric = "units" | "value";

type StockActionDialogState = {
  product: Product;
  mode: StockActionMode;
};

type InventoryAnalyticsSummary = {
  totalItems: number;
  totalCategories: number;
  totalStock: number;
  lowStock: number;
  outOfStock: number;
  visibleStockValue: number;
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

function formatCompactCurrency(value: number) {
  if (value >= 10_000_000) {
    return `${new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(value / 10_000_000)} Cr`;
  }

  if (value >= 100_000) {
    return `${new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(value / 100_000)} L`;
  }

  return formatCurrency(value);
}

function toNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function getStockHealthPercent(totalItems: number, lowStock: number, outOfStock: number) {
  if (!totalItems) return 0;
  return Math.max(0, Math.round(((totalItems - lowStock - outOfStock) / totalItems) * 100));
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
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${item.cls}`}>
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
      className={`inline-flex items-center justify-center rounded-md border px-2 py-1 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${toneClass}`}
    >
      {children}
    </button>
  );
}

function InventoryAnalyticsDialog({
  open,
  onClose,
  summary,
  categories,
  isLoading,
}: {
  open: boolean;
  onClose: () => void;
  summary: InventoryAnalyticsSummary;
  categories: InventoryCategorySummary[];
  isLoading?: boolean;
}) {
  if (!open) return null;

  const maxStock = Math.max(...categories.map((category) => toNumber(category.totalStockQty)), 1);
  const stockHealth = summary.totalItems
    ? Math.max(0, Math.round(((summary.totalItems - summary.lowStock - summary.outOfStock) / summary.totalItems) * 100))
    : 0;
  const topCategories = categories
    .slice()
    .sort((left, right) => toNumber(right.totalStockQty) - toNumber(left.totalStockQty))
    .slice(0, 6);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
              <BarChart3 className="h-4 w-4" />
              Inventory Analytics
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Stock performance overview</h2>
            <p className="mt-1 text-sm text-slate-500">Track inventory health, stock risk, and category distribution.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          {isLoading ? (
            <div className="flex min-h-[240px] items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading inventory analytics...
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <AnalyticsMetric label="Items" value={summary.totalItems.toString()} hint="Total products" />
                <AnalyticsMetric label="Stock Health" value={`${stockHealth}%`} hint="Healthy inventory ratio" />
                <AnalyticsMetric label="Total Stock" value={summary.totalStock.toString()} hint="Units across categories" />
                <AnalyticsMetric label="Visible Value" value={formatCurrency(summary.visibleStockValue)} hint="Current table items" />
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">Category stock</h3>
                      <p className="mt-1 text-xs text-slate-500">{summary.totalCategories} active categories</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
                      Top {topCategories.length}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {topCategories.length ? (
                      topCategories.map((category) => {
                        const stock = toNumber(category.totalStockQty);
                        const width = `${Math.max(6, Math.round((stock / maxStock) * 100))}%`;
                        return (
                          <div key={category.category}>
                            <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                              <span className="font-semibold text-slate-700">{category.category}</span>
                              <span className="text-slate-500">{stock} units</span>
                            </div>
                            <div className="h-2 rounded-full bg-white">
                              <div className="h-2 rounded-full bg-brand-600" style={{ width }} />
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                        No category analytics available yet.
                      </p>
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-5">
                  <h3 className="text-sm font-semibold text-slate-900">Stock risk</h3>
                  <p className="mt-1 text-xs text-slate-500">Items needing attention across inventory.</p>
                  <div className="mt-4 space-y-3">
                    <RiskRow label="Low stock" value={summary.lowStock} className="bg-amber-50 text-amber-700" />
                    <RiskRow label="Out of stock" value={summary.outOfStock} className="bg-rose-50 text-rose-700" />
                    <RiskRow label="Healthy stock" value={Math.max(0, summary.totalItems - summary.lowStock - summary.outOfStock)} className="bg-emerald-50 text-emerald-700" />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function AnalyticsMetric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

function RiskRow({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <div className={`flex items-center justify-between rounded-2xl px-4 py-3 ${className}`}>
      <span className="text-sm font-semibold">{label}</span>
      <span className="text-xl font-bold">{value}</span>
    </div>
  );
}

function DashboardMetricCard({
  label,
  value,
  helper,
  icon,
  tone,
}: {
  label: string;
  value: string | number;
  helper: string;
  icon: React.ReactNode;
  tone: "blue" | "emerald" | "violet" | "amber";
}) {
  const toneClass = {
    blue: "bg-blue-50 text-blue-700",
    emerald: "bg-emerald-50 text-emerald-700",
    violet: "bg-violet-50 text-violet-700",
    amber: "bg-amber-50 text-amber-700",
  }[tone];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-center gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${toneClass}`}>
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-500">{label}</p>
          <p className="mt-1 truncate text-2xl font-bold text-slate-950">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{helper}</p>
        </div>
      </div>
    </div>
  );
}

function StockByCategoryPanel({
  categories,
  products,
  metric,
  onMetricChange,
}: {
  categories: InventoryCategorySummary[];
  products: Product[];
  metric: CategoryMetric;
  onMetricChange: (metric: CategoryMetric) => void;
}) {
  const categoryValueMap = products.reduce<Record<string, number>>((acc, product) => {
    acc[product.category] = (acc[product.category] || 0) + toNumber(product.stockQty) * toNumber(product.price);
    return acc;
  }, {});

  const rows = categories
    .slice()
    .sort((left, right) => toNumber(right.totalStockQty) - toNumber(left.totalStockQty))
    .slice(0, 5)
    .map((category) => ({
      category: category.category,
      value: metric === "units" ? toNumber(category.totalStockQty) : categoryValueMap[category.category] || 0,
    }));
  const maxValue = Math.max(...rows.map((row) => row.value), 1);
  const tones = [
    { icon: "bg-blue-50 text-blue-700", bar: "bg-blue-600" },
    { icon: "bg-emerald-50 text-emerald-700", bar: "bg-emerald-500" },
    { icon: "bg-violet-50 text-violet-700", bar: "bg-violet-500" },
    { icon: "bg-amber-50 text-amber-700", bar: "bg-amber-500" },
    { icon: "bg-rose-50 text-rose-700", bar: "bg-rose-500" },
  ];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-950">Stock by Category</h2>
          <p className="mt-1 text-xs text-slate-500">Units on hand across product categories</p>
        </div>
        <div className="inline-flex w-max rounded-md border border-slate-200 bg-slate-50 p-0.5">
          {(["units", "value"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onMetricChange(option)}
              className={`rounded px-2.5 py-1 text-xs font-semibold capitalize transition-colors ${
                metric === option ? "bg-brand-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 space-y-3">
        {rows.length ? (
          rows.map((row, index) => {
            const tone = tones[index % tones.length];
            const width = `${Math.max(5, Math.round((row.value / maxValue) * 100))}%`;
            const displayValue = metric === "units" ? row.value.toLocaleString("en-IN") : formatCompactCurrency(row.value);

            return (
              <div key={row.category} className="grid gap-2 sm:grid-cols-[150px_minmax(0,1fr)_86px] sm:items-center">
                <div className="flex min-w-0 items-center gap-2">
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${tone.icon}`}>
                    <Package className="h-3.5 w-3.5" />
                  </span>
                  <span className="truncate text-xs font-semibold text-slate-700">{row.category}</span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-100">
                  <div className={`h-2.5 rounded-full ${tone.bar}`} style={{ width }} />
                </div>
                <span className="text-right text-xs font-bold text-slate-700">{displayValue}</span>
              </div>
            );
          })
        ) : (
          <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-5 text-center text-sm text-slate-500">
            Category stock appears here once items are available.
          </div>
        )}
      </div>
    </div>
  );
}

function StockHealthPanel({
  totalItems,
  lowStock,
  outOfStock,
}: {
  totalItems: number;
  lowStock: number;
  outOfStock: number;
}) {
  const healthy = Math.max(0, totalItems - lowStock - outOfStock);
  const healthyPercent = getStockHealthPercent(totalItems, lowStock, outOfStock);
  const healthyDegrees = totalItems ? (healthy / totalItems) * 360 : 0;
  const lowDegrees = totalItems ? (lowStock / totalItems) * 360 : 0;
  const outDegrees = totalItems ? (outOfStock / totalItems) * 360 : 0;
  const donutStyle = {
    background: totalItems
      ? `conic-gradient(#10b981 0deg ${healthyDegrees}deg, #f59e0b ${healthyDegrees}deg ${
          healthyDegrees + lowDegrees
        }deg, #f43f5e ${healthyDegrees + lowDegrees}deg ${
          healthyDegrees + lowDegrees + outDegrees
        }deg, #e2e8f0 ${healthyDegrees + lowDegrees + outDegrees}deg 360deg)`
      : "#e2e8f0",
  };

  const rows = [
    { label: "Healthy", value: healthy, percent: healthyPercent, dot: "bg-emerald-500" },
    {
      label: "Low Stock",
      value: lowStock,
      percent: totalItems ? Math.round((lowStock / totalItems) * 100) : 0,
      dot: "bg-amber-500",
    },
    {
      label: "Out of Stock",
      value: outOfStock,
      percent: totalItems ? Math.round((outOfStock / totalItems) * 100) : 0,
      dot: "bg-rose-500",
    },
  ];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div>
        <h2 className="text-sm font-bold text-slate-950">Stock Health</h2>
        <p className="mt-1 text-xs text-slate-500">Overview of stock availability</p>
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-[120px_130px_minmax(0,1fr)] lg:items-center">
        <div>
          <p className="text-4xl font-bold text-slate-950">{healthyPercent}%</p>
          <p className="mt-1 text-lg font-bold text-emerald-600">Healthy</p>
        </div>
        <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full" style={donutStyle}>
          <div className="h-16 w-16 rounded-full bg-white shadow-inner" />
        </div>
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.label} className="grid grid-cols-[minmax(0,1fr)_70px] items-center gap-3 text-xs">
              <div className="flex min-w-0 items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${row.dot}`} />
                <span className="font-semibold text-slate-700">{row.label}</span>
              </div>
              <span className="text-right font-bold text-slate-700">
                {row.percent}% ({row.value})
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
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

function StockAdjustmentDialog({
  product,
  mode,
  form,
  onChange,
  onClose,
  onSave,
  isLoading,
}: {
  product: Product | null;
  mode: StockActionMode;
  form: AdjustmentFormState;
  onChange: React.Dispatch<React.SetStateAction<AdjustmentFormState>>;
  onClose: () => void;
  onSave: () => void;
  isLoading?: boolean;
}) {
  if (!product) return null;

  const isConsuming = mode === "consume";
  const currentStock = toNumber(product.stockQty);
  const projectedStock = currentStock + Number(form.quantity || 0) * (isConsuming ? -1 : 1);
  const title = isConsuming ? "Consumption" : "Received Stock";

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-3xl rounded-3xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {isConsuming
                ? "Record consumed quantity and reduce current stock immediately."
                : "Record received quantity and add it to current stock immediately."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-4 p-6 lg:grid-cols-[1.35fr,0.65fr]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">{product.name}</p>
              <p className="mt-1 text-xs text-slate-500">{product.sku}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Quantity
                </label>
                <input
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={form.quantity}
                  onChange={(event) => onChange((prev) => ({ ...prev, quantity: event.target.value }))}
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
                  value={form.txnDate}
                  onChange={(event) => onChange((prev) => ({ ...prev, txnDate: event.target.value }))}
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

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Notes
              </label>
              <textarea
                rows={3}
                value={form.notes}
                onChange={(event) => onChange((prev) => ({ ...prev, notes: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                placeholder="Optional transaction note"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Stock Preview</p>
            <p className="mt-1.5 text-sm text-slate-500">
              {isConsuming ? "Submitting this form reduces available stock." : "Submitting this form increases available stock."}
            </p>
            <div className="mt-3 rounded-2xl bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Projected Stock</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {projectedStock.toLocaleString("en-IN")}
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
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
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bookmark className="h-4 w-4" />}
            Save
          </button>
        </div>
      </form>
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
  const [categoryMetric, setCategoryMetric] = useState<CategoryMetric>("units");
  const [warehouseFilter, setWarehouseFilter] = useState("ALL");
  const [filter, setFilter] = useState<ProductFilter>(defaultFilter);
  const [addOpen, setAddOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
  const [stockAction, setStockAction] = useState<StockActionDialogState | null>(null);
  const [adjustmentForm, setAdjustmentForm] = useState<AdjustmentFormState>({
    quantity: "",
    txnDate: getTodayDateValue(),
    notes: "",
  });

  const productsQuery = useProducts(filter);
  const overviewQuery = useInventoryOverview();
  const warehouseQuery = useWarehouses({ search: "", status: "ACTIVE", page: 1, pageSize: 1 });
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct();
  const consumeMutation = useConsumeStock();
  const receiveMutation = useReceiveStock();

  const products = useMemo(() => productsQuery.data?.data ?? [], [productsQuery.data?.data]);
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
  const activeAdjustmentMutation = stockAction?.mode === "consume" ? consumeMutation : receiveMutation;
  const visibleStockValue = useMemo(
    () => products.reduce((sum, product) => sum + toNumber(product.stockQty) * toNumber(product.price), 0),
    [products]
  );

  const tableSummary = useMemo(() => {
    return {
      totalItems: pageData?.total ?? products.length,
      lowStock: products.filter((product) => product.status === ProductStatus.LOW_STOCK).length,
      outOfStock: products.filter((product) => product.status === ProductStatus.OUT_OF_STOCK).length,
    };
  }, [pageData?.total, products]);

  const analyticsSummary = useMemo<InventoryAnalyticsSummary>(() => {
    const categoryLowStock = categories.reduce((sum, category) => sum + toNumber(category.lowStockCount), 0);
    const categoryOutOfStock = categories.reduce((sum, category) => sum + toNumber(category.outOfStockCount), 0);

    return {
      totalItems: overviewQuery.data?.totalProducts ?? tableSummary.totalItems,
      totalCategories: overviewQuery.data?.totalCategories ?? categories.length,
      totalStock: overviewQuery.data?.totalStockQty ?? categories.reduce((sum, category) => sum + toNumber(category.totalStockQty), 0),
      lowStock: categoryLowStock || tableSummary.lowStock,
      outOfStock: categoryOutOfStock || tableSummary.outOfStock,
      visibleStockValue,
    };
  }, [
    categories,
    overviewQuery.data?.totalCategories,
    overviewQuery.data?.totalProducts,
    overviewQuery.data?.totalStockQty,
    tableSummary.lowStock,
    tableSummary.outOfStock,
    tableSummary.totalItems,
    visibleStockValue,
  ]);

  const warehouseCount = warehouseQuery.data?.total ?? 5;
  function resetAdjustmentForm() {
    setAdjustmentForm({ quantity: "", txnDate: getTodayDateValue(), notes: "" });
  }

  function openAction(product: Product, mode: StockActionMode) {
    setStockAction({ product, mode });
    resetAdjustmentForm();
  }

  function closeStockAction() {
    setStockAction(null);
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

  function submitAdjustment() {
    if (!stockAction) return;
    const { product, mode } = stockAction;
    const quantity = Number(adjustmentForm.quantity);
    const txnDate = adjustmentForm.txnDate.trim();
    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error("Enter a valid quantity greater than zero.");
      return;
    }
    if (!txnDate) {
      toast.error("Select a transaction date.");
      return;
    }
    if (mode === "consume" && quantity > toNumber(product.stockQty)) {
      toast.error("Consumed quantity cannot exceed available stock.");
      return;
    }

    const payload = {
      quantity,
      txnDate,
      notes: adjustmentForm.notes.trim() || undefined,
    };

    const mutation = mode === "consume" ? consumeMutation : receiveMutation;
    mutation.mutate(
      { productId: product.id, data: payload },
      {
        onSuccess: () => {
          toast.success(
            mode === "consume"
              ? "Consumption recorded successfully."
              : "Received stock recorded successfully."
          );
          closeStockAction();
        },
        onError: (error) => {
          toast.error(
            getApiErrorMessage(
              error,
              mode === "consume"
                ? "Failed to consume stock."
                : "Failed to receive stock."
            )
          );
        },
      }
    );
  }

  function handleExportProducts() {
    if (!products.length) {
      toast.error("No inventory items available to export.");
      return;
    }
    exportProductsCsv(products);
    toast.success("Inventory CSV downloaded.");
  }

  const inventoryActions = (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <button
        type="button"
        onClick={() => setAnalyticsOpen(true)}
        className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
      >
        <BarChart3 className="h-4 w-4" />
        Analytics
      </button>
      <button
        type="button"
        onClick={() => setAddOpen(true)}
        className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
      >
        <Plus className="h-4 w-4" />
        Add Item
      </button>
    </div>
  );

  return (
    <>
      <InventoryLayout showHeader={false}>
        <div className="space-y-3">
          <div className="flex justify-end">
            {inventoryActions}
          </div>

          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <DashboardMetricCard
              label="Total Items"
              value={analyticsSummary.totalItems.toLocaleString("en-IN")}
              helper="All Products"
              icon={<Boxes className="h-5 w-5" />}
              tone="blue"
            />
            <DashboardMetricCard
              label="Categories"
              value={analyticsSummary.totalCategories.toLocaleString("en-IN")}
              helper="Product Categories"
              icon={<Tags className="h-5 w-5" />}
              tone="emerald"
            />
            <DashboardMetricCard
              label="Warehouses"
              value={warehouseCount.toLocaleString("en-IN")}
              helper="Active Warehouses"
              icon={<Building2 className="h-5 w-5" />}
              tone="violet"
            />
            <DashboardMetricCard
              label="Inventory Value"
              value={formatCompactCurrency(analyticsSummary.visibleStockValue)}
              helper="Current Stock Value"
              icon={<IndianRupee className="h-5 w-5" />}
              tone="amber"
            />
          </section>

          <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <StockByCategoryPanel
              categories={categories}
              products={products}
              metric={categoryMetric}
              onMetricChange={setCategoryMetric}
            />
            <StockHealthPanel
              totalItems={analyticsSummary.totalItems}
              lowStock={analyticsSummary.lowStock}
              outOfStock={analyticsSummary.outOfStock}
            />
          </section>

          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-3 pt-3">
              <div className="flex items-center gap-5">
                <UnderlineTab active={view === "items"} onClick={() => setView("items")}>
                  Items
                </UnderlineTab>
                <UnderlineTab active={view === "categories"} onClick={() => setView("categories")}>
                  <span className="inline-flex items-center gap-2">
                    Categories
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-700">
                      {analyticsSummary.totalCategories}
                    </span>
                  </span>
                </UnderlineTab>
              </div>
            </div>

            {view === "items" ? (
              <>
                <div className="flex flex-col gap-2 border-b border-slate-200 p-3 xl:flex-row xl:items-center xl:justify-between">
                  <div className="relative w-full max-w-xl">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={filter.search}
                      onChange={(e) => setFilter((prev) => ({ ...prev, search: e.target.value, page: 1 }))}
                      placeholder="Search by item name or SKU..."
                      className="w-full rounded-md border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                    />
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap xl:justify-end">
                    <button
                      type="button"
                      onClick={handleExportProducts}
                      className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      <Download className="h-4 w-4" />
                      Export
                    </button>
                    <select
                      value={filter.category}
                      onChange={(e) => setFilter((prev) => ({ ...prev, category: e.target.value, page: 1 }))}
                      className="min-w-40 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
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
                      className="min-w-36 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                    >
                      <option value="ALL">All Status</option>
                      <option value={ProductStatus.IN_STOCK}>In Stock</option>
                      <option value={ProductStatus.LOW_STOCK}>Low Stock</option>
                      <option value={ProductStatus.OUT_OF_STOCK}>Out of Stock</option>
                    </select>
                    <select
                      value={warehouseFilter}
                      onChange={(e) => setWarehouseFilter(e.target.value)}
                      className="min-w-40 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                    >
                      <option value="ALL">All Warehouses</option>
                    </select>
                    <button
                      type="button"
                      title="Reset filters"
                      onClick={() => {
                        setFilter(defaultFilter);
                        setWarehouseFilter("ALL");
                      }}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50"
                    >
                      <Filter className="h-4 w-4" />
                    </button>
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
                              className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                            >
                              {heading}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {products.length ? (
                          products.map((product) => {
                            const currentStock = toNumber(product.stockQty);

                            return (
                              <tr key={product.id} className="border-b border-slate-100 align-top">
                                <td className="px-3 py-2.5">
                                  <div className="flex items-start gap-2">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-50 text-blue-700">
                                      <Package className="h-4 w-4" />
                                    </div>
                                    <div>
                                      <p className="font-semibold text-slate-900">{product.name}</p>
                                      <p className="mt-1 text-xs text-slate-500">{product.sku}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-3 py-2.5 text-slate-600">
                                  <p>{product.category}</p>
                                  <p className="mt-1 text-xs text-slate-400">{product.subCategory ?? product.brand ?? "-"}</p>
                                </td>
                                <td className="px-3 py-2.5 font-semibold text-slate-900">{currentStock.toLocaleString("en-IN")}</td>
                                <td className="px-3 py-2.5 font-semibold text-slate-900">{formatCurrency(toNumber(product.price))}</td>
                                <td className="px-3 py-2.5">
                                  <StatusBadge status={product.status} />
                                </td>
                                <td className="px-3 py-2.5">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <ActionButton onClick={() => setEditProduct(product)}>
                                      <Pencil className="h-3.5 w-3.5" />
                                    </ActionButton>
                                    <ActionButton
                                      tone="brand"
                                      onClick={() => openAction(product, "consume")}
                                    >
                                      C
                                    </ActionButton>
                                    <ActionButton
                                      tone="brand"
                                      onClick={() => openAction(product, "receive")}
                                    >
                                      R
                                    </ActionButton>
                                    <ActionButton tone="danger" onClick={() => setDeleteProduct(product)}>
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </ActionButton>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={6} className="px-3 py-10 text-center text-sm text-slate-500">
                              No inventory items matched your filters.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {pageData ? (
                    <div className="flex flex-col gap-2 border-t border-slate-200 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
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
                          className="rounded-md border border-slate-200 p-1.5 text-slate-500 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
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
                          className="rounded-md border border-slate-200 p-1.5 text-slate-500 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : null}
                </>
              )}
              </>
          ) : (
            <>
              <div className="border-b border-slate-200 p-3">
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
                          className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
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
                          <td className="px-3 py-2.5">
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
                          <td className="px-3 py-2.5 text-slate-600">{toNumber(category.productCount)}</td>
                          <td className="px-3 py-2.5 font-semibold text-slate-900">
                            {toNumber(category.totalStockQty).toLocaleString("en-IN")}
                          </td>
                          <td className="px-3 py-2.5 text-amber-700">{toNumber(category.lowStockCount)}</td>
                          <td className="px-3 py-2.5 text-rose-700">{toNumber(category.outOfStockCount)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-3 py-10 text-center text-sm text-slate-500">
                          No categories available yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
        </div>
      </InventoryLayout>

      <InventoryAnalyticsDialog
        open={analyticsOpen}
        onClose={() => setAnalyticsOpen(false)}
        summary={analyticsSummary}
        categories={categories}
        isLoading={overviewQuery.isLoading}
      />
      <ProductDialog open={addOpen} onClose={() => setAddOpen(false)} onSave={handleCreate} isLoading={createMutation.isPending} />
      <ProductDialog open={!!editProduct} onClose={() => setEditProduct(null)} product={editProduct} onSave={handleUpdate} isLoading={updateMutation.isPending} />
      <StockAdjustmentDialog
        product={stockAction?.product ?? null}
        mode={stockAction?.mode ?? "consume"}
        form={adjustmentForm}
        onChange={setAdjustmentForm}
        onClose={closeStockAction}
        onSave={submitAdjustment}
        isLoading={activeAdjustmentMutation.isPending}
      />
      <DeleteDialog open={!!deleteProduct} product={deleteProduct} onClose={() => setDeleteProduct(null)} onConfirm={handleDelete} isLoading={deleteMutation.isPending} />
    </>
  );
}
