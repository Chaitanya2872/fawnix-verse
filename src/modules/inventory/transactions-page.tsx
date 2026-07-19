"use client";

import { Fragment, useMemo, useState } from "react";
import { Download, Loader2, Maximize2, Minimize2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { DatePicker } from "@/components/ui/DatePicker";
import { getApiErrorMessage } from "@/services/api-client";
import { useTransactions } from "./hooks";
import { InventoryLayout } from "./layout";
import { exportTransactionsCsv } from "./export";
import { type InventoryTransaction, type InventoryTransactionType } from "./types";

type BucketMode = "day" | "week" | "month";
type MetricMode = "received" | "consumed" | "net";
type ValueMode = "quantity" | "transactions";

type BucketAggregate = {
  received: number;
  consumed: number;
  receivedCount: number;
  consumedCount: number;
};

type HeatmapRow = {
  sku: string;
  productName: string;
  buckets: Record<string, BucketAggregate>;
  totalReceived: number;
  totalConsumed: number;
};

const BUCKET_OPTIONS: { value: BucketMode; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

const METRIC_OPTIONS: { value: MetricMode; label: string }[] = [
  { value: "received", label: "Received" },
  { value: "consumed", label: "Consumed" },
  { value: "net", label: "Net" },
];

const VALUE_OPTIONS: { value: ValueMode; label: string }[] = [
  { value: "quantity", label: "Qty" },
  { value: "transactions", label: "Txns" },
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);
}

function isInbound(type: InventoryTransactionType) {
  return type === "RECEIVED" || type === "INWARD" || type === "OPENING";
}

function typeBadgeClass(type: InventoryTransactionType) {
  return isInbound(type)
    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
    : "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfWeek(date: Date) {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", { month: "short", year: "2-digit" }).format(new Date(year, month - 1, 1));
}

function bucketKeyFor(mode: BucketMode, date: Date) {
  if (mode === "day") return dayKey(date);
  if (mode === "week") return dayKey(startOfWeek(date));
  return monthKey(date);
}

function bucketShortLabel(mode: BucketMode, key: string) {
  if (mode === "day") {
    return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" }).format(new Date(`${key}T00:00:00`));
  }
  if (mode === "week") {
    return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" }).format(new Date(`${key}T00:00:00`));
  }
  return formatMonthLabel(key);
}

function bucketFullLabel(mode: BucketMode, key: string) {
  if (mode === "day") {
    return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${key}T00:00:00`));
  }
  if (mode === "week") {
    const start = new Date(`${key}T00:00:00`);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const fmt = (d: Date) => new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" }).format(d);
    return `${fmt(start)} - ${fmt(end)}`;
  }
  return formatMonthLabel(key);
}

function minColumnWidth(mode: BucketMode) {
  if (mode === "day") return 40;
  if (mode === "week") return 56;
  return 80;
}

function defaultRangeForMode(mode: BucketMode) {
  const to = new Date();
  const from = new Date(to);
  if (mode === "day") from.setDate(to.getDate() - 29);
  else if (mode === "week") from.setDate(to.getDate() - 7 * 11);
  else from.setMonth(to.getMonth() - 5);
  return { from, to };
}

function buildBuckets(mode: BucketMode, from: Date, to: Date) {
  const values: string[] = [];
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);
  let guard = 0;
  while (cursor.getTime() <= end.getTime() && guard < 1000) {
    values.push(bucketKeyFor(mode, cursor));
    if (mode === "day") cursor.setDate(cursor.getDate() + 1);
    else if (mode === "week") cursor.setDate(cursor.getDate() + 7);
    else cursor.setMonth(cursor.getMonth() + 1);
    guard += 1;
  }
  return Array.from(new Set(values));
}

function emptyAggregate(): BucketAggregate {
  return { received: 0, consumed: 0, receivedCount: 0, consumedCount: 0 };
}

function cellValue(agg: BucketAggregate | undefined, metric: MetricMode, valueMode: ValueMode) {
  const a = agg ?? emptyAggregate();
  if (valueMode === "transactions") {
    if (metric === "received") return a.receivedCount;
    if (metric === "consumed") return a.consumedCount;
    return a.receivedCount - a.consumedCount;
  }
  if (metric === "received") return a.received;
  if (metric === "consumed") return a.consumed;
  return a.received - a.consumed;
}

function intensityStep(intensity: number, steps: string[]) {
  if (intensity < 0.2) return steps[0];
  if (intensity < 0.4) return steps[1];
  if (intensity < 0.6) return steps[2];
  if (intensity < 0.8) return steps[3];
  return steps[4];
}

const EMERALD_STEPS = ["bg-emerald-50 text-emerald-700", "bg-emerald-100 text-emerald-700", "bg-emerald-300 text-emerald-900", "bg-emerald-500 text-white", "bg-emerald-700 text-white"];
const AMBER_STEPS = ["bg-amber-50 text-amber-700", "bg-amber-100 text-amber-700", "bg-amber-300 text-amber-900", "bg-amber-500 text-white", "bg-amber-700 text-white"];
const ROSE_STEPS = ["bg-rose-50 text-rose-700", "bg-rose-100 text-rose-700", "bg-rose-300 text-rose-900", "bg-rose-500 text-white", "bg-rose-700 text-white"];

function heatColorFor(value: number, max: number, metric: MetricMode) {
  if (max <= 0 || value === 0) return "bg-slate-50 text-slate-300";
  if (metric === "net") {
    const intensity = Math.abs(value) / max;
    return intensityStep(intensity, value > 0 ? EMERALD_STEPS : ROSE_STEPS);
  }
  if (value < 0) return "bg-slate-50 text-slate-300";
  const intensity = value / max;
  return intensityStep(intensity, metric === "received" ? EMERALD_STEPS : AMBER_STEPS);
}

function formatSignedValue(value: number, metric: MetricMode, valueMode: ValueMode) {
  const magnitude = valueMode === "transactions" ? String(Math.abs(value)) : formatQuantity(Math.abs(value));
  if (metric === "net" && value !== 0) return `${value > 0 ? "+" : "-"}${magnitude}`;
  return magnitude;
}

function buildCellTooltip(row: HeatmapRow, mode: BucketMode, key: string) {
  const agg = row.buckets[key] ?? emptyAggregate();
  const net = agg.received - agg.consumed;
  const count = agg.receivedCount + agg.consumedCount;
  const label = bucketFullLabel(mode, key);
  return [
    `${row.productName} · ${label}`,
    `Received: ${formatQuantity(agg.received)} units`,
    `Consumed: ${formatQuantity(agg.consumed)} units`,
    `Net movement: ${net >= 0 ? "+" : ""}${formatQuantity(net)}`,
    `${count} transaction${count === 1 ? "" : "s"}`,
  ].join("\n");
}

function KpiTile({
  label,
  value,
  sub,
  tone = "slate",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "slate" | "emerald" | "amber" | "rose";
}) {
  const toneClass = {
    slate: "text-slate-900",
    emerald: "text-emerald-700",
    amber: "text-amber-700",
    rose: "text-rose-700",
  }[tone];
  return (
    <div className="bg-white px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={cn("mt-1 truncate text-lg font-bold", toneClass)}>{value}</p>
      {sub ? <p className="mt-0.5 truncate text-[11px] text-slate-400">{sub}</p> : null}
    </div>
  );
}

function ToggleGroup<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
            value === option.value ? "bg-white text-brand-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default function InventoryTransactionsPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<InventoryTransactionType | "ALL">("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [minQuantity, setMinQuantity] = useState("");
  const [bucketMode, setBucketMode] = useState<BucketMode>("month");
  const [metricMode, setMetricMode] = useState<MetricMode>("net");
  const [valueMode, setValueMode] = useState<ValueMode>("quantity");
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{ sku: string; bucketKey: string } | null>(null);
  const transactionsQuery = useTransactions();

  const transactions = useMemo(() => {
    const all = transactionsQuery.data?.data ?? [];
    const fromTime = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
    const toTime = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : null;
    const minQty = minQuantity.trim() ? Number(minQuantity) : null;
    return all.filter((item) => {
      const matchesSearch = [item.sku, item.productName, item.txnRef, item.notes, item.projectRef, item.vendorName]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(search.toLowerCase()));
      const matchesType = typeFilter === "ALL" || item.txnType === typeFilter;
      const txnTime = new Date(item.txnDate).getTime();
      const matchesFrom = fromTime === null || txnTime >= fromTime;
      const matchesTo = toTime === null || txnTime <= toTime;
      const matchesQty = minQty === null || Number.isNaN(minQty) || item.quantity >= minQty;
      return matchesSearch && matchesType && matchesFrom && matchesTo && matchesQty;
    });
  }, [search, transactionsQuery.data?.data, typeFilter, dateFrom, dateTo, minQuantity]);

  const activeFilterCount = [search.trim() !== "", typeFilter !== "ALL", dateFrom !== "", dateTo !== "", minQuantity.trim() !== ""].filter(
    Boolean
  ).length;

  function clearAllFilters() {
    setSearch("");
    setTypeFilter("ALL");
    setDateFrom("");
    setDateTo("");
    setMinQuantity("");
  }

  const summary = useMemo(() => {
    const bySku = new Map<string, { qty: number; name: string }>();
    let received = 0;
    let consumed = 0;
    for (const item of transactions) {
      if (isInbound(item.txnType)) received += item.quantity;
      else consumed += item.quantity;
      const current = bySku.get(item.sku) ?? { qty: 0, name: item.productName };
      current.qty += item.quantity;
      bySku.set(item.sku, current);
    }
    let mostActive: { sku: string; name: string; qty: number } | null = null;
    for (const [sku, entry] of bySku) {
      if (!mostActive || entry.qty > mostActive.qty) {
        mostActive = { sku, name: entry.name, qty: entry.qty };
      }
    }
    return {
      received,
      consumed,
      net: received - consumed,
      transactionCount: transactions.length,
      activeSkuCount: bySku.size,
      mostActive,
    };
  }, [transactions]);

  const bucketRange = useMemo(() => {
    if (dateFrom || dateTo) {
      const fallback = defaultRangeForMode(bucketMode);
      const from = dateFrom ? new Date(`${dateFrom}T00:00:00`) : fallback.from;
      const to = dateTo ? new Date(`${dateTo}T00:00:00`) : fallback.to;
      return { from, to };
    }
    return defaultRangeForMode(bucketMode);
  }, [dateFrom, dateTo, bucketMode]);

  const buckets = useMemo(() => {
    const built = buildBuckets(bucketMode, bucketRange.from, bucketRange.to);
    const MAX_BUCKETS = 62;
    return built.length > MAX_BUCKETS ? built.slice(-MAX_BUCKETS) : built;
  }, [bucketMode, bucketRange]);

  const bucketSet = useMemo(() => new Set(buckets), [buckets]);

  const itemHeatmap = useMemo(() => {
    const grouped = new Map<string, HeatmapRow>();
    for (const transaction of transactions) {
      const key = bucketKeyFor(bucketMode, new Date(transaction.txnDate));
      if (!bucketSet.has(key)) continue;
      const current = grouped.get(transaction.sku) ?? {
        sku: transaction.sku,
        productName: transaction.productName,
        buckets: {},
        totalReceived: 0,
        totalConsumed: 0,
      };
      const agg = current.buckets[key] ?? emptyAggregate();
      if (isInbound(transaction.txnType)) {
        agg.received += transaction.quantity;
        agg.receivedCount += 1;
        current.totalReceived += transaction.quantity;
      } else {
        agg.consumed += transaction.quantity;
        agg.consumedCount += 1;
        current.totalConsumed += transaction.quantity;
      }
      current.buckets[key] = agg;
      grouped.set(transaction.sku, current);
    }

    return Array.from(grouped.values())
      .sort((left, right) => right.totalReceived + right.totalConsumed - (left.totalReceived + left.totalConsumed))
      .slice(0, 12);
  }, [transactions, bucketMode, bucketSet]);

  const scaleMax = useMemo(() => {
    let max = 0;
    for (const row of itemHeatmap) {
      for (const key of buckets) {
        max = Math.max(max, Math.abs(cellValue(row.buckets[key], metricMode, valueMode)));
      }
    }
    return max;
  }, [itemHeatmap, buckets, metricMode, valueMode]);

  const nonZeroCellCount = useMemo(() => {
    let count = 0;
    for (const row of itemHeatmap) {
      for (const key of buckets) {
        if (cellValue(row.buckets[key], metricMode, valueMode) !== 0) count += 1;
      }
    }
    return count;
  }, [itemHeatmap, buckets, metricMode, valueMode]);

  const hasEnoughData = nonZeroCellCount >= 3;

  const activitySuggestion = useMemo(() => {
    const all = transactionsQuery.data?.data ?? [];
    if (!all.length) return null;
    const counts = new Map<string, number>();
    for (const item of all) {
      const key = monthKey(new Date(item.txnDate));
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    let best: string | null = null;
    let bestCount = 0;
    for (const [key, count] of counts) {
      if (count > bestCount) {
        best = key;
        bestCount = count;
      }
    }
    return best ? formatMonthLabel(best) : null;
  }, [transactionsQuery.data?.data]);

  const drawerTransactions = useMemo(() => {
    if (!selectedCell) return [];
    return transactions
      .filter((item) => item.sku === selectedCell.sku && bucketKeyFor(bucketMode, new Date(item.txnDate)) === selectedCell.bucketKey)
      .sort((left, right) => new Date(right.txnDate).getTime() - new Date(left.txnDate).getTime());
  }, [selectedCell, transactions, bucketMode]);

  const recentTransactions = useMemo(() => transactions.slice(0, 10), [transactions]);

  const legendSteps = useMemo(() => {
    if (scaleMax <= 0) return [];
    const boundaries = [0.2, 0.4, 0.6, 0.8, 1].map((fraction) => Math.max(1, Math.round(scaleMax * fraction)));
    const steps = metricMode === "consumed" ? AMBER_STEPS : EMERALD_STEPS;
    return boundaries.map((boundary, index) => {
      const prevBoundary = index === 0 ? 1 : boundaries[index - 1] + 1;
      const rangeLabel = index === boundaries.length - 1 && boundary === prevBoundary ? `${boundary}` : index === boundaries.length - 1 ? `${prevBoundary}+` : `${prevBoundary}-${boundary}`;
      return { label: rangeLabel, className: steps[index] };
    });
  }, [scaleMax, metricMode]);

  function handleExportTransactions() {
    if (!transactions.length) return;
    exportTransactionsCsv(transactions);
  }

  const unitLabel = valueMode === "transactions" ? "txns" : "units";

  return (
    <InventoryLayout showHeader={false}>
      <div className="space-y-4">
        <p className="text-sm text-slate-500">Monitor stock movement patterns across items and warehouses.</p>

        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 sm:grid-cols-3 lg:grid-cols-6">
          <KpiTile label="Received" value={`${formatQuantity(summary.received)} units`} tone="emerald" />
          <KpiTile label="Consumed" value={`${formatQuantity(summary.consumed)} units`} tone="amber" />
          <KpiTile
            label="Net movement"
            value={`${summary.net >= 0 ? "+" : ""}${formatQuantity(summary.net)} units`}
            tone={summary.net >= 0 ? "emerald" : "rose"}
          />
          <KpiTile label="Transactions" value={String(summary.transactionCount)} sub={activeFilterCount ? "filtered" : "total"} />
          <KpiTile label="Active SKUs" value={String(summary.activeSkuCount)} sub="items" />
          <KpiTile
            label="Most active item"
            value={summary.mostActive?.name ?? "-"}
            sub={summary.mostActive ? `${formatQuantity(summary.mostActive.qty)} units moved` : undefined}
          />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search item, SKU, reference, vendor..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
            </div>
            <DatePicker
              value={dateFrom}
              onChange={setDateFrom}
              placeholder="From"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            />
            <DatePicker
              value={dateTo}
              onChange={setDateTo}
              placeholder="To"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as InventoryTransactionType | "ALL")}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            >
              <option value="ALL">All Types</option>
              <option value="RECEIVED">Received</option>
              <option value="CONSUMED">Consumed</option>
              <option value="INWARD">Inward</option>
              <option value="OUTWARD">Outward</option>
              <option value="OPENING">Opening</option>
            </select>
            <input
              type="number"
              min={0}
              value={minQuantity}
              onChange={(e) => setMinQuantity(e.target.value)}
              placeholder="Min qty"
              className="w-24 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
            <button
              type="button"
              onClick={handleExportTransactions}
              disabled={!transactions.length}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
            {activeFilterCount > 0 ? (
              <button
                type="button"
                onClick={clearAllFilters}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-50"
              >
                <X className="h-3.5 w-3.5" />
                Clear all ({activeFilterCount})
              </button>
            ) : null}
          </div>
        </div>

        {isFullScreen ? <div className="fixed inset-0 z-40 bg-slate-950/50" onClick={() => setIsFullScreen(false)} /> : null}

        <div
          className={
            isFullScreen
              ? "fixed inset-4 z-50 flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
              : "rounded-3xl border border-slate-200 bg-white shadow-sm"
          }
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Movement Heatmap</h3>
              <p className="mt-0.5 text-xs text-slate-500">
                {bucketMode} view · {metricMode} {unitLabel} · click a cell for transaction detail
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ToggleGroup value={bucketMode} onChange={setBucketMode} options={BUCKET_OPTIONS} />
              <ToggleGroup value={metricMode} onChange={setMetricMode} options={METRIC_OPTIONS} />
              <ToggleGroup value={valueMode} onChange={setValueMode} options={VALUE_OPTIONS} />
              <button
                type="button"
                onClick={() => setIsFullScreen((current) => !current)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50"
                aria-label={isFullScreen ? "Exit full screen" : "Full screen"}
              >
                {isFullScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {transactionsQuery.isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
            </div>
          ) : transactionsQuery.isError ? (
            <div className="p-6 text-sm text-rose-600">
              {getApiErrorMessage(transactionsQuery.error, "Failed to load inventory transactions.")}
            </div>
          ) : (
            <div className={cn("flex-1 overflow-auto p-4", isFullScreen && "overflow-y-auto")}>
              {hasEnoughData ? (
                <>
                  <section className="overflow-x-auto">
                    <div
                      className="grid gap-1.5"
                      style={{ gridTemplateColumns: `220px repeat(${buckets.length}, minmax(${minColumnWidth(bucketMode)}px, 1fr))` }}
                    >
                      <div className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Item</div>
                      {buckets.map((key) => (
                        <div key={key} className="px-1 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          {bucketShortLabel(bucketMode, key)}
                        </div>
                      ))}
                      {itemHeatmap.map((row) => (
                        <Fragment key={row.sku}>
                          <div
                            key={`${row.sku}-label`}
                            className="flex flex-col justify-center truncate rounded-lg bg-slate-50 px-3 py-2"
                            title={`${row.productName} (${row.sku})`}
                          >
                            <p className="truncate text-sm font-semibold text-slate-900">{row.productName}</p>
                            <p className="mt-0.5 truncate text-[11px] text-slate-500">
                              {row.sku} · {formatQuantity(row.totalReceived - row.totalConsumed)} net
                            </p>
                          </div>
                          {buckets.map((key) => {
                            const value = cellValue(row.buckets[key], metricMode, valueMode);
                            return (
                              <button
                                type="button"
                                key={`${row.sku}-${key}`}
                                onClick={() => setSelectedCell({ sku: row.sku, bucketKey: key })}
                                className={cn(
                                  "flex h-14 items-center justify-center rounded-lg text-xs font-semibold transition-transform hover:scale-105 hover:shadow-sm",
                                  heatColorFor(value, scaleMax, metricMode)
                                )}
                                title={buildCellTooltip(row, bucketMode, key)}
                              >
                                {value !== 0 ? formatSignedValue(value, metricMode, valueMode) : ""}
                              </button>
                            );
                          })}
                        </Fragment>
                      ))}
                    </div>
                  </section>

                  {legendSteps.length ? (
                    <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Legend</span>
                      <span className="inline-flex h-6 items-center rounded-md bg-slate-50 px-2 text-[11px] font-semibold text-slate-300">0</span>
                      {legendSteps.map((step) => (
                        <span key={step.label} className={cn("inline-flex h-6 items-center rounded-md px-2 text-[11px] font-semibold", step.className)}>
                          {step.label}
                        </span>
                      ))}
                      {metricMode === "net" ? (
                        <span className="text-[11px] text-slate-400">(green = net increase, red = net decrease)</span>
                      ) : null}
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-12 text-center text-sm text-slate-500">
                  {activitySuggestion
                    ? `Activity is concentrated in ${activitySuggestion}. Expand the date range or switch to Month view — meanwhile, check the movement trail below.`
                    : "Not enough recent activity to visualize as a heatmap yet — check the movement trail below."}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4">
            <h3 className="text-base font-semibold text-slate-900">Recent Movement Trail</h3>
            <p className="mt-0.5 text-xs text-slate-500">Latest stock movements for operational follow-up.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Date</th>
                  <th className="px-4 py-2.5 font-semibold">Item</th>
                  <th className="px-4 py-2.5 font-semibold">Type</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Quantity</th>
                  <th className="px-4 py-2.5 font-semibold">Reference</th>
                  <th className="px-4 py-2.5 font-semibold">Performed by</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentTransactions.length ? (
                  recentTransactions.map((item: InventoryTransaction) => (
                    <tr key={item.id} className="transition-colors hover:bg-slate-50/60">
                      <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">{formatDate(item.txnDate)}</td>
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-slate-900">{item.productName}</p>
                        <p className="text-xs text-slate-400">{item.sku}</p>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold", typeBadgeClass(item.txnType))}>
                          {item.txnType}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right font-semibold text-slate-900">{formatQuantity(item.quantity)}</td>
                      <td className="px-4 py-2.5 text-slate-500">{item.txnRef}</td>
                      <td className="px-4 py-2.5 text-slate-500">{item.issuedBy ?? item.vendorName ?? "-"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                      No recent movement to show.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedCell ? (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedCell(null)} />
          <div className="relative z-10 flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{bucketFullLabel(bucketMode, selectedCell.bucketKey)}</p>
                <h3 className="mt-0.5 text-base font-semibold text-slate-900">{drawerTransactions[0]?.productName ?? selectedCell.sku}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCell(null)}
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {drawerTransactions.length ? (
                <div className="space-y-2.5">
                  {drawerTransactions.map((item) => (
                    <div key={item.id} className="rounded-xl border border-slate-200 px-3.5 py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold", typeBadgeClass(item.txnType))}>
                          {item.txnType}
                        </span>
                        <span className="text-sm font-bold text-slate-900">{formatQuantity(item.quantity)}</span>
                      </div>
                      <p className="mt-1.5 text-xs text-slate-500">
                        {item.txnRef} · {formatDate(item.txnDate)}
                      </p>
                      {item.issuedBy ? <p className="mt-0.5 text-xs text-slate-400">By {item.issuedBy}</p> : null}
                      {item.notes ? <p className="mt-1 text-xs text-slate-500">{item.notes}</p> : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No transactions found for this cell.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </InventoryLayout>
  );
}
