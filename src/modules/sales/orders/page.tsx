"use client";

import { useState, type ReactNode } from "react";
import { ArrowRightLeft, ClipboardList, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { useQuotes } from "@/modules/sales/hooks";
import { QuoteStatus, type QuoteFilter } from "@/modules/sales/types";
import {
  useConvertQuoteToOrder,
  useSalesOrder,
  useSalesOrders,
  useUpdateSalesOrderStatus,
} from "./hooks";
import { SalesOrderStatus, type SalesOrderSummary, type SalesOrderFilter } from "./types";

const PAGE_SIZE = 50;

const STATUS_OPTIONS: Array<SalesOrderStatus | "ALL"> = [
  "ALL",
  SalesOrderStatus.DRAFT,
  SalesOrderStatus.PENDING_APPROVAL,
  SalesOrderStatus.APPROVED,
  SalesOrderStatus.PROCESSING,
  SalesOrderStatus.PACKED,
  SalesOrderStatus.SHIPPED,
  SalesOrderStatus.DELIVERED,
  SalesOrderStatus.CLOSED,
  SalesOrderStatus.CANCELLED,
];

const STATUS_TONE: Record<SalesOrderStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  PENDING_APPROVAL: "bg-amber-100 text-amber-700",
  APPROVED: "bg-indigo-100 text-indigo-700",
  PROCESSING: "bg-sky-100 text-sky-700",
  PACKED: "bg-violet-100 text-violet-700",
  SHIPPED: "bg-cyan-100 text-cyan-700",
  DELIVERED: "bg-emerald-100 text-emerald-700",
  CLOSED: "bg-emerald-200 text-emerald-800",
  CANCELLED: "bg-rose-100 text-rose-700",
};

function toLabel(value: string) {
  return value.toLowerCase().replace(/_/g, " ");
}

function fmtCurrency(value: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function fmtDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function SalesOrdersPage() {
  const [filter, setFilter] = useState<SalesOrderFilter>({
    search: "",
    status: "ALL",
    page: 1,
    pageSize: PAGE_SIZE,
  });
  const [detailId, setDetailId] = useState("");

  const acceptedQuotesFilter: QuoteFilter = {
    search: "",
    status: QuoteStatus.ACCEPTED,
    page: 1,
    pageSize: 12,
  };

  const ordersQuery = useSalesOrders(filter);
  const detailQuery = useSalesOrder(detailId);
  const acceptedQuotesQuery = useQuotes(acceptedQuotesFilter);
  const convertMutation = useConvertQuoteToOrder();
  const statusMutation = useUpdateSalesOrderStatus();

  const orders = ordersQuery.data?.data ?? [];
  const acceptedQuotes = acceptedQuotesQuery.data?.data ?? [];
  const detail = detailQuery.data ?? null;

  function handleConvert(quoteId: string) {
    convertMutation.mutate(quoteId, {
      onSuccess: (created) => {
        toast.success(`Order ${created.orderNumber} created.`);
        setDetailId(created.id);
      },
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : "Could not convert quote.");
      },
    });
  }

  function handleStatusUpdate(order: SalesOrderSummary, status: SalesOrderStatus) {
    statusMutation.mutate(
      { id: order.id, status },
      {
        onSuccess: () => {
          toast.success("Order status updated.");
          setDetailId(order.id);
        },
        onError: (error) => {
          toast.error(error instanceof Error ? error.message : "Could not update status.");
        },
      }
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="flex flex-col gap-6">
          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Sales</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Sales Orders</h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-500">
                  Convert accepted quotes into orders and move them through the O2C execution flow.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <MetricCard label="Orders" value={String(ordersQuery.data?.total ?? 0)} />
                <MetricCard label="Accepted Quotes" value={String(acceptedQuotes.length)} />
                <MetricCard
                  label="Open Flow"
                  value={String(orders.filter((order) => !["DELIVERED", "CLOSED", "CANCELLED"].includes(order.status)).length)}
                />
              </div>
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <section className="space-y-4">
              <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <label className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={filter.search}
                      onChange={(event) => setFilter((prev) => ({ ...prev, search: event.target.value, page: 1 }))}
                      placeholder="Search order number, customer, company"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-10 py-2.5 text-sm text-slate-700 outline-none transition focus:border-sky-400"
                    />
                  </label>
                  <select
                    value={filter.status}
                    onChange={(event) => setFilter((prev) => ({ ...prev, status: event.target.value as SalesOrderStatus | "ALL", page: 1 }))}
                    className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700"
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status === "ALL" ? "All statuses" : toLabel(status)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-4 py-3">
                  <h2 className="text-sm font-semibold text-slate-900">Order Queue</h2>
                </div>
                {ordersQuery.isLoading ? (
                  <ListState icon={<Loader2 className="h-5 w-5 animate-spin" />} label="Loading orders..." />
                ) : !orders.length ? (
                  <ListState icon={<ClipboardList className="h-5 w-5" />} label="No sales orders yet." />
                ) : (
                  <div className="divide-y divide-slate-100">
                    {orders.map((order) => (
                      <button
                        key={order.id}
                        type="button"
                        onClick={() => setDetailId(order.id)}
                        className={`flex w-full flex-col gap-3 px-4 py-4 text-left transition hover:bg-slate-50 ${
                          detailId === order.id ? "bg-sky-50/70" : ""
                        }`}
                      >
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-slate-900">{order.orderNumber}</span>
                              <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${STATUS_TONE[order.status]}`}>
                                {toLabel(order.status)}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-slate-700">{order.customerName}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {order.company || "No company"} • Updated {fmtDate(order.updatedAt)}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <select
                              value={order.status}
                              onChange={(event) => {
                                event.stopPropagation();
                                handleStatusUpdate(order, event.target.value as SalesOrderStatus);
                              }}
                              className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-700"
                            >
                              {STATUS_OPTIONS.filter((status) => status !== "ALL").map((status) => (
                                <option key={status} value={status}>
                                  {toLabel(status)}
                                </option>
                              ))}
                            </select>
                            <span className="text-sm font-semibold text-slate-900">{fmtCurrency(order.total)}</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="space-y-4">
              <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="h-4 w-4 text-slate-400" />
                  <h2 className="text-sm font-semibold text-slate-900">Accepted Quotes Ready For Conversion</h2>
                </div>
                <div className="mt-4 space-y-3">
                  {acceptedQuotesQuery.isLoading ? (
                    <ListState icon={<Loader2 className="h-5 w-5 animate-spin" />} label="Loading accepted quotes..." compact />
                  ) : !acceptedQuotes.length ? (
                    <ListState icon={<ClipboardList className="h-5 w-5" />} label="No accepted quotes available." compact />
                  ) : (
                    acceptedQuotes.map((quote) => (
                      <div key={quote.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{quote.quoteNumber}</p>
                            <p className="mt-1 text-sm text-slate-700">{quote.customerName}</p>
                            <p className="mt-1 text-xs text-slate-500">{quote.company || "No company"} • {fmtDate(quote.updatedAt)}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleConvert(quote.id)}
                            disabled={convertMutation.isPending}
                            className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                          >
                            Convert
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-4 py-3">
                  <h2 className="text-sm font-semibold text-slate-900">Order Detail</h2>
                </div>
                {!detailId ? (
                  <ListState icon={<ClipboardList className="h-5 w-5" />} label="Select an order to inspect line items and billing details." compact />
                ) : detailQuery.isLoading ? (
                  <ListState icon={<Loader2 className="h-5 w-5 animate-spin" />} label="Loading order detail..." compact />
                ) : detail ? (
                  <div className="space-y-4 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-slate-950">{detail.orderNumber}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {detail.customerName} • {detail.company || "No company"}
                        </p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_TONE[detail.status]}`}>
                        {toLabel(detail.status)}
                      </span>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <InfoCard label="Quote" value={detail.quoteId || "Manual order"} />
                      <InfoCard label="Currency" value={detail.currency} />
                      <InfoCard label="Subtotal" value={fmtCurrency(detail.subtotal, detail.currency)} />
                      <InfoCard label="Total" value={fmtCurrency(detail.total, detail.currency)} />
                    </div>

                    <div className="rounded-2xl border border-slate-200">
                      <div className="border-b border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Line items
                      </div>
                      <div className="divide-y divide-slate-100">
                        {detail.items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between gap-3 px-3 py-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                              <p className="mt-1 text-xs text-slate-500">
                                {item.quantity} {item.unit || "units"} • {item.make || "Standard"}
                              </p>
                            </div>
                            <p className="text-sm font-semibold text-slate-900">
                              {fmtCurrency(item.lineTotal, detail.currency)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                      <p className="font-semibold text-slate-900">Billing</p>
                      <p className="mt-1">{detail.billingAddress || "No billing address"}</p>
                      <p className="mt-3 font-semibold text-slate-900">Shipping</p>
                      <p className="mt-1">{detail.shippingAddress || "No shipping address"}</p>
                    </div>
                  </div>
                ) : (
                  <ListState icon={<ClipboardList className="h-5 w-5" />} label="Order detail unavailable." compact />
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function ListState({
  icon,
  label,
  compact = false,
}: {
  icon: ReactNode;
  label: string;
  compact?: boolean;
}) {
  return (
    <div className={`flex items-center justify-center ${compact ? "p-6" : "p-10"}`}>
      <div className="flex flex-col items-center text-center text-slate-500">
        <div className="rounded-2xl bg-slate-100 p-3 text-slate-400">{icon}</div>
        <p className="mt-3 text-sm">{label}</p>
      </div>
    </div>
  );
}
