"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, Plus, RefreshCw, Search, Sparkles, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useCreateQuote, useQuotes } from "./hooks";
import {
  DiscountType,
  QuoteStatus,
  type QuoteFilter,
  type QuoteFormData,
  type QuoteFormItem,
  type QuoteSummary,
} from "./types";

const PAGE_SIZE = 200;

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
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

const fmtDate = (value: string) =>
  new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

function QuoteCard({ quote }: { quote: QuoteSummary }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm">
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
    </div>
  );
}

function KanbanColumn({
  status,
  quotes,
}: {
  status: QuoteStatus;
  quotes: QuoteSummary[];
}) {
  return (
    <div className="flex min-w-[260px] flex-1 flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
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
          quotes.map((quote) => <QuoteCard key={quote.id} quote={quote} />)
        )}
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
  const [builderError, setBuilderError] = useState<string | null>(null);
  const [form, setForm] = useState<QuoteFormData>({
    customerName: "",
    company: "",
    email: "",
    phone: "",
    billingAddress: "",
    shippingAddress: "",
    currency: "USD",
    status: QuoteStatus.DRAFT,
    discountType: DiscountType.PERCENT,
    discountValue: 0,
    taxRate: 0,
    validUntil: "",
    notes: "",
    terms: "",
    items: [
      {
        name: "",
        description: "",
        quantity: 1,
        unit: "",
        unitPrice: 0,
      },
    ],
  });

  const { data, isLoading, isError, error, refetch } = useQuotes(filter);
  const createQuote = useCreateQuote();
  const quotes = data?.data ?? [];

  const grouped = useMemo(() => {
    const map: Record<QuoteStatus, QuoteSummary[]> = {
      DRAFT: [],
      SENT: [],
      ACCEPTED: [],
      REJECTED: [],
      EXPIRED: [],
    };
    quotes.forEach((quote) => {
      map[quote.status]?.push(quote);
    });
    return map;
  }, [quotes]);

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
      items: [
        ...prev.items,
        { name: "", description: "", quantity: 1, unit: "", unitPrice: 0 },
      ],
    }));
  }

  function removeItem(index: number) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  }

  function openBuilder() {
    setBuilderError(null);
    setShowBuilder(true);
  }

  function closeBuilder() {
    setShowBuilder(false);
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
    await createQuote.mutateAsync(form);
    closeBuilder();
  }

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
          <div className="relative z-10 flex w-full max-w-5xl flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">Quotation Builder</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-900">Build a new quote</h2>
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

            <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
              <div className="space-y-5 min-w-0">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-500">Customer Name</label>
                    <input
                      value={form.customerName}
                      onChange={(e) => setForm((prev) => ({ ...prev, customerName: e.target.value }))}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-300"
                      placeholder="Customer name"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500">Company</label>
                    <input
                      value={form.company}
                      onChange={(e) => setForm((prev) => ({ ...prev, company: e.target.value }))}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-300"
                      placeholder="Company"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500">Email</label>
                    <input
                      value={form.email}
                      onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-300"
                      placeholder="Email"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500">Phone</label>
                    <input
                      value={form.phone}
                      onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-300"
                      placeholder="Phone"
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-800">Products</h3>
                    <button
                      onClick={addItem}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Product
                    </button>
                  </div>
                  <div className="mt-4 space-y-3">
                    {form.items.map((item, index) => (
                      <div key={`${index}-${item.name}`} className="rounded-xl border border-slate-200 p-3">
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
                        <div className="mt-2 grid gap-3 md:grid-cols-[2fr_1fr_1fr]">
                          <input
                            value={item.name}
                            onChange={(e) => updateItem(index, { name: e.target.value })}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-300"
                            placeholder="Product name"
                          />
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => updateItem(index, { quantity: Number(e.target.value) || 0 })}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-300"
                            placeholder="Qty"
                          />
                          <input
                            type="number"
                            min={0}
                            value={item.unitPrice}
                            onChange={(e) => updateItem(index, { unitPrice: Number(e.target.value) || 0 })}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-300"
                            placeholder="Unit price"
                          />
                        </div>
                        <div className="mt-2 grid gap-3 md:grid-cols-[2fr_1fr]">
                          <input
                            value={item.description}
                            onChange={(e) => updateItem(index, { description: e.target.value })}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-300"
                            placeholder="Description (optional)"
                          />
                          <input
                            value={item.unit}
                            onChange={(e) => updateItem(index, { unit: e.target.value })}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-300"
                            placeholder="Unit (pcs, sqft)"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4 min-w-0">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <h3 className="text-sm font-semibold text-slate-800">Pricing</h3>
                  <div className="mt-3 grid gap-3">
                    <div className="grid grid-cols-[1fr_1fr] gap-3">
                      <select
                        value={form.discountType}
                        onChange={(e) => setForm((prev) => ({ ...prev, discountType: e.target.value as DiscountType }))}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-300"
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
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-300"
                        placeholder="Discount"
                      />
                    </div>
                    {form.discountType === DiscountType.PERCENT ? (
                      <p className="text-xs text-slate-500">Maximum discount allowed: 12%</p>
                    ) : null}
                    <div className="grid grid-cols-[1fr_1fr] gap-3">
                      <input
                        type="number"
                        min={0}
                        value={form.taxRate}
                        onChange={(e) => setForm((prev) => ({ ...prev, taxRate: Number(e.target.value) || 0 }))}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-300"
                        placeholder="Tax %"
                      />
                      <input
                        type="date"
                        value={form.validUntil}
                        onChange={(e) => setForm((prev) => ({ ...prev, validUntil: e.target.value }))}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-300"
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

                <div className="rounded-2xl border border-slate-200 p-4">
                  <label className="text-xs font-semibold text-slate-500">Notes</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                    className="mt-2 h-20 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-300"
                    placeholder="Notes for customer"
                  />
                  <label className="mt-3 block text-xs font-semibold text-slate-500">Terms</label>
                  <textarea
                    value={form.terms}
                    onChange={(e) => setForm((prev) => ({ ...prev, terms: e.target.value }))}
                    className="mt-2 h-20 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-300"
                    placeholder="Terms & conditions"
                  />
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
                  disabled={createQuote.isPending}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {createQuote.isPending ? "Saving..." : "Create Quote"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-700">
              <Sparkles className="h-3 w-3" />
              Sales Command Center
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

      <div className="flex gap-4 overflow-x-auto pb-2">
        {(Object.keys(STATUS_LABELS) as QuoteStatus[]).map((status) => (
          <KanbanColumn key={status} status={status} quotes={grouped[status]} />
        ))}
      </div>
    </div>
  );
}
