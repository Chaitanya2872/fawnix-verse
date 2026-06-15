/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useRef, useState, type ComponentProps, type ReactNode } from "react";
import {
  ArrowRightCircle,
  BadgeIndianRupee,
  Barcode,
  Building2,
  CalendarDays,
  CalendarRange,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock,
  CreditCard,
  FileClock,
  FileText,
  Globe,
  Hash,
  IndianRupee,
  Link2,
  ListChecks,
  Loader2,
  Mail,
  Package,
  Paperclip,
  Pencil,
  Percent,
  Plus,
  Ruler,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  StickyNote,
  Tag,
  Trash2,
  Type,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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

/* ------------------------------------------------------------------ */
/* Design tokens (shared with Vendor Management)
 *
 *   Primary action ........ blue-600 / blue-700 (hover)
 *   Focus ring ............ blue-500 @ 15%
 *   Surfaces .............. flat white panels, divider-separated sections
 *   Fields ................ rounded-md, no shadow, slate-300 border
 *   Dropdowns ............. custom translucent menus (bg-white/70 + blur)
/* ------------------------------------------------------------------ */

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

/* --------------------------- field + button tokens --------------------------- */

function fieldShellClass(hasError = false, disabled = false, translucent = false) {
  return cn(
    "w-full rounded-md border px-3.5 py-2.5 text-sm text-slate-700 outline-none transition",
    translucent ? "bg-white/50 backdrop-blur-sm" : "bg-white",
    "placeholder:text-slate-400",
    disabled
      ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
      : hasError
        ? "border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/15"
        : "border-slate-300 hover:border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
  );
}

const buttonPrimary =
  "inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:opacity-50";
const buttonSecondary =
  "inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 disabled:opacity-50";
const buttonSuccess =
  "inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50";
const buttonDangerSolid =
  "inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-50";
const buttonGhostSmall =
  "rounded-md px-2.5 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30";
const microLabel = "text-xs font-semibold uppercase tracking-wide text-slate-400";

const MONOGRAM_TONES = [
  "bg-sky-100 text-sky-700 ring-sky-600/10",
  "bg-blue-100 text-blue-700 ring-blue-600/10",
  "bg-indigo-50 text-indigo-700 ring-indigo-600/10",
  "bg-cyan-50 text-cyan-700 ring-cyan-600/10",
  "bg-slate-100 text-slate-600 ring-slate-500/10",
];

function monogramTone(seed?: string | null) {
  const value = seed ?? "";
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = (hash * 31 + value.charCodeAt(i)) % 997;
  return MONOGRAM_TONES[hash % MONOGRAM_TONES.length];
}

/* --------------------------- translucent dropdown --------------------------- */

type SelectOption = { value: string; label: string };

function SelectField({
  value,
  options,
  onChange,
  hasError = false,
  disabled = false,
  placeholder = "Select",
}: {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  hasError?: boolean;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const selected = options.find((option) => option.value === value);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(fieldShellClass(hasError, disabled), "flex items-center justify-between gap-2 text-left")}
      >
        <span className={cn("truncate", !selected && "text-slate-400")}>{selected?.label ?? placeholder}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-56 overflow-auto rounded-md border border-slate-200 bg-white/70 py-1 backdrop-blur-md"
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value || "__empty"}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition hover:bg-blue-50/70",
                  isSelected ? "font-semibold text-blue-700" : "text-slate-700"
                )}
              >
                <span className="truncate">{option.label}</span>
                {isSelected ? <Check className="h-3.5 w-3.5 shrink-0 text-blue-600" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

const requestTypeSelectOptions: SelectOption[] = PURCHASE_REQUISITION_TYPE_OPTIONS.map((type) => ({
  value: type,
  label: requestTypeLabel(type),
}));
const prioritySelectOptions: SelectOption[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((entry) => ({
  value: entry,
  label: entry.charAt(0) + entry.slice(1).toLowerCase(),
}));
const itemSourceSelectOptions: SelectOption[] = [
  { value: "INVENTORY", label: "Inventory Item" },
  { value: "ADHOC", label: "Other / Ad Hoc Item" },
];
const budgetTypeSelectOptions: SelectOption[] = [
  { value: "DEPARTMENT", label: "Department" },
  { value: "PROJECT", label: "Project" },
];
const riskLevelSelectOptions: SelectOption[] = [
  { value: "LOW", label: "Low risk" },
  { value: "MEDIUM", label: "Medium risk" },
  { value: "HIGH", label: "High risk" },
];
const evaluationDecisionSelectOptions: SelectOption[] = [
  "Proceed to negotiation",
  "Need alternate specifications",
  "Need stock or vendor recheck",
  "Hold for business clarification",
].map((entry) => ({ value: entry, label: entry }));

/* --------------------------- icon input primitive --------------------------- */

function InputWithIcon({ icon: Icon, className, ...props }: ComponentProps<"input"> & { icon: LucideIcon }) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input {...props} className={cn(className, "pl-9")} />
    </div>
  );
}

/* --------------------------- flat section primitives --------------------------- */

function FlatSection({
  title,
  hint,
  badge,
  isOpen,
  onToggle,
  anchorId,
  children,
}: {
  title: string;
  hint: string;
  badge?: string;
  isOpen: boolean;
  onToggle: () => void;
  anchorId: string;
  children: ReactNode;
}) {
  return (
    <section id={anchorId} className="scroll-mt-4 border-b border-slate-200 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 py-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500/30"
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-900">{title}</span>
            {badge ? (
              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-slate-600">{badge}</span>
            ) : null}
          </span>
          <span className="mt-0.5 block truncate text-xs text-slate-500">{hint}</span>
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform", isOpen && "rotate-180")} />
      </button>
      {isOpen ? <div className="pb-6">{children}</div> : null}
    </section>
  );
}

function MetricStrip({ items }: { items: Array<{ label: string; value: ReactNode; sub?: ReactNode; highlight?: boolean }> }) {
  return (
    <div className="grid grid-cols-2 divide-slate-200 overflow-hidden rounded-lg border border-slate-200 sm:flex sm:divide-x">
      {items.map((item) => (
        <div key={item.label} className={cn("min-w-0 flex-1 px-4 py-3", item.highlight && "bg-blue-50/60")}>
          <p className={cn(microLabel, item.highlight && "text-blue-700")}>{item.label}</p>
          <p className="mt-1 truncate text-sm font-semibold text-slate-900">{item.value}</p>
          {item.sub ? <p className="mt-0.5 truncate text-xs text-slate-500">{item.sub}</p> : null}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------ create panel ------------------------------ */

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

type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

type VendorBenchmarkDraft = {
  quotedAmount: string;
  leadTimeDays: string;
  paymentTerms: string;
  qualityScore: string;
  serviceScore: string;
  riskLevel: RiskLevel;
  notes: string;
  sourceLabel: string;
};

type ExternalVendorCandidate = {
  id: string;
  name: string;
  sourceLabel: string;
  contact: string;
  website: string;
};

type ComparisonCandidate = {
  id: string;
  vendorId?: string;
  vendorName: string;
  vendorCode: string;
  sourceLabel: string;
  contact: string;
  location: string;
  quotedAmount: number;
  leadTimeDays: number;
  paymentTerms: string;
  qualityScore: number;
  serviceScore: number;
  riskLevel: RiskLevel;
  notes: string;
  isExternal: boolean;
  score: number;
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

const CREATE_SECTIONS = [
  { key: "basic", title: "Basic Info", hint: "Title, type, priority, and timing", icon: ClipboardList },
  { key: "details", title: "Requirement Details", hint: "Business justification", icon: FileText },
  { key: "items", title: "Items", hint: "Products, quantities, and tax", icon: ListChecks },
  { key: "attachments", title: "Attachments", hint: "Documents and quotes", icon: Paperclip },
] as const;

type CreateSectionKey = (typeof CREATE_SECTIONS)[number]["key"];

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
    category?: string | null;
    unit?: string | null;
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
  const [openSections, setOpenSections] = useState<Record<CreateSectionKey, boolean>>({
    basic: true,
    details: true,
    items: true,
    attachments: true,
  });
  const [activeSection, setActiveSection] = useState<CreateSectionKey>("basic");
  const scrollRef = useRef<HTMLDivElement>(null);

  const selectedProduct = products.find((entry) => entry.id === draftItem.productId);
  const draftUnitPrice =
    draftItem.source === "INVENTORY" ? selectedProduct?.price ?? draftItem.estimatedUnitPrice : draftItem.estimatedUnitPrice;
  const draftLineBase = draftUnitPrice * draftItem.quantity;
  const draftLineTotal = draftLineBase + draftLineBase * (draftItem.taxPercent / 100);

  const productSelectOptions: SelectOption[] = [
    { value: "", label: "Select product" },
    ...products.map((product) => ({ value: product.id, label: `${product.name} (${product.sku})` })),
  ];

  const sectionIsComplete = (key: CreateSectionKey) => {
    switch (key) {
      case "basic":
        return Boolean(title.trim() && department.trim());
      case "details":
        return Boolean(description.trim());
      case "items":
        return items.length > 0;
      case "attachments":
        return documentFiles.length + quoteFiles.length > 0;
    }
  };

  const handlePanelScroll = () => {
    const container = scrollRef.current;
    if (!container) return;
    const containerTop = container.getBoundingClientRect().top;
    let current: CreateSectionKey = CREATE_SECTIONS[0].key;
    for (const section of CREATE_SECTIONS) {
      const element = container.querySelector(`#pr-section-${section.key}`);
      if (element && element.getBoundingClientRect().top - containerTop <= 96) {
        current = section.key;
      }
    }
    setActiveSection(current);
  };

  const jumpToSection = (key: CreateSectionKey) => {
    setOpenSections((current) => ({ ...current, [key]: true }));
    setActiveSection(key);
    requestAnimationFrame(() => {
      scrollRef.current?.querySelector(`#pr-section-${key}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const toggleSection = (key: CreateSectionKey) => {
    setOpenSections((current) => ({ ...current, [key]: !current[key] }));
  };

  const canSave = Boolean(title.trim() && department.trim() && items.length > 0) && !isSavingDraft && !isSubmittingForApproval;

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 flex h-full w-full flex-col bg-white shadow-2xl sm:w-[94vw] lg:w-[60vw] lg:max-w-[1000px] lg:border-l lg:border-slate-200">
        {/* Header */}
        <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold ring-1", monogramTone(title || "pr"))}>
                <ClipboardList className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className={microLabel}>Purchase requisition</p>
                  <span
                    className={cn(
                      "rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                      isEditing ? "bg-indigo-50 text-indigo-700" : "bg-blue-50 text-blue-700"
                    )}
                  >
                    {isEditing ? "Editing" : "New"}
                  </span>
                </div>
                <h2 className="mt-0.5 truncate text-lg font-semibold text-slate-900">
                  {title.trim() || (isEditing ? "Edit requisition" : "Create requisition")}
                </h2>
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  Requester {currentUserName ?? "Loading user..."} · {isEditing ? "Existing PR" : "PR number auto on save"} · {items.length} item(s)
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close panel"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-300 text-slate-500 transition hover:bg-slate-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body: rail + form */}
        <div className="flex flex-1 overflow-hidden">
          <nav className="hidden w-60 shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-slate-200 bg-white px-3 py-4 lg:flex">
            <p className={cn(microLabel, "px-2 pb-2")}>Sections</p>
            {CREATE_SECTIONS.map((section) => {
              const isComplete = sectionIsComplete(section.key);
              const isActive = activeSection === section.key;
              const Icon = section.icon;
              return (
                <button
                  key={section.key}
                  type="button"
                  onClick={() => jumpToSection(section.key)}
                  aria-current={isActive ? "true" : undefined}
                  className={cn(
                    "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30",
                    isActive ? "bg-blue-50 text-blue-700" : "hover:bg-sky-50"
                  )}
                >
                  <Icon className={cn("h-4 w-4", isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-500")} />
                  <span className={cn("min-w-0 flex-1 truncate text-[13px]", isActive ? "font-semibold text-blue-700" : "font-medium text-slate-700")}>
                    {section.title}
                  </span>
                  {isComplete ? (
                    <Check className="h-3.5 w-3.5 shrink-0 text-blue-600" aria-label="Complete" />
                  ) : (
                    <span className="h-2 w-2 shrink-0 rounded-full border border-slate-300" />
                  )}
                </button>
              );
            })}
            <div className="mt-auto rounded-lg bg-slate-50 px-3 py-2.5 text-[11px] leading-relaxed text-slate-500">
              Title, department, and at least one item are required before saving.
            </div>
          </nav>

          <div ref={scrollRef} onScroll={handlePanelScroll} className="flex-1 overflow-y-auto px-5 py-1 sm:px-8">
            <div className="mx-auto max-w-3xl">
              {/* Basic Info */}
              <FlatSection
                title="Basic Info"
                hint={CREATE_SECTIONS[0].hint}
                anchorId="pr-section-basic"
                isOpen={openSections.basic}
                onToggle={() => toggleSection("basic")}
              >
                <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <P2PFormField label="Title" hint="Short business title for this requisition.">
                      <InputWithIcon
                        icon={Type}
                        value={title}
                        onChange={(event) => onTitleChange(event.target.value)}
                        placeholder="Warehouse barcode scanners"
                        className={fieldShellClass()}
                      />
                    </P2PFormField>
                  </div>
                  <P2PFormField label="Request Type" hint="Business intent behind this purchase.">
                    <SelectField
                      value={requestType}
                      options={requestTypeSelectOptions}
                      onChange={(value) => onRequestTypeChange(value as PurchaseRequisitionType)}
                    />
                  </P2PFormField>
                  <P2PFormField label="Priority" hint="Operational urgency of this request.">
                    <SelectField
                      value={priority}
                      options={prioritySelectOptions}
                      onChange={(value) => onPriorityChange(value as PurchaseRequisitionPriority)}
                    />
                  </P2PFormField>
                  <P2PFormField label="Department" hint="Business function raising the request.">
                    <InputWithIcon
                      icon={Building2}
                      value={department}
                      onChange={(event) => onDepartmentChange(event.target.value)}
                      placeholder="Operations"
                      className={fieldShellClass()}
                    />
                  </P2PFormField>
                  <P2PFormField label="Category" hint="Requirement category for this requisition.">
                    <InputWithIcon
                      icon={Tag}
                      value={requestCategory}
                      onChange={(event) => onRequestCategoryChange(event.target.value)}
                      placeholder="Hardware / Software / Service"
                      className={fieldShellClass()}
                    />
                  </P2PFormField>
                  <P2PFormField label="Needed By" hint="Target date for business consumption.">
                    <InputWithIcon
                      icon={CalendarDays}
                      type="date"
                      value={neededByDate}
                      onChange={(event) => onNeededByDateChange(event.target.value)}
                      className={fieldShellClass()}
                    />
                  </P2PFormField>
                </div>
              </FlatSection>

              {/* Requirement Details */}
              <FlatSection
                title="Requirement Details"
                hint={CREATE_SECTIONS[1].hint}
                anchorId="pr-section-details"
                isOpen={openSections.details}
                onToggle={() => toggleSection("details")}
              >
                <P2PFormField label="Description / Justification" hint="Describe why this purchase is needed.">
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(event) => onDescriptionChange(event.target.value)}
                    placeholder="Procure barcode scanners for the new warehouse dispatch lane."
                    className={cn(fieldShellClass(), "resize-y")}
                  />
                </P2PFormField>
              </FlatSection>

              {/* Items */}
              <FlatSection
                title="Items"
                hint={CREATE_SECTIONS[2].hint}
                badge={`${items.length}`}
                anchorId="pr-section-items"
                isOpen={openSections.items}
                onToggle={() => toggleSection("items")}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-slate-500">Add item, quantity, tax, and remarks, then press Add.</p>
                    {isProductsLoading ? (
                      <span className="inline-flex items-center gap-2 text-xs text-slate-500">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Loading products...
                      </span>
                    ) : null}
                  </div>

                  <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
                    <P2PFormField label="Item Source">
                      <SelectField
                        value={draftItem.source}
                        options={itemSourceSelectOptions}
                        onChange={(value) =>
                          onDraftItemChange({
                            ...emptyDraft,
                            source: value as DraftItem["source"],
                            quantity: draftItem.quantity,
                          })
                        }
                      />
                    </P2PFormField>

                    {draftItem.source === "INVENTORY" ? (
                      <P2PFormField label="Product">
                        <SelectField
                          value={draftItem.productId}
                          options={productSelectOptions}
                          placeholder="Select product"
                          onChange={(value) => {
                            const product = products.find((entry) => entry.id === value);
                            onDraftItemChange({
                              ...draftItem,
                              productId: value,
                              sku: product?.sku ?? "",
                              productName: product?.name ?? "",
                              category: product?.category ?? "",
                              unit: product?.unit ?? "",
                              estimatedUnitPrice: product?.price ?? 0,
                            });
                          }}
                        />
                      </P2PFormField>
                    ) : (
                      <P2PFormField label="Item Name">
                        <InputWithIcon
                          icon={ListChecks}
                          value={draftItem.productName}
                          onChange={(event) => onDraftItemChange({ ...draftItem, productName: event.target.value })}
                          placeholder="e.g. Barcode scanner"
                          className={fieldShellClass()}
                        />
                      </P2PFormField>
                    )}

                    {draftItem.source === "ADHOC" ? (
                      <>
                        <P2PFormField label="SKU / Reference" hint="Optional reference code.">
                          <InputWithIcon
                            icon={Barcode}
                            value={draftItem.sku}
                            onChange={(event) => onDraftItemChange({ ...draftItem, sku: event.target.value })}
                            placeholder="e.g. SCN-1001"
                            className={fieldShellClass()}
                          />
                        </P2PFormField>
                        <P2PFormField label="Category">
                          <InputWithIcon
                            icon={Tag}
                            value={draftItem.category}
                            onChange={(event) => onDraftItemChange({ ...draftItem, category: event.target.value })}
                            placeholder="e.g. Hardware"
                            className={fieldShellClass()}
                          />
                        </P2PFormField>
                        <P2PFormField label="Unit">
                          <InputWithIcon
                            icon={Ruler}
                            value={draftItem.unit}
                            onChange={(event) => onDraftItemChange({ ...draftItem, unit: event.target.value })}
                            placeholder="e.g. pcs, box"
                            className={fieldShellClass()}
                          />
                        </P2PFormField>
                        <P2PFormField label="Unit Price">
                          <InputWithIcon
                            icon={IndianRupee}
                            type="number"
                            min={0}
                            step="0.01"
                            value={draftItem.estimatedUnitPrice}
                            onChange={(event) => onDraftItemChange({ ...draftItem, estimatedUnitPrice: Number(event.target.value) || 0 })}
                            placeholder="0.00"
                            className={fieldShellClass()}
                          />
                        </P2PFormField>
                      </>
                    ) : (
                      <>
                        <P2PFormField label="SKU" hint="Filled from the selected product.">
                          <InputWithIcon icon={Barcode} value={selectedProduct?.sku ?? draftItem.sku} disabled className={fieldShellClass(false, true)} />
                        </P2PFormField>
                        <P2PFormField label="Unit" hint="Filled from the selected product.">
                          <InputWithIcon icon={Ruler} value={selectedProduct?.unit ?? draftItem.unit} disabled className={fieldShellClass(false, true)} />
                        </P2PFormField>
                      </>
                    )}

                    <P2PFormField label="Quantity">
                      <InputWithIcon
                        icon={Hash}
                        type="number"
                        min={1}
                        value={draftItem.quantity}
                        onChange={(event) => onDraftItemChange({ ...draftItem, quantity: Number(event.target.value) || 1 })}
                        className={fieldShellClass()}
                      />
                    </P2PFormField>
                    <P2PFormField label="Tax %">
                      <InputWithIcon
                        icon={Percent}
                        type="number"
                        min={0}
                        step="0.01"
                        value={draftItem.taxPercent}
                        onChange={(event) => onDraftItemChange({ ...draftItem, taxPercent: Number(event.target.value) || 0 })}
                        className={fieldShellClass()}
                      />
                    </P2PFormField>
                    <div className="sm:col-span-2">
                      <P2PFormField label="Item Description" hint="Optional remarks carried onto the line item.">
                        <InputWithIcon
                          icon={StickyNote}
                          value={draftItem.remarks}
                          onChange={(event) => onDraftItemChange({ ...draftItem, remarks: event.target.value })}
                          placeholder="e.g. For dispatch lane 3"
                          className={fieldShellClass()}
                        />
                      </P2PFormField>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button type="button" onClick={onAddItem} className={buttonPrimary}>
                      <Plus className="h-4 w-4" />
                      Add Item
                    </button>
                  </div>

                  <MetricStrip
                    items={[
                      { label: "Unit Price", value: formatCurrency(draftUnitPrice) },
                      { label: "Quantity", value: draftItem.quantity },
                      { label: "Tax", value: formatPercent(draftItem.taxPercent) },
                      { label: "Line Total", value: formatCurrency(draftLineTotal), highlight: true },
                    ]}
                  />

                  {items.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
                      <ListChecks className="h-5 w-5 text-slate-300" />
                      <p className="text-sm text-slate-500">No items added yet. Start with a product, quantity, and any remarks.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {items.map((item, index) => {
                        const product = products.find((entry) => entry.id === item.productId);
                        const unitPrice =
                          item.source === "INVENTORY" ? product?.price ?? item.estimatedUnitPrice : item.estimatedUnitPrice;
                        const lineSubtotal = unitPrice * item.quantity;
                        const lineTotal = lineSubtotal + lineSubtotal * (item.taxPercent / 100);
                        return (
                          <div key={`${item.productId}-${index}`} className="flex items-center justify-between gap-4 py-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900">{product?.name ?? item.productName}</p>
                              <p className="mt-0.5 text-xs text-slate-500">
                                {product?.sku ?? item.sku ?? "No SKU"} · Qty {item.quantity}
                                {item.remarks ? ` · ${item.remarks}` : ""}
                              </p>
                              <p className="mt-0.5 text-xs text-slate-500">
                                Unit price {formatCurrency(unitPrice)} · Subtotal {formatCurrency(lineSubtotal)} · Tax {formatPercent(item.taxPercent)}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <p className="text-sm font-semibold text-slate-900">{formatCurrency(lineTotal)}</p>
                              <button
                                type="button"
                                onClick={() => onRemoveItem(index)}
                                className={cn(buttonGhostSmall, "text-rose-600 hover:bg-rose-50")}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <MetricStrip
                    items={[
                      { label: "Subtotal", value: formatCurrency(subtotalAmount) },
                      { label: "Tax", value: formatCurrency(taxAmount) },
                      { label: "Grand Total", value: formatCurrency(grandTotal), highlight: true },
                    ]}
                  />
                </div>
              </FlatSection>

              {/* Attachments */}
              <FlatSection
                title="Attachments"
                hint={CREATE_SECTIONS[3].hint}
                badge={`${documentFiles.length + quoteFiles.length}`}
                anchorId="pr-section-attachments"
                isOpen={openSections.attachments}
                onToggle={() => toggleSection("attachments")}
              >
                <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
                  <P2PFormField label="Documents" hint="Requirement documents, approvals, or supporting files.">
                    <label className="flex cursor-pointer flex-col items-center gap-1.5 rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center transition hover:border-blue-400 hover:bg-blue-50/40">
                      <Paperclip className="h-4 w-4 text-slate-400" />
                      <span className="text-sm font-medium text-slate-700">
                        {documentFiles.length > 0 ? `${documentFiles.length} file(s) selected` : "Click to choose files"}
                      </span>
                      <span className="truncate text-xs text-slate-500" style={{ maxWidth: "100%" }}>
                        {documentFiles.map((file) => file.name).join(", ") || "No documents selected"}
                      </span>
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(event) => onDocumentFilesChange(Array.from(event.target.files ?? []))}
                      />
                    </label>
                  </P2PFormField>
                  <P2PFormField label="Quotes" hint="Optional vendor or reference quotations.">
                    <label className="flex cursor-pointer flex-col items-center gap-1.5 rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center transition hover:border-blue-400 hover:bg-blue-50/40">
                      <Paperclip className="h-4 w-4 text-slate-400" />
                      <span className="text-sm font-medium text-slate-700">
                        {quoteFiles.length > 0 ? `${quoteFiles.length} file(s) selected` : "Click to choose files"}
                      </span>
                      <span className="truncate text-xs text-slate-500" style={{ maxWidth: "100%" }}>
                        {quoteFiles.map((file) => file.name).join(", ") || "No quotes selected"}
                      </span>
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(event) => onQuoteFilesChange(Array.from(event.target.files ?? []))}
                      />
                    </label>
                  </P2PFormField>
                </div>
              </FlatSection>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-white px-5 py-3.5 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className={microLabel}>Grand Total</p>
              <p className="text-lg font-semibold text-slate-900">{formatCurrency(grandTotal)}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={onClose} className={buttonSecondary}>
                Cancel
              </button>
              <button type="button" onClick={() => onCreate("draft")} disabled={!canSave} className={buttonSecondary}>
                {isSavingDraft ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {isEditing ? "Save Changes" : "Save Draft"}
              </button>
              <button type="button" onClick={() => onCreate("submit")} disabled={!canSave} className={buttonPrimary}>
                {isSubmittingForApproval ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Submit for Approval
              </button>
            </div>
          </div>
          {errorMessage ? <p className="mt-2 text-sm text-rose-600">{errorMessage}</p> : null}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ detail panel ------------------------------ */

function emptyVendorBenchmarkDraft(sourceLabel = "ERP Vendor"): VendorBenchmarkDraft {
  return {
    quotedAmount: "",
    leadTimeDays: "",
    paymentTerms: "",
    qualityScore: "3",
    serviceScore: "3",
    riskLevel: "MEDIUM",
    notes: "",
    sourceLabel,
  };
}

function parseNumericInput(value: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function riskScore(level: RiskLevel) {
  switch (level) {
    case "LOW":
      return 10;
    case "MEDIUM":
      return 6;
    default:
      return 2;
  }
}

function riskTone(level: RiskLevel) {
  switch (level) {
    case "LOW":
      return "bg-emerald-50 text-emerald-700";
    case "MEDIUM":
      return "bg-amber-50 text-amber-700";
    default:
      return "bg-rose-50 text-rose-700";
  }
}

function normalizeLabel(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function DetailBlock({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="py-5 first:pt-4 last:pb-4">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {hint ? <p className="mt-0.5 text-xs text-slate-500">{hint}</p> : null}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function InfoPair({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className={microLabel}>{label}</p>
      <p className="mt-1 text-sm text-slate-700">{value}</p>
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
  const [shortlistedVendorIds, setShortlistedVendorIds] = useState<string[]>([]);
  const [vendorBenchmarks, setVendorBenchmarks] = useState<Record<string, VendorBenchmarkDraft>>({});
  const [externalCandidates, setExternalCandidates] = useState<ExternalVendorCandidate[]>([]);
  const [showExternalVendorForm, setShowExternalVendorForm] = useState(false);
  const [externalVendorName, setExternalVendorName] = useState("");
  const [externalVendorSource, setExternalVendorSource] = useState("");
  const [externalVendorContact, setExternalVendorContact] = useState("");
  const [externalVendorWebsite, setExternalVendorWebsite] = useState("");
  const [recommendedVendorId, setRecommendedVendorId] = useState("");

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
    setShowExternalVendorForm(false);
    setExternalVendorName("");
    setExternalVendorSource("");
    setExternalVendorContact("");
    setExternalVendorWebsite("");
  }, [requisition]);

  useEffect(() => {
    const defaultShortlist = vendors
      .filter((vendor) => vendor.status === "ACTIVE")
      .slice(0, 3)
      .map((vendor) => vendor.id);
    const persistedKey = `fawnix.p2p.requisition-sourcing.${requisition.id}`;
    if (typeof window === "undefined") {
      setShortlistedVendorIds(requisition.negotiationVendorId ? [requisition.negotiationVendorId] : defaultShortlist);
      setVendorBenchmarks({});
      setExternalCandidates([]);
      setRecommendedVendorId(requisition.negotiationVendorId ?? "");
      return;
    }

    const persisted = window.localStorage.getItem(persistedKey);
    if (!persisted) {
      setShortlistedVendorIds(requisition.negotiationVendorId ? [requisition.negotiationVendorId] : defaultShortlist);
      setVendorBenchmarks({});
      setExternalCandidates([]);
      setRecommendedVendorId(requisition.negotiationVendorId ?? "");
      return;
    }

    try {
      const parsed = JSON.parse(persisted) as {
        shortlistedVendorIds?: string[];
        vendorBenchmarks?: Record<string, VendorBenchmarkDraft>;
        externalCandidates?: ExternalVendorCandidate[];
        recommendedVendorId?: string;
      };
      setShortlistedVendorIds(parsed.shortlistedVendorIds?.length ? parsed.shortlistedVendorIds : defaultShortlist);
      setVendorBenchmarks(parsed.vendorBenchmarks ?? {});
      setExternalCandidates(parsed.externalCandidates ?? []);
      setRecommendedVendorId(parsed.recommendedVendorId ?? requisition.negotiationVendorId ?? "");
    } catch {
      setShortlistedVendorIds(requisition.negotiationVendorId ? [requisition.negotiationVendorId] : defaultShortlist);
      setVendorBenchmarks({});
      setExternalCandidates([]);
      setRecommendedVendorId(requisition.negotiationVendorId ?? "");
    }
  }, [requisition.id, requisition.negotiationVendorId, vendors]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      `fawnix.p2p.requisition-sourcing.${requisition.id}`,
      JSON.stringify({
        shortlistedVendorIds,
        vendorBenchmarks,
        externalCandidates,
        recommendedVendorId,
      })
    );
  }, [externalCandidates, recommendedVendorId, requisition.id, shortlistedVendorIds, vendorBenchmarks]);

  const budgetState =
    requisition.status === "DRAFT"
      ? "Draft request not yet sent for budget review."
      : requisition.status === "SUBMITTED"
        ? "Awaiting validation against approval workflow and budget thresholds."
        : requisition.status === "APPROVED" || requisition.status === "PO_CREATED"
          ? "Budget check cleared through approval workflow."
          : "Budget review closed.";

  const negotiationState =
    requisition.status === "APPROVED"
      ? `${vendors.length} vendors available for commercial discussion.`
      : requisition.status === "PO_CREATED"
        ? "Negotiation is locked once a purchase order has been created."
        : "Negotiation opens after requisition approval.";

  const canReview = requisition.status === "SUBMITTED" && !!currentUserId;
  const canNegotiate = requisition.status === "APPROVED";
  const canEditBudget = requisition.status !== "PO_CREATED";
  const canEditEvaluation = requisition.status === "APPROVED";
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
  const budgetVariance = budgetMetrics.availableAfterPr;
  const releaseRecommendation =
    budgetValidationStatus === "Exceeded"
      ? "Escalate to finance controller before approval."
      : budgetValidationStatus === "Near Limit"
        ? "Proceed only with exception note and approver acknowledgement."
        : "Budget posture is healthy enough for sourcing to continue.";

  const comparisonCandidates = useMemo<ComparisonCandidate[]>(() => {
    const rowsFromVendors = shortlistedVendorIds
      .map((vendorId) => vendors.find((vendor) => vendor.id === vendorId))
      .filter((vendor): vendor is Vendor => Boolean(vendor))
      .map((vendor) => {
        const benchmark = vendorBenchmarks[vendor.id] ?? emptyVendorBenchmarkDraft("ERP Vendor");
        return {
          id: vendor.id,
          vendorId: vendor.id,
          vendorName: vendor.vendorName,
          vendorCode: vendor.vendorCode,
          sourceLabel: benchmark.sourceLabel || "ERP Vendor",
          contact: vendor.email || vendor.mobile || vendor.phone || "No contact",
          location: [vendor.city, vendor.state, vendor.country].filter(Boolean).join(", ") || "Location not captured",
          quotedAmount: parseNumericInput(benchmark.quotedAmount, requisition.totalAmount),
          leadTimeDays: parseNumericInput(benchmark.leadTimeDays, 7),
          paymentTerms: benchmark.paymentTerms || "To be negotiated",
          qualityScore: parseNumericInput(benchmark.qualityScore, 3),
          serviceScore: parseNumericInput(benchmark.serviceScore, 3),
          riskLevel: benchmark.riskLevel,
          notes: benchmark.notes,
          isExternal: false,
          score: 0,
        };
      });

    const rowsFromExternal = externalCandidates.map((candidate) => {
      const benchmark = vendorBenchmarks[candidate.id] ?? emptyVendorBenchmarkDraft(candidate.sourceLabel || "External Source");
      return {
        id: candidate.id,
        vendorName: candidate.name,
        vendorCode: "External",
        sourceLabel: benchmark.sourceLabel || candidate.sourceLabel || "External Source",
        contact: candidate.contact || candidate.website || "Manual benchmark",
        location: "External market source",
        quotedAmount: parseNumericInput(benchmark.quotedAmount, requisition.totalAmount),
        leadTimeDays: parseNumericInput(benchmark.leadTimeDays, 10),
        paymentTerms: benchmark.paymentTerms || "Market benchmark",
        qualityScore: parseNumericInput(benchmark.qualityScore, 3),
        serviceScore: parseNumericInput(benchmark.serviceScore, 3),
        riskLevel: benchmark.riskLevel,
        notes: benchmark.notes,
        isExternal: true,
        score: 0,
      };
    });

    const baseRows = [...rowsFromVendors, ...rowsFromExternal];
    if (baseRows.length === 0) return [];

    const minimumQuote = Math.min(...baseRows.map((candidate) => candidate.quotedAmount));
    const minimumLeadTime = Math.min(...baseRows.map((candidate) => candidate.leadTimeDays));

    return baseRows
      .map((candidate) => {
        const priceScore = candidate.quotedAmount > 0 ? (minimumQuote / candidate.quotedAmount) * 40 : 0;
        const deliveryScore = candidate.leadTimeDays > 0 ? (minimumLeadTime / candidate.leadTimeDays) * 20 : 0;
        const qualityScore = Math.min(candidate.qualityScore, 5) * 4;
        const serviceScore = Math.min(candidate.serviceScore, 5) * 2;
        const score = Math.round(priceScore + deliveryScore + qualityScore + serviceScore + riskScore(candidate.riskLevel));
        return { ...candidate, score };
      })
      .sort((left, right) => right.score - left.score);
  }, [externalCandidates, requisition.totalAmount, shortlistedVendorIds, vendorBenchmarks, vendors]);

  const topRecommendedCandidate = comparisonCandidates[0] ?? null;
  const selectedRecommendation =
    comparisonCandidates.find((candidate) => candidate.id === recommendedVendorId) ?? topRecommendedCandidate;
  const negotiationCandidate =
    comparisonCandidates.find((candidate) => candidate.vendorId === negotiationVendorId || candidate.id === negotiationVendorId) ?? null;
  const evaluationSummary = comparisonCandidates.length
    ? comparisonCandidates
        .map(
          (candidate, index) =>
            `${index + 1}. ${candidate.vendorName} ${formatCurrency(candidate.quotedAmount)}, ${candidate.leadTimeDays}d, risk ${candidate.riskLevel}, score ${candidate.score}`
        )
        .join(" | ")
    : "";

  useEffect(() => {
    if (!recommendedVendorId && topRecommendedCandidate) {
      setRecommendedVendorId(topRecommendedCandidate.id);
    }
  }, [recommendedVendorId, topRecommendedCandidate]);

  useEffect(() => {
    if (!negotiationVendorId && selectedRecommendation?.vendorId) {
      setNegotiationVendorId(selectedRecommendation.vendorId);
    }
  }, [negotiationVendorId, selectedRecommendation]);

  const tabs: Array<{ key: PanelTab; label: string }> = [
    { key: "overview", label: "PR Form" },
    { key: "budget", label: "Budget Check" },
    { key: "evaluation", label: "Vendor Evaluation" },
    { key: "negotiation", label: "Negotiation" },
  ];

  const updateVendorBenchmark = (candidateId: string, patch: Partial<VendorBenchmarkDraft>) => {
    setVendorBenchmarks((current) => ({
      ...current,
      [candidateId]: {
        ...(current[candidateId] ?? emptyVendorBenchmarkDraft()),
        ...patch,
      },
    }));
  };

  const toggleShortlistedVendor = (vendorId: string) => {
    setShortlistedVendorIds((current) =>
      current.includes(vendorId) ? current.filter((entry) => entry !== vendorId) : [...current, vendorId]
    );
  };

  const addExternalCandidate = () => {
    if (!externalVendorName.trim() || !externalVendorSource.trim()) {
      toast.error("Enter vendor name and source before adding an external benchmark.");
      return;
    }
    const externalId = `external-${normalizeLabel(externalVendorName)}-${Date.now()}`;
    const candidate: ExternalVendorCandidate = {
      id: externalId,
      name: externalVendorName.trim(),
      sourceLabel: externalVendorSource.trim(),
      contact: externalVendorContact.trim(),
      website: externalVendorWebsite.trim(),
    };
    setExternalCandidates((current) => [...current, candidate]);
    setVendorBenchmarks((current) => ({
      ...current,
      [externalId]: emptyVendorBenchmarkDraft(candidate.sourceLabel),
    }));
    setExternalVendorName("");
    setExternalVendorSource("");
    setExternalVendorContact("");
    setExternalVendorWebsite("");
    setShowExternalVendorForm(false);
    toast.success("External vendor benchmark added to the comparison desk.");
  };

  const removeExternalCandidate = (candidateId: string) => {
    setExternalCandidates((current) => current.filter((candidate) => candidate.id !== candidateId));
    setVendorBenchmarks((current) => {
      const next = { ...current };
      delete next[candidateId];
      return next;
    });
    if (recommendedVendorId === candidateId) {
      setRecommendedVendorId("");
    }
  };

  const handleSaveEvaluation = () => {
    if (readinessDecision === "Proceed to negotiation" && comparisonCandidates.length === 0) {
      toast.error("Shortlist at least one vendor before moving this PR into negotiation.");
      return;
    }
    const selectedCandidate = selectedRecommendation;
    const notes = [
      evaluationRemarks.trim(),
      evaluationSummary ? `Comparison: ${evaluationSummary}` : "",
      selectedCandidate ? `Recommended vendor: ${selectedCandidate.vendorName} (${selectedCandidate.sourceLabel})` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    onSaveEvaluation(requisition.id, readinessDecision.trim() || undefined, notes || undefined);
  };

  const handleSaveNegotiation = () => {
    const selectedCandidateForNegotiation =
      comparisonCandidates.find((candidate) => candidate.vendorId === negotiationVendorId || candidate.id === negotiationVendorId) ??
      null;
    if (!selectedCandidateForNegotiation?.vendorId) {
      toast.error("Select an ERP vendor from the comparison desk before approving negotiation for PO.");
      return;
    }

    const resolvedQuotedAmount = quotedAmount
      ? Number(quotedAmount)
      : selectedCandidateForNegotiation.quotedAmount;
    const notes = [
      negotiationTerms.trim(),
      `Negotiation basis: ${selectedCandidateForNegotiation.vendorName}, score ${selectedCandidateForNegotiation.score}, source ${selectedCandidateForNegotiation.sourceLabel}.`,
      selectedCandidateForNegotiation.notes ? `Comparison notes: ${selectedCandidateForNegotiation.notes}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    onSaveNegotiation(
      requisition.id,
      selectedCandidateForNegotiation.vendorId,
      resolvedQuotedAmount,
      negotiationDeliveryTimeline.trim() || `${selectedCandidateForNegotiation.leadTimeDays} day(s)`,
      negotiationPaymentTerms.trim() || selectedCandidateForNegotiation.paymentTerms,
      negotiationDiscountPercent ? Number(negotiationDiscountPercent) : undefined,
      negotiationDiscountAmount ? Number(negotiationDiscountAmount) : undefined,
      notes || undefined
    );
  };

  const approvalRemarks = [budgetMetrics.autoApprovalSummary, budgetValidationNotes.trim(), budgetExceptionJustification.trim()]
    .filter(Boolean)
    .join(" | ");

  const rejectionRemarks =
    budgetExceptionJustification.trim() ||
    budgetValidationNotes.trim() ||
    `Rejected during financial validation. ${budgetMetrics.autoApprovalSummary}`;

  const negotiationVendorSelectOptions: SelectOption[] = [
    { value: "", label: "Select vendor" },
    ...comparisonCandidates
      .filter((candidate) => candidate.vendorId)
      .map((candidate) => ({ value: candidate.vendorId!, label: `${candidate.vendorName} (${candidate.vendorCode})` })),
  ];

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 flex h-full w-full flex-col bg-white shadow-2xl sm:w-[90vw] lg:w-[60vw] lg:max-w-[1000px] lg:border-l lg:border-slate-200">
        {/* Header */}
        <div className="border-b border-slate-200 px-5 pt-5 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-bold ring-1", monogramTone(requisition.department))}>
                {requisition.department.slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold text-slate-900">{requisition.prNumber}</h2>
                  <P2PStatusBadge label={requisition.status.replace("_", " ")} tone={toneForStatus(requisition.status)} />
                  {requisition.currentStepOrder ? (
                    <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                      Step {requisition.currentStepOrder}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 truncate text-sm text-slate-500">
                  {requestTypeLabel(requisition.requestType)} · {requisition.department} · {formatCurrency(requisition.totalAmount)} · {requisition.items.length} item(s)
                </p>
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  Requester {requisition.requesterId} · Needed by {formatDate(requisition.neededByDate)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close panel"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-300 text-slate-500 transition hover:bg-slate-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Underline tabs */}
          <div className="mt-4 flex gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30",
                  activeTab === tab.key
                    ? "border-blue-600 font-semibold text-blue-700"
                    : "border-transparent font-medium text-slate-500 hover:border-slate-300 hover:text-slate-700"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 sm:px-6">
          {activeTab === "overview" ? (
            <div className="divide-y divide-slate-200">
              <DetailBlock
                title="Current Action"
                hint={
                  requisition.status === "DRAFT"
                    ? "This PR is still a draft. Submit it to start approval."
                    : requisition.status === "SUBMITTED"
                      ? "This PR is waiting for approval action."
                      : requisition.status === "APPROVED"
                        ? "This PR is approved and ready for downstream procurement steps."
                        : requisition.status === "REJECTED"
                          ? "This PR has been rejected."
                          : "This PR has already moved to PO stage."
                }
              >
                <div className="flex flex-wrap gap-2">
                  {requisition.status === "DRAFT" ? (
                    <button
                      type="button"
                      onClick={() => currentUserId && onSubmit(requisition.id, currentUserId)}
                      disabled={!currentUserId || isSubmitting}
                      className={buttonPrimary}
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
                        className={buttonSuccess}
                      >
                        {isReviewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => currentUserId && onReject(requisition.id, currentUserId, rejectionRemarks)}
                        disabled={isReviewing}
                        className={buttonDangerSolid}
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </button>
                    </>
                  ) : (
                    <p className="text-sm text-slate-500">No actions available at this stage.</p>
                  )}
                </div>
              </DetailBlock>

              <DetailBlock title="Snapshot">
                <MetricStrip
                  items={[
                    { label: "Priority", value: requisition.priority, sub: `Needed by ${formatDate(requisition.neededByDate)}` },
                    { label: "Category", value: requisition.requestCategory || "Unclassified" },
                    { label: "Stage", value: workflowStage(requisition), sub: statusLabel(requisition.status) },
                    { label: "Total", value: formatCurrency(requisition.totalAmount), highlight: true },
                  ]}
                />
              </DetailBlock>

              <DetailBlock title="Basic Info">
                <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                  <InfoPair label="Requester ID" value={requisition.requesterId} />
                  <InfoPair label="Request Type" value={requestTypeLabel(requisition.requestType)} />
                  <InfoPair label="Department" value={requisition.department} />
                  <InfoPair label="Required Date" value={formatDate(requisition.neededByDate)} />
                  <InfoPair label="Created" value={formatDate(requisition.createdAt)} />
                  <InfoPair label="Updated" value={formatDate(requisition.updatedAt)} />
                  <div className="sm:col-span-2">
                    <InfoPair label="Title" value={requisition.title} />
                  </div>
                  <div className="sm:col-span-2">
                    <InfoPair label="Description / Justification" value={requisition.description || "No description entered."} />
                  </div>
                </div>
                {requisition.rejectionReason ? (
                  <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">Last rejection note</p>
                    <p className="mt-1 text-sm text-slate-700">{requisition.rejectionReason}</p>
                  </div>
                ) : null}
                <div className="mt-4">
                  <p className={microLabel}>Saved Evaluation</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {requisition.evaluationDecision || "No evaluation decision saved"}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">{requisition.evaluationNotes || "No evaluation notes yet."}</p>
                </div>
              </DetailBlock>

              <DetailBlock title="Items" hint={`${requisition.items.length} line item(s) on this requisition.`}>
                <div className="divide-y divide-slate-100">
                  {requisition.items.map((item) => (
                    <div key={item.id} className="flex items-start justify-between gap-4 py-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                          {item.productId ? <Package className="h-4 w-4" /> : <Tag className="h-4 w-4" />}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">{item.productName}</p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {(item.sku || "No SKU")} · {item.unit} · {item.productId ? "Inventory" : "Ad hoc"}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            Qty {item.quantity} · Unit price {formatCurrency(item.estimatedUnitPrice)}
                          </p>
                          {item.remarks ? <p className="mt-0.5 text-xs text-slate-500">Note: {item.remarks}</p> : null}
                        </div>
                      </div>
                      <p className="shrink-0 text-sm font-semibold text-slate-900">{formatCurrency(item.lineTotal)}</p>
                    </div>
                  ))}
                </div>
              </DetailBlock>
            </div>
          ) : null}

          {activeTab === "budget" ? (
            <div className="divide-y divide-slate-200">
              <DetailBlock title="Budget Context" hint="Capture the budget reference details for this requisition.">
                <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
                  <P2PFormField label="Budget Name">
                    <InputWithIcon
                      icon={Wallet}
                      value={budgetName}
                      onChange={(event) => setBudgetName(event.target.value)}
                      placeholder="Enter budget name"
                      className={fieldShellClass()}
                    />
                  </P2PFormField>
                  <P2PFormField label="Budget Type">
                    <SelectField
                      value={budgetType}
                      options={budgetTypeSelectOptions}
                      onChange={(value) => setBudgetType(value as BudgetContextType)}
                    />
                  </P2PFormField>
                  <P2PFormField label="Period">
                    <InputWithIcon
                      icon={CalendarRange}
                      value={budgetPeriod}
                      onChange={(event) => setBudgetPeriod(event.target.value)}
                      placeholder="Apr 2026 / FY 2026-27"
                      className={fieldShellClass()}
                    />
                  </P2PFormField>
                  <P2PFormField label="Allocated Budget">
                    <InputWithIcon
                      icon={IndianRupee}
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
                    <InputWithIcon
                      icon={IndianRupee}
                      type="number"
                      min={0}
                      step="0.01"
                      value={committedAmount}
                      onChange={(event) => setCommittedAmount(event.target.value)}
                      placeholder="0.00"
                      className={fieldShellClass()}
                    />
                  </P2PFormField>
                  <P2PFormField label="Actual Spend">
                    <InputWithIcon
                      icon={IndianRupee}
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
              </DetailBlock>

              <DetailBlock title="Budget Check" hint={budgetState}>
                <div className="space-y-4">
                  <MetricStrip
                    items={[
                      { label: "Available Budget", value: formatCurrency(budgetMetrics.availableBudget) },
                      { label: "PR Amount", value: formatCurrency(requisition.totalAmount) },
                      {
                        label: "Available After PR",
                        value: (
                          <span className={budgetMetrics.availableAfterPr >= 0 ? undefined : "text-rose-600"}>
                            {formatCurrency(budgetMetrics.availableAfterPr)}
                          </span>
                        ),
                      },
                      { label: "Validation", value: budgetStatusLabel(budgetValidationStatus), highlight: true },
                    ]}
                  />

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className={cn("rounded-lg border px-4 py-3", budgetMetrics.toneClass)}>
                      <p className="text-xs font-semibold uppercase tracking-wide">System Verdict</p>
                      <p className="mt-1 text-sm font-semibold">{budgetMetrics.systemVerdict}</p>
                      <p className="mt-1 text-xs">
                        Utilization {formatPercent(budgetMetrics.utilizationPercent)} with post-PR variance {formatCurrency(budgetVariance)}.
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 px-4 py-3">
                      <p className={microLabel}>Release Recommendation</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{releaseRecommendation}</p>
                      <p className="mt-1 text-xs text-slate-500">{budgetMetrics.autoApprovalSummary}</p>
                    </div>
                  </div>

                  {budgetMetrics.exceptionSignals.length > 0 ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Control Signals</p>
                      <div className="mt-2 space-y-1.5">
                        {budgetMetrics.exceptionSignals.map((signal) => (
                          <p key={signal} className="text-sm text-amber-900">
                            {signal}
                          </p>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <P2PFormField label="Validation Notes" hint="Reviewer context or approval rationale.">
                    <textarea
                      rows={3}
                      value={budgetValidationNotes}
                      onChange={(event) => setBudgetValidationNotes(event.target.value)}
                      placeholder="Capture reviewer validation notes."
                      className={cn(fieldShellClass(), "resize-y")}
                    />
                  </P2PFormField>

                  <P2PFormField label="Exception Justification" hint="Required when the requisition exceeds or nears budget.">
                    <textarea
                      rows={3}
                      value={budgetExceptionJustification}
                      onChange={(event) => setBudgetExceptionJustification(event.target.value)}
                      placeholder="Capture exception justification when needed."
                      className={cn(fieldShellClass(), "resize-y")}
                    />
                  </P2PFormField>

                  <div className="flex flex-wrap items-center gap-2">
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
                      disabled={isSavingBudget || !canEditBudget}
                      className={buttonSecondary}
                    >
                      {isSavingBudget ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Save Remarks
                    </button>

                    {requisition.status === "DRAFT" ? (
                      <button
                        type="button"
                        onClick={() => currentUserId && onSubmit(requisition.id, currentUserId)}
                        disabled={!currentUserId || isSubmitting}
                        className={buttonPrimary}
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
                          className={buttonSuccess}
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
                          disabled={budgetValidationStatus !== "Exceeded" || isSavingBudget || !canEditBudget}
                          className={cn(buttonSecondary, "border-amber-300 text-amber-700 hover:bg-amber-50")}
                        >
                          Escalate
                        </button>
                        <button
                          type="button"
                          onClick={() => currentUserId && onReject(requisition.id, currentUserId, rejectionRemarks)}
                          disabled={isReviewing}
                          className={buttonDangerSolid}
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </button>
                      </>
                    ) : (
                      <p className="text-sm text-slate-500">
                        {requisition.status === "APPROVED" || requisition.status === "PO_CREATED"
                          ? "Budget validation is already complete for this request."
                          : requisition.status === "REJECTED"
                            ? "This request has already been rejected."
                            : requisition.status === "DRAFT"
                              ? ""
                              : "Submit this draft request first to open approval actions."}
                      </p>
                    )}
                  </div>
                </div>
              </DetailBlock>
            </div>
          ) : null}

          {activeTab === "evaluation" ? (
            <div className="divide-y divide-slate-200">
              <DetailBlock
                title="Vendor Evaluation Desk"
                hint="Compare shortlisted vendors for this PR and add market benchmarks from websites, marketplaces, or partner references."
              >
                <div className="space-y-4">
                  <MetricStrip
                    items={[
                      { label: "PR Value", value: formatCurrency(requisition.totalAmount) },
                      { label: "Compared Vendors", value: comparisonCandidates.length },
                      {
                        label: "Lowest Quote",
                        value:
                          comparisonCandidates.length > 0
                            ? formatCurrency(Math.min(...comparisonCandidates.map((candidate) => candidate.quotedAmount)))
                            : "-",
                      },
                      { label: "Recommended", value: selectedRecommendation?.vendorName || "Not selected", highlight: true },
                    ]}
                  />

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className={microLabel}>ERP vendors for this PR</p>
                    <button type="button" onClick={() => setShowExternalVendorForm((current) => !current)} className={buttonSecondary}>
                      <Search className="h-4 w-4" />
                      Browse Other Sources
                    </button>
                  </div>

                  {vendors.length === 0 ? (
                    <p className="text-sm text-slate-500">Vendor master is empty. Add vendors to open comparison.</p>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {vendors.map((vendor) => (
                        <label
                          key={vendor.id}
                          className={cn(
                            "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition",
                            shortlistedVendorIds.includes(vendor.id)
                              ? "border-blue-300 bg-blue-50/50"
                              : "border-slate-200 hover:border-slate-300"
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={shortlistedVendorIds.includes(vendor.id)}
                            onChange={() => toggleShortlistedVendor(vendor.id)}
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-sm font-semibold text-slate-900">{vendor.vendorName}</p>
                              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-500">
                                {vendor.vendorCode}
                              </span>
                            </div>
                            <p className="mt-0.5 truncate text-xs text-slate-500">
                              {[vendor.vendorType, vendor.city, vendor.state].filter(Boolean).join(" · ") || "ERP vendor"}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}

                  {showExternalVendorForm ? (
                    <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4">
                      <p className="text-sm font-semibold text-slate-900">Add External Benchmark Vendor</p>
                      <p className="mt-0.5 text-xs text-slate-500">Capture a market supplier before onboarding them to the vendor master.</p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <InputWithIcon icon={Building2} value={externalVendorName} onChange={(event) => setExternalVendorName(event.target.value)} placeholder="Vendor name" className={fieldShellClass()} />
                        <InputWithIcon icon={Globe} value={externalVendorSource} onChange={(event) => setExternalVendorSource(event.target.value)} placeholder="Source: website / marketplace / referral" className={fieldShellClass()} />
                        <InputWithIcon icon={Mail} value={externalVendorContact} onChange={(event) => setExternalVendorContact(event.target.value)} placeholder="Contact / email" className={fieldShellClass()} />
                        <InputWithIcon icon={Link2} value={externalVendorWebsite} onChange={(event) => setExternalVendorWebsite(event.target.value)} placeholder="Website / source link" className={fieldShellClass()} />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" onClick={addExternalCandidate} className={buttonPrimary}>
                          <Plus className="h-4 w-4" />
                          Add to Compare
                        </button>
                        <button type="button" onClick={() => setShowExternalVendorForm(false)} className={buttonSecondary}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </DetailBlock>

              <DetailBlock title="Comparison Desk" hint="Benchmark quotes, lead times, and risk to score each candidate.">
                {comparisonCandidates.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
                    <Search className="h-5 w-5 text-slate-300" />
                    <p className="text-sm text-slate-500">Shortlist vendors or add an external benchmark to open the comparison desk.</p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {comparisonCandidates.map((candidate, candidateIndex) => {
                      const benchmark = vendorBenchmarks[candidate.id] ?? emptyVendorBenchmarkDraft(candidate.sourceLabel);
                      return (
                        <div
                          key={candidate.id}
                          className={cn("border-t border-slate-200 pt-4", candidateIndex === 0 && "border-t-0 pt-0")}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold text-slate-900">{candidate.vendorName}</p>
                                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-500">{candidate.vendorCode}</span>
                                <span className={cn("rounded-md px-1.5 py-0.5 text-[11px] font-semibold", riskTone(candidate.riskLevel))}>
                                  {candidate.riskLevel} risk
                                </span>
                                <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-blue-700">
                                  Score {candidate.score}/100
                                </span>
                              </div>
                              <p className="mt-0.5 truncate text-xs text-slate-500">
                                {candidate.sourceLabel} · {candidate.contact}
                              </p>
                            </div>
                            <div className="flex shrink-0 flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => setRecommendedVendorId(candidate.id)}
                                className={cn(
                                  buttonGhostSmall,
                                  recommendedVendorId === candidate.id
                                    ? "bg-blue-600 text-white hover:bg-blue-700"
                                    : "border border-slate-300 text-slate-600 hover:bg-slate-50"
                                )}
                              >
                                {recommendedVendorId === candidate.id ? "Recommended" : "Set Recommended"}
                              </button>
                              {candidate.isExternal ? (
                                <button
                                  type="button"
                                  onClick={() => removeExternalCandidate(candidate.id)}
                                  className={cn(buttonGhostSmall, "text-rose-600 hover:bg-rose-50")}
                                >
                                  Remove
                                </button>
                              ) : null}
                            </div>
                          </div>

                          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <InputWithIcon icon={IndianRupee} type="number" min={0} step="0.01" value={benchmark.quotedAmount} onChange={(event) => updateVendorBenchmark(candidate.id, { quotedAmount: event.target.value })} placeholder="Quoted amount" className={fieldShellClass()} />
                            <InputWithIcon icon={Clock} type="number" min={1} step="1" value={benchmark.leadTimeDays} onChange={(event) => updateVendorBenchmark(candidate.id, { leadTimeDays: event.target.value })} placeholder="Lead time (days)" className={fieldShellClass()} />
                            <InputWithIcon icon={CreditCard} value={benchmark.paymentTerms} onChange={(event) => updateVendorBenchmark(candidate.id, { paymentTerms: event.target.value })} placeholder="Payment terms" className={fieldShellClass()} />
                            <InputWithIcon icon={Tag} value={benchmark.sourceLabel} onChange={(event) => updateVendorBenchmark(candidate.id, { sourceLabel: event.target.value })} placeholder="Source label" className={fieldShellClass()} />
                            <input type="number" min={1} max={5} step="1" value={benchmark.qualityScore} onChange={(event) => updateVendorBenchmark(candidate.id, { qualityScore: event.target.value })} placeholder="Quality score 1-5" className={fieldShellClass()} />
                            <input type="number" min={1} max={5} step="1" value={benchmark.serviceScore} onChange={(event) => updateVendorBenchmark(candidate.id, { serviceScore: event.target.value })} placeholder="Service score 1-5" className={fieldShellClass()} />
                            <SelectField
                              value={benchmark.riskLevel}
                              options={riskLevelSelectOptions}
                              onChange={(value) => updateVendorBenchmark(candidate.id, { riskLevel: value as RiskLevel })}
                            />
                            <InputWithIcon icon={StickyNote} value={benchmark.notes} onChange={(event) => updateVendorBenchmark(candidate.id, { notes: event.target.value })} placeholder="Notes and negotiation levers" className={fieldShellClass()} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </DetailBlock>

              <DetailBlock title="Evaluation Decision" hint="Choose the sourcing direction and leave a clear audit trail.">
                <div className="space-y-4">
                  <P2PFormField label="Evaluation Decision" hint="Choose the sourcing direction for the next stage.">
                    <SelectField value={readinessDecision} options={evaluationDecisionSelectOptions} onChange={setReadinessDecision} />
                  </P2PFormField>
                  <P2PFormField label="Evaluation Notes" hint="Leave a clear audit trail for sourcing, approvals, and PO creation.">
                    <textarea
                      rows={4}
                      value={evaluationRemarks}
                      onChange={(event) => setEvaluationRemarks(event.target.value)}
                      placeholder="Record technical review, sourcing observations, urgency, alternate make suggestions, and approval dependencies."
                      className={cn(fieldShellClass(), "resize-y")}
                    />
                  </P2PFormField>
                  <div className="flex flex-wrap items-center gap-3">
                    <button type="button" onClick={handleSaveEvaluation} disabled={isSavingEvaluation || !canEditEvaluation} className={buttonPrimary}>
                      {isSavingEvaluation ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Save Evaluation
                    </button>
                    <span className="text-xs text-slate-500">Last saved {formatDate(requisition.evaluationUpdatedAt)}</span>
                  </div>
                </div>
              </DetailBlock>
            </div>
          ) : null}

          {activeTab === "negotiation" ? (
            <div className="divide-y divide-slate-200">
              <DetailBlock title="Negotiation Readiness" hint={negotiationState}>
                <div className="space-y-4">
                  <MetricStrip
                    items={[
                      { label: "Available Vendors", value: comparisonCandidates.length },
                      { label: "Target Spend", value: formatCurrency(requisition.totalAmount) },
                      {
                        label: "Recommended",
                        value: selectedRecommendation?.vendorName || "No recommendation yet",
                        sub: selectedRecommendation
                          ? `${formatCurrency(selectedRecommendation.quotedAmount)} · ${selectedRecommendation.leadTimeDays} days · score ${selectedRecommendation.score}`
                          : "Complete the comparison desk to drive negotiation.",
                        highlight: true,
                      },
                    ]}
                  />
                  <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                    <InfoPair
                      label="Evaluation Decision"
                      value={requisition.evaluationDecision || "No saved decision"}
                    />
                    <InfoPair
                      label="Evaluation Notes"
                      value={requisition.evaluationNotes || "No evaluation notes captured yet."}
                    />
                  </div>
                </div>
              </DetailBlock>

              <DetailBlock title="Negotiation Form" hint="Lock the preferred supplier and commercial terms for PO preparation.">
                <div className="space-y-4">
                  <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
                    <P2PFormField label="Selected Vendor" hint="Lock the preferred supplier for PO preparation.">
                      <SelectField
                        value={negotiationVendorId}
                        options={negotiationVendorSelectOptions}
                        disabled={!canNegotiate}
                        placeholder="Select vendor"
                        onChange={(nextVendorId) => {
                          setNegotiationVendorId(nextVendorId);
                          const matchedCandidate = comparisonCandidates.find((candidate) => candidate.vendorId === nextVendorId);
                          if (matchedCandidate) {
                            setQuotedAmount(matchedCandidate.quotedAmount.toFixed(2));
                            setNegotiationDeliveryTimeline(`${matchedCandidate.leadTimeDays} day(s)`);
                            setNegotiationPaymentTerms(matchedCandidate.paymentTerms);
                          }
                        }}
                      />
                    </P2PFormField>
                    <P2PFormField label="Negotiated Price" hint="Amount that should carry into the PO handoff.">
                      <InputWithIcon
                        icon={IndianRupee}
                        type="number"
                        min={0}
                        step="0.01"
                        value={quotedAmount}
                        onChange={(event) => setQuotedAmount(event.target.value)}
                        disabled={!canNegotiate}
                        className={fieldShellClass(false, !canNegotiate)}
                      />
                    </P2PFormField>
                    <P2PFormField label="Delivery Timeline" hint="Committed delivery timeline from the vendor.">
                      <InputWithIcon
                        icon={Clock}
                        value={negotiationDeliveryTimeline}
                        onChange={(event) => setNegotiationDeliveryTimeline(event.target.value)}
                        disabled={!canNegotiate}
                        className={fieldShellClass(false, !canNegotiate)}
                      />
                    </P2PFormField>
                    <P2PFormField label="Payment Terms" hint="Final agreed payment terms.">
                      <InputWithIcon
                        icon={CreditCard}
                        value={negotiationPaymentTerms}
                        onChange={(event) => setNegotiationPaymentTerms(event.target.value)}
                        disabled={!canNegotiate}
                        className={fieldShellClass(false, !canNegotiate)}
                      />
                    </P2PFormField>
                    <P2PFormField label="Discount %" hint="Negotiated percentage discount if any.">
                      <InputWithIcon
                        icon={Percent}
                        type="number"
                        min={0}
                        step="0.01"
                        value={negotiationDiscountPercent}
                        onChange={(event) => setNegotiationDiscountPercent(event.target.value)}
                        disabled={!canNegotiate}
                        className={fieldShellClass(false, !canNegotiate)}
                      />
                    </P2PFormField>
                    <P2PFormField label="Discount Amount" hint="Negotiated flat discount if any.">
                      <InputWithIcon
                        icon={IndianRupee}
                        type="number"
                        min={0}
                        step="0.01"
                        value={negotiationDiscountAmount}
                        onChange={(event) => setNegotiationDiscountAmount(event.target.value)}
                        disabled={!canNegotiate}
                        className={fieldShellClass(false, !canNegotiate)}
                      />
                    </P2PFormField>
                  </div>

                  <P2PFormField label="Negotiation Notes" hint="Capture commitments, concessions, lead times, and payment terms.">
                    <textarea
                      rows={4}
                      value={negotiationTerms}
                      onChange={(event) => setNegotiationTerms(event.target.value)}
                      disabled={!canNegotiate}
                      placeholder="Capture quote revisions, delivery commitments, payment terms, and concessions."
                      className={cn(fieldShellClass(false, !canNegotiate), "resize-y")}
                    />
                  </P2PFormField>

                  {negotiationCandidate ? (
                    <div className="rounded-lg border border-slate-200 px-4 py-3">
                      <p className={microLabel}>Selected Vendor Snapshot</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{negotiationCandidate.vendorName}</p>
                      <p className="mt-0.5 text-sm text-slate-600">{negotiationCandidate.contact}</p>
                      <p className="mt-0.5 text-sm text-slate-600">{negotiationCandidate.location}</p>
                      <p className="mt-0.5 text-sm text-slate-600">
                        {formatCurrency(negotiationCandidate.quotedAmount)} · {negotiationCandidate.leadTimeDays} day(s) · {negotiationCandidate.paymentTerms}
                      </p>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-3">
                    <button type="button" onClick={handleSaveNegotiation} disabled={!canNegotiate || isSavingNegotiation} className={buttonPrimary}>
                      {isSavingNegotiation ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      Approve for PO
                    </button>
                    <span className="text-xs text-slate-500">Last saved {formatDate(requisition.negotiationUpdatedAt)}</span>
                  </div>
                </div>
              </DetailBlock>

              <DetailBlock title="PO Handoff">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">
                      {requisition.status === "APPROVED" && requisition.negotiationVendorId && requisition.negotiatedAmount
                        ? "Commercial handoff complete"
                        : "Waiting for saved negotiation"}
                    </p>
                    <p className="mt-0.5 text-sm text-slate-500">
                      Save vendor, negotiated amount, and commercial notes before switching to Purchase Order.
                    </p>
                  </div>
                  <a
                    href="/p2p/po"
                    className={cn(
                      "inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition",
                      isReadyForPo || requisition.status === "PO_CREATED"
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "pointer-events-none bg-slate-100 text-slate-400"
                    )}
                  >
                    <ArrowRightCircle className="h-4 w-4" />
                    Open PO Desk
                  </a>
                </div>
              </DetailBlock>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function workflowStage(requisition: PurchaseRequisition) {
  if (requisition.status === "DRAFT") return "Budget Check";
  if (requisition.status === "SUBMITTED") return "Budget Validation";
  if (requisition.status === "APPROVED") {
    const negotiationReady =
      !!requisition.negotiationVendorId && requisition.negotiatedAmount != null;
    if (negotiationReady) return "Ready for PO";
    return requisition.evaluationDecision ? "Negotiation" : "Evaluation";
  }
  if (requisition.status === "PO_CREATED") return "Converted to PO";
  return "Closed";
}

/* --------------------------------- page --------------------------------- */

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

  const panelProducts = useMemo(
    () =>
      products.map((product) => ({
        ...product,
        category: product.category ?? undefined,
        unit: product.unit ?? undefined,
      })),
    [products]
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
    { key: "actions", label: "Actions", className: "w-[150px]" },
  ];

  const rows = filteredRequisitions.map((requisition) => ({
    id: requisition.id,
    code: (
      <div className="flex items-center gap-3 text-left">
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold ring-1", monogramTone(requisition.department))}>
          {requisition.department.slice(0, 2).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-900">{requisition.prNumber}</p>
          <p className="truncate text-xs text-slate-500">
            {requestTypeLabel(requisition.requestType)} · {requisition.items.length} item(s) · {workflowStage(requisition)}
          </p>
        </div>
      </div>
    ),
    department: <span className="text-sm text-slate-600">{requisition.department}</span>,
    neededBy: <span className="text-sm text-slate-600">{formatDate(requisition.neededByDate)}</span>,
    amount: <span className="text-sm font-semibold tabular-nums text-slate-900">{formatCurrency(requisition.totalAmount)}</span>,
    status: (
      <P2PStatusBadge label={requisition.status.replace("_", " ")} tone={toneForStatus(requisition.status)} />
    ),
    actions:
      requisition.status === "DRAFT" ? (
        <div className="flex items-center gap-1" onClick={(event) => event.stopPropagation()}>
          <button
            type="button"
            onClick={() => hydrateFormFromRequisition(requisition)}
            className={cn(buttonGhostSmall, "inline-flex items-center gap-1.5 text-slate-600 hover:bg-slate-100")}
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
          <button
            type="button"
            onClick={() => void handleDeleteRequisition(requisition.id)}
            className={cn(buttonGhostSmall, "inline-flex items-center gap-1.5 text-rose-600 hover:bg-rose-50")}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      ) : (
        <span className="text-xs text-slate-400">Locked</span>
      ),
  }));

  const stats = [
    { label: "Total PRs", value: queueStats.total, sub: "in the pipeline", icon: ClipboardList },
    { label: "Action queue", value: queueStats.action, sub: "draft or submitted", icon: FileClock },
    { label: "Ready for PO", value: queueStats.approved, sub: "approved requisitions", icon: ShieldCheck },
    { label: "Pipeline value", value: formatCurrency(queueStats.totalValue), sub: "total requested", icon: BadgeIndianRupee },
  ];

  const queueFilters = [
    { key: "ALL", label: "All" },
    { key: "ACTION", label: "Needs Action" },
    { key: "APPROVED", label: "Ready For PO" },
    { key: "REJECTED", label: "Rejected" },
  ] as const;

  return (
    <>
      <P2PLayout
        title="PR Management"
        subtitle="Run requisitions through budget, evaluation, negotiation, and PO readiness from one sourcing desk."
        meta={
          <div className="flex flex-wrap items-center justify-end gap-3">
            <div className="text-right">
              <p className={microLabel}>Requester</p>
              <p className="text-sm font-semibold text-slate-900">{currentUser?.name ?? "Loading user..."}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setIsCreatePanelOpen(true);
              }}
              className={buttonPrimary}
            >
              <Plus className="h-4 w-4" />
              Create PR
            </button>
          </div>
        }
      >
        {/* Stat band: one card, divided */}
        <div className="grid grid-cols-2 divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm sm:grid-cols-4 sm:divide-x">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-100/70 text-sky-600">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xl font-semibold tabular-nums leading-none text-slate-900">{stat.value}</p>
                  <p className="mt-1 truncate text-xs font-medium text-slate-500">{stat.label}</p>
                  <p className="truncate text-[11px] text-slate-400">{stat.sub}</p>
                </div>
              </div>
            );
          })}
        </div>

        <P2PCard
          title="PR Queue"
          description="Filter the queue, open any requisition, and drive it through budget, evaluation, negotiation, and PO handoff."
          contentClassName="-mx-6 -mb-6"
        >
          <div className="mb-4 flex flex-col gap-3 px-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="inline-flex flex-wrap gap-0.5 rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              {queueFilters.map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setQueueFilter(filter.key)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30",
                    queueFilter === filter.key ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <div className="relative w-full lg:w-[330px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={queueSearch}
                onChange={(event) => setQueueSearch(event.target.value)}
                placeholder="Search PR number, department, status..."
                className={cn(fieldShellClass(), "pl-9")}
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
            <div className="mx-6 mb-6 flex flex-col items-center gap-3 rounded-xl border border-dashed border-sky-200 bg-sky-50/50 px-6 py-14 text-center">
              <ClipboardList className="h-6 w-6 text-slate-300" />
              <div>
                <p className="text-base font-semibold text-slate-900">No requisitions match this view.</p>
                <p className="mt-1 text-sm text-slate-500">Adjust the queue filter or search term to broaden the sourcing pipeline.</p>
              </div>
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
            reviewRequisition.mutate(
              {
                id,
                payload: { action: "APPROVED", actorId, remarks },
              },
              {
                onSuccess: () => toast.success("Requisition approved."),
                onError: (mutationError) =>
                  toast.error(
                    mutationError instanceof Error
                      ? mutationError.message
                      : "Approval failed. Please try again.",
                  ),
              },
            )
          }
          onReject={(id, actorId, remarks) =>
            reviewRequisition.mutate(
              {
                id,
                payload: { action: "REJECTED", actorId, remarks },
              },
              {
                onSuccess: () => toast.success("Requisition rejected."),
                onError: (mutationError) =>
                  toast.error(
                    mutationError instanceof Error
                      ? mutationError.message
                      : "Rejection failed. Please try again.",
                  ),
              },
            )
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