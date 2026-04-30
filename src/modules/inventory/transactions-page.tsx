"use client";

import React, { useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { getApiErrorMessage } from "@/services/api-client";
import { useTransactions } from "./hooks";
import { InventoryLayout } from "./layout";
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

function toneForType(type: InventoryTransactionType) {
  if (type === "RECEIVED" || type === "INWARD" || type === "OPENING") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  return "bg-amber-50 text-amber-700 border-amber-200";
}

export default function InventoryTransactionsPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<InventoryTransactionType | "ALL">("ALL");
  const transactionsQuery = useTransactions();

  const transactions = useMemo(() => {
    const all = transactionsQuery.data?.data ?? [];
    return all.filter((item) => {
      const matchesSearch = [item.sku, item.productName, item.txnRef, item.notes, item.projectRef]
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
        return accumulator;
      },
      { received: 0, consumed: 0 }
    );
  }, [transactions]);

  return (
    <InventoryLayout>
      <div className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Transactions</h2>
              <p className="mt-1 text-sm text-slate-500">Track every received and consumed stock movement in one place.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Received</p>
                <p className="mt-1 text-2xl font-bold text-emerald-700">{formatQuantity(summary.received)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Consumed</p>
                <p className="mt-1 text-2xl font-bold text-amber-700">{formatQuantity(summary.consumed)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by SKU, item name, reference, or note"
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
            </div>
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

          {transactionsQuery.isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
            </div>
          ) : transactionsQuery.isError ? (
            <div className="p-6 text-sm text-rose-600">
              {getApiErrorMessage(transactionsQuery.error, "Failed to load inventory transactions.")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    {["Date", "Item", "Type", "Quantity", "Reference", "Project", "Notes"].map((heading) => (
                      <th key={heading} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transactions.length ? (
                    transactions.map((item: InventoryTransaction) => (
                      <tr key={item.id} className="border-b border-slate-100">
                        <td className="px-5 py-4 text-slate-600">{formatDate(item.txnDate)}</td>
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-900">{item.productName}</p>
                          <p className="mt-1 text-xs text-slate-500">{item.sku}</p>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${toneForType(item.txnType)}`}>
                            {item.txnType}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-semibold text-slate-900">{formatQuantity(item.quantity)}</td>
                        <td className="px-5 py-4 text-slate-600">{item.txnRef}</td>
                        <td className="px-5 py-4 text-slate-600">{item.projectRef ?? "-"}</td>
                        <td className="px-5 py-4 text-slate-600">{item.notes ?? "-"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-5 py-16 text-center text-sm text-slate-500">
                        No transactions matched your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </InventoryLayout>
  );
}
