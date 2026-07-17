"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  Building2,
  ClipboardList,
  Eye,
  FileText,
  Landmark,
  Loader2,
  PackageCheck,
  Plus,
  Printer,
  Search,
  Trash2,
  Truck,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
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

type ProformaBuilderSectionId =
  | "invoice"
  | "dispatch"
  | "buyer"
  | "consignee"
  | "items"
  | "bank"
  | "terms";

const PROFORMA_BUILDER_SECTIONS: Array<{
  id: ProformaBuilderSectionId;
  title: string;
  total: number;
  icon: LucideIcon;
}> = [
  { id: "invoice", title: "Invoice Details", total: 10, icon: FileText },
  { id: "dispatch", title: "Dispatch From", total: 4, icon: Building2 },
  { id: "buyer", title: "Bill To / Buyer", total: 5, icon: UserRound },
  { id: "consignee", title: "Ship To / Consignee", total: 4, icon: Truck },
  { id: "items", title: "Product Items", total: 1, icon: PackageCheck },
  { id: "bank", title: "Bank Details", total: 5, icon: Landmark },
  { id: "terms", title: "Terms & Signature", total: 2, icon: ClipboardList },
];

type ProformaParty = {
  name: string;
  company?: string;
  address: string;
  gstin: string;
  state: string;
};

type ProformaLineItem = {
  id: string;
  description: string;
  hsnSac: string;
  uom: string;
  quantity: number;
  rate: number;
  taxPercent: number;
};

type ProformaLineItemForm = {
  id: string;
  description: string;
  hsnSac: string;
  uom: string;
  quantity: string;
  rate: string;
  taxPercent: string;
};

type ProformaBankDetails = {
  accountNumber: string;
  bank: string;
  branch: string;
  ifsc: string;
  accountType: string;
};

type ProformaInvoice = {
  id: string;
  proformaNumber: string;
  invoiceDate: string;
  poDate: string;
  poNumber: string;
  projectRef: string;
  ewayBillNo: string;
  ewayBillDate: string;
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
  dispatchFrom: ProformaParty;
  billTo: ProformaParty;
  shipTo: ProformaParty;
  items: ProformaLineItem[];
  bankDetails: ProformaBankDetails;
  terms: string[];
  createdAt: string;
  updatedAt: string;
};

type ProformaFormState = {
  proformaNumber: string;
  invoiceDate: string;
  poDate: string;
  poNumber: string;
  projectRef: string;
  ewayBillNo: string;
  ewayBillDate: string;
  salesOrderNumber: string;
  validUntil: string;
  currency: string;
  status: ProformaStatus;
  dispatchFrom: ProformaParty;
  billTo: ProformaParty;
  shipTo: ProformaParty;
  items: ProformaLineItemForm[];
  bankDetails: ProformaBankDetails;
  notes: string;
  terms: string;
};

type ProformaSectionProgress = Record<ProformaBuilderSectionId, { count: number; total: number; complete: boolean }>;

const DEFAULT_DISPATCH_FROM: ProformaParty = {
  name: "ACS TECHNOLOGIES LIMITED",
  address: "7th Floor, Level-7, Pardia Picassa Building\nDurgam Cheruvu, Hyderabad, Telangana-500081.",
  gstin: "36AAACL4102B3Z9",
  state: "Telangana",
};

const DEFAULT_BANK_DETAILS_FORM: ProformaBankDetails = {
  accountNumber: "5020 0009 1346 10",
  bank: "HDFC BANK LTD",
  branch: "PUNJAGUTTA, HYDERABAD",
  ifsc: "HDFC 000 1228",
  accountType: "Current Account",
};

const DEFAULT_PROFORMA_TERMS = [
  "Validity up to the mentioned validity date.",
  "Payment terms as agreed with the customer.",
  "Final tax invoice will be issued after order confirmation.",
];

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

function createLocalId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createEmptyProformaItem(): ProformaLineItemForm {
  return {
    id: createLocalId("proforma-item"),
    description: "",
    hsnSac: "",
    uom: "Nos",
    quantity: "1",
    rate: "",
    taxPercent: "18",
  };
}

function createEmptyProformaForm(proformaNumber = ""): ProformaFormState {
  return {
    proformaNumber,
    invoiceDate: getDateInputValue(),
    poDate: "",
    poNumber: "",
    projectRef: "",
    ewayBillNo: "",
    ewayBillDate: "",
    salesOrderNumber: "",
    validUntil: getDateInputValue(14),
    currency: "INR",
    status: "DRAFT",
    dispatchFrom: { ...DEFAULT_DISPATCH_FROM },
    billTo: {
      name: "",
      company: "",
      address: "",
      gstin: "",
      state: "",
    },
    shipTo: {
      name: "",
      address: "",
      gstin: "",
      state: "",
    },
    items: [createEmptyProformaItem()],
    bankDetails: { ...DEFAULT_BANK_DETAILS_FORM },
    notes: "",
    terms: DEFAULT_PROFORMA_TERMS.join("\n"),
  };
}

function isProformaStatus(value: unknown): value is ProformaStatus {
  return typeof value === "string" && PROFORMA_STATUSES.includes(value as ProformaStatus);
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function numberValue(value: unknown, fallback = 0) {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(number) ? number : fallback;
}

function positiveNumberValue(value: unknown, fallback = 0) {
  const number = numberValue(value, fallback);
  return number > 0 ? number : fallback;
}

function splitTextLines(value?: string | null) {
  return (value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function partyAddressLines(party: ProformaParty, fallback: string) {
  const lines = splitTextLines(party.address);
  if (party.company?.trim()) {
    return [party.company.trim(), ...(lines.length ? lines : [fallback])];
  }
  return lines.length ? lines : [fallback];
}

function normalizeParty(value: unknown, fallback: ProformaParty): ProformaParty {
  const party = value && typeof value === "object" ? (value as Partial<ProformaParty>) : {};
  return {
    name: stringValue(party.name, fallback.name),
    company: stringValue(party.company, fallback.company ?? ""),
    address: stringValue(party.address, fallback.address),
    gstin: stringValue(party.gstin, fallback.gstin),
    state: stringValue(party.state, fallback.state),
  };
}

function normalizeBankDetails(value: unknown): ProformaBankDetails {
  const bankDetails = value && typeof value === "object" ? (value as Partial<ProformaBankDetails>) : {};
  return {
    accountNumber: stringValue(bankDetails.accountNumber, DEFAULT_BANK_DETAILS_FORM.accountNumber),
    bank: stringValue(bankDetails.bank, DEFAULT_BANK_DETAILS_FORM.bank),
    branch: stringValue(bankDetails.branch, DEFAULT_BANK_DETAILS_FORM.branch),
    ifsc: stringValue(bankDetails.ifsc, DEFAULT_BANK_DETAILS_FORM.ifsc),
    accountType: stringValue(bankDetails.accountType, DEFAULT_BANK_DETAILS_FORM.accountType),
  };
}

function calculateLineTotal(item: Pick<ProformaLineItem, "quantity" | "rate" | "taxPercent">) {
  const basic = item.quantity * item.rate;
  return basic + (basic * item.taxPercent) / 100;
}

function calculateItemsTotal(items: Array<Pick<ProformaLineItem, "quantity" | "rate" | "taxPercent">>) {
  return items.reduce((sum, item) => sum + calculateLineTotal(item), 0);
}

function createLegacyLineItem(record: Partial<ProformaInvoice>): ProformaLineItem {
  const quantity = positiveNumberValue(record.quantity, 1);
  const taxPercent = numberValue(record.taxPercent, 18);
  const amount = numberValue(record.amount, 0);
  const taxMultiplier = 1 + Math.max(taxPercent, 0) / 100;
  const rate = amount > 0 ? amount / taxMultiplier / quantity : 0;

  return {
    id: `${stringValue(record.id, createLocalId("legacy-proforma"))}-item`,
    description:
      stringValue(record.productDescription) ||
      stringValue(record.notes) ||
      `Proforma supply against ${stringValue(record.salesOrderNumber) || stringValue(record.proformaNumber)}`,
    hsnSac: stringValue(record.hsnSac),
    uom: stringValue(record.uom, "Nos"),
    quantity,
    rate,
    taxPercent: amount > 0 ? Math.max(taxPercent, 0) : 0,
  };
}

function normalizeLineItems(value: unknown, record: Partial<ProformaInvoice>) {
  if (!Array.isArray(value)) return [createLegacyLineItem(record)];

  const items = value
    .map((item, index): ProformaLineItem | null => {
      if (!item || typeof item !== "object") return null;
      const line = item as Partial<ProformaLineItem>;
      const quantity = positiveNumberValue(line.quantity, 0);
      const rate = positiveNumberValue(line.rate, 0);

      if (!quantity && !rate && !stringValue(line.description)) return null;

      return {
        id: stringValue(line.id, `${stringValue(record.id, "proforma")}-item-${index + 1}`),
        description: stringValue(line.description, "Product details to be updated"),
        hsnSac: stringValue(line.hsnSac),
        uom: stringValue(line.uom, "Nos"),
        quantity,
        rate,
        taxPercent: Math.max(numberValue(line.taxPercent, 0), 0),
      };
    })
    .filter((item): item is ProformaLineItem => Boolean(item));

  return items.length ? items : [createLegacyLineItem(record)];
}

function normalizeTerms(value: unknown) {
  if (Array.isArray(value)) {
    const terms = value.map((term) => stringValue(term).trim()).filter(Boolean);
    if (terms.length) return terms;
  }
  return DEFAULT_PROFORMA_TERMS;
}

function normalizeProformaRecord(value: unknown): ProformaInvoice | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Partial<ProformaInvoice>;
  if (
    typeof record.id !== "string" ||
    typeof record.proformaNumber !== "string" ||
    !isProformaStatus(record.status)
  ) {
    return null;
  }

  const items = normalizeLineItems(record.items, record);
  const billTo = normalizeParty(record.billTo, {
    name: stringValue(record.customerName),
    company: stringValue(record.company),
    address: stringValue(record.company, "Billing address to be updated"),
    gstin: "",
    state: "Telangana",
  });
  const shipTo = normalizeParty(record.shipTo, {
    name: stringValue(record.customerName),
    address: stringValue(record.company, "Shipping address to be updated"),
    gstin: "",
    state: "Telangana",
  });
  const calculatedAmount = calculateItemsTotal(items);

  return {
    id: record.id,
    proformaNumber: record.proformaNumber,
    invoiceDate: stringValue(record.invoiceDate, record.createdAt ?? getDateInputValue()),
    poDate: stringValue(record.poDate, record.createdAt ?? ""),
    poNumber: stringValue(record.poNumber, record.salesOrderNumber ?? ""),
    projectRef: stringValue(record.projectRef, record.company ?? ""),
    ewayBillNo: stringValue(record.ewayBillNo),
    ewayBillDate: stringValue(record.ewayBillDate, record.validUntil ?? ""),
    customerName: billTo.name || stringValue(record.customerName),
    company: billTo.company ?? stringValue(record.company),
    salesOrderNumber: stringValue(record.salesOrderNumber, record.poNumber ?? ""),
    validUntil: stringValue(record.validUntil, getDateInputValue(14)),
    currency: stringValue(record.currency, "INR"),
    amount: numberValue(record.amount, calculatedAmount),
    productDescription: stringValue(record.productDescription, items[0]?.description ?? ""),
    hsnSac: stringValue(record.hsnSac, items[0]?.hsnSac ?? ""),
    uom: stringValue(record.uom, items[0]?.uom ?? "Nos"),
    quantity: positiveNumberValue(record.quantity, items[0]?.quantity ?? 1),
    taxPercent: numberValue(record.taxPercent, items[0]?.taxPercent ?? 18),
    status: record.status,
    notes: stringValue(record.notes),
    dispatchFrom: normalizeParty(record.dispatchFrom, DEFAULT_DISPATCH_FROM),
    billTo,
    shipTo,
    items,
    bankDetails: normalizeBankDetails(record.bankDetails),
    terms: normalizeTerms(record.terms),
    createdAt: stringValue(record.createdAt, new Date().toISOString()),
    updatedAt: stringValue(record.updatedAt, new Date().toISOString()),
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

function toDocumentParty(party: ProformaParty, fallbackAddress: string) {
  return {
    name: party.name,
    addressLines: partyAddressLines(party, fallbackAddress),
    gstin: party.gstin || "-",
    state: party.state || "-",
  };
}

function bankDetailsRows(bankDetails: ProformaBankDetails): Array<[string, string]> {
  return [
    ["A/C No.", bankDetails.accountNumber],
    ["Bank", bankDetails.bank],
    ["Branch", bankDetails.branch],
    ["IFSC", bankDetails.ifsc],
    ["A/c Type", bankDetails.accountType],
  ];
}

function buildProformaDocument(proforma: ProformaInvoice): ProformaInvoiceDocumentData {
  const items = proforma.items.length ? proforma.items : [createLegacyLineItem(proforma)];

  return {
    proformaNumber: proforma.proformaNumber,
    invoiceDate: proforma.invoiceDate || proforma.createdAt,
    poNumber: proforma.poNumber || proforma.salesOrderNumber,
    poDate: proforma.poDate || proforma.createdAt,
    projectRef: proforma.projectRef || proforma.company || proforma.customerName,
    ewayBillNo: proforma.ewayBillNo || "-",
    ewayBillDate: proforma.ewayBillDate || proforma.validUntil,
    validUntil: proforma.validUntil,
    dispatchFrom: toDocumentParty(proforma.dispatchFrom, "Dispatch address to be updated"),
    billTo: toDocumentParty(proforma.billTo, "Billing address to be updated"),
    shipTo: toDocumentParty(proforma.shipTo, "Shipping address to be updated"),
    items: items.map((item) => ({
      id: item.id,
      description: item.description || "Product details to be updated",
      hsnSac: item.hsnSac || "-",
      uom: item.uom || "Nos",
      quantity: item.quantity,
      rate: item.rate,
      taxPercent: item.taxPercent,
    })),
    bankDetails: bankDetailsRows(proforma.bankDetails),
    terms: proforma.terms.length ? proforma.terms : DEFAULT_PROFORMA_TERMS,
    notes: proforma.notes,
  };
}

function parseFormLineItem(item: ProformaLineItemForm): ProformaLineItem | null {
  const quantity = positiveNumberValue(item.quantity, 0);
  const rate = positiveNumberValue(item.rate, 0);
  if (quantity <= 0 || rate <= 0) return null;

  return {
    id: item.id,
    description: item.description.trim() || "Product details to be updated",
    hsnSac: item.hsnSac.trim(),
    uom: item.uom.trim() || "Nos",
    quantity,
    rate,
    taxPercent: Math.max(numberValue(item.taxPercent, 0), 0),
  };
}

function draftDocumentItems(items: ProformaLineItemForm[]) {
  const parsedItems = items.map(parseFormLineItem).filter((item): item is ProformaLineItem => Boolean(item));
  if (parsedItems.length) return parsedItems;

  const firstItem = items[0] ?? createEmptyProformaItem();
  return [
    {
      id: firstItem.id,
      description: firstItem.description.trim() || "Product details to be updated",
      hsnSac: firstItem.hsnSac.trim(),
      uom: firstItem.uom.trim() || "Nos",
      quantity: positiveNumberValue(firstItem.quantity, 0),
      rate: positiveNumberValue(firstItem.rate, 0),
      taxPercent: Math.max(numberValue(firstItem.taxPercent, 0), 0),
    },
  ];
}

function buildDraftProformaDocument(form: ProformaFormState): ProformaInvoiceDocumentData {
  const terms = splitTextLines(form.terms);
  return {
    proformaNumber: form.proformaNumber || "PI-DRAFT",
    invoiceDate: form.invoiceDate,
    poNumber: form.poNumber || form.salesOrderNumber,
    poDate: form.poDate,
    projectRef: form.projectRef,
    ewayBillNo: form.ewayBillNo || "-",
    ewayBillDate: form.ewayBillDate,
    validUntil: form.validUntil,
    dispatchFrom: toDocumentParty(form.dispatchFrom, "Dispatch address to be updated"),
    billTo: toDocumentParty(form.billTo, "Billing address to be updated"),
    shipTo: toDocumentParty(form.shipTo, "Shipping address to be updated"),
    items: draftDocumentItems(form.items).map((item) => ({
      id: item.id,
      description: item.description,
      hsnSac: item.hsnSac || "-",
      uom: item.uom,
      quantity: item.quantity,
      rate: item.rate,
      taxPercent: item.taxPercent,
    })),
    bankDetails: bankDetailsRows(form.bankDetails),
    terms: terms.length ? terms : DEFAULT_PROFORMA_TERMS,
    notes: form.notes,
  };
}

function isFilled(value: string) {
  return Boolean(value.trim());
}

function getProformaSectionProgress(form: ProformaFormState): ProformaSectionProgress {
  const validItems = form.items.map(parseFormLineItem).filter(Boolean).length;
  const termsCount = [form.notes, form.terms].filter(isFilled).length;

  return {
    invoice: {
      count: [
        form.proformaNumber,
        form.invoiceDate,
        form.salesOrderNumber || form.poNumber,
        form.poDate,
        form.projectRef,
        form.ewayBillNo,
        form.ewayBillDate,
        form.validUntil,
        form.currency,
        form.status,
      ].filter(isFilled).length,
      total: 10,
      complete: isFilled(form.proformaNumber) && isFilled(form.invoiceDate) && isFilled(form.validUntil),
    },
    dispatch: {
      count: [form.dispatchFrom.name, form.dispatchFrom.address, form.dispatchFrom.gstin, form.dispatchFrom.state].filter(isFilled).length,
      total: 4,
      complete: isFilled(form.dispatchFrom.name) && isFilled(form.dispatchFrom.address),
    },
    buyer: {
      count: [form.billTo.name, form.billTo.company ?? "", form.billTo.address, form.billTo.gstin, form.billTo.state].filter(isFilled).length,
      total: 5,
      complete: isFilled(form.billTo.name),
    },
    consignee: {
      count: [form.shipTo.name, form.shipTo.address, form.shipTo.gstin, form.shipTo.state].filter(isFilled).length,
      total: 4,
      complete: isFilled(form.shipTo.name) || isFilled(form.shipTo.address),
    },
    items: {
      count: validItems,
      total: Math.max(form.items.length, 1),
      complete: validItems > 0,
    },
    bank: {
      count: [
        form.bankDetails.accountNumber,
        form.bankDetails.bank,
        form.bankDetails.branch,
        form.bankDetails.ifsc,
        form.bankDetails.accountType,
      ].filter(isFilled).length,
      total: 5,
      complete: isFilled(form.bankDetails.accountNumber) && isFilled(form.bankDetails.bank) && isFilled(form.bankDetails.ifsc),
    },
    terms: {
      count: termsCount,
      total: 2,
      complete: isFilled(form.terms),
    },
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
  const [activeProformaSection, setActiveProformaSection] = useState<ProformaBuilderSectionId>("invoice");
  const [proformaFormError, setProformaFormError] = useState<string | null>(null);
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
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100";
  const parsedProformaItems = useMemo(
    () => proformaForm.items.map(parseFormLineItem).filter((item): item is ProformaLineItem => Boolean(item)),
    [proformaForm.items]
  );
  const proformaDraftTotal = useMemo(() => calculateItemsTotal(parsedProformaItems), [parsedProformaItems]);
  const proformaDraftDocument = useMemo(() => buildDraftProformaDocument(proformaForm), [proformaForm]);
  const proformaSectionProgress = useMemo(() => getProformaSectionProgress(proformaForm), [proformaForm]);

  function openProformaForm() {
    setProformaForm(createEmptyProformaForm(createProformaNumber(proformas)));
    setActiveProformaSection("invoice");
    setProformaFormError(null);
    setShowProformaForm(true);
    setView("proforma");
  }

  function updateProformaField<K extends keyof ProformaFormState>(key: K, value: ProformaFormState[K]) {
    setProformaForm((current) => ({ ...current, [key]: value }));
    setProformaFormError(null);
  }

  function updateProformaParty(section: "dispatchFrom" | "billTo" | "shipTo", key: keyof ProformaParty, value: string) {
    setProformaForm((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [key]: value,
      },
    }));
    setProformaFormError(null);
  }

  function updateProformaBankField(key: keyof ProformaBankDetails, value: string) {
    setProformaForm((current) => ({
      ...current,
      bankDetails: {
        ...current.bankDetails,
        [key]: value,
      },
    }));
  }

  function updateProformaItem(id: string, key: keyof ProformaLineItemForm, value: string) {
    setProformaForm((current) => ({
      ...current,
      items: current.items.map((item) => (item.id === id ? { ...item, [key]: value } : item)),
    }));
    setProformaFormError(null);
  }

  function addProformaItem() {
    setProformaForm((current) => ({ ...current, items: [...current.items, createEmptyProformaItem()] }));
    setActiveProformaSection("items");
  }

  function removeProformaItem(id: string) {
    setProformaForm((current) => ({
      ...current,
      items: current.items.length > 1 ? current.items.filter((item) => item.id !== id) : current.items,
    }));
  }

  function handleCreateProforma(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const customerName = proformaForm.billTo.name.trim();
    const items = proformaForm.items.map(parseFormLineItem).filter((item): item is ProformaLineItem => Boolean(item));

    if (!customerName) {
      setProformaFormError("Bill To / Buyer name is required before saving.");
      setActiveProformaSection("buyer");
      return;
    }

    if (!items.length) {
      setProformaFormError("Add at least one product item with positive quantity and rate.");
      setActiveProformaSection("items");
      return;
    }

    const now = new Date().toISOString();
    const amount = calculateItemsTotal(items);
    const firstItem = items[0];
    const record: ProformaInvoice = {
      id: createLocalId("proforma"),
      proformaNumber: proformaForm.proformaNumber || createProformaNumber(proformas),
      invoiceDate: proformaForm.invoiceDate,
      poDate: proformaForm.poDate,
      poNumber: proformaForm.poNumber.trim() || proformaForm.salesOrderNumber.trim(),
      projectRef: proformaForm.projectRef.trim(),
      ewayBillNo: proformaForm.ewayBillNo.trim(),
      ewayBillDate: proformaForm.ewayBillDate,
      customerName,
      company: proformaForm.billTo.company?.trim() ?? "",
      salesOrderNumber: proformaForm.salesOrderNumber.trim(),
      validUntil: proformaForm.validUntil,
      currency: proformaForm.currency.trim().toUpperCase() || "INR",
      amount,
      productDescription: firstItem.description,
      hsnSac: firstItem.hsnSac,
      uom: firstItem.uom,
      quantity: firstItem.quantity,
      taxPercent: firstItem.taxPercent,
      status: proformaForm.status,
      notes: proformaForm.notes.trim(),
      dispatchFrom: {
        ...proformaForm.dispatchFrom,
        name: proformaForm.dispatchFrom.name.trim(),
        company: proformaForm.dispatchFrom.company?.trim(),
        address: proformaForm.dispatchFrom.address.trim(),
        gstin: proformaForm.dispatchFrom.gstin.trim(),
        state: proformaForm.dispatchFrom.state.trim(),
      },
      billTo: {
        ...proformaForm.billTo,
        name: customerName,
        company: proformaForm.billTo.company?.trim(),
        address: proformaForm.billTo.address.trim(),
        gstin: proformaForm.billTo.gstin.trim(),
        state: proformaForm.billTo.state.trim(),
      },
      shipTo: {
        ...proformaForm.shipTo,
        name: proformaForm.shipTo.name.trim() || customerName,
        company: proformaForm.shipTo.company?.trim(),
        address: proformaForm.shipTo.address.trim() || proformaForm.billTo.address.trim(),
        gstin: proformaForm.shipTo.gstin.trim() || proformaForm.billTo.gstin.trim(),
        state: proformaForm.shipTo.state.trim() || proformaForm.billTo.state.trim(),
      },
      items,
      bankDetails: {
        accountNumber: proformaForm.bankDetails.accountNumber.trim(),
        bank: proformaForm.bankDetails.bank.trim(),
        branch: proformaForm.bankDetails.branch.trim(),
        ifsc: proformaForm.bankDetails.ifsc.trim(),
        accountType: proformaForm.bankDetails.accountType.trim(),
      },
      terms: splitTextLines(proformaForm.terms),
      createdAt: now,
      updatedAt: now,
    };

    setProformas((current) => [record, ...current]);
    setProformaForm(createEmptyProformaForm());
    setProformaFormError(null);
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
       <div className="space-y-4">
  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Bills
      </p>
      <p className="mt-1 text-2xl font-bold text-slate-900">
        {formatQuantity(bills.length)}
      </p>
    </div>

    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Bill Value
      </p>
      <p className="mt-1 text-xl font-bold text-slate-900">
        {formatCurrency(billSummary.totalValue)}
      </p>
    </div>

    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Invoices
      </p>
      <p className="mt-1 text-2xl font-bold text-slate-900">
        {formatQuantity(invoices.length)}
      </p>
    </div>

    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Balance Due
      </p>
      <p className="mt-1 text-xl font-bold text-slate-900">
        {formatCurrency(invoiceSummary.balanceDue, invoiceCurrency)}
      </p>
    </div>

    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Proforma
      </p>
      <p className="mt-1 text-2xl font-bold text-slate-900">
        {formatQuantity(filteredProformas.length)}
      </p>
    </div>
  </div>

  <div className="border-b border-slate-200">
    <div className="flex items-center gap-6">
      <UnderlineTab
        active={view === "bills"}
        onClick={() => setView("bills")}
      >
        Bills
      </UnderlineTab>

      <UnderlineTab
        active={view === "invoices"}
        onClick={() => setView("invoices")}
      >
        Invoices
      </UnderlineTab>

      <UnderlineTab
        active={view === "proforma"}
        onClick={() => setView("proforma")}
      >
        Proforma
      </UnderlineTab>
    </div>
  </div>
</div>
        {/* <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
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
        </div> */}

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
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
                <form
                  onSubmit={handleCreateProforma}
                  className="flex h-[min(92vh,900px)] w-full max-w-[1500px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
                >
                <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">New Proforma Invoice</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Build every proforma section and preview the invoice before saving.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                      {proformaForm.proformaNumber}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                      {formatCurrency(proformaDraftTotal, proformaForm.currency || "INR")}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setShowProformaForm(false);
                        setProformaFormError(null);
                      }}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
                      aria-label="Close proforma form"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_390px]">
                  <aside className="border-b border-slate-200 bg-slate-50/70 p-3 lg:border-b-0 lg:border-r">
                    <div className="space-y-1">
                      {PROFORMA_BUILDER_SECTIONS.map((section) => {
                        const progress = proformaSectionProgress[section.id];
                        const Icon = section.icon;
                        const active = activeProformaSection === section.id;
                        return (
                          <button
                            key={section.id}
                            type="button"
                            onClick={() => setActiveProformaSection(section.id)}
                            aria-label={`${section.title}, ${progress.count} of ${progress.total} fields filled`}
                            className={`group flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-xs font-semibold transition-colors ${
                              active
                                ? "bg-brand-50 text-slate-900 shadow-sm"
                                : "text-slate-500 hover:bg-white hover:text-slate-800"
                            }`}
                          >
                            <Icon className={`h-4 w-4 shrink-0 ${active ? "text-brand-600" : "text-slate-400 group-hover:text-slate-500"}`} />
                            <span className="min-w-0 truncate leading-tight">{section.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  </aside>

                  <section className="min-h-0 min-w-0 overflow-auto border-b border-slate-200 xl:border-b-0 xl:border-r">
                    <div className="border-b border-slate-200 px-5 py-4">
                      <h4 className="text-sm font-semibold text-slate-900">
                        {PROFORMA_BUILDER_SECTIONS.find((section) => section.id === activeProformaSection)?.title}
                      </h4>
                      {proformaFormError ? <p className="mt-1 text-sm font-semibold text-rose-600">{proformaFormError}</p> : null}
                    </div>

                    <div className="space-y-4 p-5">
                      {activeProformaSection === "invoice" ? (
                        <div className="grid gap-4 md:grid-cols-2">
                          <ProformaField label="Proforma No." required>
                            <input value={proformaForm.proformaNumber} readOnly className={`${inputClass} bg-slate-50 font-semibold`} />
                          </ProformaField>
                          <ProformaField label="Invoice Date" required>
                            <input type="date" value={proformaForm.invoiceDate} onChange={(event) => updateProformaField("invoiceDate", event.target.value)} className={inputClass} />
                          </ProformaField>
                          <ProformaField label="PO/SO No.">
                            <input value={proformaForm.salesOrderNumber} onChange={(event) => updateProformaField("salesOrderNumber", event.target.value)} className={inputClass} placeholder="PO/ARC/2025-26-03/04" />
                          </ProformaField>
                          <ProformaField label="PO/SO Date">
                            <input type="date" value={proformaForm.poDate} onChange={(event) => updateProformaField("poDate", event.target.value)} className={inputClass} />
                          </ProformaField>
                          <ProformaField label="Project Ref.">
                            <input value={proformaForm.projectRef} onChange={(event) => updateProformaField("projectRef", event.target.value)} className={inputClass} placeholder="ARCHIMEDES" />
                          </ProformaField>
                          <ProformaField label="Ewaybill No.">
                            <input value={proformaForm.ewayBillNo} onChange={(event) => updateProformaField("ewayBillNo", event.target.value)} className={inputClass} placeholder="1624 2910 5413" />
                          </ProformaField>
                          <ProformaField label="Ewaybill Date">
                            <input type="date" value={proformaForm.ewayBillDate} onChange={(event) => updateProformaField("ewayBillDate", event.target.value)} className={inputClass} />
                          </ProformaField>
                          <ProformaField label="Valid Until" required>
                            <input type="date" value={proformaForm.validUntil} onChange={(event) => updateProformaField("validUntil", event.target.value)} className={inputClass} />
                          </ProformaField>
                          <ProformaField label="Currency">
                            <input value={proformaForm.currency} onChange={(event) => updateProformaField("currency", event.target.value)} className={inputClass} placeholder="INR" />
                          </ProformaField>
                          <ProformaField label="Status">
                            <select value={proformaForm.status} onChange={(event) => updateProformaField("status", event.target.value as ProformaStatus)} className={inputClass}>
                              {PROFORMA_STATUSES.map((status) => (
                                <option key={status} value={status}>
                                  {status.replaceAll("_", " ")}
                                </option>
                              ))}
                            </select>
                          </ProformaField>
                        </div>
                      ) : null}

                      {activeProformaSection === "dispatch" ? (
                        <div className="grid gap-4 md:grid-cols-2">
                          <ProformaField label="Name" required>
                            <input value={proformaForm.dispatchFrom.name} onChange={(event) => updateProformaParty("dispatchFrom", "name", event.target.value)} className={inputClass} />
                          </ProformaField>
                          <ProformaField label="GSTIN">
                            <input value={proformaForm.dispatchFrom.gstin} onChange={(event) => updateProformaParty("dispatchFrom", "gstin", event.target.value)} className={inputClass} />
                          </ProformaField>
                          <div className="md:col-span-2">
                            <ProformaField label="Address" required>
                              <textarea value={proformaForm.dispatchFrom.address} onChange={(event) => updateProformaParty("dispatchFrom", "address", event.target.value)} className={`${inputClass} min-h-24 resize-y`} />
                            </ProformaField>
                          </div>
                          <ProformaField label="State">
                            <input value={proformaForm.dispatchFrom.state} onChange={(event) => updateProformaParty("dispatchFrom", "state", event.target.value)} className={inputClass} />
                          </ProformaField>
                        </div>
                      ) : null}

                      {activeProformaSection === "buyer" ? (
                        <div className="grid gap-4 md:grid-cols-2">
                          <ProformaField label="Name" required>
                            <input value={proformaForm.billTo.name} onChange={(event) => updateProformaParty("billTo", "name", event.target.value)} className={inputClass} placeholder="ARCHIMEDES GREEN ENERGY(S)P LTD" />
                          </ProformaField>
                          <ProformaField label="Company">
                            <input value={proformaForm.billTo.company ?? ""} onChange={(event) => updateProformaParty("billTo", "company", event.target.value)} className={inputClass} />
                          </ProformaField>
                          <div className="md:col-span-2">
                            <ProformaField label="Address">
                              <textarea value={proformaForm.billTo.address} onChange={(event) => updateProformaParty("billTo", "address", event.target.value)} className={`${inputClass} min-h-24 resize-y`} />
                            </ProformaField>
                          </div>
                          <ProformaField label="GSTIN/UIN">
                            <input value={proformaForm.billTo.gstin} onChange={(event) => updateProformaParty("billTo", "gstin", event.target.value)} className={inputClass} />
                          </ProformaField>
                          <ProformaField label="State">
                            <input value={proformaForm.billTo.state} onChange={(event) => updateProformaParty("billTo", "state", event.target.value)} className={inputClass} />
                          </ProformaField>
                        </div>
                      ) : null}

                      {activeProformaSection === "consignee" ? (
                        <div className="grid gap-4 md:grid-cols-2">
                          <ProformaField label="Name">
                            <input value={proformaForm.shipTo.name} onChange={(event) => updateProformaParty("shipTo", "name", event.target.value)} className={inputClass} placeholder="Ship to / Consignee" />
                          </ProformaField>
                          <ProformaField label="GSTIN">
                            <input value={proformaForm.shipTo.gstin} onChange={(event) => updateProformaParty("shipTo", "gstin", event.target.value)} className={inputClass} />
                          </ProformaField>
                          <div className="md:col-span-2">
                            <ProformaField label="Address">
                              <textarea value={proformaForm.shipTo.address} onChange={(event) => updateProformaParty("shipTo", "address", event.target.value)} className={`${inputClass} min-h-24 resize-y`} />
                            </ProformaField>
                          </div>
                          <ProformaField label="State">
                            <input value={proformaForm.shipTo.state} onChange={(event) => updateProformaParty("shipTo", "state", event.target.value)} className={inputClass} />
                          </ProformaField>
                        </div>
                      ) : null}

                      {activeProformaSection === "items" ? (
                        <div className="space-y-4">
                          {proformaForm.items.map((item, index) => (
                            <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                              <div className="mb-3 flex items-center justify-between gap-3">
                                <p className="text-sm font-semibold text-slate-900">Item {index + 1}</p>
                                <button type="button" onClick={() => removeProformaItem(item.id)} disabled={proformaForm.items.length === 1} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-white text-rose-600 disabled:opacity-40" title="Remove item">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                              <div className="grid gap-4 md:grid-cols-2">
                                <div className="md:col-span-2">
                                  <ProformaField label="Product Description" required>
                                    <textarea value={item.description} onChange={(event) => updateProformaItem(item.id, "description", event.target.value)} className={`${inputClass} min-h-20 resize-y bg-white`} placeholder="C & Z Purlins..." />
                                  </ProformaField>
                                </div>
                                <ProformaField label="HSN/SAC">
                                  <input value={item.hsnSac} onChange={(event) => updateProformaItem(item.id, "hsnSac", event.target.value)} className={inputClass} placeholder="72103090" />
                                </ProformaField>
                                <ProformaField label="UOM">
                                  <input value={item.uom} onChange={(event) => updateProformaItem(item.id, "uom", event.target.value)} className={inputClass} placeholder="Kgs" />
                                </ProformaField>
                                <ProformaField label="Quantity" required>
                                  <input type="number" min={0.01} step="0.01" value={item.quantity} onChange={(event) => updateProformaItem(item.id, "quantity", event.target.value)} className={inputClass} />
                                </ProformaField>
                                <ProformaField label="Rate" required>
                                  <input type="number" min={0.01} step="0.01" value={item.rate} onChange={(event) => updateProformaItem(item.id, "rate", event.target.value)} className={inputClass} />
                                </ProformaField>
                                <ProformaField label="Tax %">
                                  <input type="number" min={0} step="0.01" value={item.taxPercent} onChange={(event) => updateProformaItem(item.id, "taxPercent", event.target.value)} className={inputClass} />
                                </ProformaField>
                                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Line Total</p>
                                  <p className="mt-1 text-sm font-bold text-slate-900">
                                    {formatCurrency(calculateLineTotal({
                                      quantity: positiveNumberValue(item.quantity, 0),
                                      rate: positiveNumberValue(item.rate, 0),
                                      taxPercent: numberValue(item.taxPercent, 0),
                                    }), proformaForm.currency || "INR")}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                          <button type="button" onClick={addProformaItem} className="inline-flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-100">
                            <Plus className="h-4 w-4" />
                            Add Item
                          </button>
                        </div>
                      ) : null}

                      {activeProformaSection === "bank" ? (
                        <div className="grid gap-4 md:grid-cols-2">
                          <ProformaField label="A/C No.">
                            <input value={proformaForm.bankDetails.accountNumber} onChange={(event) => updateProformaBankField("accountNumber", event.target.value)} className={inputClass} />
                          </ProformaField>
                          <ProformaField label="Bank">
                            <input value={proformaForm.bankDetails.bank} onChange={(event) => updateProformaBankField("bank", event.target.value)} className={inputClass} />
                          </ProformaField>
                          <ProformaField label="Branch">
                            <input value={proformaForm.bankDetails.branch} onChange={(event) => updateProformaBankField("branch", event.target.value)} className={inputClass} />
                          </ProformaField>
                          <ProformaField label="IFSC">
                            <input value={proformaForm.bankDetails.ifsc} onChange={(event) => updateProformaBankField("ifsc", event.target.value)} className={inputClass} />
                          </ProformaField>
                          <ProformaField label="A/C Type">
                            <input value={proformaForm.bankDetails.accountType} onChange={(event) => updateProformaBankField("accountType", event.target.value)} className={inputClass} />
                          </ProformaField>
                        </div>
                      ) : null}

                      {activeProformaSection === "terms" ? (
                        <div className="space-y-4">
                          <ProformaField label="Terms & Conditions">
                            <textarea value={proformaForm.terms} onChange={(event) => updateProformaField("terms", event.target.value)} className={`${inputClass} min-h-32 resize-y`} placeholder="One term per line" />
                          </ProformaField>
                          <ProformaField label="Note">
                            <textarea value={proformaForm.notes} onChange={(event) => updateProformaField("notes", event.target.value)} className={`${inputClass} min-h-24 resize-y`} placeholder="Internal note or customer-facing remark" />
                          </ProformaField>
                        </div>
                      ) : null}
                    </div>
                  </section>

                  <aside className="hidden min-h-0 bg-white xl:block">
                    <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Preview</p>
                        <p className="mt-1 text-xs text-slate-500">{proformaForm.proformaNumber}</p>
                      </div>
                      <Eye className="h-4 w-4 text-slate-400" />
                    </div>
                    <div className="h-[calc(100%-57px)] overflow-auto bg-[#e9e2cf] p-4">
                      <div className="origin-top-left scale-[0.45]">
                        <ProformaInvoiceDocument document={proformaDraftDocument} />
                      </div>
                    </div>
                  </aside>
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowProformaForm(false);
                      setProformaFormError(null);
                    }}
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
              </div>
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
