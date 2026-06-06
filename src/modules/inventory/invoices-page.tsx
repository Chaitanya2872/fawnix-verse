"use client";

import { useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { getApiErrorMessage } from "@/services/api-client";
import { useSalesInvoices } from "@/modules/sales/orders/hooks";
import { SalesInvoiceStatus, type SalesInvoice } from "@/modules/sales/orders/types";
import { InventoryLayout } from "./layout";

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(value);
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function toneForStatus(status: SalesInvoiceStatus) {
  const tones: Record<SalesInvoiceStatus, string> = {
    DRAFT: "border-slate-200 bg-slate-50 text-slate-700",
    ISSUED: "border-blue-200 bg-blue-50 text-blue-700",
    PARTIALLY_PAID: "border-amber-200 bg-amber-50 text-amber-700",
    PAID: "border-emerald-200 bg-emerald-50 text-emerald-700",
    OVERDUE: "border-rose-200 bg-rose-50 text-rose-700",
    CANCELLED: "border-slate-200 bg-slate-50 text-slate-500",
  };
  return tones[status];
}

function StatusBadge({ status }: { status: SalesInvoiceStatus }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${toneForStatus(status)}`}>
      {status.replaceAll("_", " ")}
    </span>
  );
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);
}

export default function InventoryInvoicesPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<SalesInvoiceStatus | "ALL">("ALL");
  const invoicesQuery = useSalesInvoices();

  const invoices = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return (invoicesQuery.data?.data ?? []).filter((invoice: SalesInvoice) => {
      const matchesStatus = statusFilter === "ALL" || invoice.status === statusFilter;
      const matchesSearch =
        !normalizedSearch ||
        [
          invoice.invoiceNumber,
          invoice.salesOrderNumber,
          invoice.customerName,
          invoice.company,
          invoice.status,
          invoice.notes,
        ]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(normalizedSearch));
      return matchesStatus && matchesSearch;
    });
  }, [invoicesQuery.data?.data, search, statusFilter]);

  const summary = useMemo(() => {
    return invoices.reduce(
      (accumulator, invoice) => {
        accumulator.balanceDue += invoice.balanceDue;
        if (invoice.status === SalesInvoiceStatus.ISSUED || invoice.status === SalesInvoiceStatus.PARTIALLY_PAID) {
          accumulator.open += 1;
        }
        if (invoice.status === SalesInvoiceStatus.PAID) accumulator.paid += 1;
        if (invoice.status === SalesInvoiceStatus.OVERDUE) accumulator.overdue += 1;
        return accumulator;
      },
      { balanceDue: 0, open: 0, paid: 0, overdue: 0 }
    );
  }, [invoices]);

  const displayCurrency = invoices[0]?.currency ?? "INR";

  return (
    <InventoryLayout>
      <div className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Invoices</h2>
              <p className="mt-1 text-sm text-slate-500">Customer invoices fetched from sales billing records.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Invoices</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{formatQuantity(invoices.length)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Open</p>
                <p className="mt-1 text-2xl font-bold text-blue-700">{formatQuantity(summary.open)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Overdue</p>
                <p className="mt-1 text-2xl font-bold text-rose-700">{formatQuantity(summary.overdue)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Balance Due</p>
                <p className="mt-1 text-xl font-bold text-slate-900">{formatCurrency(summary.balanceDue, displayCurrency)}</p>
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
                placeholder="Search by invoice, order, customer, or status"
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as SalesInvoiceStatus | "ALL")}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            >
              <option value="ALL">All Status</option>
              {Object.values(SalesInvoiceStatus).map((status) => (
                <option key={status} value={status}>
                  {status.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>

          {invoicesQuery.isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
            </div>
          ) : invoicesQuery.isError ? (
            <div className="p-6 text-sm text-rose-600">
              {getApiErrorMessage(invoicesQuery.error, "Failed to load invoices.")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    {["Invoice", "Customer", "Sales Order", "Total", "Balance Due", "Due Date", "Status"].map((heading) => (
                      <th key={heading} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoices.length ? (
                    invoices.map((invoice) => (
                      <tr key={invoice.id} className="border-b border-slate-100">
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-900">{invoice.invoiceNumber}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            Issued {formatDate(invoice.issuedAt)}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-900">{invoice.customerName}</p>
                          <p className="mt-1 text-xs text-slate-500">{invoice.company ?? "-"}</p>
                        </td>
                        <td className="px-5 py-4 text-slate-600">{invoice.salesOrderNumber}</td>
                        <td className="px-5 py-4 font-semibold text-slate-900">{formatCurrency(invoice.total, invoice.currency)}</td>
                        <td className="px-5 py-4 font-semibold text-slate-900">{formatCurrency(invoice.balanceDue, invoice.currency)}</td>
                        <td className="px-5 py-4 text-slate-600">{formatDate(invoice.dueDate)}</td>
                        <td className="px-5 py-4">
                          <StatusBadge status={invoice.status} />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-5 py-16 text-center text-sm text-slate-500">
                        No invoices matched your filters.
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
