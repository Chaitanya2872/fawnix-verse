"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Eye, Loader2, Plus, Printer, Search, Trash2 } from "lucide-react";
import { getApiErrorMessage } from "@/services/api-client";
import { useInvoices as useBills } from "@/modules/purchases/hooks";
import type { Invoice as Bill, InvoiceStatus as BillStatus } from "@/modules/purchases/types";
import { useSalesInvoices } from "@/modules/sales/orders/hooks";
import { SalesInvoiceStatus, type SalesInvoice } from "@/modules/sales/orders/types";
import {
  ProformaInvoiceDocument,
  type ProformaInvoiceDocumentData,
} from "./ProformaInvoiceDocument";
import { InventoryLayout } from "./layout";

type BillingView = "bills" | "invoices" | "proforma";

const PROFORMA_STORAGE_KEY = "fawnix.inventory.proforma-invoices.v1";
const PROFORMA_STATUSES = ["DRAFT", "SENT", "ACCEPTED", "EXPIRED", "CANCELLED"] as const;

type ProformaStatus = (typeof PROFORMA_STATUSES)[number];

type ProformaInvoice = {
  id: string;
  proformaNumber: string;
  customerName: string;
  company: string;
  salesOrderNumber: string;
  validUntil: string;
  currency: string;
  amount: number;
  productDescription: string;
  hsnSac: string;
  uom: string;
  quantity: number;
  taxPercent: number;
  status: ProformaStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

type ProformaFormState = {
  customerName: string;
  company: string;
  salesOrderNumber: string;
  validUntil: string;
  currency: string;
  amount: string;
  productDescription: string;
  hsnSac: string;
  uom: string;
  quantity: string;
  taxPercent: string;
  status: ProformaStatus;
  notes: string;
};

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

function getDateInputValue(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function createProformaNumber(records: ProformaInvoice[]) {
  const year = new Date().getFullYear();
  const prefix = `PI-${year}-`;
  const next = records.reduce((max, record) => {
    if (!record.proformaNumber.startsWith(prefix)) return max;
    const sequence = Number.parseInt(record.proformaNumber.slice(prefix.length), 10);
    return Number.isFinite(sequence) ? Math.max(max, sequence) : max;
  }, 0) + 1;
  return `${prefix}${String(next).padStart(3, "0")}`;
}

function createEmptyProformaForm(): ProformaFormState {
  return {
    customerName: "",
    company: "",
    salesOrderNumber: "",
    validUntil: getDateInputValue(14),
    currency: "INR",
    amount: "",
    productDescription: "",
    hsnSac: "",
    uom: "Nos",
    quantity: "1",
    taxPercent: "18",
    status: "DRAFT",
    notes: "",
  };
}

function isProformaStatus(value: unknown): value is ProformaStatus {
  return typeof value === "string" && PROFORMA_STATUSES.includes(value as ProformaStatus);
}

function normalizeProformaRecord(value: unknown): ProformaInvoice | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Partial<ProformaInvoice>;
  if (
    typeof record.id !== "string" ||
    typeof record.proformaNumber !== "string" ||
    typeof record.customerName !== "string" ||
    typeof record.salesOrderNumber !== "string" ||
    typeof record.validUntil !== "string" ||
    !isProformaStatus(record.status)
  ) {
    return null;
  }

  return {
    id: record.id,
    proformaNumber: record.proformaNumber,
    customerName: record.customerName,
    company: record.company ?? "",
    salesOrderNumber: record.salesOrderNumber,
    validUntil: record.validUntil,
    currency: record.currency ?? "INR",
    amount: Number(record.amount ?? 0),
    productDescription: record.productDescription ?? "",
    hsnSac: record.hsnSac ?? "",
    uom: record.uom ?? "Nos",
    quantity: Number(record.quantity ?? 1),
    taxPercent: Number(record.taxPercent ?? 18),
    status: record.status,
    notes: record.notes ?? "",
    createdAt: record.createdAt ?? new Date().toISOString(),
    updatedAt: record.updatedAt ?? new Date().toISOString(),
  };
}

function loadProformaInvoices() {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(PROFORMA_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeProformaRecord).filter((record): record is ProformaInvoice => Boolean(record));
  } catch {
    return [];
  }
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

function proformaStatusTone(status: ProformaStatus) {
  const tones: Record<ProformaStatus, string> = {
    DRAFT: "border-slate-200 bg-slate-50 text-slate-700",
    SENT: "border-blue-200 bg-blue-50 text-blue-700",
    ACCEPTED: "border-emerald-200 bg-emerald-50 text-emerald-700",
    EXPIRED: "border-amber-200 bg-amber-50 text-amber-700",
    CANCELLED: "border-rose-200 bg-rose-50 text-rose-700",
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

function matchesProformaSearch(proforma: ProformaInvoice, search: string) {
  if (!search) return true;
  return [
    proforma.proformaNumber,
    proforma.customerName,
    proforma.company,
    proforma.salesOrderNumber,
    proforma.status,
    proforma.notes,
  ].some((value) => value.toLowerCase().includes(search));
}

function ProformaField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
        {required ? <span className="text-rose-500"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

function buildProformaDocument(proforma: ProformaInvoice): ProformaInvoiceDocumentData {
  const quantity = proforma.quantity > 0 ? proforma.quantity : 1;
  const taxPercent = Number.isFinite(proforma.taxPercent) ? proforma.taxPercent : 18;
  const taxMultiplier = 1 + taxPercent / 100;
  const taxableValue = proforma.amount > 0 ? proforma.amount / taxMultiplier / quantity : 0;
  const itemDescription =
    proforma.productDescription ||
    proforma.notes ||
    `Proforma supply against ${proforma.salesOrderNumber || proforma.proformaNumber}`;

  return {
    proformaNumber: proforma.proformaNumber,
    invoiceDate: proforma.createdAt,
    poNumber: proforma.salesOrderNumber,
    poDate: proforma.createdAt,
    projectRef: proforma.company || proforma.customerName,
    ewayBillNo: "-",
    ewayBillDate: proforma.validUntil,
    dispatchFrom: {
      name: "ACS TECHNOLOGIES LIMITED",
      addressLines: [
        "7th Floor, Level-7, Pardia Picassa Building",
        "Durgam Cheruvu, Hyderabad, Telangana-500081.",
      ],
      gstin: "36AAACL4102B3Z9",
      state: "Telangana",
    },
    billTo: {
      name: proforma.customerName,
      addressLines: [proforma.company || "Billing address to be updated"],
      gstin: "-",
      state: "Telangana",
    },
    shipTo: {
      name: proforma.customerName,
      addressLines: [proforma.company || "Shipping address to be updated"],
      gstin: "-",
      state: "Telangana",
    },
    items: [
      {
        id: `${proforma.id}-item`,
        description: itemDescription,
        hsnSac: proforma.hsnSac || "-",
        uom: proforma.uom || "Nos",
        quantity,
        rate: taxableValue,
        taxPercent: proforma.amount > 0 ? taxPercent : 0,
      },
    ],
    terms: [
      `Validity up to ${formatDate(proforma.validUntil)}.`,
      "Payment terms as agreed with the customer.",
      "Final tax invoice will be issued after order confirmation.",
    ],
  };
}

function ProformaPreviewModal({
  data,
  title,
  onClose,
}: {
  data: ProformaInvoiceDocumentData;
  title: string;
  onClose: () => void;
}) {
  useEffect(() => {
    document.body.classList.add("printing-quotation");
    return () => document.body.classList.remove("printing-quotation");
  }, []);

  return createPortal(
    <div className="quotation-print-layer fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm print:static print:block print:bg-white print:p-0">
      <div className="quotation-print-root relative flex h-[92vh] w-full max-w-[1100px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-[#f5f1e6] shadow-2xl print:h-auto print:max-w-none print:rounded-none print:border-none print:bg-white print:shadow-none">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 print:hidden">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
              Proforma Invoice Preview
            </p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">{title}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              <Printer className="h-4 w-4" />
              Print / Save PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </div>
        <div className="quotation-preview-stage flex-1 overflow-auto bg-[#e9e2cf] p-6 print:overflow-visible print:bg-white print:p-0">
          <ProformaInvoiceDocument document={data} />
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function InventoryInvoicesPage() {
  const [view, setView] = useState<BillingView>("bills");
  const [search, setSearch] = useState("");
  const [proformas, setProformas] = useState<ProformaInvoice[]>(() => loadProformaInvoices());
  const [showProformaForm, setShowProformaForm] = useState(false);
  const [proformaForm, setProformaForm] = useState<ProformaFormState>(() => createEmptyProformaForm());
  const [previewProformaId, setPreviewProformaId] = useState<string | null>(null);
  const billsQuery = useBills();
  const invoicesQuery = useSalesInvoices();

  const normalizedSearch = search.trim().toLowerCase();

  useEffect(() => {
    window.localStorage.setItem(PROFORMA_STORAGE_KEY, JSON.stringify(proformas));
  }, [proformas]);

  const bills = useMemo(
    () => (billsQuery.data ?? []).filter((bill) => matchesBillSearch(bill, normalizedSearch)),
    [billsQuery.data, normalizedSearch]
  );

  const invoices = useMemo(
    () => (invoicesQuery.data?.data ?? []).filter((invoice) => matchesInvoiceSearch(invoice, normalizedSearch)),
    [invoicesQuery.data?.data, normalizedSearch]
  );

  const filteredProformas = useMemo(
    () => proformas.filter((proforma) => matchesProformaSearch(proforma, normalizedSearch)),
    [proformas, normalizedSearch]
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

  const proformaSummary = useMemo(() => {
    return filteredProformas.reduce(
      (summary, proforma) => {
        summary.totalValue += proforma.amount;
        if (proforma.status === "DRAFT") summary.draft += 1;
        if (proforma.status === "SENT") summary.sent += 1;
        if (proforma.status === "ACCEPTED") summary.accepted += 1;
        return summary;
      },
      { totalValue: 0, draft: 0, sent: 0, accepted: 0 }
    );
  }, [filteredProformas]);

  const invoiceCurrency = invoices[0]?.currency ?? "INR";
  const proformaCurrency = filteredProformas[0]?.currency ?? "INR";
  const previewProforma = proformas.find((proforma) => proforma.id === previewProformaId) ?? null;
  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100";

  function openProformaForm() {
    setProformaForm(createEmptyProformaForm());
    setShowProformaForm(true);
    setView("proforma");
  }

  function updateProformaField<K extends keyof ProformaFormState>(key: K, value: ProformaFormState[K]) {
    setProformaForm((current) => ({ ...current, [key]: value }));
  }

  function handleCreateProforma(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const customerName = proformaForm.customerName.trim();
    const amount = Number(proformaForm.amount);
    const quantity = Number(proformaForm.quantity);
    const taxPercent = Number(proformaForm.taxPercent);

    if (!customerName || !Number.isFinite(amount) || amount < 0 || !Number.isFinite(quantity) || quantity <= 0) {
      return;
    }

    const now = new Date().toISOString();
    const record: ProformaInvoice = {
      id: crypto.randomUUID(),
      proformaNumber: createProformaNumber(proformas),
      customerName,
      company: proformaForm.company.trim(),
      salesOrderNumber: proformaForm.salesOrderNumber.trim(),
      validUntil: proformaForm.validUntil,
      currency: proformaForm.currency.trim().toUpperCase() || "INR",
      amount,
      productDescription: proformaForm.productDescription.trim(),
      hsnSac: proformaForm.hsnSac.trim(),
      uom: proformaForm.uom.trim() || "Nos",
      quantity,
      taxPercent: Number.isFinite(taxPercent) && taxPercent >= 0 ? taxPercent : 0,
      status: proformaForm.status,
      notes: proformaForm.notes.trim(),
      createdAt: now,
      updatedAt: now,
    };

    setProformas((current) => [record, ...current]);
    setProformaForm(createEmptyProformaForm());
    setShowProformaForm(false);
  }

  function updateProformaStatus(id: string, status: ProformaStatus) {
    setProformas((current) =>
      current.map((record) =>
        record.id === id ? { ...record, status, updatedAt: new Date().toISOString() } : record
      )
    );
  }

  function deleteProforma(id: string) {
    setProformas((current) => current.filter((record) => record.id !== id));
  }

  return (
    <InventoryLayout showHeader={false}>
      <div className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="space-y-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Bills & Invoices</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Supplier bills, customer invoices, and local proforma records in one page.
                  </p>
                </div>
                <div className="flex items-center gap-5 border-b border-slate-200">
                  <UnderlineTab active={view === "bills"} onClick={() => setView("bills")}>
                    Bills
                  </UnderlineTab>
                  <UnderlineTab active={view === "invoices"} onClick={() => setView("invoices")}>
                    Invoices
                  </UnderlineTab>
                  <UnderlineTab active={view === "proforma"} onClick={() => setView("proforma")}>
                    Proforma
                  </UnderlineTab>
                </div>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
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
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Proforma</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{formatQuantity(filteredProformas.length)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={
                  view === "bills"
                    ? "Search bill, PO, vendor, matching, or status"
                    : view === "invoices"
                    ? "Search invoice, order, customer, company, or status"
                    : "Search proforma, customer, company, order, or status"
                }
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
            </div>
            {view === "proforma" ? (
              <button
                type="button"
                onClick={openProformaForm}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
              >
                <Plus className="h-4 w-4" />
                Add Proforma
              </button>
            ) : null}
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

        {view === "proforma" ? (
          <div className="space-y-4">
            {showProformaForm ? (
              <form
                onSubmit={handleCreateProforma}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-2 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">New Proforma Invoice</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Local proforma draft for pre-invoice customer confirmation.
                    </p>
                  </div>
                  <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    {createProformaNumber(proformas)}
                  </span>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <ProformaField label="Customer" required>
                    <input
                      required
                      value={proformaForm.customerName}
                      onChange={(event) => updateProformaField("customerName", event.target.value)}
                      className={inputClass}
                      placeholder="Customer name"
                    />
                  </ProformaField>
                  <ProformaField label="Company">
                    <input
                      value={proformaForm.company}
                      onChange={(event) => updateProformaField("company", event.target.value)}
                      className={inputClass}
                      placeholder="Company"
                    />
                  </ProformaField>
                  <ProformaField label="Sales Order">
                    <input
                      value={proformaForm.salesOrderNumber}
                      onChange={(event) => updateProformaField("salesOrderNumber", event.target.value)}
                      className={inputClass}
                      placeholder="SO-2026-001"
                    />
                  </ProformaField>
                  <ProformaField label="Valid Until" required>
                    <input
                      required
                      type="date"
                      value={proformaForm.validUntil}
                      onChange={(event) => updateProformaField("validUntil", event.target.value)}
                      className={inputClass}
                    />
                  </ProformaField>
                  <ProformaField label="Currency">
                    <input
                      value={proformaForm.currency}
                      onChange={(event) => updateProformaField("currency", event.target.value)}
                      className={inputClass}
                      placeholder="INR"
                    />
                  </ProformaField>
                  <ProformaField label="Amount" required>
                    <input
                      required
                      type="number"
                      min={0}
                      step="0.01"
                      value={proformaForm.amount}
                      onChange={(event) => updateProformaField("amount", event.target.value)}
                      className={inputClass}
                      placeholder="0.00"
                    />
                  </ProformaField>
                  <div className="md:col-span-2">
                    <ProformaField label="Product Description">
                      <input
                        value={proformaForm.productDescription}
                        onChange={(event) => updateProformaField("productDescription", event.target.value)}
                        className={inputClass}
                        placeholder="C & Z Purlins, controller, material, service..."
                      />
                    </ProformaField>
                  </div>
                  <ProformaField label="HSN/SAC">
                    <input
                      value={proformaForm.hsnSac}
                      onChange={(event) => updateProformaField("hsnSac", event.target.value)}
                      className={inputClass}
                      placeholder="72103090"
                    />
                  </ProformaField>
                  <ProformaField label="UOM">
                    <input
                      value={proformaForm.uom}
                      onChange={(event) => updateProformaField("uom", event.target.value)}
                      className={inputClass}
                      placeholder="Kgs"
                    />
                  </ProformaField>
                  <ProformaField label="Quantity" required>
                    <input
                      required
                      type="number"
                      min={0.01}
                      step="0.01"
                      value={proformaForm.quantity}
                      onChange={(event) => updateProformaField("quantity", event.target.value)}
                      className={inputClass}
                      placeholder="1"
                    />
                  </ProformaField>
                  <ProformaField label="Tax %">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={proformaForm.taxPercent}
                      onChange={(event) => updateProformaField("taxPercent", event.target.value)}
                      className={inputClass}
                      placeholder="18"
                    />
                  </ProformaField>
                  <ProformaField label="Status">
                    <select
                      value={proformaForm.status}
                      onChange={(event) => updateProformaField("status", event.target.value as ProformaStatus)}
                      className={inputClass}
                    >
                      {PROFORMA_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status.replaceAll("_", " ")}
                        </option>
                      ))}
                    </select>
                  </ProformaField>
                  <div className="md:col-span-2 xl:col-span-4">
                    <ProformaField label="Notes">
                      <textarea
                        value={proformaForm.notes}
                        onChange={(event) => updateProformaField("notes", event.target.value)}
                        className={`${inputClass} min-h-20 resize-y`}
                        placeholder="Commercial terms, validity note, or dispatch assumptions"
                      />
                    </ProformaField>
                  </div>
                </div>

                <div className="mt-5 flex justify-end gap-3 border-t border-slate-200 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowProformaForm(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
                  >
                    Save Proforma
                  </button>
                </div>
              </form>
            ) : null}

            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-2 border-b border-slate-200 p-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Proforma Invoices</h3>
                  <p className="mt-1 text-sm text-slate-500">Local pre-invoice records for sales order follow-up.</p>
                </div>
                <div className="flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <span>Draft {formatQuantity(proformaSummary.draft)}</span>
                  <span>Sent {formatQuantity(proformaSummary.sent)}</span>
                  <span>Accepted {formatQuantity(proformaSummary.accepted)}</span>
                  <span>{formatCurrency(proformaSummary.totalValue, proformaCurrency)}</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80">
                      {["Proforma", "Customer", "Sales Order", "Amount", "Valid Until", "Status", "Actions"].map((heading) => (
                        <th key={heading} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProformas.length ? (
                      filteredProformas.map((proforma) => (
                        <tr key={proforma.id} className="border-b border-slate-100 align-top">
                          <td className="px-5 py-4">
                            <p className="font-semibold text-slate-900">{proforma.proformaNumber}</p>
                            <p className="mt-1 text-xs text-slate-500">Created {formatDate(proforma.createdAt)}</p>
                          </td>
                          <td className="px-5 py-4">
                            <p className="font-semibold text-slate-900">{proforma.customerName}</p>
                            <p className="mt-1 text-xs text-slate-500">{proforma.company || "-"}</p>
                          </td>
                          <td className="px-5 py-4 text-slate-600">{proforma.salesOrderNumber || "-"}</td>
                          <td className="px-5 py-4 font-semibold text-slate-900">
                            {formatCurrency(proforma.amount, proforma.currency)}
                          </td>
                          <td className="px-5 py-4 text-slate-600">{formatDate(proforma.validUntil)}</td>
                          <td className="px-5 py-4">
                            <StatusBadge label={proforma.status} className={proformaStatusTone(proforma.status)} />
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setPreviewProformaId(proforma.id)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-brand-200 bg-brand-50 text-brand-700 transition-colors hover:bg-brand-100"
                                aria-label={`Preview ${proforma.proformaNumber}`}
                                title="Preview / Print PDF"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <select
                                value={proforma.status}
                                onChange={(event) => updateProformaStatus(proforma.id, event.target.value as ProformaStatus)}
                                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                                aria-label={`Update ${proforma.proformaNumber} status`}
                              >
                                {PROFORMA_STATUSES.map((status) => (
                                  <option key={status} value={status}>
                                    {status.replaceAll("_", " ")}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => deleteProforma(proforma.id)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700 transition-colors hover:bg-rose-100"
                                aria-label={`Delete ${proforma.proformaNumber}`}
                                title="Delete proforma"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-5 py-16 text-center text-sm text-slate-500">
                          No proforma invoices matched your filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}
        {previewProforma ? (
          <ProformaPreviewModal
            data={buildProformaDocument(previewProforma)}
            title={previewProforma.proformaNumber}
            onClose={() => setPreviewProformaId(null)}
          />
        ) : null}
      </div>
    </InventoryLayout>
  );
}
