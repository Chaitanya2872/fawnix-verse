"use client";

import { Fragment, useMemo, useState } from "react";
import { Download, Loader2, Search } from "lucide-react";
import { getApiErrorMessage } from "@/services/api-client";
import { useTransactions } from "./hooks";
import { InventoryLayout } from "./layout";
import { exportTransactionsCsv } from "./export";
import { type InventoryTransaction, type InventoryTransactionType } from "./types";

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

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function toneForType(type: InventoryTransactionType) {
  return type === "RECEIVED" || type === "INWARD" || type === "OPENING" ? "text-emerald-700" : "text-amber-700";
}

function buildRecentDays(days: number) {
  const values: string[] = [];
  const today = new Date();
  for (let index = days - 1; index >= 0; index -= 1) {
    const next = new Date(today);
    next.setDate(today.getDate() - index);
    values.push(dayKey(next));
  }
  return values;
}

function heatColor(value: number, max: number) {
  if (value <= 0 || max <= 0) return "bg-slate-100 text-slate-400";
  const intensity = value / max;
  if (intensity < 0.25) return "bg-sky-100 text-sky-700";
  if (intensity < 0.5) return "bg-sky-200 text-sky-800";
  if (intensity < 0.75) return "bg-blue-300 text-blue-900";
  return "bg-slate-900 text-white";
}

export default function InventoryTransactionsPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<InventoryTransactionType | "ALL">("ALL");
  const transactionsQuery = useTransactions();

  const transactions = useMemo(() => {
    const all = transactionsQuery.data?.data ?? [];
    return all.filter((item) => {
      const matchesSearch = [item.sku, item.productName, item.txnRef, item.notes, item.projectRef, item.vendorName]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(search.toLowerCase()));
      const matchesType = typeFilter === "ALL" || item.txnType === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [search, transactionsQuery.data?.data, typeFilter]);

  const summary = useMemo(() => {
    return transactions.reduce(
      (accumulator, item) => {
        if (item.txnType === "RECEIVED" || item.txnType === "INWARD" || item.txnType === "OPENING") {
          accumulator.received += item.quantity;
        } else {
          accumulator.consumed += item.quantity;
        }
        accumulator.references.add(item.txnRef);
        return accumulator;
      },
      { received: 0, consumed: 0, references: new Set<string>() }
    );
  }, [transactions]);

  const recentDays = useMemo(() => buildRecentDays(14), []);

  const itemHeatmap = useMemo(() => {
    const grouped = new Map<string, { sku: string; productName: string; days: Record<string, number>; total: number; count: number }>();
    for (const transaction of transactions) {
      const key = transaction.sku;
      const day = transaction.txnDate.slice(0, 10);
      if (!recentDays.includes(day)) continue;
      const current = grouped.get(key) ?? {
        sku: transaction.sku,
        productName: transaction.productName,
        days: {},
        total: 0,
        count: 0,
      };
      current.days[day] = (current.days[day] ?? 0) + transaction.quantity;
      current.total += transaction.quantity;
      current.count += 1;
      grouped.set(key, current);
    }

    return Array.from(grouped.values())
      .sort((left, right) => right.total - left.total || right.count - left.count)
      .slice(0, 10);
  }, [recentDays, transactions]);

  const maxHeat = useMemo(
    () => Math.max(0, ...itemHeatmap.flatMap((row) => recentDays.map((day) => row.days[day] ?? 0))),
    [itemHeatmap, recentDays]
  );

  const recentTransactions = useMemo(() => transactions.slice(0, 8), [transactions]);

  function handleExportTransactions() {
    if (!transactions.length) return;
    exportTransactionsCsv(transactions);
  }

  return (
    <InventoryLayout showHeader={false}>
      <div className="space-y-6">
        
        
      <div className="grid gap-3 sm:grid-cols-2">
  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
      Received
    </p>
    <p className="mt-1 text-2xl font-bold text-emerald-700">
      {formatQuantity(summary.received)}
    </p>
  </div>

  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
      Consumed
    </p>
    <p className="mt-1 text-2xl font-bold text-amber-700">
      {formatQuantity(summary.consumed)}
    </p>
  </div>
</div>

        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by SKU, item name, reference, vendor, or note"
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleExportTransactions}
                disabled={!transactions.length}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as InventoryTransactionType | "ALL")}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              >
                <option value="ALL">All Types</option>
                <option value="RECEIVED">Received</option>
                <option value="CONSUMED">Consumed</option>
                <option value="INWARD">Inward</option>
                <option value="OUTWARD">Outward</option>
                <option value="OPENING">Opening</option>
              </select>
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
            <div className="space-y-6 p-5">
              <section className="overflow-x-auto">
                <div className="min-w-[1080px]">
                  <div className="grid grid-cols-[240px_repeat(14,minmax(48px,1fr))] gap-2">
                    <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Item / Day</div>
                    {recentDays.map((day) => (
                      <div key={day} className="px-1 py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" }).format(new Date(day))}
                      </div>
                    ))}
                    {itemHeatmap.length ? (
                      itemHeatmap.map((row) => (
                        <Fragment key={row.sku}>
                          <div key={`${row.sku}-label`} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                            <p className="font-semibold text-slate-900">{row.productName}</p>
                            <p className="mt-1 text-xs text-slate-500">{row.sku}</p>
                            <p className="mt-2 text-xs font-semibold text-slate-600">{formatQuantity(row.total)} total movement</p>
                          </div>
                          {recentDays.map((day) => {
                            const value = row.days[day] ?? 0;
                            return (
                              <div
                                key={`${row.sku}-${day}`}
                                className={`flex h-20 items-center justify-center rounded-2xl border border-white text-xs font-bold transition-transform hover:-translate-y-0.5 ${heatColor(value, maxHeat)}`}
                                title={`${row.productName} on ${formatDate(day)}: ${formatQuantity(value)}`}
                              >
                                {value > 0 ? formatQuantity(value) : "0"}
                              </div>
                            );
                          })}
                        </Fragment>
                      ))
                    ) : (
                      <div className="col-span-15 rounded-2xl border border-dashed border-slate-300 px-4 py-12 text-center text-sm text-slate-500">
                        No transactions matched your filters for the last 14 days.
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
                <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="mb-4">
                    <h3 className="text-base font-semibold text-slate-900">Recent Movement Trail</h3>
                    <p className="mt-1 text-sm text-slate-500">Latest stock movements for operational follow-up.</p>
                  </div>
                  <div className="space-y-3">
                    {recentTransactions.length ? (
                      recentTransactions.map((item: InventoryTransaction) => (
                        <div key={item.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="font-semibold text-slate-900">{item.productName}</p>
                              <p className="mt-1 text-xs text-slate-500">
                                {item.sku} | {item.txnRef} | {formatDate(item.txnDate)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className={`text-sm font-semibold ${toneForType(item.txnType)}`}>{item.txnType}</p>
                              <p className="mt-1 text-sm font-bold text-slate-900">{formatQuantity(item.quantity)}</p>
                            </div>
                          </div>
                          <p className="mt-2 text-xs text-slate-500">{item.notes ?? item.projectRef ?? item.vendorName ?? "-"}</p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
                        No recent movement to show.
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-4">
                  <div className="mb-4">
                    <h3 className="text-base font-semibold text-slate-900">Heatmap Legend</h3>
                    <p className="mt-1 text-sm text-slate-500">Darker tiles mean more quantity moved on that day for that item.</p>
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: "No activity", className: "bg-slate-100 text-slate-500", value: "0" },
                      { label: "Light", className: "bg-sky-100 text-sky-700", value: "<25%" },
                      { label: "Medium", className: "bg-sky-200 text-sky-800", value: "25-50%" },
                      { label: "High", className: "bg-blue-300 text-blue-900", value: "50-75%" },
                      { label: "Peak", className: "bg-slate-900 text-white", value: ">75%" },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <div className="flex items-center gap-3">
                          <span className={`inline-flex h-8 w-8 items-center justify-center rounded-xl text-xs font-bold ${item.className}`}>{item.value}</span>
                          <span className="text-sm font-semibold text-slate-700">{item.label}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </InventoryLayout>
  );
}
