"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { LucideIcon } from "lucide-react";
import {
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Download,
  FileText,
  Loader2,
  MoreHorizontal,
  PackageCheck,
  Plus,
  ReceiptText,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, getInitials, timeAgo } from "@/lib/utils";
import type { QuoteSummary } from "@/modules/sales/types";
import type {
  ManualOrderFormState,
  ManualOrderItemDraft,
  SalesOrder,
  SalesOrderStatus,
  SalesOrderSummary,
} from "./types";

export const ORDER_STATUS_TONE: Record<SalesOrderStatus, string> = {
  DRAFT: "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
  PENDING_APPROVAL: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/70 dark:text-amber-300",
  APPROVED: "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300",
  PROCESSING: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/70 dark:text-sky-300",
  PACKED: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/70 dark:text-violet-300",
  SHIPPED: "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-800 dark:bg-cyan-950/70 dark:text-cyan-300",
  DELIVERED: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300",
  CLOSED: "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  CANCELLED: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/70 dark:text-rose-300",
};

type HeroProps = {
  orderCount: number;
  onCreateOrder: () => void;
  onExport: () => void;
};

type KpiMetric = {
  key: string;
  label: string;
  value: string;
  trend: string;
  hint: string;
  icon: LucideIcon;
  tone: string;
  bars: number[];
};

type OrderTab = {
  key: string;
  label: string;
  count: number;
};

type QueueProps = {
  orders: SalesOrderSummary[];
  search: string;
  onSearchChange: (value: string) => void;
  tabs: OrderTab[];
  activeTab: string;
  onTabChange: (value: string) => void;
  isLoading: boolean;
  onOpenOrder: (orderId: string) => void;
  onCreateOrder: () => void;
};

type AcceptedQuotesProps = {
  quotes: QuoteSummary[];
  isLoading: boolean;
  isConverting: boolean;
  onConvert: (quoteId: string) => void;
};

type ActivityItem = {
  id: string;
  title: string;
  subtitle: string;
  timestamp: string;
  kind: "order" | "quote" | "delivery";
};

type QuickStat = {
  label: string;
  value: string;
  helper: string;
};

type OpsStat = {
  label: string;
  value: string;
  helper: string;
  tone?: string;
};

type PendingApproval = {
  id: string;
  orderNumber: string;
  customerName: string;
  total: number;
  updatedAt: string;
};

type DrawerShellProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  widthClassName?: string;
};

type CreateDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: ManualOrderFormState;
  subtotal: number;
  total: number;
  pending: boolean;
  onFieldChange: <K extends keyof ManualOrderFormState>(field: K, value: ManualOrderFormState[K]) => void;
  onItemChange: (key: string, field: keyof ManualOrderItemDraft, value: string) => void;
  onAddItem: () => void;
  onRemoveItem: (key: string) => void;
  onReset: () => void;
  onSubmit: () => void;
};

type DetailDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: SalesOrder | null;
  loading: boolean;
  statusOptions: SalesOrderStatus[];
  onStatusChange: (status: SalesOrderStatus) => void;
  statusPending: boolean;
};

export function toLabel(value: string) {
  return value.toLowerCase().replace(/_/g, " ");
}

export function fmtCurrency(value: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

export function fmtDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function SalesOrdersHero({ orderCount, onCreateOrder, onExport }: HeroProps) {
  return (
    <section className="rounded-[20px] border border-slate-200 bg-[#FCFCFD] shadow-[0_8px_24px_-18px_rgba(16,24,40,0.18)] dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-5 px-5 py-5 lg:flex-row lg:items-end lg:justify-between lg:px-6">
        <div className="min-w-0 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
            <span>Sales</span>
            <ChevronRight className="h-3.5 w-3.5 opacity-70" />
            <span>Order-to-Cash</span>
          </div>
          <div className="mt-3 space-y-1.5">
            <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[#101828] sm:text-4xl dark:text-white">Sales Orders</h1>
            <p className="max-w-2xl text-sm text-[#667085] dark:text-slate-400">
              Manage quote conversions, direct order intake, and execution status from one operational control surface.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex h-11 items-center gap-2 rounded-full border border-[#EAECF0] bg-white px-4 text-sm text-[#667085] shadow-[0_1px_2px_rgba(16,24,40,0.05)] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#98A2B3] dark:text-slate-500">Live Queue</span>
            <span className="h-1 w-1 rounded-full bg-[#98A2B3] dark:bg-slate-600" />
            <span className="font-semibold text-[#101828] dark:text-white">{orderCount} active</span>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={onExport}
            className="h-11 rounded-xl border-[#EAECF0] bg-white px-4 text-[#344054] shadow-none hover:bg-[#F2F4F7] hover:text-[#101828] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button
            type="button"
            onClick={onCreateOrder}
            className="h-11 rounded-xl bg-[#0F172A] px-5 text-white shadow-[0_6px_16px_-10px_rgba(15,23,42,0.45)] hover:bg-[#111827] dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
          >
            <Plus className="h-4 w-4" />
            Create Order
          </Button>
        </div>
      </div>
    </section>
  );
}

export function SalesOrdersKpis({ metrics, isLoading }: { metrics: KpiMetric[]; isLoading: boolean }) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {metrics.map((metric) => (
        <article
          key={metric.key}
          className="group relative overflow-hidden rounded-[20px] border border-[#EAECF0] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.05)] transition-all duration-200 hover:border-slate-300 hover:bg-[#FCFCFD] dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 dark:hover:bg-slate-900"
        >
          <div className={cn("absolute inset-x-0 top-0 h-px opacity-60", metric.tone)} />
          <div className="relative space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#98A2B3] dark:text-slate-500">{metric.label}</p>
                {isLoading ? (
                  <div className="h-8 w-24 animate-pulse rounded-xl bg-slate-200/80 dark:bg-slate-800" />
                ) : (
                  <p className="text-[28px] font-semibold leading-none tracking-[-0.03em] text-[#101828] dark:text-white">{metric.value}</p>
                )}
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#EAECF0] bg-[#F8FAFC] text-[#667085] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                <metric.icon className="h-4 w-4" />
              </div>
            </div>

            <div className="flex items-end justify-between gap-3">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1 text-xs font-medium text-[#12B76A] dark:text-emerald-400">
                  <ArrowUpRight className="h-3 w-3" />
                  {metric.trend}
                </div>
                <p className="text-xs text-[#667085] dark:text-slate-400">{metric.hint}</p>
              </div>
              <div className="flex h-7 items-end gap-1 rounded-xl bg-[#F8FAFC] px-2 py-1.5 ring-1 ring-[#EAECF0] dark:bg-slate-950 dark:ring-slate-800">
                {metric.bars.map((bar, index) => (
                  <span
                    key={`${metric.key}-${index}`}
                    className="w-1 rounded-full bg-slate-400 dark:bg-slate-500"
                    style={{ height: `${Math.max(24, Math.round(bar * 0.7))}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}

export function SalesOrdersQueueCard({
  orders,
  search,
  onSearchChange,
  tabs,
  activeTab,
  onTabChange,
  isLoading,
  onOpenOrder,
  onCreateOrder,
}: QueueProps) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/88 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.28)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/85">
      <div className="border-b border-slate-200/80 px-5 py-5 dark:border-slate-800">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-950 dark:text-white">Sales Order Queue</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Prioritize fulfillment, approvals, and order health in one view.</p>
          </div>
          <div className="w-full xl:max-w-sm">
            <div className="relative">
              <Input
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search order number, customer, company"
                className="h-11 rounded-2xl border-0 bg-slate-100/90 pl-11 text-sm shadow-none ring-1 ring-slate-200/70 transition focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-sky-500/30 dark:bg-slate-800/80 dark:ring-slate-700 dark:focus-visible:bg-slate-900"
              />
              <Sparkles className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
        </div>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => {
            const active = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onTabChange(tab.key)}
                className={cn(
                  "inline-flex min-w-fit items-center gap-2 rounded-2xl px-3.5 py-2 text-sm font-medium transition",
                  active
                    ? "bg-slate-950 text-white shadow-lg shadow-slate-950/10 dark:bg-white dark:text-slate-950"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                )}
              >
                <span>{tab.label}</span>
                <span className={cn("rounded-full px-2 py-0.5 text-[11px]", active ? "bg-white/15 text-white dark:bg-slate-200 dark:text-slate-950" : "bg-white text-slate-500 dark:bg-slate-900 dark:text-slate-400")}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-h-[820px] overflow-auto">
        <div className="sticky top-0 z-10 grid grid-cols-[minmax(0,2.1fr)_minmax(120px,0.9fr)_minmax(120px,0.8fr)_minmax(140px,0.9fr)] gap-4 border-b border-slate-200/80 bg-white/90 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-400">
          <span>Order & Customer</span>
          <span>Status</span>
          <span>Amount</span>
          <span>Updated</span>
        </div>

        {isLoading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="grid animate-pulse grid-cols-[minmax(0,2.1fr)_minmax(120px,0.9fr)_minmax(120px,0.8fr)_minmax(140px,0.9fr)] gap-4 rounded-3xl border border-slate-200/70 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                <div className="h-12 rounded-2xl bg-slate-200 dark:bg-slate-800" />
                <div className="h-8 rounded-2xl bg-slate-200 dark:bg-slate-800" />
                <div className="h-8 rounded-2xl bg-slate-200 dark:bg-slate-800" />
                <div className="h-8 rounded-2xl bg-slate-200 dark:bg-slate-800" />
              </div>
            ))}
          </div>
        ) : orders.length ? (
          <div className="space-y-2 p-3">
            {orders.map((order) => (
              <button
                key={order.id}
                type="button"
                onClick={() => onOpenOrder(order.id)}
                className="group grid w-full grid-cols-[minmax(0,2.1fr)_minmax(120px,0.9fr)_minmax(120px,0.8fr)_minmax(140px,0.9fr)] gap-4 rounded-[24px] border border-transparent bg-transparent px-2 py-2.5 text-left transition hover:border-slate-200/80 hover:bg-slate-50/80 dark:hover:border-slate-800 dark:hover:bg-slate-950/50"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-sm font-semibold text-slate-700 ring-1 ring-slate-200/80 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700">
                    {getInitials(order.customerName)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">{order.orderNumber}</p>
                      {order.quoteId ? (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          Quote conversion
                        </span>
                      ) : (
                        <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-600 dark:bg-sky-950/60 dark:text-sky-300">
                          Manual
                        </span>
                      )}
                    </div>
                    <p className="mt-1 truncate text-sm text-slate-600 dark:text-slate-300">{order.customerName}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span>{order.company || "No company"}</span>
                      <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                      <span>{order.quoteId ? "Presales handoff" : "Direct intake"}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center">
                  <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold", ORDER_STATUS_TONE[order.status])}>
                    {toLabel(order.status)}
                  </span>
                </div>

                <div className="flex items-center">
                  <div>
                    <p className="text-sm font-semibold text-slate-950 dark:text-white">{fmtCurrency(order.total)}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{order.inventoryReserved ? "Reserved" : "Pending reserve"}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{timeAgo(order.updatedAt)}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{fmtDate(order.updatedAt)}</p>
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-400 transition group-hover:text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500 dark:group-hover:text-slate-200">
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-[24px] border border-slate-200 bg-white text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              <ClipboardList className="h-6 w-6" />
            </div>
            <h3 className="mt-5 text-lg font-semibold text-slate-950 dark:text-white">Your queue is ready for lift-off</h3>
            <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
              Create your first sales order or convert an accepted quote to kick off the O2C flow.
            </p>
            <Button onClick={onCreateOrder} className="mt-5 h-11 rounded-2xl bg-slate-950 px-5 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200">
              <Plus className="h-4 w-4" />
              Create your first sales order
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}

export function AcceptedQuotesCard({ quotes, isLoading, isConverting, onConvert }: AcceptedQuotesProps) {
  return (
    <SurfaceCard title="Accepted Quotes" subtitle="Ready for conversion">
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="animate-pulse rounded-[22px] border border-slate-200/70 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="h-4 w-28 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="mt-3 h-4 w-40 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="mt-4 h-9 rounded-2xl bg-slate-200 dark:bg-slate-800" />
            </div>
          ))
        ) : quotes.length ? (
          quotes.map((quote) => (
            <div key={quote.id} className="rounded-[24px] border border-slate-200/70 bg-slate-50/75 p-4 transition hover:border-slate-300 hover:bg-white dark:border-slate-800 dark:bg-slate-950/55 dark:hover:border-slate-700 dark:hover:bg-slate-950">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300">
                      Accepted
                    </span>
                    <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">{quote.quoteNumber}</p>
                  </div>
                  <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">{quote.customerName}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>{quote.company || "No company"}</span>
                    <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                    <span>{fmtCurrency(quote.total)}</span>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onConvert(quote.id)}
                  disabled={isConverting}
                  className="rounded-xl bg-slate-950 px-3 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                >
                  {isConverting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Convert"}
                </Button>
              </div>
            </div>
          ))
        ) : (
          <EmptyMiniState icon={<FileText className="h-5 w-5" />} label="No accepted quotes are waiting for conversion." />
        )}
      </div>
    </SurfaceCard>
  );
}

export function QuickStatsCard({ stats }: { stats: QuickStat[] }) {
  return (
    <SurfaceCard title="Quick Stats" subtitle="Operational pulse">
      <div className="space-y-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-[22px] bg-slate-50/85 px-4 py-3 ring-1 ring-slate-200/70 dark:bg-slate-950/55 dark:ring-slate-800">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{stat.label}</p>
              <p className="text-lg font-semibold text-slate-950 dark:text-white">{stat.value}</p>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{stat.helper}</p>
          </div>
        ))}
      </div>
    </SurfaceCard>
  );
}

export function OperationsSnapshotCard({
  title,
  subtitle,
  stats,
}: {
  title: string;
  subtitle: string;
  stats: OpsStat[];
}) {
  return (
    <SurfaceCard title={title} subtitle={subtitle}>
      <div className="space-y-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-[22px] border border-slate-200/70 bg-slate-50/85 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/55"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{stat.label}</p>
              <p className={cn("text-lg font-semibold text-slate-950 dark:text-white", stat.tone)}>{stat.value}</p>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{stat.helper}</p>
          </div>
        ))}
      </div>
    </SurfaceCard>
  );
}

export function PendingApprovalsCard({
  approvals,
  onOpenOrder,
}: {
  approvals: PendingApproval[];
  onOpenOrder: (orderId: string) => void;
}) {
  return (
    <SurfaceCard title="Pending Approvals" subtitle="Needs decision">
      <div className="space-y-3">
        {approvals.length ? (
          approvals.map((order) => (
            <button
              key={order.id}
              type="button"
              onClick={() => onOpenOrder(order.id)}
              className="flex w-full items-center justify-between gap-3 rounded-[22px] border border-slate-200/70 bg-slate-50/80 px-4 py-3 text-left transition hover:border-amber-200 hover:bg-amber-50/70 dark:border-slate-800 dark:bg-slate-950/55 dark:hover:border-amber-900 dark:hover:bg-amber-950/30"
            >
              <div>
                <p className="text-sm font-semibold text-slate-950 dark:text-white">{order.orderNumber}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{order.customerName}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-950 dark:text-white">{fmtCurrency(order.total)}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{timeAgo(order.updatedAt)}</p>
              </div>
            </button>
          ))
        ) : (
          <EmptyMiniState icon={<CheckCircle2 className="h-5 w-5" />} label="No orders are blocked on approval right now." />
        )}
      </div>
    </SurfaceCard>
  );
}

export function ActivityTimelineCard({ items }: { items: ActivityItem[] }) {
  return (
    <SurfaceCard title="Recent Activity" subtitle="Cross-team momentum">
      <div className="space-y-4">
        {items.length ? (
          items.map((item, index) => (
            <div key={item.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-2xl ring-1", activityTone(item.kind))}>
                  {activityIcon(item.kind)}
                </div>
                {index < items.length - 1 ? <div className="mt-2 h-full w-px bg-slate-200 dark:bg-slate-800" /> : null}
              </div>
              <div className="min-w-0 flex-1 pb-4">
                <p className="text-sm font-medium text-slate-900 dark:text-white">{item.title}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{item.subtitle}</p>
                <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">{timeAgo(item.timestamp)}</p>
              </div>
            </div>
          ))
        ) : (
          <EmptyMiniState icon={<ReceiptText className="h-5 w-5" />} label="Activity will appear here as orders move through the flow." />
        )}
      </div>
    </SurfaceCard>
  );
}

export function CreateOrderDrawer({
  open,
  onOpenChange,
  form,
  subtotal,
  total,
  pending,
  onFieldChange,
  onItemChange,
  onAddItem,
  onRemoveItem,
  onReset,
  onSubmit,
}: CreateDrawerProps) {
  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title="Create Sales Order"
      description="Build a premium order intake record without leaving the queue."
      footer={
        <>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="rounded-2xl px-4 text-slate-600 dark:text-slate-300">
            Cancel
          </Button>
          <Button type="button" variant="outline" onClick={onReset} className="rounded-2xl border-slate-200 dark:border-slate-700">
            Reset
          </Button>
          <Button
            type="button"
            onClick={onSubmit}
            disabled={pending}
            className="rounded-2xl bg-slate-950 px-5 text-white shadow-[0_16px_30px_-18px_rgba(15,23,42,0.85)] hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Create Order
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <DrawerSection
          title="Customer Information"
          description="Primary contact and customer identity"
          icon={<Sparkles className="h-4 w-4" />}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <DrawerField label="Customer name">
              <Input value={form.customerName} onChange={(event) => onFieldChange("customerName", event.target.value)} className={drawerInputClassName} />
            </DrawerField>
            <DrawerField label="Company">
              <Input value={form.company} onChange={(event) => onFieldChange("company", event.target.value)} className={drawerInputClassName} />
            </DrawerField>
            <DrawerField label="Email">
              <Input value={form.email} onChange={(event) => onFieldChange("email", event.target.value)} className={drawerInputClassName} />
            </DrawerField>
            <DrawerField label="Phone">
              <Input value={form.phone} onChange={(event) => onFieldChange("phone", event.target.value)} className={drawerInputClassName} />
            </DrawerField>
          </div>
        </DrawerSection>

        <DrawerSection
          title="Billing & Shipping"
          description="Logistics and invoicing context"
          icon={<PackageCheck className="h-4 w-4" />}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <DrawerField label="Billing address" className="sm:col-span-2">
              <textarea
                rows={3}
                value={form.billingAddress}
                onChange={(event) => onFieldChange("billingAddress", event.target.value)}
                className={drawerTextareaClassName}
              />
            </DrawerField>
            <DrawerField label="Shipping address" className="sm:col-span-2">
              <textarea
                rows={3}
                value={form.shippingAddress}
                onChange={(event) => onFieldChange("shippingAddress", event.target.value)}
                className={drawerTextareaClassName}
              />
            </DrawerField>
          </div>
        </DrawerSection>

        <DrawerSection
          title="Order Items"
          description="Define the requested products and pricing"
          icon={<ReceiptText className="h-4 w-4" />}
          action={
            <Button type="button" size="icon" variant="outline" onClick={onAddItem} className="h-9 w-9 rounded-xl border-slate-200 bg-white/70 dark:border-slate-700 dark:bg-slate-900/60">
              <Plus className="h-4 w-4" />
            </Button>
          }
        >
          <div className="space-y-3">
            {form.items.map((item, index) => (
              <div key={item.key} className="rounded-[22px] border border-slate-200/70 bg-slate-50/85 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Line item {index + 1}</p>
                  <button
                    type="button"
                    onClick={() => onRemoveItem(item.key)}
                    disabled={form.items.length === 1}
                    className="rounded-xl p-2 text-slate-400 transition hover:bg-white hover:text-slate-700 disabled:opacity-40 dark:hover:bg-slate-900 dark:hover:text-slate-200"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <DrawerField label="Item name">
                    <Input value={item.name} onChange={(event) => onItemChange(item.key, "name", event.target.value)} className={drawerInputClassName} />
                  </DrawerField>
                  <DrawerField label="Make">
                    <Input value={item.make} onChange={(event) => onItemChange(item.key, "make", event.target.value)} className={drawerInputClassName} />
                  </DrawerField>
                  <DrawerField label="Quantity">
                    <Input type="number" min="0.01" step="0.01" value={item.quantity} onChange={(event) => onItemChange(item.key, "quantity", event.target.value)} className={drawerInputClassName} />
                  </DrawerField>
                  <DrawerField label="Unit price">
                    <Input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(event) => onItemChange(item.key, "unitPrice", event.target.value)} className={drawerInputClassName} />
                  </DrawerField>
                  <DrawerField label="Unit">
                    <Input value={item.unit} onChange={(event) => onItemChange(item.key, "unit", event.target.value)} className={drawerInputClassName} />
                  </DrawerField>
                  <DrawerField label="Utility">
                    <Input value={item.utility} onChange={(event) => onItemChange(item.key, "utility", event.target.value)} className={drawerInputClassName} />
                  </DrawerField>
                  <DrawerField label="Description" className="sm:col-span-2">
                    <textarea
                      rows={2}
                      value={item.description}
                      onChange={(event) => onItemChange(item.key, "description", event.target.value)}
                      className={drawerTextareaClassName}
                    />
                  </DrawerField>
                </div>
              </div>
            ))}
          </div>
        </DrawerSection>

        <DrawerSection
          title="Pricing Summary"
          description="Commercial guardrails and value snapshot"
          icon={<TrendingUp className="h-4 w-4" />}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <DrawerField label="Currency">
              <Input value={form.currency} onChange={(event) => onFieldChange("currency", event.target.value.toUpperCase())} className={drawerInputClassName} />
            </DrawerField>
            <DrawerField label="Status">
              <select
                value={form.status}
                onChange={(event) => onFieldChange("status", event.target.value as SalesOrderStatus)}
                className={drawerSelectClassName}
              >
                {Object.values(ORDER_STATUS_TONE).length &&
                  (["DRAFT", "PENDING_APPROVAL", "APPROVED", "PROCESSING", "PACKED", "SHIPPED", "DELIVERED", "CLOSED", "CANCELLED"] as SalesOrderStatus[]).map((status) => (
                    <option key={status} value={status}>
                      {toLabel(status)}
                    </option>
                  ))}
              </select>
            </DrawerField>
            <DrawerField label="Tax rate (%)">
              <Input type="number" min="0" step="0.01" value={form.taxRate} onChange={(event) => onFieldChange("taxRate", event.target.value)} className={drawerInputClassName} />
            </DrawerField>
            <div className="rounded-[22px] border border-slate-200/70 bg-white/80 px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Projected total</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{fmtCurrency(total, form.currency || "INR")}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Subtotal {fmtCurrency(subtotal, form.currency || "INR")}</p>
            </div>
          </div>
        </DrawerSection>

        <DrawerSection title="Notes" description="Context for approvals and execution" icon={<MoreHorizontal className="h-4 w-4" />}>
          <textarea
            rows={4}
            value={form.notes}
            onChange={(event) => onFieldChange("notes", event.target.value)}
            className={drawerTextareaClassName}
          />
        </DrawerSection>
      </div>
    </DrawerShell>
  );
}

export function OrderDetailDrawer({
  open,
  onOpenChange,
  order,
  loading,
  statusOptions,
  onStatusChange,
  statusPending,
}: DetailDrawerProps) {
  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title={order?.orderNumber ?? "Order detail"}
      description={order ? `${order.customerName} ${order.company ? `| ${order.company}` : ""}` : "Inspect order status, items, and addresses."}
      footer={
        order ? (
          <>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="rounded-2xl px-4 text-slate-600 dark:text-slate-300">
              Close
            </Button>
            <select
              value={order.status}
              onChange={(event) => onStatusChange(event.target.value as SalesOrderStatus)}
              disabled={statusPending}
              className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {toLabel(status)}
                </option>
              ))}
            </select>
          </>
        ) : null
      }
    >
      {loading ? (
        <div className="flex min-h-[320px] items-center justify-center">
          <div className="flex items-center gap-3 rounded-2xl bg-slate-100/80 px-4 py-3 text-sm text-slate-500 dark:bg-slate-800/70 dark:text-slate-300">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading order detail...
          </div>
        </div>
      ) : order ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <DetailStat label="Status" value={toLabel(order.status)} tone={ORDER_STATUS_TONE[order.status]} />
            <DetailStat label="Total" value={fmtCurrency(order.total, order.currency)} />
            <DetailStat label="Quote source" value={order.quoteId || "Manual order"} />
            <DetailStat label="Reserved inventory" value={order.inventoryReserved ? "Reserved" : "Pending"} />
          </div>

          <DrawerSection title="Line Items" description="Commercial scope">
            <div className="space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="rounded-[22px] border border-slate-200/70 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-950 dark:text-white">{item.name}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {item.quantity} {item.unit || "units"} | {item.make || "Standard"} | {item.utility || "General"}
                      </p>
                      {item.description ? <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.description}</p> : null}
                    </div>
                    <p className="text-sm font-semibold text-slate-950 dark:text-white">{fmtCurrency(item.lineTotal, order.currency)}</p>
                  </div>
                </div>
              ))}
            </div>
          </DrawerSection>

          <DrawerSection title="Addresses" description="Logistics">
            <div className="grid gap-4 sm:grid-cols-2">
              <AddressBlock title="Billing" value={order.billingAddress || "No billing address"} />
              <AddressBlock title="Shipping" value={order.shippingAddress || "No shipping address"} />
            </div>
          </DrawerSection>

          <DrawerSection title="Notes" description="Execution context">
            <div className="rounded-[22px] border border-slate-200/70 bg-slate-50/80 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300">
              {order.notes || "No notes captured for this order."}
            </div>
          </DrawerSection>
        </div>
      ) : (
        <EmptyMiniState icon={<ClipboardList className="h-5 w-5" />} label="Select an order to inspect details." />
      )}
    </DrawerShell>
  );
}

function SurfaceCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/88 p-5 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.24)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/85">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-950 dark:text-white">{title}</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function EmptyMiniState({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-slate-50/65 px-5 py-10 text-center dark:border-slate-800 dark:bg-slate-950/40">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-400 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-500 dark:ring-slate-800">
        {icon}
      </div>
      <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}

function DrawerShell({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  widthClassName = "max-w-[540px]",
}: DrawerShellProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-950/20 backdrop-blur-sm data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 dark:bg-slate-950/50" />
        <DialogPrimitive.Content
          className={cn(
            "fixed inset-y-3 right-3 z-50 flex w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-[30px] border border-slate-200/80 bg-white/95 shadow-[0_30px_80px_-28px_rgba(15,23,42,0.45)] backdrop-blur-xl outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-right-full data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-right-full dark:border-slate-800 dark:bg-slate-900/96",
            widthClassName
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-slate-200/80 px-6 py-5 dark:border-slate-800">
            <div className="space-y-1">
              <DialogPrimitive.Title className="text-lg font-semibold text-slate-950 dark:text-white">{title}</DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-sm text-slate-500 dark:text-slate-400">{description}</DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white/80 text-slate-500 transition hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-white">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>

          {footer ? (
            <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-3 border-t border-slate-200/80 bg-white/95 px-6 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
              {footer}
            </div>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function DrawerSection({
  title,
  description,
  icon,
  action,
  children,
}: {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {icon ? (
            <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
              {icon}
            </div>
          ) : null}
          <div>
            <h3 className="text-sm font-semibold text-slate-950 dark:text-white">{title}</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function DrawerField({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function DetailStat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-[22px] border border-slate-200/70 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/50">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{label}</p>
      {tone ? (
        <span className={cn("mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold", tone)}>{value}</span>
      ) : (
        <p className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">{value}</p>
      )}
    </div>
  );
}

function AddressBlock({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-slate-200/70 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/50">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{title}</p>
      <p className="mt-2 whitespace-pre-line text-sm text-slate-700 dark:text-slate-200">{value}</p>
    </div>
  );
}

function activityTone(kind: ActivityItem["kind"]) {
  switch (kind) {
    case "quote":
      return "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300";
    case "delivery":
      return "border-cyan-200 bg-cyan-50 text-cyan-600 dark:border-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-300";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300";
  }
}

function activityIcon(kind: ActivityItem["kind"]) {
  switch (kind) {
    case "quote":
      return <FileText className="h-4 w-4" />;
    case "delivery":
      return <PackageCheck className="h-4 w-4" />;
    default:
      return <ReceiptText className="h-4 w-4" />;
  }
}

const drawerInputClassName =
  "h-11 rounded-2xl border-0 bg-white/80 px-4 shadow-none ring-1 ring-slate-200/80 transition focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-sky-500/25 dark:bg-slate-900/75 dark:ring-slate-700 dark:focus-visible:bg-slate-900";

const drawerTextareaClassName =
  "min-h-[92px] w-full rounded-2xl border-0 bg-white/80 px-4 py-3 text-sm text-slate-900 shadow-none outline-none ring-1 ring-slate-200/80 transition placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-sky-500/25 dark:bg-slate-900/75 dark:text-slate-100 dark:ring-slate-700 dark:placeholder:text-slate-500 dark:focus:bg-slate-900";

const drawerSelectClassName =
  "h-11 w-full rounded-2xl border-0 bg-white/80 px-4 text-sm text-slate-900 outline-none ring-1 ring-slate-200/80 transition focus:ring-2 focus:ring-sky-500/25 dark:bg-slate-900/75 dark:text-slate-100 dark:ring-slate-700";
