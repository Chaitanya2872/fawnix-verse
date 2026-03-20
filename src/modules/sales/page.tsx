"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, RefreshCw, Search, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useQuotes } from "./hooks";
import { QuoteStatus, type QuoteFilter, type QuoteSummary } from "./types";

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

  const { data, isLoading, isError, error, refetch } = useQuotes(filter);
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
