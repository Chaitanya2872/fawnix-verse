"use client";

import { useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { getApiErrorMessage } from "@/services/api-client";
import { useInvoices } from "@/modules/purchases/hooks";
import type { Invoice, InvoiceStatus } from "@/modules/purchases/types";
import { InventoryLayout } from "./layout";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value);
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function toneForStatus(status: InvoiceStatus) {
  const tones: Record<InvoiceStatus, string> = {
    DRAFT: "border-slate-200 bg-slate-50 text-slate-700",
    PENDING_APPROVAL: "border-amber-200 bg-amber-50 text-amber-700",
    APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-700",
    REJECTED: "border-rose-200 bg-rose-50 text-rose-700",
    PAID: "border-blue-200 bg-blue-50 text-blue-700",
  };
  return tones[status];
}

function toneForMatching(status: Invoice["matchingStatus"]) {
  const tones: Record<Invoice["matchingStatus"], string> = {
    MATCHED: "border-emerald-200 bg-emerald-50 text-emerald-700",
    MISMATCH: "border-rose-200 bg-rose-50 text-rose-700",
    PENDING_GRN: "border-amber-200 bg-amber-50 text-amber-700",
  };
  return tones[status];
}

function StatusBadge({ label, className }: { label: string; className: string }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${className}`}>
      {label.replaceAll("_", " ")}
    </span>
  );
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);
}

export default function InventoryBillsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "ALL">("ALL");
  const billsQuery = useInvoices();

  const bills = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return (billsQuery.data ?? []).filter((bill) => {
      const matchesStatus = statusFilter === "ALL" || bill.status === statusFilter;
      const matchesSearch =
        !normalizedSearch ||
        [
          bill.invoiceNumber,
          bill.poNumber,
          bill.vendor.vendorName,
          bill.status,
          bill.matchingStatus,
          bill.matchingNotes,
        ].some((value) => value.toLowerCase().includes(normalizedSearch));
      return matchesStatus && matchesSearch;
    });
  }, [billsQuery.data, search, statusFilter]);

  const summary = useMemo(() => {
    return bills.reduce(
      (accumulator, bill) => {
        accumulator.totalValue += bill.amount;
        if (bill.status === "PENDING_APPROVAL") accumulator.pending += 1;
        if (bill.status === "APPROVED") accumulator.approved += 1;
        return accumulator;
      },
      { totalValue: 0, pending: 0, approved: 0 }
    );
  }, [bills]);

  return (
    <InventoryLayout>
      <div className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Bills</h2>
              <p className="mt-1 text-sm text-slate-500">Supplier bills fetched from procurement invoices.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bills</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{formatQuantity(bills.length)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pending</p>
                <p className="mt-1 text-2xl font-bold text-amber-700">{formatQuantity(summary.pending)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Approved</p>
                <p className="mt-1 text-2xl font-bold text-emerald-700">{formatQuantity(summary.approved)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Value</p>
                <p className="mt-1 text-xl font-bold text-slate-900">{formatCurrency(summary.totalValue)}</p>
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
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by bill, PO, vendor, or status"
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as InvoiceStatus | "ALL")}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            >
              <option value="ALL">All Status</option>
              <option value="DRAFT">Draft</option>
              <option value="PENDING_APPROVAL">Pending Approval</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="PAID">Paid</option>
            </select>
          </div>

          {billsQuery.isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
            </div>
          ) : billsQuery.isError ? (
            <div className="p-6 text-sm text-rose-600">
              {getApiErrorMessage(billsQuery.error, "Failed to load bills.")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    {["Bill", "Vendor", "Purchase Order", "Amount", "Matching", "Due Date", "Status"].map((heading) => (
                      <th key={heading} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bills.length ? (
                    bills.map((bill) => (
                      <tr key={bill.id} className="border-b border-slate-100">
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-900">{bill.invoiceNumber}</p>
                          <p className="mt-1 text-xs text-slate-500">{formatDate(bill.invoiceDate)}</p>
                        </td>
                        <td className="px-5 py-4 text-slate-600">{bill.vendor.vendorName}</td>
                        <td className="px-5 py-4 text-slate-600">{bill.poNumber}</td>
                        <td className="px-5 py-4 font-semibold text-slate-900">{formatCurrency(bill.amount)}</td>
                        <td className="px-5 py-4">
                          <StatusBadge label={bill.matchingStatus} className={toneForMatching(bill.matchingStatus)} />
                          <p className="mt-1 max-w-xs truncate text-xs text-slate-500">{bill.matchingNotes}</p>
                        </td>
                        <td className="px-5 py-4 text-slate-600">{formatDate(bill.dueDate)}</td>
                        <td className="px-5 py-4">
                          <StatusBadge label={bill.status} className={toneForStatus(bill.status)} />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-5 py-16 text-center text-sm text-slate-500">
                        No bills matched your filters.
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
