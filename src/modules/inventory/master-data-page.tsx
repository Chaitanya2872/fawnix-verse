"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Bookmark,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Download,
  Filter,
  Loader2,
  Package,
  Pencil,
  Plus,
  Rows3,
  Search,
  Tags,
  Trash2,
  Upload,
  Warehouse as WarehouseIcon,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Menu } from "@base-ui/react/menu";
import { getApiErrorMessage } from "@/services/api-client";
import {
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_GROUPS,
  ProductStatus,
  type Product,
  type ProductFilter,
  type ProductFormData,
  type Warehouse,
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
import { ProductImportModal } from "./ProductImportModal";

type StockView = "items" | "categories";
type StockActionMode = "consume" | "receive";
type StockActionDialogState = {
  product: Product;
  mode: StockActionMode;
};

type CustomCategory = {
  name: string;
  subCategories: string[];
};

type CategoryFormState = {
  name: string;
  subCategories: string;
};

type AdjustmentFormState = {
  quantity: string;
  txnDate: string;
  notes: string;
};

type SortField = "name" | "stockQty";
type SortState = {
  field: SortField | null;
  direction: "asc" | "desc";
};

type BulkMapFormState = {
  warehouseId: string;
  storageLocationId: string;
  quantityOnHand: string;
  primaryMapping: boolean;
  notes: string;
};

const defaultBulkMapForm: BulkMapFormState = {
  warehouseId: "",
  storageLocationId: "",
  quantityOnHand: "",
  primaryMapping: false,
  notes: "",
};

const defaultFilter: ProductFilter = {
  search: "",
  category: "",
  brand: "",
  status: "ALL",
  page: 1,
  pageSize: 10,
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
  storageMappings: [],
};

const CUSTOM_CATEGORY_STORAGE_KEY = "inventory.custom-categories";
const defaultCategoryForm: CategoryFormState = {
  name: "",
  subCategories: "",
};

function createEmptyStorageMappingDraft() {
  return {
    warehouseId: "",
    storageLocationId: "",
    quantityOnHand: 0,
    minStockLevel: null,
    maxStockLevel: null,
    primaryMapping: false,
    notes: "",
  };
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value);
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

function readCustomCategories(): CustomCategory[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_CATEGORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CustomCategory[];
    return Array.isArray(parsed)
      ? parsed
          .filter((item) => item && typeof item.name === "string")
          .map((item) => ({
            name: item.name.trim(),
            subCategories: Array.isArray(item.subCategories)
              ? item.subCategories
                  .map((value) => String(value).trim())
                  .filter(Boolean)
              : [],
          }))
          .filter((item) => item.name)
      : [];
  } catch {
    return [];
  }
}

function StatusBadge({ status }: { status: ProductStatus }) {
  const config: Record<ProductStatus, { label: string; cls: string; dot: string }> = {
    [ProductStatus.IN_STOCK]: {
      label: "In Stock",
      cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
      dot: "bg-emerald-500",
    },
    [ProductStatus.LOW_STOCK]: {
      label: "Low Stock",
      cls: "bg-amber-50 text-amber-700 border-amber-200",
      dot: "bg-amber-500",
    },
    [ProductStatus.OUT_OF_STOCK]: {
      label: "Out of Stock",
      cls: "bg-rose-50 text-rose-700 border-rose-200",
      dot: "bg-rose-500",
    },
  };

  const item = config[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${item.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${item.dot}`} />
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

function FilterSelect({
  icon,
  value,
  onChange,
  children,
  className = "",
}: {
  icon?: React.ReactNode;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      {icon ? (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>
      ) : null}
      <select
        value={value}
        onChange={onChange}
        className={`w-full appearance-none rounded-xl border border-slate-200/70 bg-white/60 py-2.5 pr-9 text-sm font-medium text-slate-700 outline-none backdrop-blur-md transition-colors hover:bg-white/80 focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100 ${
          icon ? "pl-9" : "pl-3"
        }`}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>
  );
}

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
      {label}
      <button
        type="button"
        onClick={onClear}
        aria-label={`Clear ${label} filter`}
        className="rounded-full p-0.5 text-brand-500 transition-colors hover:bg-brand-100 hover:text-brand-800"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

function ActionButton({
  children,
  tone = "default",
  onClick,
  disabled,
  title,
}: {
  children: React.ReactNode;
  tone?: "default" | "brand" | "danger";
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
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
      title={title}
      className={`inline-flex items-center justify-center rounded-md border px-2 py-1 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${toneClass}`}
    >
      {children}
    </button>
  );
}


function ProductDialog({
  open,
  onClose,
  product,
  warehouses,
  categoryOptions,
  categoryGroups,
  onSave,
  isLoading,
}: {
  open: boolean;
  onClose: () => void;
  product?: Product | null;
  warehouses: Warehouse[];
  categoryOptions: string[];
  categoryGroups: Record<string, string[]>;
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
            storageMappings: product.storageMappings.map((mapping) => ({
              id: mapping.id,
              warehouseId: mapping.warehouseId,
              storageLocationId: mapping.storageLocationId,
              quantityOnHand: toNumber(mapping.quantityOnHand),
              minStockLevel: mapping.minStockLevel ?? null,
              maxStockLevel: mapping.maxStockLevel ?? null,
              primaryMapping: mapping.primaryMapping,
              notes: mapping.notes ?? "",
            })),
          }
        : defaultForm
    );
  }, [open, product]);

  if (!open) return null;

  const subCategoryOptions = categoryGroups[form.category] ?? [];

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100";

  function updateField<K extends keyof ProductFormData>(key: K, value: ProductFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateStorageMapping(index: number, patch: Partial<ProductFormData["storageMappings"][number]>) {
    setForm((prev) => ({
      ...prev,
      storageMappings: prev.storageMappings.map((mapping, currentIndex) =>
        currentIndex === index ? { ...mapping, ...patch } : mapping
      ),
    }));
  }

  function addStorageMapping() {
    setForm((prev) => {
      const draft = createEmptyStorageMappingDraft();
      if (prev.storageMappings.length === 0 && toNumber(prev.stockQty) > 0) {
        draft.quantityOnHand = toNumber(prev.stockQty);
      }
      return {
        ...prev,
        storageMappings: [...prev.storageMappings, draft],
      };
    });
  }

  function removeStorageMapping(index: number) {
    setForm((prev) => ({
      ...prev,
      storageMappings: prev.storageMappings.filter((_, currentIndex) => currentIndex !== index),
    }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const normalizedMappings = form.storageMappings
      .map((mapping, index) => ({
        ...mapping,
        quantityOnHand: Number(mapping.quantityOnHand) || 0,
        minStockLevel: mapping.minStockLevel == null ? null : Number(mapping.minStockLevel),
        maxStockLevel: mapping.maxStockLevel == null ? null : Number(mapping.maxStockLevel),
        primaryMapping: Boolean(mapping.primaryMapping || index === 0),
        notes: mapping.notes?.trim() || "",
      }))
      .filter((mapping) => mapping.warehouseId && mapping.storageLocationId);

    const computedStockQty = normalizedMappings.length
      ? normalizedMappings.reduce((sum, mapping) => sum + (Number(mapping.quantityOnHand) || 0), 0)
      : form.stockQty;

    onSave({
      ...form,
      stockQty: computedStockQty,
      storageMappings: normalizedMappings,
    });
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
        <form onSubmit={handleSubmit} className="space-y-6 p-6">
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
                {categoryOptions.map((category) => (
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
                disabled={form.storageMappings.length > 0}
              />
              {form.storageMappings.length > 0 ? (
                <p className="mt-1 text-xs text-slate-500">Calculated from mapped warehouse locations below.</p>
              ) : null}
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
          <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Warehouse Mapping</h3>
                <p className="mt-1 text-sm text-slate-500">Assign this item to one or more warehouse storage locations with on-hand quantities.</p>
              </div>
              <button
                type="button"
                onClick={addStorageMapping}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                <Plus className="h-4 w-4" />
                Add Mapping
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {form.storageMappings.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-6 text-sm text-slate-500">
                  No warehouse mappings yet. Add one to connect this item to a storage location.
                </div>
              ) : (
                form.storageMappings.map((mapping, index) => {
                  const selectedWarehouse = warehouses.find((warehouse) => warehouse.id === mapping.warehouseId) ?? null;
                  const availableLocations = selectedWarehouse?.storageLocations ?? [];
                  return (
                    <div key={mapping.id ?? `mapping-${index}`} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{selectedWarehouse?.name ?? `Mapping ${index + 1}`}</p>
                          <p className="text-xs text-slate-500">{availableLocations.find((location) => location.id === mapping.storageLocationId)?.code ?? "Select location"}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeStorageMapping(index)}
                          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Warehouse</label>
                          <select
                            value={mapping.warehouseId}
                            onChange={(event) => updateStorageMapping(index, { warehouseId: event.target.value, storageLocationId: "" })}
                            className={inputClass}
                          >
                            <option value="">Select warehouse</option>
                            {warehouses.map((warehouse) => (
                              <option key={warehouse.id} value={warehouse.id}>
                                {warehouse.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Storage Location</label>
                          <select
                            value={mapping.storageLocationId}
                            onChange={(event) => updateStorageMapping(index, { storageLocationId: event.target.value })}
                            className={inputClass}
                            disabled={!selectedWarehouse}
                          >
                            <option value="">{selectedWarehouse ? "Select location" : "Select warehouse first"}</option>
                            {availableLocations.map((location) => (
                              <option key={location.id ?? `${selectedWarehouse?.id}-${location.code}`} value={location.id}>
                                {location.code} - {location.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Qty on Hand</label>
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={mapping.quantityOnHand}
                            onChange={(event) => updateStorageMapping(index, { quantityOnHand: Number(event.target.value) || 0 })}
                            className={inputClass}
                          />
                        </div>
                        <div className="flex items-end pb-2.5">
                          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                            <input
                              type="checkbox"
                              checked={mapping.primaryMapping}
                              onChange={(event) =>
                                setForm((prev) => ({
                                  ...prev,
                                  storageMappings: prev.storageMappings.map((entry, currentIndex) => ({
                                    ...entry,
                                    primaryMapping: currentIndex === index ? event.target.checked : false,
                                  })),
                                }))
                              }
                              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                            />
                            Primary location
                          </label>
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Min Stock</label>
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={mapping.minStockLevel ?? ""}
                            onChange={(event) => updateStorageMapping(index, { minStockLevel: event.target.value ? Number(event.target.value) : null })}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Max Stock</label>
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={mapping.maxStockLevel ?? ""}
                            onChange={(event) => updateStorageMapping(index, { maxStockLevel: event.target.value ? Number(event.target.value) : null })}
                            className={inputClass}
                          />
                        </div>
                        <div className="md:col-span-2 xl:col-span-2">
                          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</label>
                          <input
                            value={mapping.notes ?? ""}
                            onChange={(event) => updateStorageMapping(index, { notes: event.target.value })}
                            className={inputClass}
                            placeholder="Fast moving, quarantine, project-specific, overflow..."
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
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

function BulkDeleteDialog({
  open,
  count,
  onClose,
  onConfirm,
  isLoading,
}: {
  open: boolean;
  count: number;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}) {
  if (!open || count <= 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900">Delete selected items?</h3>
        <p className="mt-2 text-sm text-slate-500">
          You are about to delete <span className="font-semibold text-slate-900">{count}</span> selected item{count === 1 ? "" : "s"}.
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Items with stock transaction history will be blocked and kept in the system.
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
            Delete Selected
          </button>
        </div>
      </div>
    </div>
  );
}

function BulkWarehouseMappingDialog({
  open,
  count,
  warehouses,
  form,
  onChange,
  onClose,
  onSave,
  isLoading,
}: {
  open: boolean;
  count: number;
  warehouses: Warehouse[];
  form: BulkMapFormState;
  onChange: React.Dispatch<React.SetStateAction<BulkMapFormState>>;
  onClose: () => void;
  onSave: () => void;
  isLoading?: boolean;
}) {
  if (!open || count <= 0) return null;

  const selectedWarehouse = warehouses.find((warehouse) => warehouse.id === form.warehouseId) ?? null;
  const availableLocations = selectedWarehouse?.storageLocations ?? [];
  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100";

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Map Warehouse</h3>
            <p className="mt-1 text-sm text-slate-500">
              Assign a warehouse storage location to{" "}
              <span className="font-semibold text-slate-900">
                {count} selected item{count === 1 ? "" : "s"}
              </span>
              . Items already mapped there are skipped.
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

        <div className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Warehouse</label>
              <select
                value={form.warehouseId}
                onChange={(event) => onChange((prev) => ({ ...prev, warehouseId: event.target.value, storageLocationId: "" }))}
                className={inputClass}
              >
                <option value="">Select warehouse</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Storage Location</label>
              <select
                value={form.storageLocationId}
                onChange={(event) => onChange((prev) => ({ ...prev, storageLocationId: event.target.value }))}
                className={inputClass}
                disabled={!selectedWarehouse}
              >
                <option value="">{selectedWarehouse ? "Select location" : "Select warehouse first"}</option>
                {availableLocations.map((location) => (
                  <option key={location.id ?? `${selectedWarehouse?.id}-${location.code}`} value={location.id}>
                    {location.code} - {location.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Qty on Hand</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.quantityOnHand}
                onChange={(event) => onChange((prev) => ({ ...prev, quantityOnHand: event.target.value }))}
                className={inputClass}
                placeholder="0"
              />
            </div>
            <label className="flex items-end gap-2 pb-2.5 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={form.primaryMapping}
                onChange={(event) => onChange((prev) => ({ ...prev, primaryMapping: event.target.checked }))}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              Primary location
            </label>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</label>
            <input
              value={form.notes}
              onChange={(event) => onChange((prev) => ({ ...prev, notes: event.target.value }))}
              className={inputClass}
              placeholder="Optional mapping note"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading || !form.warehouseId || !form.storageLocationId}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Map Warehouse
          </button>
        </div>
      </form>
    </div>
  );
}

function AddCategoryDialog({
  open,
  form,
  onChange,
  onClose,
  onSave,
}: {
  open: boolean;
  form: CategoryFormState;
  onChange: React.Dispatch<React.SetStateAction<CategoryFormState>>;
  onClose: () => void;
  onSave: () => void;
}) {
  if (!open) return null;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Add Category</h3>
            <p className="mt-1 text-sm text-slate-500">
              Create a category option for inventory items. It will be available immediately in filters and item forms.
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

        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Category Name
            </label>
            <input
              value={form.name}
              onChange={(event) => onChange((prev) => ({ ...prev, name: event.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              placeholder="Example: Lighting"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Subcategories
            </label>
            <input
              value={form.subCategories}
              onChange={(event) => onChange((prev) => ({ ...prev, subCategories: event.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              placeholder="Example: Downlights, Strip Lights, Drivers"
            />
            <p className="mt-1 text-xs text-slate-400">Separate multiple subcategories with commas.</p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
          >
            Save Category
          </button>
        </div>
      </form>
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

export default function InventoryMasterDataPage() {
  const [view, setView] = useState<StockView>("items");
  const [warehouseFilter, setWarehouseFilter] = useState("ALL");
  const [filter, setFilter] = useState<ProductFilter>(defaultFilter);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>(() => readCustomCategories());
  const [addOpen, setAddOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(defaultCategoryForm);
  const [importOpen, setImportOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkMapOpen, setBulkMapOpen] = useState(false);
  const [bulkMapForm, setBulkMapForm] = useState<BulkMapFormState>(defaultBulkMapForm);
  const [stockAction, setStockAction] = useState<StockActionDialogState | null>(null);
  const [sort, setSort] = useState<SortState>({ field: null, direction: "asc" });
  const [adjustmentForm, setAdjustmentForm] = useState<AdjustmentFormState>({
    quantity: "",
    txnDate: getTodayDateValue(),
    notes: "",
  });

  const productsQuery = useProducts(filter);
  const overviewQuery = useInventoryOverview();
  const warehouseQuery = useWarehouses({ search: "", status: "ACTIVE", page: 1, pageSize: 200 });
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct();
  const consumeMutation = useConsumeStock();
  const receiveMutation = useReceiveStock();

  const allProducts = useMemo(() => productsQuery.data?.data ?? [], [productsQuery.data?.data]);
  const warehouseOptions = useMemo(() => warehouseQuery.data?.data ?? [], [warehouseQuery.data?.data]);
  const categoryGroups = useMemo<Record<string, string[]>>(
    () => ({
      ...PRODUCT_CATEGORY_GROUPS,
      ...Object.fromEntries(customCategories.map((item) => [item.name, item.subCategories])),
    }),
    [customCategories]
  );
  const categoryOptions = useMemo(
    () => Array.from(new Set([...PRODUCT_CATEGORIES, ...customCategories.map((item) => item.name)])).sort(),
    [customCategories]
  );
  const products = useMemo(
    () =>
      warehouseFilter === "ALL"
        ? allProducts
        : allProducts.filter((product) => product.storageMappings.some((mapping) => mapping.warehouseId === warehouseFilter)),
    [allProducts, warehouseFilter]
  );
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
  const allVisibleSelected = products.length > 0 && products.every((product) => selectedProductIds.includes(product.id));
  const selectedProducts = useMemo(
    () => products.filter((product) => selectedProductIds.includes(product.id)),
    [products, selectedProductIds]
  );
  const sortedProducts = useMemo(() => {
    if (!sort.field) return products;
    const direction = sort.direction === "asc" ? 1 : -1;
    return [...products].sort((a, b) => {
      if (sort.field === "name") return a.name.localeCompare(b.name) * direction;
      return (toNumber(a.stockQty) - toNumber(b.stockQty)) * direction;
    });
  }, [products, sort]);
  const activeFilterChips = useMemo(() => {
    const chips: { key: string; label: string; onClear: () => void }[] = [];
    if (filter.category) {
      chips.push({
        key: "category",
        label: `Category: ${filter.category}`,
        onClear: () => setFilter((prev) => ({ ...prev, category: "", page: 1 })),
      });
    }
    if (filter.status !== "ALL") {
      const statusLabels: Record<string, string> = {
        [ProductStatus.IN_STOCK]: "In Stock",
        [ProductStatus.LOW_STOCK]: "Low Stock",
        [ProductStatus.OUT_OF_STOCK]: "Out of Stock",
      };
      chips.push({
        key: "status",
        label: `Status: ${statusLabels[filter.status] ?? filter.status}`,
        onClear: () => setFilter((prev) => ({ ...prev, status: "ALL", page: 1 })),
      });
    }
    if (warehouseFilter !== "ALL") {
      const warehouseName = warehouseOptions.find((warehouse) => warehouse.id === warehouseFilter)?.name ?? "Warehouse";
      chips.push({
        key: "warehouse",
        label: `Warehouse: ${warehouseName}`,
        onClear: () => setWarehouseFilter("ALL"),
      });
    }
    if (filter.search) {
      chips.push({
        key: "search",
        label: `Search: "${filter.search}"`,
        onClear: () => setFilter((prev) => ({ ...prev, search: "", page: 1 })),
      });
    }
    return chips;
  }, [filter.category, filter.status, filter.search, warehouseFilter, warehouseOptions]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(CUSTOM_CATEGORY_STORAGE_KEY, JSON.stringify(customCategories));
  }, [customCategories]);

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

  function resetCategoryForm() {
    setCategoryForm(defaultCategoryForm);
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
        setSelectedProductIds((current) => current.filter((id) => id !== deleteProduct.id));
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

  function handleCreateCategory() {
    const name = categoryForm.name.trim();
    const subCategories = categoryForm.subCategories
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    if (!name) {
      toast.error("Enter a category name.");
      return;
    }

    const exists = categoryOptions.some((value) => value.toLowerCase() === name.toLowerCase());
    if (exists) {
      toast.error("Category already exists.");
      return;
    }

    setCustomCategories((current) => [...current, { name, subCategories }]);
    setCategoryModalOpen(false);
    resetCategoryForm();
    setView("categories");
    toast.success("Category added.");
  }

  function toggleProductSelection(productId: string) {
    setSelectedProductIds((current) =>
      current.includes(productId) ? current.filter((id) => id !== productId) : [...current, productId]
    );
  }

  function toggleSelectAllVisible() {
    setSelectedProductIds((current) => {
      if (allVisibleSelected) {
        return current.filter((id) => !products.some((product) => product.id === id));
      }
      const merged = new Set([...current, ...products.map((product) => product.id)]);
      return Array.from(merged);
    });
  }

  function handleExportSelected() {
    if (!selectedProducts.length) {
      toast.error("Select at least one product to export.");
      return;
    }
    exportProductsCsv(selectedProducts);
    toast.success("Selected products exported.");
  }

  async function handleBulkDelete() {
    if (!selectedProducts.length || deleteMutation.isPending) return;
    try {
      for (const product of selectedProducts) {
        // Reuse the existing delete API instead of adding a new backend batch endpoint.
        // This keeps the new master-data workflow compatible with the current service layer.
        await deleteMutation.mutateAsync(product.id);
      }
      toast.success(`${selectedProducts.length} item${selectedProducts.length === 1 ? "" : "s"} deleted.`);
      setSelectedProductIds([]);
      setBulkDeleteOpen(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to delete selected inventory items."));
    }
  }

  function toggleSort(field: SortField) {
    setSort((prev) =>
      prev.field === field ? { field, direction: prev.direction === "asc" ? "desc" : "asc" } : { field, direction: "asc" }
    );
  }

  function resetBulkMapForm() {
    setBulkMapForm(defaultBulkMapForm);
  }

  async function handleBulkMapWarehouse() {
    if (!selectedProducts.length || updateMutation.isPending) return;
    const { warehouseId, storageLocationId, quantityOnHand, primaryMapping, notes } = bulkMapForm;
    if (!warehouseId || !storageLocationId) {
      toast.error("Select a warehouse and storage location.");
      return;
    }

    const quantity = Number(quantityOnHand) || 0;
    let mappedCount = 0;
    let skippedCount = 0;

    try {
      for (const product of selectedProducts) {
        const alreadyMapped = product.storageMappings.some(
          (mapping) => mapping.warehouseId === warehouseId && mapping.storageLocationId === storageLocationId
        );
        if (alreadyMapped) {
          skippedCount += 1;
          continue;
        }

        const existingMappings = product.storageMappings.map((mapping) => ({
          id: mapping.id,
          warehouseId: mapping.warehouseId,
          storageLocationId: mapping.storageLocationId,
          quantityOnHand: toNumber(mapping.quantityOnHand),
          minStockLevel: mapping.minStockLevel ?? null,
          maxStockLevel: mapping.maxStockLevel ?? null,
          primaryMapping: primaryMapping ? false : mapping.primaryMapping,
          notes: mapping.notes ?? "",
        }));
        const nextMappings = [
          ...existingMappings,
          {
            warehouseId,
            storageLocationId,
            quantityOnHand: quantity,
            minStockLevel: null,
            maxStockLevel: null,
            primaryMapping,
            notes: notes.trim(),
          },
        ];
        const computedStockQty = nextMappings.reduce((sum, mapping) => sum + (Number(mapping.quantityOnHand) || 0), 0);

        await updateMutation.mutateAsync({
          id: product.id,
          data: { storageMappings: nextMappings, stockQty: computedStockQty },
        });
        mappedCount += 1;
      }

      if (mappedCount) {
        toast.success(
          `Mapped ${mappedCount} item${mappedCount === 1 ? "" : "s"} to the selected warehouse location.${
            skippedCount ? ` ${skippedCount} already mapped there.` : ""
          }`
        );
      } else {
        toast.error("Selected items are already mapped to that warehouse location.");
      }
      setBulkMapOpen(false);
      resetBulkMapForm();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to map warehouse for selected items."));
    }
  }

  const inventoryActions = (
    <Menu.Root>
      <Menu.Trigger className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700">
        <Plus className="h-4 w-4" />
        Add
        <ChevronDown className="h-4 w-4" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner align="end" sideOffset={8}>
          <Menu.Popup className="z-50 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-lg outline-none">
            <Menu.Item
              onClick={() => setAddOpen(true)}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none transition-colors hover:bg-slate-50 focus:bg-slate-50"
            >
              <Plus className="h-4 w-4" />
              Add Item
            </Menu.Item>
            <Menu.Item
              onClick={() => {
                resetCategoryForm();
                setCategoryModalOpen(true);
              }}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none transition-colors hover:bg-slate-50 focus:bg-slate-50"
            >
              <Bookmark className="h-4 w-4" />
              Add Category
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );

  return (
    <>
      <InventoryLayout
        title="Master Data"
        description="Manage item masters, warehouse-location mappings, pricing, and stock status with a selection-first workspace."
        eyebrow="Inventory"
        actions={inventoryActions}
      >
        <div className="space-y-3">
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
                      {categories.length}
                    </span>
                  </span>
                </UnderlineTab>
              </div>
            </div>

            {view === "items" ? (
              <>
                <div className="border-b border-slate-200 bg-slate-50/60 p-4">
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                    <div className="relative w-full xl:max-w-sm">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        value={filter.search}
                        onChange={(e) => setFilter((prev) => ({ ...prev, search: e.target.value, page: 1 }))}
                        placeholder="Search product name or SKU"
                        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:flex xl:flex-1 xl:flex-wrap">
                      <FilterSelect
                        icon={<Tags className="h-4 w-4" />}
                        value={filter.category}
                        onChange={(e) => setFilter((prev) => ({ ...prev, category: e.target.value, page: 1 }))}
                        className="min-w-0 xl:w-44"
                      >
                        <option value="">All Categories</option>
                        {categoryOptions.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </FilterSelect>
                      <FilterSelect
                        icon={<CircleDot className="h-4 w-4" />}
                        value={filter.status}
                        onChange={(e) =>
                          setFilter((prev) => ({ ...prev, status: e.target.value as ProductFilter["status"], page: 1 }))
                        }
                        className="min-w-0 xl:w-40"
                      >
                        <option value="ALL">All Status</option>
                        <option value={ProductStatus.IN_STOCK}>In Stock</option>
                        <option value={ProductStatus.LOW_STOCK}>Low Stock</option>
                        <option value={ProductStatus.OUT_OF_STOCK}>Out of Stock</option>
                      </FilterSelect>
                      <FilterSelect
                        icon={<WarehouseIcon className="h-4 w-4" />}
                        value={warehouseFilter}
                        onChange={(e) => setWarehouseFilter(e.target.value)}
                        className="min-w-0 xl:w-48"
                      >
                        <option value="ALL">All Warehouses</option>
                        {warehouseOptions.map((warehouse) => (
                          <option key={warehouse.id} value={warehouse.id}>
                            {warehouse.name}
                          </option>
                        ))}
                      </FilterSelect>
                      <FilterSelect
                        icon={<Rows3 className="h-4 w-4" />}
                        value={String(filter.pageSize)}
                        onChange={(e) => setFilter((prev) => ({ ...prev, pageSize: Number(e.target.value), page: 1 }))}
                        className="min-w-0 xl:w-32"
                      >
                        <option value="10">10 rows</option>
                        <option value="20">20 rows</option>
                        <option value="50">50 rows</option>
                      </FilterSelect>
                    </div>

                    <div className="flex items-center gap-2 xl:shrink-0">
                      <button
                        type="button"
                        onClick={() => setImportOpen(true)}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 xl:flex-none"
                      >
                        <Upload className="h-4 w-4" />
                        Import
                      </button>
                      <button
                        type="button"
                        onClick={handleExportProducts}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 xl:flex-none"
                      >
                        <Download className="h-4 w-4" />
                        Export
                      </button>
                      <button
                        type="button"
                        title="Reset filters"
                        onClick={() => {
                          setFilter(defaultFilter);
                          setWarehouseFilter("ALL");
                          setSelectedProductIds([]);
                        }}
                        className="inline-flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50"
                      >
                        <Filter className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {activeFilterChips.length ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200/70 pt-3">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Active:</span>
                      {activeFilterChips.map((chip) => (
                        <FilterChip key={chip.key} label={chip.label} onClear={chip.onClear} />
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setFilter(defaultFilter);
                          setWarehouseFilter("ALL");
                        }}
                        className="text-xs font-semibold text-slate-500 underline-offset-2 transition-colors hover:text-slate-800 hover:underline"
                      >
                        Clear all
                      </button>
                    </div>
                  ) : null}
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
                    <table className="w-full min-w-[1160px] text-sm">
                      <thead>
                        <tr className="border-b-2 border-slate-200 bg-slate-50">
                        {["", "SKU", "Product Name", "Type", "Selling Price", "Stock", "Warehouse / Location", "Status", "Actions"].map((heading) => {
                            const sortField: SortField | null =
                              heading === "Product Name" ? "name" : heading === "Stock" ? "stockQty" : null;
                            return (
                            <th
                              key={heading}
                              className={`px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 ${
                                heading === "Actions" ? "text-right" : ""
                              }`}
                            >
                              {sortField ? (
                                <button
                                  type="button"
                                  onClick={() => toggleSort(sortField)}
                                  className="inline-flex items-center gap-1 transition-colors hover:text-slate-800"
                                >
                                  {heading}
                                  {sort.field === sortField ? (
                                    sort.direction === "asc" ? (
                                      <ArrowUp className="h-3 w-3 text-brand-600" />
                                    ) : (
                                      <ArrowDown className="h-3 w-3 text-brand-600" />
                                    )
                                  ) : (
                                    <ArrowUpDown className="h-3 w-3 text-slate-300" />
                                  )}
                                </button>
                              ) : (
                                heading || (
                                  <input
                                    type="checkbox"
                                    checked={allVisibleSelected}
                                    onChange={toggleSelectAllVisible}
                                    aria-label="Select all visible products"
                                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                                  />
                                )
                              )}
                            </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {sortedProducts.length ? (
                          sortedProducts.map((product) => {
                            const currentStock = toNumber(product.stockQty);
                            const selected = selectedProductIds.includes(product.id);

                            return (
                              <tr
                                key={product.id}
                                className={`border-b border-slate-100 align-top transition-colors ${
                                  selected ? "bg-brand-50/50" : "hover:bg-slate-50"
                                }`}
                              >
                                <td className="px-4 py-3.5">
                                  <input
                                    type="checkbox"
                                    checked={selected}
                                    onChange={() => toggleProductSelection(product.id)}
                                    aria-label={`Select ${product.name}`}
                                    className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                                  />
                                </td>
                                <td className="px-4 py-3.5 text-slate-600">
                                  <div className="font-medium text-slate-900">{product.sku}</div>
                                  <div className="mt-1 text-xs text-slate-400">{product.unit ?? "pcs"}</div>
                                </td>
                                <td className="px-4 py-3.5">
                                  <div className="flex items-start gap-2.5">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700">
                                      <Package className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="truncate font-semibold text-slate-900">{product.name}</p>
                                      <p className="mt-1 text-xs text-slate-500">{product.brand ?? "Unbranded item"}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3.5 text-slate-600">
                                  <p>{product.category}</p>
                                  <p className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                                    {product.subCategory ?? "General"}
                                  </p>
                                </td>
                                <td className="px-4 py-3.5 font-semibold text-slate-900">{formatCurrency(toNumber(product.price))}</td>
                                <td className="px-4 py-3.5">
                                  <div className="flex items-center gap-2 font-semibold text-slate-900">
                                    <span>{currentStock.toLocaleString("en-IN")}</span>
                                    {product.status !== ProductStatus.IN_STOCK ? (
                                      <AlertTriangle
                                        className={`h-4 w-4 ${
                                          product.status === ProductStatus.OUT_OF_STOCK ? "text-rose-500" : "text-amber-500"
                                        }`}
                                      />
                                    ) : null}
                                  </div>
                                </td>
                                <td className="px-4 py-3.5 text-slate-600">
                                  {product.storageMappings.length ? (
                                    <div className="space-y-1">
                                      <p className="font-semibold text-slate-900">
                                        {product.storageMappings[0].warehouseCode} / {product.storageMappings[0].storageLocationCode}
                                      </p>
                                      <p className="text-xs text-slate-500">
                                        {product.storageMappings[0].warehouseName} • {product.storageMappings.length} mapped location{product.storageMappings.length === 1 ? "" : "s"}
                                      </p>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-slate-400">Not mapped</span>
                                  )}
                                </td>
                                <td className="px-4 py-3.5">
                                  <StatusBadge status={product.status} />
                                </td>
                                <td className="px-4 py-3.5">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <ActionButton title="Edit item" onClick={() => setEditProduct(product)}>
                                      <Pencil className="h-3.5 w-3.5" />
                                    </ActionButton>
                                    <ActionButton
                                      tone="brand"
                                      title="Consume stock"
                                      onClick={() => openAction(product, "consume")}
                                    >
                                      C
                                    </ActionButton>
                                    <ActionButton
                                      tone="brand"
                                      title="Receive stock"
                                      onClick={() => openAction(product, "receive")}
                                    >
                                      R
                                    </ActionButton>
                                    <ActionButton tone="danger" title="Delete item" onClick={() => setDeleteProduct(product)}>
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </ActionButton>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={9} className="px-4 py-14 text-center text-sm text-slate-500">
                              <div className="flex flex-col items-center gap-2">
                                <Package className="h-8 w-8 text-slate-300" />
                                No inventory items matched your filters.
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {pageData ? (
                    <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-slate-500">
                        Showing{" "}
                        <span className="font-semibold text-slate-900">
                          {(pageData.page - 1) * pageData.pageSize + 1}-
                          {Math.min(pageData.page * pageData.pageSize, pageData.total)}
                        </span>{" "}
                        of <span className="font-semibold text-slate-900">{pageData.total}</span> items
                        {selectedProducts.length ? (
                          <span className="ml-2 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
                            {selectedProducts.length} selected
                          </span>
                        ) : null}
                      </p>
                      <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
                        <button
                          type="button"
                          disabled={filter.page === 1}
                          onClick={() => setFilter((prev) => ({ ...prev, page: prev.page - 1 }))}
                          className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="px-2 text-sm font-semibold text-slate-700">
                          Page {pageData.page} of {Math.max(pageData.totalPages, 1)}
                        </span>
                        <button
                          type="button"
                          disabled={filter.page >= pageData.totalPages}
                          onClick={() => setFilter((prev) => ({ ...prev, page: prev.page + 1 }))}
                          className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {selectedProducts.length ? (
                    <div className="sticky bottom-4 z-10 mx-auto mt-4 flex w-fit flex-wrap items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm text-white shadow-2xl">
                      <span className="font-semibold">{selectedProducts.length} item selected</span>
                      <button
                        type="button"
                        onClick={handleExportSelected}
                        className="rounded-lg border border-white/10 bg-white/10 px-3 py-1.5 font-medium transition-colors hover:bg-white/20"
                      >
                        Export selected
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          resetBulkMapForm();
                          setBulkMapOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/10 px-3 py-1.5 font-medium transition-colors hover:bg-white/20"
                      >
                        <WarehouseIcon className="h-3.5 w-3.5" />
                        Map Warehouse
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedProductIds([])}
                        className="rounded-lg border border-white/10 bg-white/10 px-3 py-1.5 font-medium transition-colors hover:bg-white/20"
                      >
                        Clear
                      </button>
                      <button
                        type="button"
                        onClick={() => setBulkDeleteOpen(true)}
                        disabled={deleteMutation.isPending}
                        className="rounded-lg border border-rose-400/20 bg-rose-500/15 px-3 py-1.5 font-medium text-rose-100 transition-colors hover:bg-rose-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedProductIds([])}
                        className="rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                        aria-label="Close bulk action bar"
                      >
                        <X className="h-4 w-4" />
                      </button>
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
                    <tr className="border-b-2 border-slate-200 bg-slate-50">
                      {["Category", "Items", "Total Stock", "Low Stock", "Out of Stock"].map((heading) => (
                        <th
                          key={heading}
                          className="px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500"
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
                          className={`border-b border-slate-100 transition-colors ${
                            selectedCategory === category.category ? "bg-brand-50/50" : "hover:bg-slate-50"
                          }`}
                        >
                          <td className="px-4 py-3">
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
                          <td className="px-4 py-3 text-slate-600">{toNumber(category.productCount)}</td>
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            {toNumber(category.totalStockQty).toLocaleString("en-IN")}
                          </td>
                          <td className="px-4 py-3 text-amber-700">{toNumber(category.lowStockCount)}</td>
                          <td className="px-4 py-3 text-rose-700">{toNumber(category.outOfStockCount)}</td>
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

      <ProductDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        warehouses={warehouseOptions}
        categoryOptions={categoryOptions}
        categoryGroups={categoryGroups}
        onSave={handleCreate}
        isLoading={createMutation.isPending}
      />
      <ProductDialog
        open={!!editProduct}
        onClose={() => setEditProduct(null)}
        product={editProduct}
        warehouses={warehouseOptions}
        categoryOptions={categoryOptions}
        categoryGroups={categoryGroups}
        onSave={handleUpdate}
        isLoading={updateMutation.isPending}
      />
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
      <BulkDeleteDialog
        open={bulkDeleteOpen}
        count={selectedProducts.length}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
        isLoading={deleteMutation.isPending}
      />
      <BulkWarehouseMappingDialog
        open={bulkMapOpen}
        count={selectedProducts.length}
        warehouses={warehouseOptions}
        form={bulkMapForm}
        onChange={setBulkMapForm}
        onClose={() => {
          setBulkMapOpen(false);
          resetBulkMapForm();
        }}
        onSave={handleBulkMapWarehouse}
        isLoading={updateMutation.isPending}
      />
      <AddCategoryDialog
        open={categoryModalOpen}
        form={categoryForm}
        onChange={setCategoryForm}
        onClose={() => {
          setCategoryModalOpen(false);
          resetCategoryForm();
        }}
        onSave={handleCreateCategory}
      />
      <ProductImportModal open={importOpen} onClose={() => setImportOpen(false)} />
    </>
  );
}
