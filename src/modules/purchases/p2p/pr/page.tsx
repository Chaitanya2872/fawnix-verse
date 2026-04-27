import { useEffect, useMemo, useState } from "react";
import {
  ArrowRightCircle,
  BadgeIndianRupee,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  FileClock,
  Loader2,
  Pencil,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  TextCursorInput,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { useCurrentUser } from "@/modules/auth/hooks";
import {
  useCreatePurchaseRequisition,
  useDeletePurchaseRequisition,
  useUploadPurchaseRequisitionDocument,
  useProcurementProducts,
  usePurchaseRequisitions,
  useReviewPurchaseRequisition,
  useSubmitPurchaseRequisition,
  useUpdatePurchaseRequisition,
  useUpdatePurchaseRequisitionBudget,
  useUpdatePurchaseRequisitionEvaluation,
  useUpdatePurchaseRequisitionNegotiation,
  useVendors,
} from "@/modules/purchases/hooks";
import type {
  BudgetContextType,
  PurchaseRequisitionPriority,
  PurchaseRequisition,
  PurchaseRequisitionStatus,
  PurchaseRequisitionType,
  Vendor,
} from "@/modules/purchases/types";
import { P2PCard, P2PFormField, P2PLayout, P2PStatusBadge, P2PTable } from "../components";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function toneForStatus(status: PurchaseRequisitionStatus) {
  switch (status) {
    case "APPROVED":
    case "PO_CREATED":
      return "success";
    case "REJECTED":
      return "danger";
    case "SUBMITTED":
      return "warning";
    default:
      return "neutral";
  }
}

function statusLabel(status: PurchaseRequisitionStatus) {
  return status.replace("_", " ");
}

function requestTypeLabel(requestType: PurchaseRequisitionType) {
  return requestType
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

const PURCHASE_REQUISITION_TYPE_OPTIONS: PurchaseRequisitionType[] = [
  "INTERNAL_USE",
  "FOR_SALE",
  "CUSTOMER",
  "SELF",
  "DEMO",
  "OTHER",
];

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function diffInDays(value?: string | null) {
  if (!value) return null;
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return null;
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const end = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  return Math.round((end - start) / 86_400_000);
}

function deriveBudgetValidationStatus(utilizationPercent: number) {
  if (utilizationPercent > 100) return "Exceeded";
  if (utilizationPercent > 85) return "Near Limit";
  return "Within Budget";
}

function budgetStatusLabel(status: string) {
  switch (status) {
    case "Exceeded":
      return "❌ Exceeded";
    case "Near Limit":
      return "⚠️ Near Limit";
    default:
      return "✅ Within Budget";
  }
}

function fieldShellClass(disabled = false) {
  return `w-full rounded-xl border px-3.5 py-2.5 text-sm text-slate-700 transition focus:outline-none ${
    disabled
      ? "border-slate-200 bg-slate-100 text-slate-400"
      : "border-slate-200 bg-slate-50/80 hover:border-slate-300 focus:border-blue-500 focus:bg-white"
  }`;
}

function workflowStage(requisition: PurchaseRequisition) {
  if (requisition.status === "DRAFT") return "Budget Check";
  if (requisition.status === "SUBMITTED") {
    return requisition.evaluationDecision ? "Negotiation" : "Evaluation";
  }
  if (requisition.status === "APPROVED") return "Ready for PO";
  if (requisition.status === "PO_CREATED") return "Converted to PO";
  return "Closed";
}

type DraftItem = {
  source: "INVENTORY" | "ADHOC";
  productId: string;
  sku: string;
  productName: string;
  category: string;
  unit: string;
  estimatedUnitPrice: number;
  taxPercent: number;
  quantity: number;
  remarks: string;
};

type PanelTab = "overview" | "budget" | "evaluation" | "negotiation";

const emptyDraft: DraftItem = {
  source: "INVENTORY",
  productId: "",
  sku: "",
  productName: "",
  category: "",
  unit: "",
  estimatedUnitPrice: 0,
  taxPercent: 0,
  quantity: 1,
  remarks: "",
};

function CreateRequisitionPanel({
  isEditing,
  currentUserName,
  products,
  isProductsLoading,
  requestType,
  title,
  description,
  department,
  neededByDate,
  priority,
  requestCategory,
  draftItem,
  items,
  subtotalAmount,
  taxAmount,
  grandTotal,
  documentFiles,
  quoteFiles,
  isSavingDraft,
  isSubmittingForApproval,
  errorMessage,
  onClose,
  onRequestTypeChange,
  onTitleChange,
  onDescriptionChange,
  onDepartmentChange,
  onNeededByDateChange,
  onPriorityChange,
  onRequestCategoryChange,
  onDocumentFilesChange,
  onQuoteFilesChange,
  onDraftItemChange,
  onAddItem,
  onRemoveItem,
  onCreate,
}: {
  isEditing: boolean;
  currentUserName?: string;
  products: Array<{
    id: string;
    name: string;
    sku: string;
    price: number;
    category?: string;
    unit?: string;
  }>;
  isProductsLoading: boolean;
  requestType: PurchaseRequisitionType;
  title: string;
  description: string;
  department: string;
  neededByDate: string;
  priority: PurchaseRequisitionPriority;
  requestCategory: string;
  draftItem: DraftItem;
  items: DraftItem[];
  subtotalAmount: number;
  taxAmount: number;
  grandTotal: number;
  documentFiles: File[];
  quoteFiles: File[];
  isSavingDraft: boolean;
  isSubmittingForApproval: boolean;
  errorMessage?: string;
  onClose: () => void;
  onRequestTypeChange: (value: PurchaseRequisitionType) => void;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onDepartmentChange: (value: string) => void;
  onNeededByDateChange: (value: string) => void;
  onPriorityChange: (value: PurchaseRequisitionPriority) => void;
  onRequestCategoryChange: (value: string) => void;
  onDocumentFilesChange: (files: File[]) => void;
  onQuoteFilesChange: (files: File[]) => void;
  onDraftItemChange: (value: DraftItem) => void;
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
  onCreate: (mode: "draft" | "submit") => void;
}) {
  const selectedProduct = products.find((entry) => entry.id === draftItem.productId);

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-slate-950/30 backdrop-blur-[1px]" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 flex h-full w-full flex-col border-l border-slate-200 bg-white shadow-2xl sm:w-[88vw] lg:w-[52vw] lg:max-w-[840px]">
        <div className="border-b border-slate-200 px-4 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Purchase Requisition</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">{isEditing ? "Edit PR" : "Create PR"}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <X className="h-4 w-4" />
              Close
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">Requester</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{currentUserName ?? "Loading user..."}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">PR Number</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{isEditing ? "Existing PR" : "Auto on save"}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Line Items</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{items.length}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <section className="rounded-xl border border-slate-200 bg-white p-3.5">
            <div className="mb-3">
              <h3 className="text-base font-semibold text-slate-900">Basic Info</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
            <P2PFormField label="Title" hint="Short business title for this requisition.">
              <input
                value={title}
                onChange={(event) => onTitleChange(event.target.value)}
                placeholder="Warehouse barcode scanners"
                className={fieldShellClass()}
              />
            </P2PFormField>

            <P2PFormField label="Request Type" hint="Classify the business intent behind this purchase.">
              <div className="relative">
                <select
                  value={requestType}
                  onChange={(event) => onRequestTypeChange(event.target.value as PurchaseRequisitionType)}
                  className={`${fieldShellClass()} appearance-none pr-10`}
                >
                  {PURCHASE_REQUISITION_TYPE_OPTIONS.map((type) => (
                    <option key={type} value={type}>
                      {requestTypeLabel(type)}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </P2PFormField>

            <P2PFormField label="Priority" hint="Operational urgency of this request.">
              <div className="relative">
                <select
                  value={priority}
                  onChange={(event) => onPriorityChange(event.target.value as PurchaseRequisitionPriority)}
                  className={`${fieldShellClass()} appearance-none pr-10`}
                >
                  {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((entry) => (
                    <option key={entry} value={entry}>
                      {entry.charAt(0) + entry.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </P2PFormField>

            <P2PFormField label="Department" hint="Business function raising the request.">
              <div className="relative">
                <TextCursorInput className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={department}
                  onChange={(event) => onDepartmentChange(event.target.value)}
                  placeholder="Operations"
                  className={`${fieldShellClass()} pl-11`}
                />
              </div>
            </P2PFormField>

            <P2PFormField label="Category" hint="Requirement category for this requisition.">
              <input
                value={requestCategory}
                onChange={(event) => onRequestCategoryChange(event.target.value)}
                placeholder="Hardware / Software / Service"
                className={fieldShellClass()}
              />
            </P2PFormField>

            <P2PFormField label="Needed By" hint="Target date for business consumption.">
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  value={neededByDate}
                  onChange={(event) => onNeededByDateChange(event.target.value)}
                  className={`${fieldShellClass()} pl-11`}
                />
              </div>
            </P2PFormField>

            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-3.5">
            <div className="mb-3">
              <h3 className="text-base font-semibold text-slate-900">Requirement Details</h3>
            </div>
            <P2PFormField label="Description / Justification" hint="Describe why this purchase is needed.">
              <textarea
                rows={4}
                value={description}
                onChange={(event) => onDescriptionChange(event.target.value)}
                placeholder="Procure barcode scanners for the new warehouse dispatch lane."
                className={fieldShellClass()}
              />
            </P2PFormField>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Items Table</h3>
                <p className="text-xs text-slate-500">Add item, quantity, tax, and amount.</p>
              </div>
              {isProductsLoading ? (
                <span className="inline-flex items-center gap-2 text-xs text-slate-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Loading products...
                </span>
              ) : null}
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="relative">
                <select
                  value={draftItem.source}
                  onChange={(event) =>
                    onDraftItemChange({
                      ...emptyDraft,
                      source: event.target.value as DraftItem["source"],
                      quantity: draftItem.quantity,
                    })
                  }
                  className={`${fieldShellClass()} appearance-none pr-10`}
                >
                  <option value="INVENTORY">Inventory Item</option>
                  <option value="ADHOC">Other / Ad Hoc Item</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>

              {draftItem.source === "INVENTORY" ? (
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <select
                    value={draftItem.productId}
                    onChange={(event) => {
                      const product = products.find((entry) => entry.id === event.target.value);
                      onDraftItemChange({
                        ...draftItem,
                        productId: event.target.value,
                        sku: product?.sku ?? "",
                        productName: product?.name ?? "",
                        category: product?.category ?? "",
                        unit: product?.unit ?? "",
                        estimatedUnitPrice: product?.price ?? 0,
                      });
                    }}
                    className={`${fieldShellClass()} appearance-none pl-11 pr-10`}
                  >
                    <option value="">Select product</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} ({product.sku})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              ) : (
                <input
                  value={draftItem.productName}
                  onChange={(event) => onDraftItemChange({ ...draftItem, productName: event.target.value })}
                  placeholder="Item name"
                  className={fieldShellClass()}
                />
              )}

              {draftItem.source === "ADHOC" ? (
                <>
                  <input
                    value={draftItem.sku}
                    onChange={(event) => onDraftItemChange({ ...draftItem, sku: event.target.value })}
                    placeholder="SKU / reference (optional)"
                    className={fieldShellClass()}
                  />
                  <input
                    value={draftItem.category}
                    onChange={(event) => onDraftItemChange({ ...draftItem, category: event.target.value })}
                    placeholder="Category"
                    className={fieldShellClass()}
                  />
                  <input
                    value={draftItem.unit}
                    onChange={(event) => onDraftItemChange({ ...draftItem, unit: event.target.value })}
                    placeholder="Unit"
                    className={fieldShellClass()}
                  />
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={draftItem.estimatedUnitPrice}
                    onChange={(event) => onDraftItemChange({ ...draftItem, estimatedUnitPrice: Number(event.target.value) || 0 })}
                    className={fieldShellClass()}
                  />
                </>
              ) : (
                <>
                  <input value={selectedProduct?.sku ?? draftItem.sku} disabled className={fieldShellClass(true)} />
                  <input value={selectedProduct?.unit ?? draftItem.unit} disabled className={fieldShellClass(true)} />
                </>
              )}

              <input
                type="number"
                min={1}
                value={draftItem.quantity}
                onChange={(event) => onDraftItemChange({ ...draftItem, quantity: Number(event.target.value) || 1 })}
                placeholder="Quantity"
                className={fieldShellClass()}
              />

              <input
                type="number"
                min={0}
                step="0.01"
                value={draftItem.taxPercent}
                onChange={(event) => onDraftItemChange({ ...draftItem, taxPercent: Number(event.target.value) || 0 })}
                placeholder="Tax %"
                className={fieldShellClass()}
              />

              <input
                value={draftItem.remarks}
                onChange={(event) => onDraftItemChange({ ...draftItem, remarks: event.target.value })}
                placeholder="Item description"
                className={fieldShellClass()}
              />

              <button
                type="button"
                onClick={onAddItem}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-4">
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Unit Price</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {formatCurrency(
                    draftItem.source === "INVENTORY"
                      ? selectedProduct?.price ?? draftItem.estimatedUnitPrice
                      : draftItem.estimatedUnitPrice
                  )}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Quantity</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{draftItem.quantity}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Tax</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{formatPercent(draftItem.taxPercent)}</p>
              </div>
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">Line Total</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {formatCurrency(
                    (() => {
                      const unitPrice =
                        draftItem.source === "INVENTORY"
                          ? selectedProduct?.price ?? draftItem.estimatedUnitPrice
                          : draftItem.estimatedUnitPrice;
                      const baseAmount = unitPrice * draftItem.quantity;
                      return baseAmount + baseAmount * (draftItem.taxPercent / 100);
                    })()
                  )}
                </p>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
              {items.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-slate-500">
                  No items added yet. Start with a product, quantity, and any remarks.
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {items.map((item, index) => {
                    const product = products.find((entry) => entry.id === item.productId);
                    const unitPrice =
                      item.source === "INVENTORY"
                        ? product?.price ?? item.estimatedUnitPrice
                        : item.estimatedUnitPrice;
                    const lineSubtotal = unitPrice * item.quantity;
                    const lineTotal = lineSubtotal + lineSubtotal * (item.taxPercent / 100);
                    return (
                      <div key={`${item.productId}-${index}`} className="flex items-center justify-between gap-4 px-4 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">{product?.name ?? item.productName}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {product?.sku ?? "Unknown SKU"} · Qty {item.quantity}
                            {item.remarks ? ` · ${item.remarks}` : ""}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Unit Price {formatCurrency(unitPrice)} | Subtotal {formatCurrency(lineSubtotal)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="text-sm font-semibold text-slate-900">{formatCurrency(lineTotal)}</p>
                          <button
                            type="button"
                            onClick={() => onRemoveItem(index)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Remove
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          <section className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Subtotal</p>
              <p className="mt-2 text-xl font-semibold text-slate-900">{formatCurrency(subtotalAmount)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Tax</p>
              <p className="mt-2 text-xl font-semibold text-slate-900">{formatCurrency(taxAmount)}</p>
            </div>
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-3.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Grand Total</p>
              <p className="mt-2 text-xl font-semibold text-slate-900">{formatCurrency(grandTotal)}</p>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-3.5">
            <div className="mb-3">
              <h3 className="text-base font-semibold text-slate-900">Attachments</h3>
              <p className="mt-1 text-sm text-slate-500">Documents and optional quotes.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <P2PFormField label="Documents" hint="Requirement documents, approvals, or supporting files.">
                <input
                  type="file"
                  multiple
                  onChange={(event) => onDocumentFilesChange(Array.from(event.target.files ?? []))}
                  className={fieldShellClass()}
                />
              </P2PFormField>
              <P2PFormField label="Quotes" hint="Optional vendor or reference quotations.">
                <input
                  type="file"
                  multiple
                  onChange={(event) => onQuoteFilesChange(Array.from(event.target.files ?? []))}
                  className={fieldShellClass()}
                />
              </P2PFormField>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Selected Documents</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{documentFiles.length}</p>
                <p className="mt-1 text-xs text-slate-500">{documentFiles.map((file) => file.name).join(", ") || "No documents selected"}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Selected Quotes</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{quoteFiles.length}</p>
                <p className="mt-1 text-xs text-slate-500">{quoteFiles.map((file) => file.name).join(", ") || "No quotes selected"}</p>
              </div>
            </div>
          </section>
        </div>

        <div className="border-t border-slate-200 bg-white px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Grand Total</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{formatCurrency(grandTotal)}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => onCreate("draft")}
                disabled={!title.trim() || !department.trim() || items.length === 0 || isSavingDraft || isSubmittingForApproval}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {isSavingDraft ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {isEditing ? "Save Changes" : "Save Draft"}
              </button>
              <button
                type="button"
                onClick={() => onCreate("submit")}
                disabled={!title.trim() || !department.trim() || items.length === 0 || isSavingDraft || isSubmittingForApproval}
                className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmittingForApproval ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Submit for Approval
              </button>
            </div>
          </div>
          {errorMessage ? <p className="mt-3 text-sm text-rose-600">{errorMessage}</p> : null}
        </div>
      </div>
    </div>
  );
}

function RequisitionDetailPanel({
  requisition,
  vendors,
  currentUserId,
  onClose,
  onSubmit,
  onApprove,
  onReject,
  onSaveBudget,
  onSaveEvaluation,
  onSaveNegotiation,
  isSubmitting,
  isReviewing,
  isSavingBudget,
  isSavingEvaluation,
  isSavingNegotiation,
}: {
  requisition: PurchaseRequisition;
  vendors: Vendor[];
  currentUserId?: string;
  onClose: () => void;
  onSubmit: (id: string, actorId: string) => void;
  onApprove: (id: string, actorId: string, remarks?: string) => void;
  onReject: (id: string, actorId: string, remarks?: string) => void;
  onSaveBudget: (
    id: string,
    payload: {
      budgetName?: string;
      budgetType?: BudgetContextType;
      budgetPeriod?: string;
      allocatedBudget?: number;
      committedAmount?: number;
      actualSpend?: number;
      validationNotes?: string;
      exceptionJustification?: string;
    }
  ) => void;
  onSaveEvaluation: (id: string, decision?: string, notes?: string) => void;
  onSaveNegotiation: (
    id: string,
    vendorId?: string,
    negotiatedAmount?: number,
    deliveryTimeline?: string,
    paymentTerms?: string,
    discountPercent?: number,
    discountAmount?: number,
    notes?: string
  ) => void;
  isSubmitting: boolean;
  isReviewing: boolean;
  isSavingBudget: boolean;
  isSavingEvaluation: boolean;
  isSavingNegotiation: boolean;
}) {
  const [activeTab, setActiveTab] = useState<PanelTab>("overview");
  const [budgetName, setBudgetName] = useState("");
  const [budgetType, setBudgetType] = useState<BudgetContextType>("DEPARTMENT");
  const [budgetPeriod, setBudgetPeriod] = useState("");
  const [allocatedBudget, setAllocatedBudget] = useState("");
  const [committedAmount, setCommittedAmount] = useState("");
  const [actualSpend, setActualSpend] = useState("");
  const [budgetValidationNotes, setBudgetValidationNotes] = useState("");
  const [budgetExceptionJustification, setBudgetExceptionJustification] = useState("");
  const [evaluationRemarks, setEvaluationRemarks] = useState("");
  const [readinessDecision, setReadinessDecision] = useState("Proceed to negotiation");
  const [negotiationVendorId, setNegotiationVendorId] = useState("");
  const [quotedAmount, setQuotedAmount] = useState(requisition.totalAmount.toFixed(2));
  const [negotiationDeliveryTimeline, setNegotiationDeliveryTimeline] = useState("");
  const [negotiationPaymentTerms, setNegotiationPaymentTerms] = useState("");
  const [negotiationDiscountPercent, setNegotiationDiscountPercent] = useState("");
  const [negotiationDiscountAmount, setNegotiationDiscountAmount] = useState("");
  const [negotiationTerms, setNegotiationTerms] = useState("");

  useEffect(() => {
    setActiveTab("overview");
    setBudgetName(requisition.budgetName ?? "");
    setBudgetType(requisition.budgetType ?? "DEPARTMENT");
    setBudgetPeriod(requisition.budgetPeriod ?? "");
    setAllocatedBudget(requisition.allocatedBudget?.toFixed(2) ?? "");
    setCommittedAmount(requisition.committedAmount?.toFixed(2) ?? "");
    setActualSpend(requisition.actualSpend?.toFixed(2) ?? "");
    setBudgetValidationNotes(requisition.budgetValidationNotes ?? "");
    setBudgetExceptionJustification(requisition.budgetExceptionJustification ?? "");
    setEvaluationRemarks(requisition.evaluationNotes ?? "");
    setReadinessDecision(requisition.evaluationDecision ?? "Proceed to negotiation");
    setNegotiationVendorId(requisition.negotiationVendorId ?? "");
    setQuotedAmount((requisition.negotiatedAmount ?? requisition.totalAmount).toFixed(2));
    setNegotiationDeliveryTimeline(requisition.negotiationDeliveryTimeline ?? "");
    setNegotiationPaymentTerms(requisition.negotiationPaymentTerms ?? "");
    setNegotiationDiscountPercent(requisition.negotiationDiscountPercent?.toFixed(2) ?? "");
    setNegotiationDiscountAmount(requisition.negotiationDiscountAmount?.toFixed(2) ?? "");
    setNegotiationTerms(requisition.negotiationNotes ?? "");
  }, [requisition]);

  const budgetState =
    requisition.status === "DRAFT"
      ? "Draft request not yet sent for budget review."
      : requisition.status === "SUBMITTED"
        ? "Awaiting validation against approval workflow and budget thresholds."
        : requisition.status === "APPROVED" || requisition.status === "PO_CREATED"
          ? "Budget check cleared through approval workflow."
          : "Budget review closed.";

  const negotiationState =
    requisition.status === "APPROVED" || requisition.status === "PO_CREATED"
      ? `${vendors.length} vendors available for commercial discussion.`
      : "Negotiation opens after requisition approval.";

  const canReview = requisition.status === "SUBMITTED" && !!currentUserId;
  const canNegotiate = requisition.status === "APPROVED" || requisition.status === "PO_CREATED";
  const selectedVendor = vendors.find((vendor) => vendor.id === negotiationVendorId) ?? null;
  const isReadyForPo =
    requisition.status === "APPROVED" &&
    !!requisition.evaluationDecision &&
    (!!requisition.negotiationVendorId || !!selectedVendor) &&
    (!!requisition.negotiatedAmount || !!quotedAmount);

  const parsedAllocatedBudget = Number(allocatedBudget) || 0;
  const parsedCommittedAmount = Number(committedAmount) || 0;
  const parsedActualSpend = Number(actualSpend) || 0;

  const budgetMetrics = useMemo(() => {
    const itemCount = requisition.items.length;
    const allocated = parsedAllocatedBudget;
    const committed = parsedCommittedAmount;
    const spent = parsedActualSpend;
    const totalAmount = requisition.totalAmount;
    const inventoryItems = requisition.items.filter((item) => !!item.productId).length;
    const adHocItems = itemCount - inventoryItems;
    const inventoryShare = itemCount > 0 ? (inventoryItems / itemCount) * 100 : 0;
    const adHocShare = itemCount > 0 ? (adHocItems / itemCount) * 100 : 0;
    const availableBudget = allocated - committed - spent;
    const availableAfterPr = availableBudget - totalAmount;
    const utilizationPercent = allocated > 0 ? ((committed + spent + totalAmount) / allocated) * 100 : 0;
    const largestLineItem = requisition.items.reduce((largest, item) => {
      if (!largest || item.lineTotal > largest.lineTotal) {
        return item;
      }
      return largest;
    }, requisition.items[0] ?? null);
    const averageLineValue = itemCount > 0 ? totalAmount / itemCount : 0;
    const daysToNeed = diffInDays(requisition.neededByDate);
    const lineConcentrationPercent =
      totalAmount > 0 && largestLineItem ? (largestLineItem.lineTotal / totalAmount) * 100 : 0;
    const exceptionSignals: string[] = [];

    if (allocated <= 0) {
      exceptionSignals.push("Allocated budget is missing. Finance context must be captured before approval.");
    } else if (availableAfterPr < 0) {
      exceptionSignals.push("Requested amount exceeds the available budget balance.");
    } else if (utilizationPercent > 85) {
      exceptionSignals.push("Requested amount is nearing the allocated budget ceiling.");
    }
    if (adHocShare >= 50) {
      exceptionSignals.push("More than half of the request is ad hoc instead of mapped inventory.");
    }
    if (largestLineItem && lineConcentrationPercent >= 45) {
      exceptionSignals.push(`A single line item drives ${formatPercent(lineConcentrationPercent)} of request value.`);
    }
    if (daysToNeed !== null && daysToNeed <= 3) {
      exceptionSignals.push("Needed-by date is within three days and should be treated as expedited.");
    }
    if (itemCount >= 8) {
      exceptionSignals.push("High line-item count may require deeper budget split validation.");
    }

    let systemVerdict = "Within policy guardrails";
    let toneClass = "border-emerald-200 bg-emerald-50 text-emerald-700";
    if (availableAfterPr < 0 || exceptionSignals.length >= 3) {
      systemVerdict = "Escalate for exception approval";
      toneClass = "border-rose-200 bg-rose-50 text-rose-700";
    } else if (utilizationPercent > 85 || exceptionSignals.length > 0) {
      systemVerdict = "Needs reviewer attention";
      toneClass = "border-amber-200 bg-amber-50 text-amber-700";
    }

    const autoApprovalSummary = [
      `allocated ${formatCurrency(allocated)}`,
      `available ${formatCurrency(availableBudget)}`,
      `utilization ${formatPercent(utilizationPercent)}`,
      `inventory mix ${formatPercent(inventoryShare)}`,
      daysToNeed !== null ? `need-by in ${daysToNeed} day(s)` : "need-by date not set",
    ].join(" | ");

    return {
      allocated,
      committed,
      spent,
      availableBudget,
      availableAfterPr,
      utilizationPercent,
      inventoryItems,
      adHocItems,
      inventoryShare,
      adHocShare,
      largestLineItem,
      averageLineValue,
      lineConcentrationPercent,
      daysToNeed,
      exceptionSignals,
      systemVerdict,
      toneClass,
      autoApprovalSummary,
    };
  }, [parsedAllocatedBudget, parsedCommittedAmount, parsedActualSpend, requisition]);
  const budgetValidationStatus = deriveBudgetValidationStatus(budgetMetrics.utilizationPercent);

  const tabs: Array<{ key: PanelTab; label: string }> = [
    { key: "overview", label: "PR Form" },
    { key: "budget", label: "Budget Check" },
    { key: "evaluation", label: "Vendor Evaluation" },
    { key: "negotiation", label: "Negotiation" },
  ];

  const approvalRemarks = [budgetMetrics.autoApprovalSummary, budgetValidationNotes.trim(), budgetExceptionJustification.trim()]
    .filter(Boolean)
    .join(" | ");

  const rejectionRemarks =
    budgetExceptionJustification.trim() ||
    budgetValidationNotes.trim() ||
    `Rejected during financial validation. ${budgetMetrics.autoApprovalSummary}`;

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 flex h-full w-full flex-col border-l border-slate-200 bg-white shadow-2xl sm:w-[86vw] lg:w-[58vw] lg:max-w-[960px]">
        <div className="border-b border-slate-200 px-4 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-sm font-semibold text-slate-700">
                {requisition.department.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold text-slate-900">{requisition.prNumber}</h2>
                  <P2PStatusBadge
                    label={requisition.status.replace("_", " ")}
                    tone={toneForStatus(requisition.status)}
                  />
                  {requisition.currentStepOrder ? (
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                      Step {requisition.currentStepOrder}
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  {requestTypeLabel(requisition.requestType)} · {requisition.department} · {formatCurrency(requisition.totalAmount)} · {requisition.items.length} item(s)
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Requester {requisition.requesterId} · Needed by {formatDate(requisition.neededByDate)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <X className="h-4 w-4" />
              Close
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2.5">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  activeTab === tab.key
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {activeTab === "overview" ? (
            <>
              <section className="rounded-xl border border-slate-200 bg-white p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">Current Action</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {requisition.status === "DRAFT"
                        ? "This PR is still a draft. Submit it to start approval."
                        : requisition.status === "SUBMITTED"
                          ? "This PR is waiting for approval action."
                          : requisition.status === "APPROVED"
                            ? "This PR is approved and ready for downstream procurement steps."
                            : requisition.status === "REJECTED"
                              ? "This PR has been rejected."
                              : "This PR has already moved to PO stage."}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {requisition.status === "DRAFT" ? (
                      <button
                        type="button"
                        onClick={() => currentUserId && onSubmit(requisition.id, currentUserId)}
                        disabled={!currentUserId || isSubmitting}
                        className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        Submit for Approval
                      </button>
                    ) : null}
                    {canReview ? (
                      <>
                        <button
                          type="button"
                          onClick={() => currentUserId && onApprove(requisition.id, currentUserId, approvalRemarks)}
                          disabled={isReviewing || budgetValidationStatus === "Exceeded"}
                          className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                        >
                          {isReviewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => currentUserId && onReject(requisition.id, currentUserId, rejectionRemarks)}
                          disabled={isReviewing}
                          className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              </section>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Priority</p>
                  <p className="mt-3 text-sm font-semibold text-slate-900">{requisition.priority}</p>
                  <p className="mt-2 text-xs text-slate-500">Needed by {formatDate(requisition.neededByDate)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Requirement Category</p>
                  <p className="mt-3 text-sm font-semibold text-slate-900">{requisition.requestCategory || "Unclassified"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Current Status</p>
                  <div className="mt-3">
                    <P2PStatusBadge
                      label={requisition.status.replace("_", " ")}
                      tone={toneForStatus(requisition.status)}
                    />
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-500">{workflowStage(requisition)}</p>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <section className="rounded-xl border border-slate-200 bg-white p-3.5">
                  <h3 className="text-base font-semibold text-slate-900">Basic Info</h3>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Requester ID</p>
                      <p className="mt-1 text-sm text-slate-700">{requisition.requesterId}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Request Type</p>
                      <p className="mt-1 text-sm text-slate-700">{requestTypeLabel(requisition.requestType)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Department</p>
                      <p className="mt-1 text-sm text-slate-700">{requisition.department}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Required Date</p>
                      <p className="mt-1 text-sm text-slate-700">{formatDate(requisition.neededByDate)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Created</p>
                      <p className="mt-1 text-sm text-slate-700">{formatDate(requisition.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Updated</p>
                      <p className="mt-1 text-sm text-slate-700">{formatDate(requisition.updatedAt)}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Description / Justification</p>
                      <p className="mt-1 text-sm text-slate-700">{requisition.description || "No description entered."}</p>
                    </div>
                  </div>
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-3.5">
                  <h3 className="text-base font-semibold text-slate-900">Requirement Details</h3>
                  <div className="mt-3 space-y-3">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Title</p>
                      <p className="mt-2 text-sm text-slate-700">{requisition.title}</p>
                    </div>
                    {requisition.rejectionReason ? (
                      <div className="rounded-xl border border-rose-100 bg-rose-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">Last rejection note</p>
                        <p className="mt-2 text-sm text-slate-700">{requisition.rejectionReason}</p>
                      </div>
                    ) : null}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Saved Evaluation</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {requisition.evaluationDecision || "No evaluation decision saved"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {requisition.evaluationNotes || "No evaluation notes yet."}
                      </p>
                    </div>
                  </div>
                </section>
              </div>

              <section className="rounded-xl border border-slate-200 bg-white p-3.5">
                <h3 className="text-base font-semibold text-slate-900">Items Table</h3>
                <div className="mt-3 space-y-2.5">
                  {requisition.items.map((item) => (
                    <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{item.productName}</p>
                          <p className="text-xs text-slate-500">
                            {(item.sku || "No SKU")} · {item.unit} · {item.productId ? "Inventory" : "Ad hoc"}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-slate-900">{formatCurrency(item.lineTotal)}</p>
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        Qty {item.quantity} · Unit Price {formatCurrency(item.estimatedUnitPrice)}
                      </p>
                      {item.remarks ? <p className="mt-2 text-xs text-slate-500">Note: {item.remarks}</p> : null}
                    </div>
                  ))}
                </div>
              </section>
            </>
          ) : null}

          {activeTab === "budget" ? (
            <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
              <section className="rounded-xl border border-slate-200 bg-white p-3.5">
                <h3 className="text-base font-semibold text-slate-900">Budget Context</h3>
                <div className="mt-1 text-xs text-slate-500">Capture the budget reference details for this requisition.</div>
                <div className="mt-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <P2PFormField label="Budget Name">
                      <input
                        value={budgetName}
                        onChange={(event) => setBudgetName(event.target.value)}
                        placeholder="Enter budget name"
                        className={fieldShellClass()}
                      />
                    </P2PFormField>
                    <P2PFormField label="Budget Type">
                      <div className="relative">
                        <select
                          value={budgetType}
                          onChange={(event) => setBudgetType(event.target.value as BudgetContextType)}
                          className={`${fieldShellClass()} appearance-none pr-10`}
                        >
                          <option value="DEPARTMENT">Department</option>
                          <option value="PROJECT">Project</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      </div>
                    </P2PFormField>
                    <div className="md:col-span-2">
                      <P2PFormField label="Period">
                        <input
                          value={budgetPeriod}
                          onChange={(event) => setBudgetPeriod(event.target.value)}
                          placeholder="Apr 2026 / FY 2026-27"
                          className={fieldShellClass()}
                        />
                      </P2PFormField>
                    </div>
                    <P2PFormField label="Allocated Budget">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={allocatedBudget}
                        onChange={(event) => setAllocatedBudget(event.target.value)}
                        placeholder="0.00"
                        className={fieldShellClass()}
                      />
                    </P2PFormField>
                    <P2PFormField label="Committed Amount">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={committedAmount}
                        onChange={(event) => setCommittedAmount(event.target.value)}
                        placeholder="0.00"
                        className={fieldShellClass()}
                      />
                    </P2PFormField>
                    <div className="md:col-span-2">
                      <P2PFormField label="Actual Spend">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={actualSpend}
                          onChange={(event) => setActualSpend(event.target.value)}
                          placeholder="0.00"
                          className={fieldShellClass()}
                        />
                      </P2PFormField>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-3.5">
                <h3 className="text-base font-semibold text-slate-900">Budget Check Form</h3>
                <div className="mt-1 text-xs text-slate-500">Enter finance values on the left. Review calculated impact on the right.</div>

                <div className="mt-3 space-y-3">
                  <div className="grid gap-3">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Available Budget</p>
                      <p className="mt-3 text-2xl font-semibold text-slate-900">{formatCurrency(budgetMetrics.availableBudget)}</p>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 min-h-[96px]">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">PR Amount</p>
                      <p className="mt-3 text-lg font-semibold text-slate-900">{formatCurrency(requisition.totalAmount)}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 min-h-[96px]">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Available After PR</p>
                      <p className={`mt-3 text-lg font-semibold ${budgetMetrics.availableAfterPr >= 0 ? "text-slate-900" : "text-rose-600"}`}>
                        {formatCurrency(budgetMetrics.availableAfterPr)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 min-h-[96px]">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Validation Result</p>
                      <p className="mt-3 text-lg font-semibold text-slate-900">{budgetStatusLabel(budgetValidationStatus)}</p>
                      <p className="mt-2 text-xs text-slate-500">{budgetState}</p>
                    </div>
                  </div>

                  <P2PFormField label="Validation Notes" hint="Reviewer context or approval rationale.">
                    <textarea
                      rows={4}
                      value={budgetValidationNotes}
                      onChange={(event) => setBudgetValidationNotes(event.target.value)}
                      placeholder="Capture reviewer validation notes."
                      className={fieldShellClass()}
                    />
                  </P2PFormField>

                  <P2PFormField label="Exception Justification" hint="Required when the requisition exceeds or nears budget.">
                    <textarea
                      rows={4}
                      value={budgetExceptionJustification}
                      onChange={(event) => setBudgetExceptionJustification(event.target.value)}
                      placeholder="Capture exception justification when needed."
                      className={fieldShellClass()}
                    />
                  </P2PFormField>

                  <button
                    type="button"
                      onClick={() =>
                      onSaveBudget(requisition.id, {
                        budgetName: budgetName.trim() || undefined,
                        budgetType: budgetType || undefined,
                        budgetPeriod: budgetPeriod.trim() || undefined,
                        allocatedBudget: allocatedBudget ? Number(allocatedBudget) : undefined,
                        committedAmount: committedAmount ? Number(committedAmount) : undefined,
                        actualSpend: actualSpend ? Number(actualSpend) : undefined,
                        validationNotes: budgetValidationNotes.trim() || undefined,
                        exceptionJustification: budgetExceptionJustification.trim() || undefined,
                      })
                    }
                    disabled={isSavingBudget}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
                  >
                    {isSavingBudget ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Save Remarks
                  </button>

                  {requisition.status === "DRAFT" ? (
                    <button
                      type="button"
                      onClick={() => currentUserId && onSubmit(requisition.id, currentUserId)}
                      disabled={!currentUserId || isSubmitting}
                      className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Submit for Approval
                    </button>
                  ) : null}

                  {canReview ? (
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          currentUserId &&
                          onApprove(requisition.id, currentUserId, approvalRemarks)
                        }
                        disabled={isReviewing || budgetValidationStatus === "Exceeded"}
                        className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        {isReviewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onSaveBudget(requisition.id, {
                            budgetName: budgetName.trim() || undefined,
                            budgetType: budgetType || undefined,
                            budgetPeriod: budgetPeriod.trim() || undefined,
                            allocatedBudget: allocatedBudget ? Number(allocatedBudget) : undefined,
                            committedAmount: committedAmount ? Number(committedAmount) : undefined,
                            actualSpend: actualSpend ? Number(actualSpend) : undefined,
                            validationNotes: budgetValidationNotes.trim() || undefined,
                            exceptionJustification: budgetExceptionJustification.trim() || undefined,
                          })
                        }
                        disabled={budgetValidationStatus !== "Exceeded" || isSavingBudget}
                        className="inline-flex items-center gap-2 rounded-full border border-amber-200 px-4 py-2 text-sm font-semibold text-amber-600 disabled:opacity-50"
                      >
                        Escalate
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          currentUserId &&
                          onReject(requisition.id, currentUserId, rejectionRemarks)
                        }
                        disabled={isReviewing}
                        className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                      {requisition.status === "APPROVED" || requisition.status === "PO_CREATED"
                        ? "Budget validation is already complete for this request."
                        : requisition.status === "REJECTED"
                          ? "This request has already been rejected."
                          : "Submit this draft request first to open approval actions."}
                    </div>
                  )}
                </div>
              </section>
            </div>
          ) : null}

          {activeTab === "evaluation" ? (
            <div className="grid gap-4">
              <section className="rounded-xl border border-slate-200 bg-white p-3.5">
                <h3 className="text-base font-semibold text-slate-900">Vendor Evaluation Form</h3>

                <div className="mt-3 space-y-3">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">PR Number</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">{requisition.prNumber}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Items Summary</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">{requisition.items.length} item(s)</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Request Value</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">{formatCurrency(requisition.totalAmount)}</p>
                    </div>
                  </div>

                  <P2PFormField label="Evaluation Decision" hint="Choose the sourcing direction for the next stage.">
                    <div className="relative">
                      <select
                        value={readinessDecision}
                        onChange={(event) => setReadinessDecision(event.target.value)}
                        className={`${fieldShellClass()} appearance-none pr-10`}
                      >
                        <option>Proceed to negotiation</option>
                        <option>Need alternate specifications</option>
                        <option>Need stock or vendor recheck</option>
                        <option>Hold for business clarification</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                  </P2PFormField>

                  <P2PFormField label="Evaluation Notes" hint="Leave a clear trail for sourcing, approvals, and PO creation.">
                    <textarea
                      rows={7}
                      value={evaluationRemarks}
                      onChange={(event) => setEvaluationRemarks(event.target.value)}
                      placeholder="Record technical review, sourcing observations, urgency, alternate make suggestions, or dependency notes."
                      className={fieldShellClass()}
                    />
                  </P2PFormField>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        onSaveEvaluation(
                          requisition.id,
                          readinessDecision.trim() || undefined,
                          evaluationRemarks.trim() || undefined
                        )
                      }
                      disabled={isSavingEvaluation}
                      className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {isSavingEvaluation ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Submit for Negotiation
                    </button>
                    <span className="text-xs text-slate-500">
                      Last saved {formatDate(requisition.evaluationUpdatedAt)}
                    </span>
                  </div>

                </div>
              </section>
            </div>
          ) : null}

          {activeTab === "negotiation" ? (
            <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
              <section className="rounded-xl border border-slate-200 bg-white p-3.5">
                <h3 className="text-base font-semibold text-slate-900">Negotiation Readiness</h3>
                <div className="mt-3 space-y-3">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Commercial Track</p>
                    <p className="mt-2 text-sm text-slate-700">{negotiationState}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Evaluation Decision</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {requisition.evaluationDecision || "No saved decision"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {requisition.evaluationNotes || "No evaluation notes captured yet."}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Available Vendors</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">{vendors.length}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Target Spend</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">{formatCurrency(requisition.totalAmount)}</p>
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-3.5">
                <h3 className="text-base font-semibold text-slate-900">Negotiation Form</h3>

                <div className="mt-3 space-y-3">
                  <P2PFormField label="Selected Vendor Info" hint="Lock the preferred supplier for PO preparation.">
                    <div className="relative">
                      <select
                        value={negotiationVendorId}
                        onChange={(event) => setNegotiationVendorId(event.target.value)}
                        disabled={!canNegotiate}
                        className={`${fieldShellClass(!canNegotiate)} appearance-none pr-10`}
                      >
                        <option value="">Select vendor</option>
                        {vendors.map((vendor) => (
                          <option key={vendor.id} value={vendor.id}>
                            {vendor.vendorName} ({vendor.vendorCode})
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                  </P2PFormField>

                  <P2PFormField label="Negotiated Price" hint="Use the commercial amount that should carry into the PO handoff.">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={quotedAmount}
                      onChange={(event) => setQuotedAmount(event.target.value)}
                      disabled={!canNegotiate}
                      className={fieldShellClass(!canNegotiate)}
                    />
                  </P2PFormField>

                  <div className="grid gap-4 md:grid-cols-2">
                    <P2PFormField label="Delivery Timeline" hint="Committed delivery timeline from the vendor.">
                      <input
                        value={negotiationDeliveryTimeline}
                        onChange={(event) => setNegotiationDeliveryTimeline(event.target.value)}
                        disabled={!canNegotiate}
                        className={fieldShellClass(!canNegotiate)}
                      />
                    </P2PFormField>
                    <P2PFormField label="Payment Terms" hint="Final agreed payment terms.">
                      <input
                        value={negotiationPaymentTerms}
                        onChange={(event) => setNegotiationPaymentTerms(event.target.value)}
                        disabled={!canNegotiate}
                        className={fieldShellClass(!canNegotiate)}
                      />
                    </P2PFormField>
                    <P2PFormField label="Discount %" hint="Negotiated percentage discount if any.">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={negotiationDiscountPercent}
                        onChange={(event) => setNegotiationDiscountPercent(event.target.value)}
                        disabled={!canNegotiate}
                        className={fieldShellClass(!canNegotiate)}
                      />
                    </P2PFormField>
                    <P2PFormField label="Discount Amount" hint="Negotiated flat discount if any.">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={negotiationDiscountAmount}
                        onChange={(event) => setNegotiationDiscountAmount(event.target.value)}
                        disabled={!canNegotiate}
                        className={fieldShellClass(!canNegotiate)}
                      />
                    </P2PFormField>
                  </div>

                  <P2PFormField label="Negotiation Notes" hint="Capture commitments, concessions, lead times, and payment terms.">
                    <textarea
                      rows={6}
                      value={negotiationTerms}
                      onChange={(event) => setNegotiationTerms(event.target.value)}
                      disabled={!canNegotiate}
                      placeholder="Capture quote revisions, delivery commitments, payment terms, and concessions."
                      className={fieldShellClass(!canNegotiate)}
                    />
                  </P2PFormField>

                  {selectedVendor ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Selected Vendor Snapshot</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">{selectedVendor.vendorName}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {selectedVendor.email || "No email"} · {selectedVendor.phone || "No phone"}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {[selectedVendor.city, selectedVendor.state, selectedVendor.country].filter(Boolean).join(", ") || "No address"}
                      </p>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        onSaveNegotiation(
                          requisition.id,
                          negotiationVendorId || undefined,
                          quotedAmount ? Number(quotedAmount) : undefined,
                          negotiationDeliveryTimeline.trim() || undefined,
                          negotiationPaymentTerms.trim() || undefined,
                          negotiationDiscountPercent ? Number(negotiationDiscountPercent) : undefined,
                          negotiationDiscountAmount ? Number(negotiationDiscountAmount) : undefined,
                          negotiationTerms.trim() || undefined
                        )
                      }
                      disabled={!canNegotiate || isSavingNegotiation}
                      className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {isSavingNegotiation ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      Approve for PO
                    </button>
                    <span className="text-xs text-slate-500">
                      Last saved {formatDate(requisition.negotiationUpdatedAt)}
                    </span>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Ready For PO</p>
                        <p className="mt-2 text-base font-semibold text-slate-900">
                          {requisition.status === "APPROVED" && requisition.negotiationVendorId && requisition.negotiatedAmount
                            ? "Commercial handoff complete"
                            : "Waiting for saved negotiation"}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Save vendor, negotiated amount, and commercial notes before switching to Purchase Order.
                        </p>
                      </div>
                      <ArrowRightCircle className="mt-1 h-6 w-6 text-slate-400" />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <a
                      href="/p2p/po"
                      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${
                        isReadyForPo || requisition.status === "PO_CREATED"
                          ? "bg-slate-900 text-white"
                          : "pointer-events-none bg-slate-200 text-slate-400"
                      }`}
                    >
                      <ArrowRightCircle className="h-4 w-4" />
                      Open PO Desk
                    </a>
                  </div>
                </div>
              </section>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function P2PPrManagementPage() {
  const { data: currentUser } = useCurrentUser();
  const { data: products = [], isLoading: isProductsLoading } = useProcurementProducts();
  const { data: requisitions = [], isLoading, isError, error } = usePurchaseRequisitions();
  const { data: vendors = [] } = useVendors();
  const createRequisition = useCreatePurchaseRequisition();
  const updateRequisition = useUpdatePurchaseRequisition();
  const deleteRequisition = useDeletePurchaseRequisition();
  const uploadPurchaseRequisitionDocument = useUploadPurchaseRequisitionDocument();
  const submitRequisition = useSubmitPurchaseRequisition();
  const reviewRequisition = useReviewPurchaseRequisition();
  const updateBudget = useUpdatePurchaseRequisitionBudget();
  const updateEvaluation = useUpdatePurchaseRequisitionEvaluation();
  const updateNegotiation = useUpdatePurchaseRequisitionNegotiation();

  const [department, setDepartment] = useState("");
  const [requestType, setRequestType] = useState<PurchaseRequisitionType>("INTERNAL_USE");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [neededByDate, setNeededByDate] = useState("");
  const [priority, setPriority] = useState<PurchaseRequisitionPriority>("MEDIUM");
  const [requestCategory, setRequestCategory] = useState("");
  const [draftItem, setDraftItem] = useState<DraftItem>(emptyDraft);
  const [items, setItems] = useState<DraftItem[]>([]);
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);
  const [quoteFiles, setQuoteFiles] = useState<File[]>([]);
  const [createAction, setCreateAction] = useState<"draft" | "submit" | null>(null);
  const [isCreatePanelOpen, setIsCreatePanelOpen] = useState(false);
  const [editingRequisitionId, setEditingRequisitionId] = useState<string | null>(null);
  const [selectedRequisitionId, setSelectedRequisitionId] = useState<string | null>(null);
  const [queueFilter, setQueueFilter] = useState<"ALL" | "ACTION" | "APPROVED" | "REJECTED">("ALL");
  const [queueSearch, setQueueSearch] = useState("");

  const subtotalAmount = useMemo(
    () =>
      items.reduce((total, item) => {
        const product = products.find((entry) => entry.id === item.productId);
        const unitPrice = item.source === "INVENTORY" ? product?.price ?? item.estimatedUnitPrice : item.estimatedUnitPrice;
        return total + unitPrice * item.quantity;
      }, 0),
    [items, products]
  );

  const taxAmount = useMemo(
    () =>
      items.reduce((total, item) => {
        const product = products.find((entry) => entry.id === item.productId);
        const unitPrice = item.source === "INVENTORY" ? product?.price ?? item.estimatedUnitPrice : item.estimatedUnitPrice;
        const lineSubtotal = unitPrice * item.quantity;
        return total + lineSubtotal * (item.taxPercent / 100);
      }, 0),
    [items, products]
  );

  const grandTotal = subtotalAmount + taxAmount;

  const selectedRequisition =
    requisitions.find((requisition) => requisition.id === selectedRequisitionId) ?? null;

  const queueStats = useMemo(() => {
    const totalValue = requisitions.reduce((sum, requisition) => sum + requisition.totalAmount, 0);
    return {
      total: requisitions.length,
      action: requisitions.filter(
        (requisition) => requisition.status === "DRAFT" || requisition.status === "SUBMITTED"
      ).length,
      approved: requisitions.filter((requisition) => requisition.status === "APPROVED").length,
      totalValue,
    };
  }, [requisitions]);

  const filteredRequisitions = useMemo(() => {
    const search = queueSearch.trim().toLowerCase();
    return requisitions.filter((requisition) => {
      const matchesFilter =
        queueFilter === "ALL"
          ? true
          : queueFilter === "ACTION"
            ? requisition.status === "DRAFT" || requisition.status === "SUBMITTED"
            : queueFilter === "APPROVED"
              ? requisition.status === "APPROVED"
              : requisition.status === "REJECTED";

      const matchesSearch =
        !search ||
        requisition.prNumber.toLowerCase().includes(search) ||
        requisition.department.toLowerCase().includes(search) ||
        requestTypeLabel(requisition.requestType).toLowerCase().includes(search) ||
        statusLabel(requisition.status).toLowerCase().includes(search);

      return matchesFilter && matchesSearch;
    });
  }, [queueFilter, queueSearch, requisitions]);

  function resetForm() {
    setDepartment("");
    setRequestType("INTERNAL_USE");
    setTitle("");
    setDescription("");
    setNeededByDate("");
    setPriority("MEDIUM");
    setRequestCategory("");
    setDraftItem(emptyDraft);
    setItems([]);
    setDocumentFiles([]);
    setQuoteFiles([]);
    setEditingRequisitionId(null);
  }

  function hydrateFormFromRequisition(requisition: PurchaseRequisition) {
    setDepartment(requisition.department);
    setRequestType(requisition.requestType);
    setTitle(requisition.title);
    setDescription(requisition.description ?? "");
    setNeededByDate(requisition.neededByDate ?? "");
    setPriority(requisition.priority);
    setRequestCategory(requisition.requestCategory ?? "");
    setDraftItem(emptyDraft);
    setItems(
      requisition.items.map((item) => ({
        source: item.productId ? "INVENTORY" : "ADHOC",
        productId: item.productId ?? "",
        sku: item.sku ?? "",
        productName: item.productName,
        category: item.category ?? "",
        unit: item.unit,
        estimatedUnitPrice: item.estimatedUnitPrice,
        taxPercent: item.taxPercent ?? 0,
        quantity: item.quantity,
        remarks: item.remarks ?? "",
      }))
    );
    setDocumentFiles([]);
    setQuoteFiles([]);
    setEditingRequisitionId(requisition.id);
    setIsCreatePanelOpen(true);
  }

  function handleAddItem() {
    if (draftItem.quantity <= 0) return;
    if (draftItem.source === "INVENTORY" && !draftItem.productId) return;
    if (draftItem.source === "ADHOC" && (!draftItem.productName.trim() || !draftItem.unit.trim())) return;
    setItems((current) => [...current, draftItem]);
    setDraftItem(emptyDraft);
  }

  async function handleCreateRequisition(mode: "draft" | "submit") {
    if (!currentUser?.id || !department.trim() || !title.trim() || items.length === 0) return;
    try {
      setCreateAction(mode);
      const payload = {
        requesterId: currentUser.id,
        requestType,
        department: department.trim(),
        title: title.trim(),
        description: description.trim() || undefined,
        purpose: description.trim() || undefined,
        neededByDate: neededByDate || undefined,
        priority,
        requestCategory: requestCategory.trim() || undefined,
        items: items.map((item) => ({
          productId: item.productId || undefined,
          sku: item.sku.trim() || undefined,
          productName: item.productName.trim() || undefined,
          category: item.category.trim() || undefined,
          unit: item.unit.trim() || undefined,
          quantity: item.quantity,
          estimatedUnitPrice:
            item.source === "INVENTORY"
              ? products.find((entry) => entry.id === item.productId)?.price ?? item.estimatedUnitPrice
              : item.estimatedUnitPrice,
          taxPercent: item.taxPercent,
          remarks: item.remarks.trim() || undefined,
        })),
      };
      const created = editingRequisitionId
        ? await updateRequisition.mutateAsync({ id: editingRequisitionId, payload })
        : await createRequisition.mutateAsync(payload);

      for (const file of documentFiles) {
        await uploadPurchaseRequisitionDocument.mutateAsync({
          requisitionId: created.id,
          type: "DOCUMENT",
          file,
        });
      }
      for (const file of quoteFiles) {
        await uploadPurchaseRequisitionDocument.mutateAsync({
          requisitionId: created.id,
          type: "QUOTE",
          file,
        });
      }

      if (mode === "submit" && created.status === "DRAFT") {
        await submitRequisition.mutateAsync({ id: created.id, actorId: currentUser.id });
      }

      resetForm();
      setIsCreatePanelOpen(false);
    } catch {
      return;
    } finally {
      setCreateAction(null);
    }
  }

  async function handleDeleteRequisition(requisitionId: string) {
    const confirmed = window.confirm("Delete this draft PR?");
    if (!confirmed) return;
    await deleteRequisition.mutateAsync(requisitionId);
    if (selectedRequisitionId === requisitionId) {
      setSelectedRequisitionId(null);
    }
  }

  const columns = [
    { key: "code", label: "PR ID" },
    { key: "department", label: "Department" },
    { key: "neededBy", label: "Needed By" },
    { key: "amount", label: "Amount" },
    { key: "status", label: "Status" },
    { key: "actions", label: "Actions", className: "w-[170px]" },
  ];

  const rows = filteredRequisitions.map((requisition) => ({
    id: requisition.id,
    code: (
      <div className="text-left">
        <p className="font-semibold text-slate-900">{requisition.prNumber}</p>
        <p className="text-xs text-slate-500">
          {requestTypeLabel(requisition.requestType)} · {requisition.items.length} item(s) · {workflowStage(requisition)}
        </p>
      </div>
    ),
    department: requisition.department,
    neededBy: formatDate(requisition.neededByDate),
    amount: formatCurrency(requisition.totalAmount),
    status: (
      <P2PStatusBadge label={requisition.status.replace("_", " ")} tone={toneForStatus(requisition.status)} />
    ),
    actions:
      requisition.status === "DRAFT" ? (
        <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
          <button
            type="button"
            onClick={() => hydrateFormFromRequisition(requisition)}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
          <button
            type="button"
            onClick={() => void handleDeleteRequisition(requisition.id)}
            className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      ) : (
        <span className="text-xs text-slate-400">Locked</span>
      ),
  }));

  return (
    <>
      <P2PLayout
        title="PR Management"
        subtitle="Run requisitions through budget, evaluation, negotiation, and PO readiness from one sourcing desk."
        meta={
          <div className="flex flex-wrap items-center justify-end gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">Requester</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{currentUser?.name ?? "Loading user..."}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setIsCreatePanelOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Create PR
              </button>
            </div>
          </div>
        }
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-100 p-2.5 text-blue-700">
                <ClipboardList className="h-4.5 w-4.5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Total PRs</p>
                <p className="text-xl font-semibold text-slate-900">{queueStats.total}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-amber-100 p-2.5 text-amber-700">
                <FileClock className="h-4.5 w-4.5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Action Queue</p>
                <p className="text-xl font-semibold text-slate-900">{queueStats.action}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-emerald-100 p-2.5 text-emerald-700">
                <ShieldCheck className="h-4.5 w-4.5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Ready For PO</p>
                <p className="text-xl font-semibold text-slate-900">{queueStats.approved}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-violet-100 p-2.5 text-violet-700">
                <BadgeIndianRupee className="h-4.5 w-4.5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Pipeline Value</p>
                <p className="text-xl font-semibold text-slate-900">{formatCurrency(queueStats.totalValue)}</p>
              </div>
            </div>
          </div>
        </div>

        <P2PCard
          title="PR Queue"
          description="Filter the queue, open any requisition, and drive it through budget, evaluation, negotiation, and PO handoff."
          contentClassName="-mx-6 -mb-6"
        >
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2 pl-2">
              {[
                { key: "ALL", label: "All" },
                { key: "ACTION", label: "Needs Action" },
                { key: "APPROVED", label: "Ready For PO" },
                { key: "REJECTED", label: "Rejected" },
              ].map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setQueueFilter(filter.key as typeof queueFilter)}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                    queueFilter === filter.key
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <div className="relative w-full lg:mr-2 lg:w-[330px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={queueSearch}
                onChange={(event) => setQueueSearch(event.target.value)}
                placeholder="Search PR number, department, status..."
                className="w-full rounded-full border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="py-16 text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600" />
              <p className="mt-3 text-sm text-slate-500">Loading requisitions...</p>
            </div>
          ) : isError ? (
            <div className="py-16 text-center text-sm text-rose-600">
              {error instanceof Error ? error.message : "Failed to load requisitions."}
            </div>
          ) : filteredRequisitions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-16 text-center">
              <p className="text-base font-semibold text-slate-900">No requisitions match this view.</p>
              <p className="mt-2 text-sm text-slate-500">
                Adjust the queue filter or search term to broaden the sourcing pipeline.
              </p>
            </div>
          ) : (
            <P2PTable
              columns={columns}
              rows={rows}
              className="rounded-none border-x-0 border-b-0"
              onRowClick={(rowId) => setSelectedRequisitionId(rowId)}
            />
          )}
        </P2PCard>
      </P2PLayout>

      {selectedRequisition ? (
        <RequisitionDetailPanel
          requisition={selectedRequisition}
          vendors={vendors}
          currentUserId={currentUser?.id}
          onClose={() => setSelectedRequisitionId(null)}
          onSubmit={(id, actorId) => submitRequisition.mutate({ id, actorId })}
          onApprove={(id, actorId, remarks) =>
            reviewRequisition.mutate({
              id,
              payload: { action: "APPROVED", actorId, remarks },
            })
          }
          onReject={(id, actorId, remarks) =>
            reviewRequisition.mutate({
              id,
              payload: { action: "REJECTED", actorId, remarks },
            })
          }
          onSaveBudget={(id, payload) =>
            updateBudget.mutate({
              id,
              payload,
            })
          }
          onSaveEvaluation={(id, decision, notes) =>
            updateEvaluation.mutate({
              id,
              payload: { decision, notes },
            })
          }
          onSaveNegotiation={(
            id,
            vendorId,
            negotiatedAmount,
            deliveryTimeline,
            paymentTerms,
            discountPercent,
            discountAmount,
            notes
          ) =>
            updateNegotiation.mutate({
              id,
              payload: {
                vendorId,
                negotiatedAmount,
                deliveryTimeline,
                paymentTerms,
                discountPercent,
                discountAmount,
                notes,
              },
            })
          }
          isSubmitting={submitRequisition.isPending}
          isReviewing={reviewRequisition.isPending}
          isSavingBudget={updateBudget.isPending}
          isSavingEvaluation={updateEvaluation.isPending}
          isSavingNegotiation={updateNegotiation.isPending}
        />
      ) : null}

      {isCreatePanelOpen ? (
        <CreateRequisitionPanel
          isEditing={!!editingRequisitionId}
          currentUserName={currentUser?.name}
          products={products}
          isProductsLoading={isProductsLoading}
          requestType={requestType}
          title={title}
          description={description}
          department={department}
          neededByDate={neededByDate}
          priority={priority}
          requestCategory={requestCategory}
          draftItem={draftItem}
          items={items}
          subtotalAmount={subtotalAmount}
          taxAmount={taxAmount}
          grandTotal={grandTotal}
          documentFiles={documentFiles}
          quoteFiles={quoteFiles}
          isSavingDraft={
            createAction === "draft" && (createRequisition.isPending || updateRequisition.isPending)
          }
          isSubmittingForApproval={
            (createAction === "submit" && (createRequisition.isPending || updateRequisition.isPending)) ||
            submitRequisition.isPending
          }
          errorMessage={
            (createRequisition.error instanceof Error && createRequisition.error.message) ||
            (updateRequisition.error instanceof Error && updateRequisition.error.message) ||
            (uploadPurchaseRequisitionDocument.error instanceof Error && uploadPurchaseRequisitionDocument.error.message) ||
            (submitRequisition.error instanceof Error && submitRequisition.error.message) ||
            undefined
          }
          onClose={() => {
            setIsCreatePanelOpen(false);
            if (
              !createRequisition.isPending &&
              !updateRequisition.isPending &&
              !submitRequisition.isPending &&
              !uploadPurchaseRequisitionDocument.isPending
            ) {
              resetForm();
            }
          }}
          onRequestTypeChange={setRequestType}
          onTitleChange={setTitle}
          onDescriptionChange={setDescription}
          onDepartmentChange={setDepartment}
          onNeededByDateChange={setNeededByDate}
          onPriorityChange={setPriority}
          onRequestCategoryChange={setRequestCategory}
          onDocumentFilesChange={setDocumentFiles}
          onQuoteFilesChange={setQuoteFiles}
          onDraftItemChange={setDraftItem}
          onAddItem={handleAddItem}
          onRemoveItem={(index) => setItems((current) => current.filter((_, currentIndex) => currentIndex !== index))}
          onCreate={handleCreateRequisition}
        />
      ) : null}
    </>
  );
}
