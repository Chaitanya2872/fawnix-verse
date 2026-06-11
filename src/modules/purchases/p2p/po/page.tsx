import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Eye,
  FileText,
  Loader2,
  PackageCheck,
  Plus,
  Printer,
  Search,
  Send,
  ShoppingCart,
  Sparkles,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import { PurchaseOrderDocument, type PurchaseOrderDocumentData } from "@/modules/purchases/PurchaseOrderDocument";
import { useCreatePurchaseOrder, usePurchaseOrders, usePurchaseRequisitions, useVendors } from "@/modules/purchases/hooks";
import type { PurchaseOrder, PurchaseOrderStatus, PurchaseRequisition, Vendor } from "@/modules/purchases/types";
import { P2PCard, P2PFormField, P2PLayout, P2PStatusBadge, P2PTable } from "../components";

type VendorQuoteDraft = {
  id: string;
  vendorId: string;
  quotedAmount: string;
  leadTimeDays: string;
  paymentTerms: string;
  remarks: string;
};

type PoLineItemDraft = {
  id: string;
  productName: string;
  sku: string;
  category: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

type PoTemplateCompany = "ACS" | "IOTIQ";

type PoTemplateConfig = {
  companyCode: PoTemplateCompany;
  companyName: string;
  companyInfo: string[];
  templateSource: string;
  sections: Array<{ title: string; fields: string[] }>;
  itemColumns: Array<{ key: string; label: string }>;
  calculations: string[];
  terms: string[];
  approvalWorkflow: string[];
};

const PO_TEMPLATE_CONFIGS: Record<PoTemplateCompany, PoTemplateConfig> = {
  ACS: {
    companyCode: "ACS",
    companyName: "ACS Technologies Limited",
    companyInfo: [
      "1st Floor, Building, Opp: District Vikalang Puranaravas Kendra",
      "Kalyanapura Road, Near Anas River, Rangapura, Badkuwa, Jhabua, Madhya Pradesh - 457661",
      "CIN: L62099TG1993PLC015268",
      "GSTIN: 23AAACL4102B1ZI",
    ],
    templateSource: "PO-25_Sannverse_redesigned_editable_fixed 3.xlsx",
    sections: [
      { title: "Company Information", fields: ["Company name", "Registered address", "CIN", "GSTIN"] },
      { title: "Purchase Order Details", fields: ["PO number", "PO date", "Project", "Reference", "Contact name", "Contact number"] },
      { title: "Vendor Details", fields: ["Vendor name", "Vendor address", "GST number", "PAN", "Vendor contact name", "Vendor contact number"] },
      { title: "Billing and Delivery Details", fields: ["Billing address", "Consignee name", "Delivery address", "Delivery contact", "Delivery GST"] },
      { title: "Tax and Charges", fields: ["Total before tax", "CGST", "SGST", "Insurance", "Grand total", "Amount in words"] },
      { title: "Signatures", fields: ["For ACS Technologies Ltd", "Authorised Signatory"] },
    ],
    itemColumns: [
      { key: "serial", label: "S.No." },
      { key: "description", label: "Description" },
      { key: "hsn", label: "HSN" },
      { key: "uom", label: "UoM" },
      { key: "quantity", label: "Qty" },
      { key: "rate", label: "Rate / Unit" },
      { key: "amount", label: "Amount" },
    ],
    calculations: ["Item total", "Total amount before tax", "CGST 9%", "SGST 9%", "Insurance", "Total amount after tax", "Amount in words"],
    terms: [
      "Delivery within 04-06 weeks from approved documents and MFC/RDSO call letter; delay attracts LD charges of 1% per week up to 5%.",
      "Price basis is FOR site and prices remain firm without escalation during the order period.",
      "Duties, octroi, cess, and taxes are inclusive or as mentioned in the PO.",
      "Payment terms: advance against PO acceptance with remaining payment as per commercial commitment.",
      "Third party inspection call by RITES/RDSO where applicable.",
      "Material must comply with required RDSO standards; rejected material must be replaced immediately at supplier cost.",
      "Original tax invoice, LR copy, delivery challan, and MTC are required for bill booking and payment.",
      "Warranty is 30 months from dispatch or 24 months from commissioning, whichever is earlier.",
      "TCS under Section 206C(1H) applies as per applicable law.",
      "Force majeure, termination, arbitration, and jurisdiction clauses apply as defined in the approved template.",
    ],
    approvalWorkflow: ["Draft", "Commercial Review", "Finance Approval", "Authorised Signatory", "Issued"],
  },
  IOTIQ: {
    companyCode: "IOTIQ",
    companyName: "IOTIQ Innovations Private Limited",
    companyInfo: [
      "Level 7, Pardhas Picasa Building, Durgam Cheruvu Road",
      "Madhapur, Hyderabad, Telangana, India - 500081",
      "CIN: 72200TG2018PTC126920",
      "GSTIN: 36AAECI9929F1Z9",
    ],
    templateSource: "PO-035_Deekay Electricals_redesigned_editable_fixed 3.xlsx",
    sections: [
      { title: "Company Information", fields: ["Company name", "Registered address", "CIN", "GST number"] },
      { title: "Purchase Order Details", fields: ["Purchase order number", "Date", "Project", "Contact name", "Contact number", "Mail ID", "Vendor PI / quote number", "Reference date"] },
      { title: "Vendor Details", fields: ["Vendor name", "Vendor address", "GST number"] },
      { title: "Shipping and Billing Details", fields: ["Shipping address", "Billing company", "Billing address", "Billing GST", "Contact person", "Contact number"] },
      { title: "Tax and Charges", fields: ["Basic value", "IGST", "CGST", "SGST", "Total purchase order value", "Amount in words"] },
      { title: "Signatures", fields: ["For IOTIQ Innovations Pvt. Ltd.", "Authorized Signature"] },
    ],
    itemColumns: [
      { key: "serial", label: "S.No." },
      { key: "description", label: "Description" },
      { key: "make", label: "Make" },
      { key: "hsn", label: "HSN Code" },
      { key: "quantity", label: "Qty" },
      { key: "uom", label: "UOM" },
      { key: "rate", label: "Rate" },
      { key: "amount", label: "Amount" },
    ],
    calculations: ["Basic value", "IGST", "CGST 9%", "SGST 9%", "Total purchase order value", "Amount in words"],
    terms: [
      "Taxes and duties: quoted price is inclusive of GST; current GST is 18%.",
      "Freight charges are extra.",
      "Payment terms: 100% advance against PI.",
      "Transport and insurance are in vendor scope.",
      "Offer validity applies as per selected quote.",
      "Delivery is immediate or as committed in the vendor quotation.",
      "Warranty is as per OEM.",
    ],
    approvalWorkflow: ["Draft", "Procurement Review", "Finance Approval", "Authorized Signature", "Issued"],
  },
};

const BUYER = {
  name: "ACS Technologies Limited",
  addressLines: ["Level 7, Pardha Picasa Building, Durgam Cheruvu Road", "Madhapur, Hyderabad, Telangana, India - 500081"],
  gst: "36AAACA4102B2S9",
  contactName: "Procurement Team",
  contactNumber: "+91 9706139943",
};

const SHIP_TO = { ...BUYER, contactName: "Warehouse Operations" };

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPlain(value: number) {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatTemplateCalculation(calculation: string, documentValue: number, estimatedTax: number, estimatedGrandTotal: number) {
  const normalized = calculation.toLowerCase();
  if (normalized.includes("amount in words")) return "Auto";
  if (normalized.includes("cgst") || normalized.includes("sgst")) return formatCurrency(estimatedTax / 2);
  if (normalized.includes("igst") || normalized.includes("tax")) return formatCurrency(estimatedTax);
  if (normalized.includes("after tax") || normalized.includes("grand") || normalized.includes("total purchase order value")) {
    return formatCurrency(estimatedGrandTotal);
  }
  if (normalized.includes("before tax") || normalized.includes("basic") || normalized.includes("item total")) {
    return formatCurrency(documentValue);
  }
  return "-";
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function fieldShellClass(disabled = false) {
  return `w-full rounded-2xl border px-4 py-3 text-sm text-slate-700 transition focus:outline-none ${
    disabled
      ? "border-slate-200 bg-slate-100 text-slate-400"
      : "border-slate-200 bg-slate-50/80 hover:border-slate-300 focus:border-blue-500 focus:bg-white"
  }`;
}

function newQuote(vendorId = "", amount = ""): VendorQuoteDraft {
  return {
    id: crypto.randomUUID(),
    vendorId,
    quotedAmount: amount,
    leadTimeDays: "",
    paymentTerms: "",
    remarks: "",
  };
}

function createLineItemDraft(item?: PurchaseRequisition["items"][number] | null): PoLineItemDraft {
  const quantity = item?.quantity ?? 1;
  const unitPrice = item?.estimatedUnitPrice ?? 0;
  return {
    id: item?.id ?? crypto.randomUUID(),
    productName: item?.productName ?? "",
    sku: item?.sku ?? "",
    category: item?.category ?? "",
    unit: item?.unit ?? "Nos",
    quantity,
    unitPrice,
    lineTotal: quantity * unitPrice,
  };
}

function recalculateLineItem(item: PoLineItemDraft): PoLineItemDraft {
  return {
    ...item,
    lineTotal: Number(item.quantity || 0) * Number(item.unitPrice || 0),
  };
}

function vendorParty(vendor?: Vendor | null) {
  if (!vendor) {
    return {
      name: "Vendor Not Selected",
      addressLines: ["Select a vendor to complete the document."],
      gst: "-",
      contactName: "-",
      contactNumber: "-",
    };
  }

  const addressLines = [
    vendor.addressLine1,
    vendor.addressLine2,
    [vendor.city, vendor.state].filter(Boolean).join(", "),
    [vendor.country, vendor.postalCode].filter(Boolean).join(" - "),
  ].filter((value): value is string => !!value && !!value.trim());

  return {
    name: vendor.vendorName,
    addressLines: addressLines.length ? addressLines : ["Address not available"],
    gst: vendor.taxIdentifier,
    contactName: vendor.vendorName,
    contactNumber: vendor.phone,
  };
}

function draftDoc(
  requisition: PurchaseRequisition,
  vendor: Vendor | null | undefined,
  orderDate: string,
  expectedDeliveryDate: string,
  project: string,
  deliveryPlace: string,
  vendorQuoteReference: string,
  paymentMode: string,
  warranty: string,
  stateCode: string,
  notes: string,
  quote?: VendorQuoteDraft | null,
  lineItems?: PoLineItemDraft[]
): PurchaseOrderDocumentData {
  const documentItems = lineItems?.length ? lineItems : requisition.items.map(createLineItemDraft);
  const subtotal = documentItems.reduce((sum, item) => sum + item.lineTotal, 0);
  return {
    poNumber: `DRAFT-${new Date().getFullYear()}-${requisition.prNumber}`,
    poDate: orderDate,
    project,
    deliveryPlace,
    requisitionNumber: requisition.prNumber,
    vendorQuoteReference,
    deliveryDate: expectedDeliveryDate || requisition.neededByDate,
    referenceDate: requisition.createdAt,
    paymentMode,
    warranty,
    stateCode,
    buyer: BUYER,
    vendor: vendorParty(vendor),
    shipTo: SHIP_TO,
    billTo: BUYER,
    items: documentItems.map((item) => ({
      id: item.id,
      description: item.productName,
      hsnOrSku: item.sku,
      quantity: item.quantity,
      unit: item.unit,
      rate: item.unitPrice,
      amount: item.lineTotal,
    })),
    subtotal,
    grandTotal: Number(quote?.quotedAmount || subtotal),
    paymentTerms: quote?.paymentTerms,
    deliveryTerms: quote?.leadTimeDays ? `Expected lead time: ${quote.leadTimeDays} day(s)` : undefined,
    vendorQuoteNotes: quote?.remarks,
    internalNotes: notes || requisition.purpose || undefined,
  };
}

function orderDoc(order: PurchaseOrder): PurchaseOrderDocumentData {
  return {
    poNumber: order.poNumber,
    poDate: order.orderDate,
    project: "-",
    deliveryPlace: "-",
    requisitionNumber: order.requisitionNumber,
    vendorQuoteReference: "-",
    deliveryDate: order.expectedDeliveryDate,
    referenceDate: order.createdAt,
    paymentMode: "-",
    warranty: "-",
    stateCode: BUYER.gst,
    buyer: BUYER,
    vendor: vendorParty(order.vendor),
    shipTo: SHIP_TO,
    billTo: BUYER,
    items: order.items.map((item) => ({
      id: item.id,
      description: item.productName,
      hsnOrSku: item.sku,
      quantity: item.quantity,
      unit: item.unit,
      rate: item.unitPrice,
      amount: item.lineTotal,
    })),
    subtotal: order.totalAmount,
    grandTotal: order.totalAmount,
    internalNotes: order.notes,
  };
}

function toneForStatus(status: PurchaseOrderStatus) {
  return status === "RECEIVED" ? "success" : "info";
}

function StatusStat({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: ReactNode;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${accent}`}>{icon}</div>
        <div>
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="text-xl font-semibold text-slate-900">{value}</p>
          {sub ? <p className="text-[11px] text-slate-500">{sub}</p> : null}
        </div>
      </div>
    </div>
  );
}

function PreviewModal({
  data,
  title,
  onClose,
}: {
  data: PurchaseOrderDocumentData;
  title: string;
  onClose: () => void;
}) {
  useEffect(() => {
    document.body.classList.add("printing-quotation");
    return () => document.body.classList.remove("printing-quotation");
  }, []);

  return (
    <div className="quotation-print-layer fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm print:static print:block print:bg-white print:p-0">
      <div className="quotation-print-root relative flex h-[92vh] w-full max-w-[1100px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-[#f5f1e6] shadow-2xl print:h-auto print:max-w-none print:rounded-none print:border-none print:bg-white print:shadow-none">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 print:hidden">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Purchase Order Preview</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">{title}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
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
          <PurchaseOrderDocument document={data} />
        </div>
      </div>
    </div>
  );
}

function CreatePurchaseOrderPanel({
  approvedRequisitions,
  vendors,
  selectedCompany,
  purchaseRequisitionId,
  vendorId,
  orderDate,
  expectedDeliveryDate,
  project,
  deliveryPlace,
  vendorQuoteReference,
  paymentMode,
  warranty,
  stateCode,
  notes,
  vendorQuotes,
  lineItems,
  selectedRequisition,
  selectedVendor,
  selectedQuote,
  bestQuoteId,
  isCreating,
  errorMessage,
  onClose,
  onSelectedCompanyChange,
  onPurchaseRequisitionIdChange,
  onVendorIdChange,
  onOrderDateChange,
  onExpectedDeliveryDateChange,
  onProjectChange,
  onDeliveryPlaceChange,
  onVendorQuoteReferenceChange,
  onPaymentModeChange,
  onWarrantyChange,
  onStateCodeChange,
  onNotesChange,
  onVendorQuotesChange,
  onLineItemsChange,
  onPreview,
  onCreate,
}: {
  approvedRequisitions: PurchaseRequisition[];
  vendors: Vendor[];
  selectedCompany: PoTemplateCompany;
  purchaseRequisitionId: string;
  vendorId: string;
  orderDate: string;
  expectedDeliveryDate: string;
  project: string;
  deliveryPlace: string;
  vendorQuoteReference: string;
  paymentMode: string;
  warranty: string;
  stateCode: string;
  notes: string;
  vendorQuotes: VendorQuoteDraft[];
  lineItems: PoLineItemDraft[];
  selectedRequisition: PurchaseRequisition | null;
  selectedVendor: Vendor | null;
  selectedQuote: VendorQuoteDraft | null;
  bestQuoteId: string | null;
  isCreating: boolean;
  errorMessage?: string;
  onClose: () => void;
  onSelectedCompanyChange: (value: PoTemplateCompany) => void;
  onPurchaseRequisitionIdChange: (value: string) => void;
  onVendorIdChange: (value: string) => void;
  onOrderDateChange: (value: string) => void;
  onExpectedDeliveryDateChange: (value: string) => void;
  onProjectChange: (value: string) => void;
  onDeliveryPlaceChange: (value: string) => void;
  onVendorQuoteReferenceChange: (value: string) => void;
  onPaymentModeChange: (value: string) => void;
  onWarrantyChange: (value: string) => void;
  onStateCodeChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onVendorQuotesChange: (value: VendorQuoteDraft[]) => void;
  onLineItemsChange: (value: PoLineItemDraft[]) => void;
  onPreview: () => void;
  onCreate: () => void;
}) {
  const template = PO_TEMPLATE_CONFIGS[selectedCompany];
  const lineItemsValue = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const documentValue = selectedQuote?.quotedAmount ? Number(selectedQuote.quotedAmount) : lineItemsValue || (selectedRequisition?.totalAmount ?? 0);
  const estimatedTax = documentValue * 0.18;
  const estimatedGrandTotal = documentValue + estimatedTax;

  function updateLineItem(itemId: string, patch: Partial<PoLineItemDraft>) {
    onLineItemsChange(
      lineItems.map((item) => (item.id === itemId ? recalculateLineItem({ ...item, ...patch }) : item))
    );
  }

  function moveLineItem(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= lineItems.length) return;
    const nextItems = [...lineItems];
    const [item] = nextItems.splice(index, 1);
    nextItems.splice(targetIndex, 0, item);
    onLineItemsChange(nextItems);
  }

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-slate-950/30 backdrop-blur-[1px]" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 flex h-full w-full flex-col border-l border-slate-200 bg-white shadow-2xl sm:w-[90vw] lg:w-[58vw] lg:max-w-[980px]">
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Purchase Order</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Create PO</h2>
              <p className="mt-1 text-sm text-slate-500">
                Select an approved PR, compare vendor commercials, and generate a document-ready purchase order.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <X className="h-4 w-4" />
              Close
            </button>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">Approved PRs</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{approvedRequisitions.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Quote Lines</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{vendorQuotes.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Selected Vendor</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{selectedVendor?.vendorName ?? "Not selected"}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
          <section className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Company Template</p>
                <h3 className="mt-2 text-lg font-semibold text-slate-900">{template.companyName}</h3>
                <p className="mt-1 text-sm text-slate-500">Loaded from {template.templateSource}</p>
                <div className="mt-3 space-y-1 text-xs leading-5 text-slate-500">
                  {template.companyInfo.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {(Object.keys(PO_TEMPLATE_CONFIGS) as PoTemplateCompany[]).map((companyCode) => {
                  const company = PO_TEMPLATE_CONFIGS[companyCode];
                  const active = selectedCompany === companyCode;
                  return (
                    <button
                      key={companyCode}
                      type="button"
                      onClick={() => onSelectedCompanyChange(companyCode)}
                      className={`rounded-2xl border px-4 py-3 text-left transition ${
                        active ? "border-blue-500 bg-white shadow-sm ring-2 ring-blue-100" : "border-slate-200 bg-white/70 hover:bg-white"
                      }`}
                    >
                      <span className="block text-sm font-semibold text-slate-900">{companyCode}</span>
                      <span className="mt-1 block text-xs text-slate-500">{company.companyName}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {template.sections.map((section) => (
                <div key={section.title} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-sm font-semibold text-slate-900">{section.title}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {section.fields.map((field) => (
                      <span key={field} className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
                        {field}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <P2PFormField label="Approved Requisition" hint="POs can only be issued from approved PRs.">
              <div className="relative">
                <ShoppingCart className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  value={purchaseRequisitionId}
                  onChange={(event) => onPurchaseRequisitionIdChange(event.target.value)}
                  className={`${fieldShellClass()} appearance-none pl-11 pr-10`}
                >
                  <option value="">Select approved requisition</option>
                  {approvedRequisitions.map((requisition) => (
                    <option key={requisition.id} value={requisition.id}>
                      {requisition.prNumber} · {requisition.department}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </P2PFormField>

            <P2PFormField label="Vendor" hint="Shortlist or override the vendor chosen in sourcing.">
              <div className="relative">
                <Truck className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  value={vendorId}
                  onChange={(event) => onVendorIdChange(event.target.value)}
                  className={`${fieldShellClass()} appearance-none pl-11 pr-10`}
                >
                  <option value="">Select vendor</option>
                  {vendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.vendorName}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </P2PFormField>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Compare Vendor Quotes</h3>
                <p className="text-xs text-slate-500">Capture multiple offers and use the best commercial line in PO preparation.</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  selectedRequisition
                    ? onVendorQuotesChange([
                        ...vendorQuotes,
                        newQuote(
                          "",
                          String(selectedRequisition.negotiatedAmount ?? selectedRequisition.totalAmount)
                        ),
                      ])
                    : null
                }
                disabled={!selectedRequisition}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Quote
              </button>
            </div>

            {!selectedRequisition ? (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
                Select an approved requisition first to compare vendor offers.
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                  <p className="text-sm font-semibold text-slate-900">{selectedRequisition.prNumber}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {selectedRequisition.department} · {selectedRequisition.items.length} item(s) · Baseline{" "}
                    {formatCurrency(selectedRequisition.totalAmount)}
                  </p>
                </div>

                {vendorQuotes.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
                    No vendor quotes added yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {vendorQuotes.map((quote) => {
                      const quoteVendor = vendors.find((vendor) => vendor.id === quote.vendorId);
                      const isBest = quote.id === bestQuoteId;
                      return (
                        <div key={quote.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-slate-900">{quoteVendor?.vendorName ?? "Vendor quote"}</p>
                              {isBest ? (
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                                  Best quote
                                </span>
                              ) : null}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                disabled={!quote.vendorId}
                                onClick={() => {
                                  onVendorIdChange(quote.vendorId);
                                  if (quote.paymentTerms || quote.remarks) {
                                    onNotesChange([quote.paymentTerms, quote.remarks].filter(Boolean).join(" | "));
                                  }
                                }}
                                className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Use For PO
                              </button>
                              <button
                                type="button"
                                onClick={() => onVendorQuotesChange(vendorQuotes.filter((entry) => entry.id !== quote.id))}
                                className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Remove
                              </button>
                            </div>
                          </div>

                          <div className="mt-3 grid gap-3 md:grid-cols-2">
                            <div className="relative">
                              <select
                                value={quote.vendorId}
                                onChange={(event) =>
                                  onVendorQuotesChange(
                                    vendorQuotes.map((entry) =>
                                      entry.id === quote.id ? { ...entry, vendorId: event.target.value } : entry
                                    )
                                  )
                                }
                                className={`${fieldShellClass()} appearance-none pr-10`}
                              >
                                <option value="">Select vendor</option>
                                {vendors.map((vendor) => (
                                  <option key={vendor.id} value={vendor.id}>
                                    {vendor.vendorName}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            </div>

                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={quote.quotedAmount}
                              onChange={(event) =>
                                onVendorQuotesChange(
                                  vendorQuotes.map((entry) =>
                                    entry.id === quote.id ? { ...entry, quotedAmount: event.target.value } : entry
                                  )
                                )
                              }
                              placeholder="Quoted amount"
                              className={fieldShellClass()}
                            />

                            <input
                              type="number"
                              min={0}
                              value={quote.leadTimeDays}
                              onChange={(event) =>
                                onVendorQuotesChange(
                                  vendorQuotes.map((entry) =>
                                    entry.id === quote.id ? { ...entry, leadTimeDays: event.target.value } : entry
                                  )
                                )
                              }
                              placeholder="Lead time in days"
                              className={fieldShellClass()}
                            />

                            <input
                              value={quote.paymentTerms}
                              onChange={(event) =>
                                onVendorQuotesChange(
                                  vendorQuotes.map((entry) =>
                                    entry.id === quote.id ? { ...entry, paymentTerms: event.target.value } : entry
                                  )
                                )
                              }
                              placeholder="Payment terms"
                              className={fieldShellClass()}
                            />

                            <textarea
                              rows={2}
                              value={quote.remarks}
                              onChange={(event) =>
                                onVendorQuotesChange(
                                  vendorQuotes.map((entry) =>
                                    entry.id === quote.id ? { ...entry, remarks: event.target.value } : entry
                                  )
                                )
                              }
                              placeholder="Remarks, warranty, inclusions, special commercial notes"
                              className={`md:col-span-2 ${fieldShellClass()}`}
                            />
                          </div>

                          <div className="mt-3 grid gap-3 md:grid-cols-3">
                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Quote Value</p>
                              <p className="mt-1 text-sm font-semibold text-slate-900">
                                {quote.quotedAmount ? formatPlain(Number(quote.quotedAmount)) : "-"}
                              </p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Lead Time</p>
                              <p className="mt-1 text-sm font-semibold text-slate-900">
                                {quote.leadTimeDays ? `${quote.leadTimeDays} days` : "-"}
                              </p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Delta vs PR</p>
                              <p className="mt-1 text-sm font-semibold text-slate-900">
                                {quote.quotedAmount
                                  ? formatCurrency(Number(quote.quotedAmount) - selectedRequisition.totalAmount)
                                  : "-"}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Line Item Details</h3>
                <p className="text-xs text-slate-500">Columns change based on the selected {selectedCompany} PO template.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!selectedRequisition}
                  onClick={() => onLineItemsChange([...lineItems, createLineItemDraft(null)])}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Item
                </button>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {template.itemColumns.map((column) => (
                      <th key={column.key} className="whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        {column.label}
                      </th>
                    ))}
                    <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {lineItems.length ? (
                    lineItems.map((item, index) => (
                      <tr key={item.id}>
                        {template.itemColumns.map((column) => {
                          const isTextField = column.key === "description" || column.key === "make" || column.key === "hsn" || column.key === "uom";
                          const textValueMap: Record<string, string> = {
                            description: item.productName,
                            make: item.category,
                            hsn: item.sku,
                            uom: item.unit,
                          };
                          return (
                            <td key={column.key} className="min-w-[120px] px-3 py-3 text-slate-700">
                              {column.key === "serial" ? (
                                <span className="text-sm font-semibold text-slate-500">{index + 1}</span>
                              ) : isTextField ? (
                                <input
                                  value={textValueMap[column.key] ?? ""}
                                  onChange={(event) =>
                                    updateLineItem(
                                      item.id,
                                      column.key === "description"
                                        ? { productName: event.target.value }
                                        : column.key === "make"
                                          ? { category: event.target.value }
                                          : column.key === "hsn"
                                            ? { sku: event.target.value }
                                            : { unit: event.target.value }
                                    )
                                  }
                                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
                                />
                              ) : column.key === "quantity" || column.key === "rate" ? (
                                <input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  value={column.key === "quantity" ? item.quantity : item.unitPrice}
                                  onChange={(event) =>
                                    updateLineItem(
                                      item.id,
                                      column.key === "quantity"
                                        ? { quantity: Number(event.target.value) }
                                        : { unitPrice: Number(event.target.value) }
                                    )
                                  }
                                  className="w-28 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
                                />
                              ) : (
                                <span className="whitespace-nowrap text-sm font-semibold text-slate-900">
                                  {formatPlain(item.lineTotal)}
                                </span>
                              )}
                            </td>
                          );
                        })}
                        <td className="whitespace-nowrap px-3 py-3 text-right">
                          <button type="button" onClick={() => moveLineItem(index, -1)} disabled={index === 0} className="mr-2 text-xs font-semibold text-slate-600 disabled:opacity-30">
                            Up
                          </button>
                          <button type="button" onClick={() => moveLineItem(index, 1)} disabled={index === lineItems.length - 1} className="mr-2 text-xs font-semibold text-slate-600 disabled:opacity-30">
                            Down
                          </button>
                          <button type="button" onClick={() => onLineItemsChange(lineItems.filter((entry) => entry.id !== item.id))} className="text-xs font-semibold text-rose-600">Delete</button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={template.itemColumns.length + 1} className="px-4 py-10 text-center text-sm text-slate-500">
                        Select an approved requisition to load line items.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <P2PFormField label="PO Date" hint="Commercial order date.">
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  value={orderDate}
                  onChange={(event) => onOrderDateChange(event.target.value)}
                  className={`${fieldShellClass()} pl-11`}
                />
              </div>
            </P2PFormField>

            <P2PFormField label="Expected Delivery Date" hint="Target supply date from vendor.">
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  value={expectedDeliveryDate}
                  onChange={(event) => onExpectedDeliveryDateChange(event.target.value)}
                  className={`${fieldShellClass()} pl-11`}
                />
              </div>
            </P2PFormField>

            <P2PFormField label="Project" hint="Optional project or cost center context.">
              <input value={project} onChange={(event) => onProjectChange(event.target.value)} placeholder="Project" className={fieldShellClass()} />
            </P2PFormField>

            <P2PFormField label="Delivery Place" hint="Delivery location printed on the PO.">
              <input
                value={deliveryPlace}
                onChange={(event) => onDeliveryPlaceChange(event.target.value)}
                placeholder="Delivery place"
                className={fieldShellClass()}
              />
            </P2PFormField>

            <P2PFormField label="Vendor PI / Quote Reference" hint="Reference used in the vendor commercial document.">
              <input
                value={vendorQuoteReference}
                onChange={(event) => onVendorQuoteReferenceChange(event.target.value)}
                placeholder="Vendor PI / Quote reference"
                className={fieldShellClass()}
              />
            </P2PFormField>

            <P2PFormField label="Payment Mode" hint="Commercial settlement mode for the PO.">
              <input
                value={paymentMode}
                onChange={(event) => onPaymentModeChange(event.target.value)}
                placeholder="Payment mode"
                className={fieldShellClass()}
              />
            </P2PFormField>

            <P2PFormField label="Warranty" hint="Product or service warranty commitment.">
              <input value={warranty} onChange={(event) => onWarrantyChange(event.target.value)} placeholder="Warranty" className={fieldShellClass()} />
            </P2PFormField>

            <P2PFormField label="State Code / GST" hint="Document tax identifier used in the PDF.">
              <input
                value={stateCode}
                onChange={(event) => onStateCodeChange(event.target.value)}
                placeholder="State code / GST"
                className={fieldShellClass()}
              />
            </P2PFormField>

            <div className="md:col-span-2">
              <P2PFormField label="Internal / Commercial Notes" hint="Delivery instructions, commitments, or billing notes.">
                <textarea
                  rows={4}
                  value={notes}
                  onChange={(event) => onNotesChange(event.target.value)}
                  placeholder="Delivery instructions, payment terms, billing notes, or vendor commitments"
                  className={fieldShellClass()}
                />
              </P2PFormField>
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-semibold text-slate-900">Terms and Conditions</p>
              <p className="mt-1 text-xs text-slate-500">Loaded from the selected company template and editable through notes before generation.</p>
              <div className="mt-4 space-y-2">
                {template.terms.map((term, index) => (
                  <div key={`${selectedCompany}-term-${index}`} className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-slate-500">{index + 1}</span>
                    <p className="text-sm leading-5 text-slate-600">{term}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-sm font-semibold text-slate-900">Tax and Charges</p>
                <div className="mt-4 space-y-2 text-sm">
                  {template.calculations.map((calculation) => (
                    <div key={calculation} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
                      <span className="text-slate-500">{calculation}</span>
                      <span className="font-semibold text-slate-900">
                        {formatTemplateCalculation(calculation, documentValue, estimatedTax, estimatedGrandTotal)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
                <p className="text-sm font-semibold text-slate-900">Approval Workflow</p>
                <div className="mt-4 space-y-2">
                  {template.approvalWorkflow.map((step, index) => (
                    <div key={step} className="flex items-center gap-3 text-sm text-slate-600">
                      <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${index === 0 ? "bg-blue-600 text-white" : "bg-white text-slate-500"}`}>
                        {index + 1}
                      </span>
                      {step}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <p className="text-sm font-semibold text-slate-900">PDF Preview</p>
                <p className="mt-2 text-sm leading-5 text-slate-600">
                  Preview uses the current PO document renderer and marks the selected template. Exact Excel-match PDF rendering can now be built against this configuration.
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Selected Requisition</p>
              {selectedRequisition ? (
                <div className="mt-2 space-y-2 text-sm text-slate-700">
                  <p>
                    <span className="text-slate-500">PR:</span> {selectedRequisition.prNumber}
                  </p>
                  <p>
                    <span className="text-slate-500">Department:</span> {selectedRequisition.department}
                  </p>
                  <p>
                    <span className="text-slate-500">Items:</span> {selectedRequisition.items.length}
                  </p>
                  <p>
                    <span className="text-slate-500">Amount:</span> {formatCurrency(selectedRequisition.totalAmount)}
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-500">Choose an approved requisition.</p>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Selected Vendor / Quote</p>
              {selectedVendor ? (
                <div className="mt-2 space-y-2 text-sm text-slate-700">
                  <p>
                    <span className="text-slate-500">Vendor:</span> {selectedVendor.vendorName}
                  </p>
                  <p>
                    <span className="text-slate-500">Email:</span> {selectedVendor.email || "-"}
                  </p>
                  <p>
                    <span className="text-slate-500">Phone:</span> {selectedVendor.phone || "-"}
                  </p>
                  <p>
                    <span className="text-slate-500">Quoted:</span>{" "}
                    {selectedQuote?.quotedAmount
                      ? formatCurrency(Number(selectedQuote.quotedAmount))
                      : formatCurrency(selectedRequisition?.totalAmount ?? 0)}
                  </p>
                  <p>
                    <span className="text-slate-500">Project:</span> {project || "-"}
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-500">Choose or apply a vendor quote.</p>
              )}
            </div>
          </section>
        </div>

        <div className="border-t border-slate-200 bg-white px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Document Value</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {formatCurrency(documentValue)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onPreview}
                disabled={!selectedRequisition}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <Eye className="h-4 w-4" />
                Preview PO
              </button>
              <button
                type="button"
                onClick={onCreate}
                disabled={!purchaseRequisitionId || !vendorId || isCreating}
                className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-50"
              >
                {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                Generate PO
              </button>
            </div>
          </div>
          {errorMessage ? <p className="mt-3 text-sm text-rose-600">{errorMessage}</p> : null}
        </div>
      </div>
    </div>
  );
}

function PurchaseOrderDetailPanel({
  order,
  onClose,
  onPreview,
}: {
  order: PurchaseOrder;
  onClose: () => void;
  onPreview: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 flex h-full w-full flex-col border-l border-slate-200 bg-white shadow-2xl sm:w-[86vw] lg:w-[56vw] lg:max-w-[920px]">
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-sm font-semibold text-slate-700">
                PO
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-semibold text-slate-900">{order.poNumber}</h2>
                  <P2PStatusBadge label={order.status} tone={toneForStatus(order.status)} />
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  {order.requisitionNumber} · {formatCurrency(order.totalAmount)} · {order.items.length} item(s)
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Vendor {order.vendor.vendorName} · PO date {formatDate(order.orderDate)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <X className="h-4 w-4" />
              Close
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
          <section className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Commercial Summary</p>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                <p>
                  <span className="text-slate-500">Vendor:</span> {order.vendor.vendorName}
                </p>
                <p>
                  <span className="text-slate-500">Requisition:</span> {order.requisitionNumber}
                </p>
                <p>
                  <span className="text-slate-500">Order Date:</span> {formatDate(order.orderDate)}
                </p>
                <p>
                  <span className="text-slate-500">Expected Delivery:</span> {formatDate(order.expectedDeliveryDate)}
                </p>
                <p>
                  <span className="text-slate-500">Amount:</span> {formatCurrency(order.totalAmount)}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Vendor Contact</p>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                <p>
                  <span className="text-slate-500">Email:</span> {order.vendor.email || "-"}
                </p>
                <p>
                  <span className="text-slate-500">Phone:</span> {order.vendor.phone || "-"}
                </p>
                <p>
                  <span className="text-slate-500">GST:</span> {order.vendor.taxIdentifier || "-"}
                </p>
                <p>
                  <span className="text-slate-500">Location:</span>{" "}
                  {[order.vendor.city, order.vendor.state, order.vendor.country].filter(Boolean).join(", ") || "-"}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-900">PO Items</h3>
            </div>
            <div className="divide-y divide-slate-200">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{item.productName}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.sku} · {item.quantity} {item.unit}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">{formatCurrency(item.lineTotal)}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatCurrency(item.unitPrice)} / unit</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {order.notes ? (
            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Notes</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">{order.notes}</p>
            </section>
          ) : null}
        </div>

        <div className="border-t border-slate-200 bg-white px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Document Total</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{formatCurrency(order.totalAmount)}</p>
            </div>
            <button
              type="button"
              onClick={onPreview}
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white"
            >
              <Eye className="h-4 w-4" />
              Preview / Print PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function P2PPurchaseOrderPage() {
  const { data: purchaseOrders = [], isLoading, isError, error } = usePurchaseOrders();
  const { data: requisitions = [] } = usePurchaseRequisitions();
  const { data: vendors = [] } = useVendors();
  const createPurchaseOrder = useCreatePurchaseOrder();

  const [selectedCompany, setSelectedCompany] = useState<PoTemplateCompany>("ACS");
  const [purchaseRequisitionId, setPurchaseRequisitionId] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [project, setProject] = useState("");
  const [deliveryPlace, setDeliveryPlace] = useState("");
  const [vendorQuoteReference, setVendorQuoteReference] = useState("");
  const [paymentMode, setPaymentMode] = useState("");
  const [warranty, setWarranty] = useState("");
  const [stateCode, setStateCode] = useState(BUYER.gst);
  const [notes, setNotes] = useState("");
  const [vendorQuotes, setVendorQuotes] = useState<VendorQuoteDraft[]>([]);
  const [poLineItems, setPoLineItems] = useState<PoLineItemDraft[]>([]);
  const [preview, setPreview] = useState<{ title: string; data: PurchaseOrderDocumentData } | null>(null);
  const [isCreatePanelOpen, setIsCreatePanelOpen] = useState(false);
  const [selectedPurchaseOrderId, setSelectedPurchaseOrderId] = useState<string | null>(null);
  const [queueFilter, setQueueFilter] = useState<"ALL" | "CREATED" | "RECEIVED">("ALL");
  const [queueSearch, setQueueSearch] = useState("");

  const approvedRequisitions = useMemo(
    () => requisitions.filter((requisition) => requisition.status === "APPROVED"),
    [requisitions]
  );
  const selectedRequisition = approvedRequisitions.find((requisition) => requisition.id === purchaseRequisitionId) ?? null;
  const selectedVendor = vendors.find((vendor) => vendor.id === vendorId) ?? null;
  const selectedQuote = vendorQuotes.find((quote) => quote.vendorId === vendorId) ?? null;
  const selectedOrder = purchaseOrders.find((order) => order.id === selectedPurchaseOrderId) ?? null;

  useEffect(() => {
    Promise.resolve().then(() => {
      if (!selectedRequisition) {
        setVendorQuotes([]);
        setVendorId("");
        setPoLineItems([]);
        return;
      }

      setPoLineItems(selectedRequisition.items.map(createLineItemDraft));

      setVendorQuotes((current) =>
        current.length
          ? current
          : [
              newQuote(
                selectedRequisition.negotiationVendorId ?? "",
                String(selectedRequisition.negotiatedAmount ?? selectedRequisition.totalAmount)
              ),
            ]
      );

      if (selectedRequisition.negotiationVendorId) {
        setVendorId(selectedRequisition.negotiationVendorId);
      }
    });
  }, [selectedRequisition]);

  const queueStats = useMemo(() => {
    const totalValue = purchaseOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    const createdOrders = purchaseOrders.filter((order) => order.status === "CREATED");
    const receivedOrders = purchaseOrders.filter((order) => order.status === "RECEIVED");
    return {
      ready: approvedRequisitions.length,
      total: purchaseOrders.length,
      received: receivedOrders.length,
      average: purchaseOrders.length ? totalValue / purchaseOrders.length : 0,
      pendingReceipt: createdOrders.length,
      totalValue,
    };
  }, [approvedRequisitions.length, purchaseOrders]);

  const bestQuoteId = useMemo(
    () =>
      vendorQuotes
        .filter((quote) => quote.vendorId && Number(quote.quotedAmount) > 0)
        .sort(
          (left, right) =>
            Number(left.quotedAmount) - Number(right.quotedAmount) ||
            Number(left.leadTimeDays || 9999) - Number(right.leadTimeDays || 9999)
        )[0]?.id ?? null,
    [vendorQuotes]
  );

  const filteredOrders = useMemo(() => {
    const search = queueSearch.trim().toLowerCase();
    return purchaseOrders.filter((order) => {
      const matchesFilter =
        queueFilter === "ALL" ? true : queueFilter === "CREATED" ? order.status === "CREATED" : order.status === "RECEIVED";

      const matchesSearch =
        !search ||
        order.poNumber.toLowerCase().includes(search) ||
        order.requisitionNumber.toLowerCase().includes(search) ||
        order.vendor.vendorName.toLowerCase().includes(search) ||
        order.status.toLowerCase().includes(search);

      return matchesFilter && matchesSearch;
    });
  }, [purchaseOrders, queueFilter, queueSearch]);

  function resetCreateForm() {
    setSelectedCompany("ACS");
    setPurchaseRequisitionId("");
    setVendorId("");
    setExpectedDeliveryDate("");
    setProject("");
    setDeliveryPlace("");
    setVendorQuoteReference("");
    setPaymentMode("");
    setWarranty("");
    setStateCode(BUYER.gst);
    setNotes("");
    setVendorQuotes([]);
    setPoLineItems([]);
  }

  function handlePreviewDraft() {
    if (!selectedRequisition) return;
    setPreview({
      title: `${selectedCompany} - ${selectedRequisition.prNumber}`,
      data: draftDoc(
        selectedRequisition,
        selectedVendor,
        orderDate,
        expectedDeliveryDate,
        project,
        deliveryPlace,
        vendorQuoteReference,
        paymentMode,
        warranty,
        stateCode,
        notes,
        selectedQuote,
        poLineItems
      ),
    });
  }

  function handleCreatePurchaseOrder() {
    if (!purchaseRequisitionId || !vendorId || !orderDate) return;
    createPurchaseOrder.mutate(
      {
        purchaseRequisitionId,
        payload: {
          vendorId,
          orderDate,
          expectedDeliveryDate: expectedDeliveryDate || undefined,
          notes: notes.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          setIsCreatePanelOpen(false);
          resetCreateForm();
        },
      }
    );
  }

  const columns = [
    { key: "poNumber", label: "PO Number" },
    { key: "requisition", label: "Requisition" },
    { key: "vendor", label: "Vendor" },
    { key: "amount", label: "Amount" },
    { key: "status", label: "Status" },
  ];

  const rows = filteredOrders.map((order) => ({
    id: order.id,
    poNumber: (
      <div className="text-left">
        <p className="font-semibold text-slate-900">{order.poNumber}</p>
        <p className="text-xs text-slate-500">
          {formatDate(order.orderDate)} · {order.items.length} item(s)
        </p>
      </div>
    ),
    requisition: order.requisitionNumber,
    vendor: order.vendor.vendorName,
    amount: formatCurrency(order.totalAmount),
    status: <P2PStatusBadge label={order.status} tone={toneForStatus(order.status)} />,
  }));

  return (
    <>
      <P2PLayout
        title="Purchase Order"
        subtitle="Review the PO register, open any order in a side panel, and issue new POs from a focused creation workspace."
        meta={
          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsCreatePanelOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Create PO
            </button>
          </div>
        }
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatusStat
            label="Approved PRs Ready"
            value={queueStats.ready}
            sub="eligible for PO creation"
            icon={<ShoppingCart className="h-4.5 w-4.5 text-sky-700" />}
            accent="bg-sky-100"
          />
          <StatusStat
            label="Issued POs"
            value={queueStats.total}
            sub={`${queueStats.pendingReceipt} awaiting receipt`}
            icon={<FileText className="h-4.5 w-4.5 text-blue-700" />}
            accent="bg-blue-100"
          />
          <StatusStat
            label="Received Orders"
            value={queueStats.received}
            sub="ready for invoice matching"
            icon={<PackageCheck className="h-4.5 w-4.5 text-emerald-700" />}
            accent="bg-emerald-100"
          />
          <StatusStat
            label="Average PO Value"
            value={formatCurrency(queueStats.average)}
            sub={queueStats.total ? `Total ${formatCurrency(queueStats.totalValue)}` : "No POs issued yet"}
            icon={<CircleDollarSign className="h-4.5 w-4.5 text-amber-700" />}
            accent="bg-amber-100"
          />
        </div>

        <P2PCard
          title="PO Queue"
          description="Filter the register, open any purchase order in-place, and preview document output without leaving the page."
          action={
            <div className="flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600">
              <Send className="h-3.5 w-3.5" />
              <span>Gateway synced</span>
              <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
            </div>
          }
          contentClassName="-mx-6 -mb-6"
        >
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2 pl-2">
              {[
                { key: "ALL", label: "All" },
                { key: "CREATED", label: "Awaiting Receipt" },
                { key: "RECEIVED", label: "Received" },
              ].map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setQueueFilter(filter.key as typeof queueFilter)}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                    queueFilter === filter.key
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <div className="relative w-full lg:mr-2 lg:w-[340px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={queueSearch}
                onChange={(event) => setQueueSearch(event.target.value)}
                placeholder="Search PO number, requisition, vendor..."
                className="w-full rounded-full border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="py-16 text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600" />
              <p className="mt-3 text-sm text-slate-500">Loading purchase orders...</p>
            </div>
          ) : isError ? (
            <div className="py-16 text-center text-sm text-rose-600">
              {error instanceof Error ? error.message : "Failed to load purchase orders."}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-16 text-center">
              <p className="text-base font-semibold text-slate-900">No purchase orders match this view.</p>
              <p className="mt-2 text-sm text-slate-500">Adjust the queue filter or search term to broaden the register.</p>
            </div>
          ) : (
            <P2PTable
              columns={columns}
              rows={rows}
              className="rounded-none border-x-0 border-b-0"
              onRowClick={(rowId) => setSelectedPurchaseOrderId(rowId)}
            />
          )}
        </P2PCard>
      </P2PLayout>

      {selectedOrder ? (
        <PurchaseOrderDetailPanel
          order={selectedOrder}
          onClose={() => setSelectedPurchaseOrderId(null)}
          onPreview={() => setPreview({ title: selectedOrder.poNumber, data: orderDoc(selectedOrder) })}
        />
      ) : null}

      {isCreatePanelOpen ? (
        <CreatePurchaseOrderPanel
          approvedRequisitions={approvedRequisitions}
          vendors={vendors}
          selectedCompany={selectedCompany}
          purchaseRequisitionId={purchaseRequisitionId}
          vendorId={vendorId}
          orderDate={orderDate}
          expectedDeliveryDate={expectedDeliveryDate}
          project={project}
          deliveryPlace={deliveryPlace}
          vendorQuoteReference={vendorQuoteReference}
          paymentMode={paymentMode}
          warranty={warranty}
          stateCode={stateCode}
          notes={notes}
          vendorQuotes={vendorQuotes}
          lineItems={poLineItems}
          selectedRequisition={selectedRequisition}
          selectedVendor={selectedVendor}
          selectedQuote={selectedQuote}
          bestQuoteId={bestQuoteId}
          isCreating={createPurchaseOrder.isPending}
          errorMessage={createPurchaseOrder.error instanceof Error ? createPurchaseOrder.error.message : undefined}
          onClose={() => {
            setIsCreatePanelOpen(false);
            if (!createPurchaseOrder.isPending) {
              resetCreateForm();
            }
          }}
          onSelectedCompanyChange={setSelectedCompany}
          onPurchaseRequisitionIdChange={setPurchaseRequisitionId}
          onVendorIdChange={setVendorId}
          onOrderDateChange={setOrderDate}
          onExpectedDeliveryDateChange={setExpectedDeliveryDate}
          onProjectChange={setProject}
          onDeliveryPlaceChange={setDeliveryPlace}
          onVendorQuoteReferenceChange={setVendorQuoteReference}
          onPaymentModeChange={setPaymentMode}
          onWarrantyChange={setWarranty}
          onStateCodeChange={setStateCode}
          onNotesChange={setNotes}
          onVendorQuotesChange={setVendorQuotes}
          onLineItemsChange={setPoLineItems}
          onPreview={handlePreviewDraft}
          onCreate={handleCreatePurchaseOrder}
        />
      ) : null}

      {preview ? <PreviewModal data={preview.data} title={preview.title} onClose={() => setPreview(null)} /> : null}
    </>
  );
}
