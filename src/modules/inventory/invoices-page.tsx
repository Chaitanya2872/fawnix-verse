"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Loader2, Search } from "lucide-react";
import { getApiErrorMessage } from "@/services/api-client";
import { useInvoices as useBills } from "@/modules/purchases/hooks";
import type { Invoice as Bill, InvoiceStatus as BillStatus } from "@/modules/purchases/types";
import { useSalesInvoices } from "@/modules/sales/orders/hooks";
import { SalesInvoiceStatus, type SalesInvoice } from "@/modules/sales/orders/types";
import { InventoryLayout } from "./layout";

type BillingView = "bills" | "invoices";

function formatCurrency(value: number, currency = "INR") {
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

function formatQuantity(value: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);
}

function billStatusTone(status: BillStatus) {
  const tones: Record<BillStatus, string> = {
    DRAFT: "border-slate-200 bg-slate-50 text-slate-700",
    PENDING_APPROVAL: "border-amber-200 bg-amber-50 text-amber-700",
    APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-700",
    REJECTED: "border-rose-200 bg-rose-50 text-rose-700",
    PAID: "border-blue-200 bg-blue-50 text-blue-700",
  };
  return tones[status];
}

function billMatchingTone(status: Bill["matchingStatus"]) {
  const tones: Record<Bill["matchingStatus"], string> = {
    MATCHED: "border-emerald-200 bg-emerald-50 text-emerald-700",
    MISMATCH: "border-rose-200 bg-rose-50 text-rose-700",
    PENDING_GRN: "border-amber-200 bg-amber-50 text-amber-700",
  };
  return tones[status];
}

function invoiceStatusTone(status: SalesInvoiceStatus) {
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

function StatusBadge({ label, className }: { label: string; className: string }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${className}`}>
      {label.replaceAll("_", " ")}
    </span>
  );
}

function UnderlineTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border-b-2 px-1 pb-2 text-sm font-semibold transition-colors ${
        active
          ? "border-brand-600 text-brand-700"
          : "border-transparent text-slate-500 hover:text-slate-900"
      }`}
    >
      {children}
    </button>
  );
}

function matchesBillSearch(bill: Bill, search: string) {
  if (!search) return true;
  return [
    bill.invoiceNumber,
    bill.poNumber,
    bill.vendor.vendorName,
    bill.status,
    bill.matchingStatus,
    bill.matchingNotes,
  ].some((value) => value.toLowerCase().includes(search));
}

function matchesInvoiceSearch(invoice: SalesInvoice, search: string) {
  if (!search) return true;
  return [
    invoice.invoiceNumber,
    invoice.salesOrderNumber,
    invoice.customerName,
    invoice.company,
    invoice.status,
    invoice.notes,
  ]
    .filter(Boolean)
    .some((value) => value!.toLowerCase().includes(search));
}

export default function InventoryInvoicesPage() {
  const [view, setView] = useState<BillingView>("bills");
  const [search, setSearch] = useState("");
  const billsQuery = useBills();
  const invoicesQuery = useSalesInvoices();

  const normalizedSearch = search.trim().toLowerCase();

  const bills = useMemo(
    () => (billsQuery.data ?? []).filter((bill) => matchesBillSearch(bill, normalizedSearch)),
    [billsQuery.data, normalizedSearch]
  );

  const invoices = useMemo(
    () => (invoicesQuery.data?.data ?? []).filter((invoice) => matchesInvoiceSearch(invoice, normalizedSearch)),
    [invoicesQuery.data?.data, normalizedSearch]
  );

  const billSummary = useMemo(() => {
    return bills.reduce(
      (summary, bill) => {
        summary.totalValue += bill.amount;
        if (bill.status === "PENDING_APPROVAL") summary.pending += 1;
        if (bill.status === "APPROVED") summary.approved += 1;
        return summary;
      },
      { totalValue: 0, pending: 0, approved: 0 }
    );
  }, [bills]);

  const invoiceSummary = useMemo(() => {
    return invoices.reduce(
      (summary, invoice) => {
        summary.balanceDue += invoice.balanceDue;
        if (invoice.status === SalesInvoiceStatus.ISSUED || invoice.status === SalesInvoiceStatus.PARTIALLY_PAID) {
          summary.open += 1;
        }
        if (invoice.status === SalesInvoiceStatus.OVERDUE) summary.overdue += 1;
        return summary;
      },
      { balanceDue: 0, open: 0, overdue: 0 }
    );
  }, [invoices]);

  const invoiceCurrency = invoices[0]?.currency ?? "INR";

  return (
    <InventoryLayout>
      <div className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="space-y-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Bills & Invoices</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Supplier bills and customer invoices fetched separately in one page.
                  </p>
                </div>
                <div className="flex items-center gap-5 border-b border-slate-200">
                  <UnderlineTab active={view === "bills"} onClick={() => setView("bills")}>
                    Bills
                  </UnderlineTab>
                  <UnderlineTab active={view === "invoices"} onClick={() => setView("invoices")}>
                    Invoices
                  </UnderlineTab>
                </div>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bills</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{formatQuantity(bills.length)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bill Value</p>
                <p className="mt-1 text-xl font-bold text-slate-900">{formatCurrency(billSummary.totalValue)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Invoices</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{formatQuantity(invoices.length)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Balance Due</p>
                <p className="mt-1 text-xl font-bold text-slate-900">
                  {formatCurrency(invoiceSummary.balanceDue, invoiceCurrency)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="relative w-full max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={
                view === "bills"
                  ? "Search bill, PO, vendor, matching, or status"
                  : "Search invoice, order, customer, company, or status"
              }
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
          </div>
        </div>

        {view === "bills" ? (
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-200 p-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Bills</h3>
              <p className="mt-1 text-sm text-slate-500">Supplier bills from procurement invoices.</p>
            </div>
            <div className="flex gap-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <span>Pending {formatQuantity(billSummary.pending)}</span>
              <span>Approved {formatQuantity(billSummary.approved)}</span>
            </div>
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
                          <StatusBadge label={bill.matchingStatus} className={billMatchingTone(bill.matchingStatus)} />
                          <p className="mt-1 max-w-xs truncate text-xs text-slate-500">{bill.matchingNotes}</p>
                        </td>
                        <td className="px-5 py-4 text-slate-600">{formatDate(bill.dueDate)}</td>
                        <td className="px-5 py-4">
                          <StatusBadge label={bill.status} className={billStatusTone(bill.status)} />
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
        ) : null}

        {view === "invoices" ? (
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-200 p-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Invoices</h3>
              <p className="mt-1 text-sm text-slate-500">Customer invoices from sales billing records.</p>
            </div>
            <div className="flex gap-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <span>Open {formatQuantity(invoiceSummary.open)}</span>
              <span>Overdue {formatQuantity(invoiceSummary.overdue)}</span>
            </div>
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
                          <p className="mt-1 text-xs text-slate-500">Issued {formatDate(invoice.issuedAt)}</p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-900">{invoice.customerName}</p>
                          <p className="mt-1 text-xs text-slate-500">{invoice.company ?? "-"}</p>
                        </td>
                        <td className="px-5 py-4 text-slate-600">{invoice.salesOrderNumber}</td>
                        <td className="px-5 py-4 font-semibold text-slate-900">
                          {formatCurrency(invoice.total, invoice.currency)}
                        </td>
                        <td className="px-5 py-4 font-semibold text-slate-900">
                          {formatCurrency(invoice.balanceDue, invoice.currency)}
                        </td>
                        <td className="px-5 py-4 text-slate-600">{formatDate(invoice.dueDate)}</td>
                        <td className="px-5 py-4">
                          <StatusBadge label={invoice.status} className={invoiceStatusTone(invoice.status)} />
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
        ) : null}
      </div>
    </InventoryLayout>
  );
}
