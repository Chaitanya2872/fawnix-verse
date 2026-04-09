"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { ArrowUpRight, Pencil, Plus, RefreshCw, Search, Sparkles, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useLeadAssignees, useLeadDetail, useLeads } from "@/modules/crm/leads/hooks";
import { LeadStatus } from "@/modules/crm/leads/types";
import { useProducts } from "@/modules/inventory/hooks";
import type { Product } from "@/modules/inventory/types";
import { useCreateQuote, useQuote, useQuotes, useUpdateQuote, useUpdateQuoteStatus } from "./hooks";
import { QuotationDocument } from "./QuotationDocument";
import {
  DiscountType,
  type Quote,
  QuoteStatus,
  type QuoteFilter,
  type QuoteFormData,
  type QuoteFormItem,
  type QuoteSummary,
} from "./types";

const PAGE_SIZE = 200;

function createClientItem(overrides?: Partial<QuoteFormItem>): QuoteFormItem {
  return {
    clientId: crypto.randomUUID(),
    inventoryProductId: "",
    name: "",
    make: "",
    description: "",
    utility: "",
    quantity: 1,
    unit: "",
    unitPrice: 0,
    ...overrides,
  };
}

const STATUS_LABELS: Record<QuoteStatus, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
};

const STATUS_TONES: Record<QuoteStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  SENT: "bg-sky-100 text-sky-600",
  ACCEPTED: "bg-emerald-100 text-emerald-600",
  REJECTED: "bg-rose-100 text-rose-600",
  EXPIRED: "bg-amber-100 text-amber-600",
};

const fmtCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);

const fieldLabelCls = "text-xs font-semibold text-slate-500";
const inputCls =
  "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100 hover:border-slate-300";
const selectCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100 hover:border-slate-300";
const textareaCls =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100 hover:border-slate-300";

const fmtDate = (value: string) =>
  new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

function QuoteCard({
  quote,
  onOpen,
  disabled = false,
}: {
  quote: QuoteSummary;
  onOpen: (id: string) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(quote.id)}
      disabled={disabled}
      className="flex w-full flex-col gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-100"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{quote.customerName}</p>
          <p className="text-xs text-slate-500">{quote.company ?? "-"}</p>
        </div>
        <ArrowUpRight className="h-4 w-4 text-slate-300" />
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
          {quote.quoteNumber}
        </span>
        <span>Total: {fmtCurrency(quote.total)}</span>
        <span>Updated: {fmtDate(quote.updatedAt)}</span>
      </div>
    </button>
  );
}

function DraggableQuoteCard({
  quote,
  onOpen,
  disabled = false,
}: {
  quote: QuoteSummary;
  onOpen: (id: string) => void;
  disabled?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: quote.id,
    data: {
      type: "quote",
      quoteId: quote.id,
      status: quote.status,
    },
    disabled,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isDragging ? "opacity-40" : undefined}
      {...attributes}
      {...listeners}
    >
      <QuoteCard quote={quote} onOpen={onOpen} disabled={disabled} />
    </div>
  );
}

function KanbanColumn({
  status,
  quotes,
  onOpenQuote,
  movingQuoteId,
}: {
  status: QuoteStatus;
  quotes: QuoteSummary[];
  onOpenQuote: (id: string) => void;
  movingQuoteId: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: {
      type: "status-lane",
      status,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex min-w-[260px] flex-1 flex-col gap-3 rounded-2xl border p-4 transition ${
        isOver
          ? "border-emerald-300 bg-emerald-50/70 shadow-sm"
          : "border-slate-200 bg-slate-50/60"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${STATUS_TONES[status]}`}>
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">{STATUS_LABELS[status]}</p>
            <p className="text-xs text-slate-500">{quotes.length} quotes</p>
          </div>
        </div>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-600 shadow-sm">
          {quotes.length}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto pr-1">
        {quotes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white/70 p-4 text-xs text-slate-500">
            No quotes in this lane.
          </div>
        ) : (
          quotes.map((quote) => (
            <DraggableQuoteCard
              key={quote.id}
              quote={quote}
              onOpen={onOpenQuote}
              disabled={movingQuoteId === quote.id}
            />
          ))
        )}
      </div>
    </div>
  );
}

function QuotationPreviewModal({
  quote,
  salesRep,
  onClose,
}: {
  quote: Quote;
  salesRep?: { name: string; email?: string | null } | null;
  onClose: () => void;
}) {
  useEffect(() => {
    document.body.classList.add("printing-quotation");
    return () => {
      document.body.classList.remove("printing-quotation");
    };
  }, []);

  return (
    <div className="quotation-print-layer fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm print:static print:block print:bg-white print:p-0">
      <div className="quotation-print-root relative flex h-[92vh] w-full max-w-[1100px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-[#f5f1e6] shadow-2xl print:h-auto print:max-w-none print:rounded-none print:border-none print:bg-white print:shadow-none">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 print:hidden">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
              Quotation Preview
            </p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">{quote.quoteNumber}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
            >
              Print
            </button>
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </div>

        <div className="quotation-preview-stage flex-1 overflow-auto bg-[#e9e2cf] p-6 print:overflow-visible print:bg-white print:p-0">
          <QuotationDocument quote={quote} salesRep={salesRep} />
        </div>
      </div>
    </div>
  );
}

export default function SalesPage() {
  const [filter, setFilter] = useState<QuoteFilter>({
    search: "",
    status: "ALL",
    page: 1,
    pageSize: PAGE_SIZE,
  });
  const [showBuilder, setShowBuilder] = useState(false);
  const [builderMode, setBuilderMode] = useState<"create" | "edit">("create");
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [builderError, setBuilderError] = useState<string | null>(null);
  const [activeQuoteId, setActiveQuoteId] = useState<string | null>(null);
  const [previewQuoteId, setPreviewQuoteId] = useState<string | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [form, setForm] = useState<QuoteFormData>({
    leadId: "",
    customerName: "",
    company: "",
    email: "",
    phone: "",
    billingAddress: "",
    shippingAddress: "",
    currency: "INR",
    status: QuoteStatus.DRAFT,
    discountType: DiscountType.PERCENT,
    discountValue: 0,
    taxRate: 0,
    validUntil: "",
    notes: "",
    terms: "",
    items: [createClientItem()],
  });

  const { data, isLoading, isError, error, refetch } = useQuotes(filter);
  const createQuote = useCreateQuote();
  const updateQuote = useUpdateQuote();
  const updateQuoteStatus = useUpdateQuoteStatus();
  const quotes = data?.data ?? [];
  const activeQuote = useQuote(activeQuoteId ?? "");
  const previewQuote = useQuote(previewQuoteId ?? "");
  const previewLead = useLeadDetail(previewQuote.data?.leadId ?? null);
  const assigneesQuery = useLeadAssignees();
  const [optimisticStatuses, setOptimisticStatuses] = useState<Record<string, QuoteStatus>>({});
  const [draggingQuoteId, setDraggingQuoteId] = useState<string | null>(null);
  const [movingQuoteId, setMovingQuoteId] = useState<string | null>(null);
  const [quoteMoveError, setQuoteMoveError] = useState<string | null>(null);
  const qualifiedLeadsQuery = useLeads(
    {
      search: "",
      status: LeadStatus.QUALIFIED,
      source: "ALL",
      assignedTo: "",
      priority: "ALL",
      page: 1,
      pageSize: 200,
    },
    { enabled: showBuilder }
  );
  const productsQuery = useProducts({
    search: "",
    category: "",
    status: "ALL",
    page: 1,
    pageSize: 200,
  });
  const qualifiedLeads = useMemo(() => {
    const leads = qualifiedLeadsQuery.data?.data ?? [];
    return [...leads].sort((a, b) => a.name.localeCompare(b.name));
  }, [qualifiedLeadsQuery.data?.data]);
  const inventoryProducts = useMemo(() => {
    const products = productsQuery.data?.data ?? [];
    return [...products].sort((a, b) => a.name.localeCompare(b.name));
  }, [productsQuery.data?.data]);

  const previewSalesRep = useMemo(() => {
    const lead = previewLead.data;
    if (!lead?.assignedTo) {
      return null;
    }

    const matchingAssignee = (assigneesQuery.data ?? []).find((assignee) => {
      if (lead.assignedToUserId) {
        return assignee.id === lead.assignedToUserId;
      }
      return assignee.name === lead.assignedTo;
    });

    return {
      name: matchingAssignee?.name ?? lead.assignedTo,
      email: matchingAssignee?.email ?? null,
    };
  }, [assigneesQuery.data, previewLead.data]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const projectedQuotes = useMemo(() => {
    return quotes.map((quote) => {
      const nextStatus = optimisticStatuses[quote.id];
      return nextStatus ? { ...quote, status: nextStatus } : quote;
    });
  }, [optimisticStatuses, quotes]);

  const grouped = useMemo(() => {
    const map: Record<QuoteStatus, QuoteSummary[]> = {
      DRAFT: [],
      SENT: [],
      ACCEPTED: [],
      REJECTED: [],
      EXPIRED: [],
    };
    projectedQuotes.forEach((quote) => {
      map[quote.status]?.push(quote);
    });
    return map;
  }, [projectedQuotes]);

  const totalByStatus = useMemo(() => {
    return Object.entries(grouped).map(([status, items]) => ({
      status: status as QuoteStatus,
      count: items.length,
    }));
  }, [grouped]);

  const subtotal = useMemo(() => {
    return form.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  }, [form.items]);

  const discountTotal = useMemo(() => {
    if (form.discountType === DiscountType.PERCENT) {
      return Math.min(subtotal * (form.discountValue / 100), subtotal);
    }
    return Math.min(form.discountValue, subtotal);
  }, [form.discountType, form.discountValue, subtotal]);

  const taxTotal = useMemo(() => {
    const base = Math.max(0, subtotal - discountTotal);
    return base * (form.taxRate / 100);
  }, [subtotal, discountTotal, form.taxRate]);

  const grandTotal = useMemo(() => {
    return Math.max(0, subtotal - discountTotal + taxTotal);
  }, [subtotal, discountTotal, taxTotal]);

  function updateItem(index: number, patch: Partial<QuoteFormItem>) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));
  }

  function addItem() {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, createClientItem()],
    }));
  }

  function removeItem(index: number) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  }

  function handleSelectLead(leadId: string) {
    setSelectedLeadId(leadId);
    const lead = qualifiedLeads.find((item) => item.id === leadId);
    if (!lead) {
      setForm((prev) => ({ ...prev, leadId: "" }));
      return;
    }
    setForm((prev) => ({
      ...prev,
      leadId: lead.id,
      customerName: lead.name ?? "",
      company: lead.company ?? "",
      email: lead.email ?? "",
      phone: lead.phone ?? "",
    }));
  }

  function addInventoryProduct(product: Product) {
    setForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        createClientItem({
          inventoryProductId: product.id,
          name: product.name,
          make: product.brand ?? "",
          description: product.description ?? product.category ?? "",
          utility: product.category ?? "",
          quantity: 1,
          unit: product.unit ?? "pcs",
          unitPrice: product.price ?? 0,
        }),
      ],
    }));
  }

  function openBuilder() {
    setBuilderError(null);
    setBuilderMode("create");
    setEditingQuoteId(null);
    setSelectedLeadId("");
    setSelectedProductId("");
    setForm({
      leadId: "",
      customerName: "",
      company: "",
      email: "",
      phone: "",
      billingAddress: "",
      shippingAddress: "",
      currency: "INR",
      status: QuoteStatus.DRAFT,
      discountType: DiscountType.PERCENT,
      discountValue: 0,
      taxRate: 0,
      validUntil: "",
      notes: "",
      terms: "",
      items: [createClientItem()],
    });
    setShowBuilder(true);
  }

  function closeBuilder() {
    setShowBuilder(false);
  }

  function openEditBuilder() {
    if (!activeQuote.data) return;
    const quote = activeQuote.data;
    setBuilderError(null);
    setBuilderMode("edit");
    setEditingQuoteId(quote.id);
    setSelectedLeadId(quote.leadId ?? "");
    setSelectedProductId("");
    setForm({
      leadId: quote.leadId ?? "",
      customerName: quote.customerName ?? "",
      company: quote.company ?? "",
      email: quote.email ?? "",
      phone: quote.phone ?? "",
      billingAddress: quote.billingAddress ?? "",
      shippingAddress: quote.shippingAddress ?? "",
      currency: quote.currency ?? "INR",
      status: quote.status,
      discountType: quote.discountType ?? DiscountType.PERCENT,
      discountValue: quote.discountValue ?? 0,
      taxRate: quote.taxRate ?? 0,
      validUntil: quote.validUntil ? quote.validUntil.slice(0, 10) : "",
      notes: quote.notes ?? "",
      terms: quote.terms ?? "",
      items: quote.items.length > 0
        ? quote.items.map((item) =>
            createClientItem({
              inventoryProductId: item.inventoryProductId ?? "",
              name: item.name,
              make: item.make ?? "",
              description: item.description ?? "",
              utility: item.utility ?? "",
              quantity: item.quantity,
              unit: item.unit ?? "",
              unitPrice: item.unitPrice,
            })
          )
        : [createClientItem()],
    });
    setActiveQuoteId(null);
    setShowBuilder(true);
  }

  function validateForm(): string | null {
    if (!form.customerName.trim()) {
      return "Customer name is required.";
    }
    if (form.items.length === 0) {
      return "Add at least one product.";
    }
    const invalidItem = form.items.find((item) => !item.name.trim() || item.quantity <= 0);
    if (invalidItem) {
      return "Each product needs a name and quantity.";
    }
    if (form.discountType === DiscountType.PERCENT && form.discountValue > 12) {
      return "Discount cannot exceed 12%.";
    }
    return null;
  }

  async function handleCreateQuote() {
    const validationError = validateForm();
    if (validationError) {
      setBuilderError(validationError);
      return;
    }
    setBuilderError(null);
    if (builderMode === "edit" && editingQuoteId) {
      await updateQuote.mutateAsync({ id: editingQuoteId, data: form });
    } else {
      await createQuote.mutateAsync(form);
    }
    closeBuilder();
  }

  async function handleDragEnd(event: DragEndEvent) {
    setDraggingQuoteId(null);
    const quoteId = String(event.active.id);
    const originStatus = event.active.data.current?.status as QuoteStatus | undefined;
    const targetStatus = event.over?.id as QuoteStatus | undefined;

    if (!originStatus || !targetStatus || originStatus === targetStatus) {
      return;
    }

    const quote = projectedQuotes.find((item) => item.id === quoteId);
    if (!quote) {
      return;
    }

    setQuoteMoveError(null);
    setOptimisticStatuses((prev) => ({ ...prev, [quoteId]: targetStatus }));
    setMovingQuoteId(quoteId);
    try {
      await updateQuoteStatus.mutateAsync({ id: quoteId, status: targetStatus });
      setOptimisticStatuses((prev) => {
        const next = { ...prev };
        delete next[quoteId];
        return next;
      });
    } catch (error) {
      setOptimisticStatuses((prev) => {
        const next = { ...prev };
        delete next[quoteId];
        return next;
      });
      setQuoteMoveError(
        error instanceof Error ? error.message : "Unable to update quotation status."
      );
    } finally {
      setMovingQuoteId(null);
    }
  }

  function handleDragStart(event: DragStartEvent) {
    setDraggingQuoteId(String(event.active.id));
    setQuoteMoveError(null);
  }

  const draggingQuote =
    draggingQuoteId != null
      ? projectedQuotes.find((quote) => quote.id === draggingQuoteId) ?? null
      : null;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-slate-500">
          Loading sales dashboard...
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-slate-500">
          {error instanceof Error ? error.message : "Failed to load quotes."}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex h-full w-full flex-col gap-6">
      {showBuilder ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeBuilder} />
          <div className="relative z-10 flex w-full max-w-6xl flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl max-h-[90vh] overflow-hidden">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">Quotation Builder</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-900">{builderMode === "edit" ? "Edit quotation" : "Build a new quotation"}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Add products, apply discount (max 12%), and confirm totals before saving.
                </p>
              </div>
              <button
                onClick={closeBuilder}
                className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_360px]">
                <div className="space-y-6 min-w-0">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800">Customer</h3>
                      <p className="text-xs text-slate-500">Choose from qualified leads and refine details.</p>
                    </div>
                    {qualifiedLeadsQuery.isLoading ? (
                      <span className="text-xs text-slate-400">Loading qualified leads...</span>
                    ) : null}
                    {qualifiedLeadsQuery.isError ? (
                      <span className="text-xs text-rose-500">Unable to load qualified leads.</span>
                    ) : null}
                  </div>
                  <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
                    <div>
                      <label className={fieldLabelCls}>Qualified Lead</label>
                      <select
                        value={selectedLeadId}
                        onChange={(e) => handleSelectLead(e.target.value)}
                        className={`${selectCls} mt-1`}
                      >
                        <option value="">Select a qualified lead</option>
                        {qualifiedLeads.map((lead) => (
                          <option key={lead.id} value={lead.id}>
                            {[lead.name, lead.company, lead.email].filter(Boolean).join(" | ")}
                          </option>
                        ))}
                      </select>
                      {qualifiedLeads.length === 0 && !qualifiedLeadsQuery.isLoading ? (
                        <p className="mt-1 text-xs text-slate-400">No qualified leads available yet.</p>
                      ) : null}
                    </div>
                    <div>
                      <label className={fieldLabelCls}>Customer Name</label>
                      <input
                        value={form.customerName}
                        onChange={(e) => setForm((prev) => ({ ...prev, customerName: e.target.value }))}
                        className={inputCls}
                        placeholder="Customer name"
                      />
                    </div>
                  </div>
                  <div className="mt-3 grid gap-4 md:grid-cols-2">
                    <div>
                      <label className={fieldLabelCls}>Company</label>
                      <input
                        value={form.company}
                        onChange={(e) => setForm((prev) => ({ ...prev, company: e.target.value }))}
                        className={inputCls}
                        placeholder="Company"
                      />
                    </div>
                    <div>
                      <label className={fieldLabelCls}>Email</label>
                      <input
                        value={form.email}
                        onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                        className={inputCls}
                        placeholder="Email"
                      />
                    </div>
                    <div>
                      <label className={fieldLabelCls}>Phone</label>
                      <input
                        value={form.phone}
                        onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                        className={inputCls}
                        placeholder="Phone"
                      />
                    </div>
                    <div className="hidden md:block" />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800">Products</h3>
                      <p className="text-xs text-slate-500">
                        Add from inventory or create a custom line item.
                      </p>
                    </div>
                    <button
                      onClick={addItem}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Custom Item
                    </button>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-[2fr_1fr_auto]">
                    <div>
                      <label className={fieldLabelCls}>Inventory Product</label>
                      <select
                        value={selectedProductId}
                        onChange={(e) => setSelectedProductId(e.target.value)}
                        className={`${selectCls} mt-1`}
                      >
                        <option value="">Select from inventory</option>
                        {inventoryProducts.map((product) => (
                          <option key={product.id} value={product.id}>
                            {[product.name, product.sku, product.price ? fmtCurrency(product.price) : null].filter(Boolean).join(" | ")}
                          </option>
                        ))}
                      </select>
                      {productsQuery.isLoading ? (
                        <p className="mt-1 text-xs text-slate-400">Loading inventory...</p>
                      ) : null}
                    </div>
                    <div>
                      <label className={fieldLabelCls}>Action</label>
                      <button
                        onClick={() => {
                          const product = inventoryProducts.find((item) => item.id === selectedProductId);
                          if (product) {
                            addInventoryProduct(product);
                            setSelectedProductId("");
                          }
                        }}
                        disabled={!selectedProductId}
                        className="mt-1 inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Add to Quote
                      </button>
                    </div>
                    <div className="hidden md:block" />
                  </div>

                  <div className="mt-4 space-y-4">
                    {form.items.map((item, index) => (
                      <div key={item.clientId ?? `${index}-${item.inventoryProductId ?? "custom"}`} className="rounded-xl border border-slate-200 bg-white p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-slate-500">Item {index + 1}</p>
                          {form.items.length > 1 && (
                            <button
                              onClick={() => removeItem(index)}
                              className="text-xs font-semibold text-rose-500 hover:text-rose-600"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        <div className="mt-2 grid gap-3 md:grid-cols-[2fr_1fr_1fr_1fr]">
                          <input
                            value={item.name}
                            onChange={(e) => updateItem(index, { name: e.target.value })}
                            className={inputCls}
                            placeholder="Product name"
                          />
                          <input
                            value={item.make}
                            onChange={(e) => updateItem(index, { make: e.target.value })}
                            className={inputCls}
                            placeholder="Make / Brand"
                          />
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => updateItem(index, { quantity: Number(e.target.value) || 0 })}
                            className={inputCls}
                            placeholder="Qty"
                          />
                          <input
                            type="number"
                            min={0}
                            value={item.unitPrice}
                            onChange={(e) => updateItem(index, { unitPrice: Number(e.target.value) || 0 })}
                            className={inputCls}
                            placeholder="Unit price (INR)"
                          />
                        </div>
                        <div className="mt-2 grid gap-3 md:grid-cols-[2fr_1fr_1fr]">
                          <input
                            value={item.description}
                            onChange={(e) => updateItem(index, { description: e.target.value })}
                            className={inputCls}
                            placeholder="Description (optional)"
                          />
                          <input
                            value={item.utility}
                            onChange={(e) => updateItem(index, { utility: e.target.value })}
                            className={inputCls}
                            placeholder="Product utility"
                          />
                          <input
                            value={item.unit}
                            onChange={(e) => updateItem(index, { unit: e.target.value })}
                            className={inputCls}
                            placeholder="Unit (pcs, sqft)"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                </div>

                <div className="space-y-4 min-w-0 lg:sticky lg:top-6 self-start">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <h3 className="text-sm font-semibold text-slate-800">Pricing</h3>
                    <div className="mt-3 grid gap-3">
                      <div className="grid grid-cols-2 gap-3">
                        <select
                          value={form.discountType}
                          onChange={(e) => setForm((prev) => ({ ...prev, discountType: e.target.value as DiscountType }))}
                          className={selectCls}
                        >
                          <option value={DiscountType.PERCENT}>Discount %</option>
                          <option value={DiscountType.AMOUNT}>Discount Amount</option>
                        </select>
                        <input
                          type="number"
                          min={0}
                          max={form.discountType === DiscountType.PERCENT ? 12 : undefined}
                          value={form.discountValue}
                          onChange={(e) => setForm((prev) => ({ ...prev, discountValue: Number(e.target.value) || 0 }))}
                          className={inputCls}
                          placeholder={form.discountType === DiscountType.PERCENT ? "Discount %" : "Discount (INR)"}
                        />
                      </div>
                      {form.discountType === DiscountType.PERCENT ? (
                        <p className="text-xs text-slate-500">Maximum discount allowed: 12%</p>
                      ) : null}
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="number"
                          min={0}
                          value={form.taxRate}
                          onChange={(e) => setForm((prev) => ({ ...prev, taxRate: Number(e.target.value) || 0 }))}
                          className={inputCls}
                          placeholder="Tax %"
                        />
                        <input
                          type="date"
                          value={form.validUntil}
                          onChange={(e) => setForm((prev) => ({ ...prev, validUntil: e.target.value }))}
                          className={inputCls}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <h3 className="text-sm font-semibold text-slate-800">Totals</h3>
                    <div className="mt-3 space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Subtotal</span>
                        <span className="font-semibold">{fmtCurrency(subtotal)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Discount</span>
                        <span className="font-semibold text-rose-500">- {fmtCurrency(discountTotal)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Tax</span>
                        <span className="font-semibold">{fmtCurrency(taxTotal)}</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-base">
                        <span className="font-semibold text-slate-700">Total</span>
                        <span className="font-semibold text-emerald-600">{fmtCurrency(grandTotal)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <label className={fieldLabelCls}>Notes</label>
                    <textarea
                      value={form.notes}
                      onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                      className={`${textareaCls} h-20`}
                      placeholder="Notes for customer"
                    />
                    <label className={`mt-3 block ${fieldLabelCls}`}>Terms</label>
                    <textarea
                      value={form.terms}
                      onChange={(e) => setForm((prev) => ({ ...prev, terms: e.target.value }))}
                      className={`${textareaCls} h-20`}
                      placeholder="Terms & conditions"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
              <div className="text-xs text-rose-500">{builderError}</div>
              <div className="flex items-center gap-2">
                <button
                  onClick={closeBuilder}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateQuote}
                  disabled={createQuote.isPending || updateQuote.isPending}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {createQuote.isPending || updateQuote.isPending
                    ? "Saving..."
                    : builderMode === "edit"
                      ? "Save Changes"
                      : "Create Quotation"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {activeQuoteId ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setActiveQuoteId(null)}
          />
          <div className="relative z-10 flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">
                  Quotation Details
                </p>
                <h2 className="mt-1 text-xl font-semibold text-slate-900">
                  {activeQuote.data?.quoteNumber ?? "Loading..."}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {activeQuote.data?.customerName ?? "Fetching quote information."}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {activeQuote.data ? (
                  <button
                    onClick={() => setPreviewQuoteId(activeQuote.data?.id ?? null)}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Preview Quote
                  </button>
                ) : null}
                {activeQuote.data?.status === QuoteStatus.DRAFT ? (
                  <button
                    onClick={openEditBuilder}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit Draft
                  </button>
                ) : null}
                <button
                  onClick={() => setActiveQuoteId(null)}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {activeQuote.isLoading ? (
                <div className="text-sm text-slate-500">Loading quotation...</div>
              ) : activeQuote.isError || !activeQuote.data ? (
                <div className="text-sm text-rose-500">Unable to load this quotation.</div>
              ) : (
                <div className="space-y-6">
                  <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 md:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold text-slate-500">Company</p>
                      <p className="text-sm text-slate-700">{activeQuote.data.company ?? "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500">Contact</p>
                      <p className="text-sm text-slate-700">
                        {[activeQuote.data.email ?? "-", activeQuote.data.phone].filter(Boolean).join(" | ")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500">Status</p>
                      <p className="text-sm text-slate-700">{STATUS_LABELS[activeQuote.data.status]}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500">Valid Until</p>
                      <p className="text-sm text-slate-700">
                        {activeQuote.data.validUntil ? fmtDate(activeQuote.data.validUntil) : "-"}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white">
                    <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800">
                      Line Items
                    </div>
                    <div className="divide-y divide-slate-100">
                      {activeQuote.data.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between"
                        >
                          <div>
                            <p className="font-semibold text-slate-800">{item.name}</p>
                            <p className="text-xs text-slate-500">
                              {item.make ? `Make: ${item.make} | ` : ""}
                              {item.utility ? `Utility: ${item.utility} | ` : ""}
                              {item.description ?? "No description"}
                              {item.unit ? ` | ${item.unit}` : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-6 text-sm text-slate-600">
                            <span>Qty: {item.quantity}</span>
                            <span>{fmtCurrency(item.unitPrice)}</span>
                            <span className="font-semibold text-slate-800">
                              {fmtCurrency(item.lineTotal)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <h3 className="text-sm font-semibold text-slate-800">Summary</h3>
                    <div className="mt-3 space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Subtotal</span>
                        <span className="font-semibold">{fmtCurrency(activeQuote.data.subtotal)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Discount</span>
                        <span className="font-semibold text-rose-500">
                          - {fmtCurrency(activeQuote.data.discountTotal)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Tax</span>
                        <span className="font-semibold">{fmtCurrency(activeQuote.data.taxTotal)}</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-base">
                        <span className="font-semibold text-slate-700">Total</span>
                        <span className="font-semibold text-emerald-600">
                          {fmtCurrency(activeQuote.data.total)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
      {previewQuoteId ? (
        previewQuote.data ? (
          <QuotationPreviewModal
            quote={previewQuote.data}
            salesRep={previewSalesRep}
            onClose={() => setPreviewQuoteId(null)}
          />
        ) : (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 text-sm text-slate-600 shadow-xl">
              Loading quotation preview...
            </div>
          </div>
        )
      ) : null}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-700">
              <Sparkles className="h-3 w-3" />
              Quotation Command Center
            </div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Track quotes from draft to close.
            </h1>
            <p className="max-w-xl text-sm text-slate-500">
              Keep quotes moving with a clear pipeline view and instant status filters.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={openBuilder}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" />
              Build Quotation
            </button>
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative w-full max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            placeholder="Search quotes by customer or number..."
            value={filter.search}
            onChange={(event) => setFilter((prev) => ({ ...prev, search: event.target.value, page: 1 }))}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-emerald-300"
          />
        </div>

        {([
          { label: "All", status: "ALL" },
          { label: "Draft", status: QuoteStatus.DRAFT },
          { label: "Sent", status: QuoteStatus.SENT },
          { label: "Accepted", status: QuoteStatus.ACCEPTED },
          { label: "Rejected", status: QuoteStatus.REJECTED },
          { label: "Expired", status: QuoteStatus.EXPIRED },
        ] as const).map((item) => {
          const active = filter.status === item.status;
          return (
            <button
              key={item.label}
              onClick={() => setFilter((prev) => ({ ...prev, status: item.status, page: 1 }))}
              className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                active
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <span className="font-semibold text-slate-700">Quick totals:</span>
        {totalByStatus.map((item) => (
          <span key={item.status}>
            {STATUS_LABELS[item.status]}: {item.count}
          </span>
        ))}
      </div>

      {quoteMoveError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {quoteMoveError}
        </div>
      ) : null}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-2">
          {(Object.keys(STATUS_LABELS) as QuoteStatus[]).map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              quotes={grouped[status]}
              onOpenQuote={(id) => setActiveQuoteId(id)}
              movingQuoteId={movingQuoteId}
            />
          ))}
        </div>

        <DragOverlay>
          {draggingQuote ? (
            <div className="w-[280px] rotate-1 opacity-95">
              <QuoteCard quote={draggingQuote} onOpen={() => {}} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}


