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
  useProcurementProducts,
  usePurchaseRequisitions,
  useReviewPurchaseRequisition,
  useSubmitPurchaseRequisition,
  useUpdatePurchaseRequisitionEvaluation,
  useUpdatePurchaseRequisitionNegotiation,
  useVendors,
} from "@/modules/purchases/hooks";
import type {
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

function fieldShellClass(disabled = false) {
  return `w-full rounded-2xl border px-4 py-3 text-sm text-slate-700 transition focus:outline-none ${
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
  quantity: 1,
  remarks: "",
};

function CreateRequisitionPanel({
  currentUserName,
  products,
  isProductsLoading,
  requestType,
  department,
  purpose,
  neededByDate,
  draftItem,
  items,
  totalDraftAmount,
  isCreating,
  errorMessage,
  onClose,
  onRequestTypeChange,
  onDepartmentChange,
  onPurposeChange,
  onNeededByDateChange,
  onDraftItemChange,
  onAddItem,
  onRemoveItem,
  onCreate,
}: {
  currentUserName?: string;
  products: Array<{ id: string; name: string; sku: string; price: number }>;
  isProductsLoading: boolean;
  requestType: PurchaseRequisitionType;
  department: string;
  purpose: string;
  neededByDate: string;
  draftItem: DraftItem;
  items: DraftItem[];
  totalDraftAmount: number;
  isCreating: boolean;
  errorMessage?: string;
  onClose: () => void;
  onRequestTypeChange: (value: PurchaseRequisitionType) => void;
  onDepartmentChange: (value: string) => void;
  onPurposeChange: (value: string) => void;
  onNeededByDateChange: (value: string) => void;
  onDraftItemChange: (value: DraftItem) => void;
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
  onCreate: () => void;
}) {
  const selectedProduct = products.find((entry) => entry.id === draftItem.productId);

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-slate-950/30 backdrop-blur-[1px]" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 flex h-full w-full flex-col border-l border-slate-200 bg-white shadow-2xl sm:w-[88vw] lg:w-[52vw] lg:max-w-[840px]">
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Purchase Request</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Create PR</h2>
              <p className="mt-1 text-sm text-slate-500">
                Raise a clean internal buying request, add line items, and send it into approvals.
              </p>
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

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">Requester</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{currentUserName ?? "Loading user..."}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Draft Total</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{formatCurrency(totalDraftAmount)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Line Items</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{items.length}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
          <section className="grid gap-4 md:grid-cols-2">
            <P2PFormField label="Request Type" hint="Classify the business intent behind this purchase.">
              <div className="relative">
                <select
                  value={requestType}
                  onChange={(event) => onRequestTypeChange(event.target.value as PurchaseRequisitionType)}
                  className={`${fieldShellClass()} appearance-none pr-10`}
                >
                  {[
                    "INTERNAL_USE",
                    "FOR_SALE",
                    "CUSTOMER",
                    "SELF",
                    "DEMO",
                    "OTHER",
                  ].map((type) => (
                    <option key={type} value={type}>
                      {requestTypeLabel(type as PurchaseRequisitionType)}
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

            <div className="md:col-span-2">
              <P2PFormField label="Purpose" hint="Describe why this purchase is needed.">
                <textarea
                  rows={4}
                  value={purpose}
                  onChange={(event) => onPurposeChange(event.target.value)}
                  placeholder="Procure barcode scanners for the new warehouse dispatch lane."
                  className={fieldShellClass()}
                />
              </P2PFormField>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Line Items</h3>
                <p className="text-xs text-slate-500">Use inventory products where possible, or add ad hoc items for customer, demo, self, and special requests.</p>
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
                className={fieldShellClass()}
              />

              <input
                value={draftItem.remarks}
                onChange={(event) => onDraftItemChange({ ...draftItem, remarks: event.target.value })}
                placeholder="Optional remarks"
                className={fieldShellClass()}
              />

              <button
                type="button"
                onClick={onAddItem}
                className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {items.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-slate-500">
                  No items added yet. Start with a product, quantity, and any remarks.
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {items.map((item, index) => {
                    const product = products.find((entry) => entry.id === item.productId);
                    return (
                      <div key={`${item.productId}-${index}`} className="flex items-center justify-between gap-4 px-4 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">{product?.name ?? item.productId}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {product?.sku ?? "Unknown SKU"} · Qty {item.quantity}
                            {item.remarks ? ` · ${item.remarks}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="text-sm font-semibold text-slate-900">
                            {formatCurrency((product?.price ?? 0) * item.quantity)}
                          </p>
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
        </div>

        <div className="border-t border-slate-200 bg-white px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Estimated Total</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{formatCurrency(totalDraftAmount)}</p>
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
                onClick={onCreate}
                disabled={!department.trim() || items.length === 0 || isCreating}
                className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-50"
              >
                {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Create PR
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
  onSaveEvaluation,
  onSaveNegotiation,
  isSubmitting,
  isReviewing,
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
  onSaveEvaluation: (id: string, decision?: string, notes?: string) => void;
  onSaveNegotiation: (id: string, vendorId?: string, negotiatedAmount?: number, notes?: string) => void;
  isSubmitting: boolean;
  isReviewing: boolean;
  isSavingEvaluation: boolean;
  isSavingNegotiation: boolean;
}) {
  const [activeTab, setActiveTab] = useState<PanelTab>("overview");
  const [budgetRemarks, setBudgetRemarks] = useState("");
  const [evaluationRemarks, setEvaluationRemarks] = useState("");
  const [readinessDecision, setReadinessDecision] = useState("Proceed to negotiation");
  const [negotiationVendorId, setNegotiationVendorId] = useState("");
  const [quotedAmount, setQuotedAmount] = useState(requisition.totalAmount.toFixed(2));
  const [negotiationTerms, setNegotiationTerms] = useState("");

  useEffect(() => {
    setActiveTab("overview");
    setBudgetRemarks(requisition.rejectionReason ?? "");
    setEvaluationRemarks(requisition.evaluationNotes ?? "");
    setReadinessDecision(requisition.evaluationDecision ?? "Proceed to negotiation");
    setNegotiationVendorId(requisition.negotiationVendorId ?? "");
    setQuotedAmount((requisition.negotiatedAmount ?? requisition.totalAmount).toFixed(2));
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

  const tabs: Array<{ key: PanelTab; label: string }> = [
    { key: "overview", label: "Overview" },
    { key: "budget", label: "Budget Check" },
    { key: "evaluation", label: "Evaluation" },
    { key: "negotiation", label: "Negotiation" },
  ];

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 flex h-full w-full flex-col border-l border-slate-200 bg-white shadow-2xl sm:w-[86vw] lg:w-[58vw] lg:max-w-[960px]">
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-sm font-semibold text-slate-700">
                {requisition.department.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-semibold text-slate-900">{requisition.prNumber}</h2>
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

          <div className="mt-5 flex flex-wrap gap-3">
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

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
          {activeTab === "overview" ? (
            <>
              <div className="rounded-2xl border border-slate-200 bg-slate-900 p-5 text-white shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-200">Workflow Position</p>
                    <h3 className="mt-2 text-lg font-semibold">{workflowStage(requisition)}</h3>
                    <p className="mt-2 text-sm text-slate-300">
                      {requisition.status === "DRAFT"
                        ? "Complete budget review and submit this PR into the approval chain."
                        : requisition.status === "SUBMITTED"
                          ? "Finish evaluation, validate commercial direction, and move the request toward PO readiness."
                          : requisition.status === "APPROVED"
                            ? "Buyer handoff is complete. Shortlist vendor and convert the approved request into a purchase order."
                            : requisition.status === "PO_CREATED"
                              ? "This requisition has already been handed off into purchase order execution."
                              : "This requisition is closed or rejected and needs a new cycle for re-entry."}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">Ready For PO</p>
                    <p className="mt-2 text-lg font-semibold">
                      {isReadyForPo ? "Yes" : requisition.status === "PO_CREATED" ? "Done" : "Not Yet"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status</p>
                  <div className="mt-3">
                    <P2PStatusBadge
                      label={requisition.status.replace("_", " ")}
                      tone={toneForStatus(requisition.status)}
                    />
                  </div>
                  <p className="mt-3 text-xs text-slate-500">Needed by {formatDate(requisition.neededByDate)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Budget Check</p>
                  <p className="mt-3 text-sm font-semibold text-slate-900">Step {requisition.currentStepOrder ?? 0}</p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">{budgetState}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">PO Readiness</p>
                  <p className="mt-3 text-sm font-semibold text-slate-900">{canNegotiate ? "Ready" : "Locked"}</p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">{negotiationState}</p>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-base font-semibold text-slate-900">Request Details</h3>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
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
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Created</p>
                      <p className="mt-1 text-sm text-slate-700">{formatDate(requisition.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Updated</p>
                      <p className="mt-1 text-sm text-slate-700">{formatDate(requisition.updatedAt)}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Purpose</p>
                      <p className="mt-1 text-sm text-slate-700">{requisition.purpose || "No purpose entered."}</p>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-base font-semibold text-slate-900">Approval Snapshot</h3>
                  <div className="mt-4 space-y-4">
                    <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Current assessment</p>
                      <p className="mt-2 text-sm text-slate-700">{budgetState}</p>
                    </div>
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Commercial track</p>
                      <p className="mt-2 text-sm text-slate-700">{negotiationState}</p>
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

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-base font-semibold text-slate-900">Requested Items</h3>
                <div className="mt-4 space-y-3">
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
            <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-base font-semibold text-slate-900">Validation Context</h3>
                <div className="mt-4 space-y-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Current Step</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">{requisition.currentStepOrder ?? "-"}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total Amount</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">{formatCurrency(requisition.totalAmount)}</p>
                  </div>
                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Workflow note</p>
                    <p className="mt-2 text-sm text-slate-700">{budgetState}</p>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-base font-semibold text-slate-900">Budget Check Form</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Use this desk to capture remarks and move the requisition through the approval workflow.
                </p>

                <div className="mt-5 space-y-4">
                  <P2PFormField label="Validation Remarks" hint="Capture exceptions, thresholds, or approval rationale.">
                    <textarea
                      rows={6}
                      value={budgetRemarks}
                      onChange={(event) => setBudgetRemarks(event.target.value)}
                      placeholder="Record budget check notes, policy exceptions, or approval rationale."
                      className={fieldShellClass()}
                    />
                  </P2PFormField>

                  {requisition.status === "DRAFT" ? (
                    <button
                      type="button"
                      onClick={() => currentUserId && onSubmit(requisition.id, currentUserId)}
                      disabled={!currentUserId || isSubmitting}
                      className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Submit for Validation
                    </button>
                  ) : null}

                  {canReview ? (
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => currentUserId && onApprove(requisition.id, currentUserId, budgetRemarks.trim() || undefined)}
                        disabled={isReviewing}
                        className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        {isReviewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        Approve Budget
                      </button>
                      <button
                        type="button"
                        onClick={() => currentUserId && onReject(requisition.id, currentUserId, budgetRemarks.trim() || "Rejected from PR validation panel")}
                        disabled={isReviewing}
                        className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        <XCircle className="h-4 w-4" />
                        Reject Request
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
            <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-base font-semibold text-slate-900">Evaluation Summary</h3>
                <div className="mt-4 space-y-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Request Value</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">{formatCurrency(requisition.totalAmount)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Line Items</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">{requisition.items.length}</p>
                  </div>
                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Stage intent</p>
                    <p className="mt-2 text-sm text-slate-700">
                      Evaluate technical fit, urgency, and sourcing path before entering vendor negotiation.
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-base font-semibold text-slate-900">Evaluation Desk</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Capture the internal review outcome that decides whether this PR is ready for commercial negotiation.
                </p>

                <div className="mt-5 space-y-4">
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
                      Save Evaluation
                    </button>
                    <span className="text-xs text-slate-500">
                      Last saved {formatDate(requisition.evaluationUpdatedAt)}
                    </span>
                  </div>

                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-900">
                    Evaluation is now saved on the purchase requisition, so the sourcing team sees the same decision and notes when the PR is reopened.
                  </div>
                </div>
              </section>
            </div>
          ) : null}

          {activeTab === "negotiation" ? (
            <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-base font-semibold text-slate-900">Negotiation Readiness</h3>
                <div className="mt-4 space-y-4">
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Commercial track</p>
                    <p className="mt-2 text-sm text-slate-700">{negotiationState}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Evaluation Decision</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {requisition.evaluationDecision || "No saved decision"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {requisition.evaluationNotes || "No evaluation notes captured yet."}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Available Vendors</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">{vendors.length}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Target Spend</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">{formatCurrency(requisition.totalAmount)}</p>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-base font-semibold text-slate-900">Negotiation Workspace</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Capture vendor shortlist and commercial notes here before converting the approved PR into a PO.
                </p>

                <div className="mt-5 space-y-4">
                  <P2PFormField label="Shortlisted Vendor" hint="Lock the preferred supplier for PO preparation.">
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

                  <P2PFormField label="Quoted / Negotiated Amount" hint="Use the commercial amount that should carry into the PO handoff.">
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
                          negotiationTerms.trim() || undefined
                        )
                      }
                      disabled={!canNegotiate || isSavingNegotiation}
                      className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {isSavingNegotiation ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      Save Negotiation
                    </button>
                    <span className="text-xs text-slate-500">
                      Last saved {formatDate(requisition.negotiationUpdatedAt)}
                    </span>
                  </div>

                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-900">
                    Negotiation now persists on the requisition, so buyer handoff into PO creation keeps the shortlisted vendor and commercial notes visible.
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
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
  const submitRequisition = useSubmitPurchaseRequisition();
  const reviewRequisition = useReviewPurchaseRequisition();
  const updateEvaluation = useUpdatePurchaseRequisitionEvaluation();
  const updateNegotiation = useUpdatePurchaseRequisitionNegotiation();

  const [department, setDepartment] = useState("");
  const [requestType, setRequestType] = useState<PurchaseRequisitionType>("INTERNAL_USE");
  const [purpose, setPurpose] = useState("");
  const [neededByDate, setNeededByDate] = useState("");
  const [draftItem, setDraftItem] = useState<DraftItem>(emptyDraft);
  const [items, setItems] = useState<DraftItem[]>([]);
  const [isCreatePanelOpen, setIsCreatePanelOpen] = useState(false);
  const [selectedRequisitionId, setSelectedRequisitionId] = useState<string | null>(null);
  const [queueFilter, setQueueFilter] = useState<"ALL" | "ACTION" | "APPROVED" | "REJECTED">("ALL");
  const [queueSearch, setQueueSearch] = useState("");

  const totalDraftAmount = useMemo(
    () =>
      items.reduce((total, item) => {
        const product = products.find((entry) => entry.id === item.productId);
        const unitPrice = item.source === "INVENTORY" ? product?.price ?? item.estimatedUnitPrice : item.estimatedUnitPrice;
        return total + unitPrice * item.quantity;
      }, 0),
    [items, products]
  );

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
    setPurpose("");
    setNeededByDate("");
    setDraftItem(emptyDraft);
    setItems([]);
  }

  function handleAddItem() {
    if (draftItem.quantity <= 0) return;
    if (draftItem.source === "INVENTORY" && !draftItem.productId) return;
    if (draftItem.source === "ADHOC" && (!draftItem.productName.trim() || !draftItem.unit.trim())) return;
    setItems((current) => [...current, draftItem]);
    setDraftItem(emptyDraft);
  }

  function handleCreateRequisition() {
    if (!currentUser?.id || !department.trim() || items.length === 0) return;
    createRequisition.mutate(
      {
        requesterId: currentUser.id,
        requestType,
        department: department.trim(),
        purpose: purpose.trim() || undefined,
        neededByDate: neededByDate || undefined,
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
          remarks: item.remarks.trim() || undefined,
        })),
      },
      {
        onSuccess: () => {
          resetForm();
          setIsCreatePanelOpen(false);
        },
      }
    );
  }

  const columns = [
    { key: "code", label: "PR ID" },
    { key: "department", label: "Department" },
    { key: "neededBy", label: "Needed By" },
    { key: "amount", label: "Amount" },
    { key: "status", label: "Status" },
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
                onClick={() => setIsCreatePanelOpen(true)}
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
          onSaveEvaluation={(id, decision, notes) =>
            updateEvaluation.mutate({
              id,
              payload: { decision, notes },
            })
          }
          onSaveNegotiation={(id, vendorId, negotiatedAmount, notes) =>
            updateNegotiation.mutate({
              id,
              payload: { vendorId, negotiatedAmount, notes },
            })
          }
          isSubmitting={submitRequisition.isPending}
          isReviewing={reviewRequisition.isPending}
          isSavingEvaluation={updateEvaluation.isPending}
          isSavingNegotiation={updateNegotiation.isPending}
        />
      ) : null}

      {isCreatePanelOpen ? (
        <CreateRequisitionPanel
          currentUserName={currentUser?.name}
          products={products}
          isProductsLoading={isProductsLoading}
          requestType={requestType}
          department={department}
          purpose={purpose}
          neededByDate={neededByDate}
          draftItem={draftItem}
          items={items}
          totalDraftAmount={totalDraftAmount}
          isCreating={createRequisition.isPending}
          errorMessage={createRequisition.error instanceof Error ? createRequisition.error.message : undefined}
          onClose={() => {
            setIsCreatePanelOpen(false);
            if (!createRequisition.isPending) {
              resetForm();
            }
          }}
          onRequestTypeChange={setRequestType}
          onDepartmentChange={setDepartment}
          onPurposeChange={setPurpose}
          onNeededByDateChange={setNeededByDate}
          onDraftItemChange={setDraftItem}
          onAddItem={handleAddItem}
          onRemoveItem={(index) => setItems((current) => current.filter((_, currentIndex) => currentIndex !== index))}
          onCreate={handleCreateRequisition}
        />
      ) : null}
    </>
  );
}
