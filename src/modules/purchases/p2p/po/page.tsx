import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
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
import acsLogo from "@/assets/purchase-order/ACS_logo.png";
import acsSeal from "@/assets/purchase-order/ACS_seal.png";
import iotiqStamp from "@/assets/purchase-order/IOTIQ_stamp.svg";
import iotiqLogo from "@/assets/purchase-order/IOTIQ_logo.png";
import { PurchaseOrderDocument, type PurchaseOrderDocumentData } from "@/modules/purchases/PurchaseOrderDocument";
import { usePurchaseOrders, usePurchaseRequisitions, useVendors } from "@/modules/purchases/hooks";
import type { PurchaseOrder, PurchaseOrderStatus, PurchaseRequisition, Vendor } from "@/modules/purchases/types";
import { P2PCard, P2PFormField, P2PLayout, P2PStatusBadge, P2PTable } from "../components";

type PoLineItemDraft = {
  id: string;
  productName: string;
  sku: string;
  category: string;
  customValues: Record<string, string>;
  unit: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

type PoItemColumnDraft = {
  id: string;
  label: string;
};

type PoTermDraft = {
  id: string;
  title: string;
  body: string;
};

type PoDraftDetails = {
  vendorName: string;
  vendorAddress: string;
  vendorGst: string;
  vendorPan: string;
  vendorContactName: string;
  vendorContactNumber: string;
  contactName: string;
  contactNumber: string;
  mailId: string;
  referenceDate: string;
  shippingAddress: string;
  otherCharges: string;
  igstAmount: string;
  igstAmountMode: "AUTO" | "MANUAL";
  preparedBy: string;
  status: string;
  approvalInformation: string;
};

type PoTemplate = "ACS" | "IOTIQ";

type PoTemplateDraft = {
  purchaseRequisitionId: string;
  vendorId: string;
  orderDate: string;
  project: string;
  vendorQuoteReference: string;
  poDraftDetails: PoDraftDetails;
  poTerms: PoTermDraft[];
  poItemColumns: PoItemColumnDraft[];
  poLineItems: PoLineItemDraft[];
};

const IOTIQ_TAX_RATE = 0.18;
const ACS_IGST_RATE = 0.18;
const ACS_TAX_RATE = 0.09;

const IOTIQ_COMPANY = {
  name: "IOTIQ Innovations Private Limited",
  addressLines: [
    "Level 7, Pardhas Picasa Building, Durgam Charuvu Road",
    "Madhapur, Hyderabad, Telangana, India - 500081",
  ],
  cin: "CIN NO. U72200TG2018PTC126920",
  gst: "GST No. 36AAECI9929F1Z9",
};

const IOTIQ_BILLING = {
  name: "IOTIQ Innovations Private Limited",
  addressLines: [
    "Level 7, Pardha Picasa Building, Durgam Charuvu Road",
    "Madhapur, Hyderabad, Telangana, India - 500081",
  ],
  gst: "GST No. 36AAECI9929F1Z9",
  contactName: "Siva Kumari",
  contactNumber: "9848106345",
};

const IOTIQ_TERMS = [
  { title: "Taxes & Duties", body: "The quoted Price is inclusive of GST. At present GST will be 18%." },
  { title: "Freight", body: "Freight charges are EXTRA." },
  { title: "Payment Terms", body: "100% advance against PI." },
  { title: "Transport & Insurance", body: "Vendor Scope." },
  { title: "Validity", body: "Our Offer is valid up to 1 Day." },
  { title: "Delivery", body: "Immediate." },
  { title: "Warranty", body: "As per OEM." },
];

const ACS_COMPANY = {
  name: "ACS Technologies Limited",
  addressLines: [
      "Level 7, Pardha Picasa Building, Durgam Charuvu Road",
    "Madhapur, Hyderabad, Telangana, India - 500081",
    
  ],
  cin: "CIN :   L62099TG1993PLC015268",
  gst: "GSTIN.No-36AAACL4102B3Z9",
};

const ACS_TERMS = [
  {
    title: "Delivery Schedule",
    body: "Within 04-06 weeks from the date of receipt of approved documents along with MFC/RDSO Call Letter. Delay in delivery will attract LD charges of 1% per week to maximum 5% of contract value.",
  },
  {
    title: "Price Basis",
    body: "FOR Site Basis. The given prices are firm and no escalation is allowed during the period of order.",
  },
  { title: "Duties, Octroi & Cess", body: "Inclusive" },
  { title: "Taxes", body: "As mentioned above" },
  { title: "Payment terms", body: "1 Crore Advance against the PO acceptance and remaining in 15 Days" },
  { title: "Inspection", body: "Third party Inspection( RITES/RDSO) call shall be raised by M/s. SANNVERSE ALTIS JV" },
  {
    title: "Material Quality",
    body: "Consequences of Deviation: If the supplied material fails to meet the required RDSO standards, if any short fall of the document it will be rejected. All expenses arising due to such deviation including inspection charges, administrative overheads, transportation charges, etc. will be debited to the account of M/s. SANVERSE. Replacement of rejected material must be immediate and treated as priority.",
  },
  {
    title: "Billing Address",
    body: "M/s.ACS TECHNOLOGIES LIMITED. 1st Floor, Building, Opp: District Vikalang Puranaravas Kendra, Kalyanapura Road, Near Anas River, Rangapura, Badkuwa, Jhabua, Madhya Pradesh, 457661. GST No: 23AAACL4102B1ZI",
  },
  {
    title: "Consignee Name & Delivery Address",
    body: "M/s. SANNVERSE ALTIS JV. C/O Pati Kallu, 730, Ghoradongri,Sarni road, Betul Madhya Pradesh-460443. Contact Person - Mrityunjay Singh - 9835058603. GST No: 23ACJAS5308K1Z9",
  },
  { title: "Test Certificates", body: "Vendor shall dispatch the materials up on receipt dispatch clearance from M/s. SANNVERSE ALTIS JV." },
  {
    title: "Documents required",
    body: "Original Tax Invoice, LR copy, Delivery Challan, and MTC are required for bill booking and payment. Soft copy shall be mailed to info@sasiottechnologies.com.",
  },
  {
    title: "Dispatch Clearence",
    body: "Vendor shall dispatch the materials up on receipt dispatch clearance from M/s. SANNVERSE ALTIS JV/M/s. ACS TECHNOLOGIES LIMITED.",
  },
  { title: "Warranty", body: "30 Months from the date of dispatch or 24 months from date of comissioning of material whichever is earlier." },
  {
    title: "TCS",
    body: "TCS Under Section 206C (1H) Of the Income Tax Act,1961, on sale Of goods Will be collected As per Application Law.",
  },
  { title: "Compliance to specification", body: "You shall comply with the agreed specifications" },
  {
    title: "Force majeure",
    body: "Neither supplier nor buyer shall be considered in default in performance of contractual obligations as long as performance is prevented or delayed by force majeure conditions notified within one week with supporting documents.",
  },
  {
    title: "Termination of order on default",
    body: "If the supplier fails to deliver the goods within the time period specified or fails any obligation under the Purchase Order, the Buyer may terminate the order after fifteen days' notice of default.",
  },
  {
    title: "Arbitration and Jurisdiction",
    body: "Any dispute or differences arising out of the Purchase Order shall be referred to arbitration in accordance with the Arbitration and conciliation Act 1996. Area of jurisdiction shall be Hyderabad, India.",
  },
];

const PO_TEMPLATE_OPTIONS: Array<{ code: PoTemplate; label: string; companyName: string; accent: string }> = [
  { code: "ACS", label: "ACS", companyName: ACS_COMPANY.name, accent: "border-emerald-500 bg-emerald-50 text-emerald-700" },
  { code: "IOTIQ", label: "IOTIQ", companyName: IOTIQ_COMPANY.name, accent: "border-blue-500 bg-blue-50 text-blue-700" },
];

function createTermsDraft(template: PoTemplate): PoTermDraft[] {
  const sourceTerms = template === "ACS" ? ACS_TERMS : IOTIQ_TERMS;
  return sourceTerms.map((term, index) => ({
    id: `${template}-${index}-${crypto.randomUUID()}`,
    title: term.title,
    body: term.body,
  }));
}

const IOTIQ_BUYER = {
  name: IOTIQ_COMPANY.name,
  addressLines: IOTIQ_COMPANY.addressLines,
  gst: IOTIQ_COMPANY.gst,
  contactName: IOTIQ_BILLING.contactName,
  contactNumber: IOTIQ_BILLING.contactNumber,
};

const ACS_BUYER = {
  name: ACS_COMPANY.name,
  addressLines: ACS_COMPANY.addressLines,
  gst: ACS_COMPANY.gst,
  contactName: "Mrs. Siva Kumari",
  contactNumber: "9848106345",
};

const SHIP_TO = { ...IOTIQ_BUYER, contactName: "Warehouse Operations" };

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

function formatEditableAmount(value: number) {
  return Number.isFinite(value) ? value.toFixed(2) : "0.00";
}

function calculatePurchaseOrderTaxes(template: PoTemplate, subtotal: number, details: PoDraftDetails) {
  const igstAmount =
    template === "IOTIQ"
      ? details.igstAmountMode === "MANUAL"
        ? parseAmountInput(details.igstAmount || "")
        : subtotal * IOTIQ_TAX_RATE
      : subtotal * ACS_IGST_RATE;
  const cgstAmount = subtotal * ACS_TAX_RATE;
  const sgstAmount = subtotal * ACS_TAX_RATE;
  const otherCharges = template === "ACS" ? Number(details.otherCharges || 0) : 0;
  const grandTotal = subtotal + igstAmount + cgstAmount + sgstAmount + otherCharges;

  return {
    igstAmount,
    cgstAmount,
    sgstAmount,
    otherCharges,
    grandTotal,
  };
}

const SMALL_NUMBERS = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];

const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function numberBelowThousandToWords(value: number) {
  const normalized = Math.floor(value);
  const hundred = Math.floor(normalized / 100);
  const remainder = normalized % 100;
  const parts: string[] = [];

  if (hundred) parts.push(`${SMALL_NUMBERS[hundred]} Hundred`);
  if (remainder < 20) {
    if (remainder) parts.push(SMALL_NUMBERS[remainder]);
  } else {
    const ten = Math.floor(remainder / 10);
    const one = remainder % 10;
    parts.push([TENS[ten], SMALL_NUMBERS[one]].filter(Boolean).join(" "));
  }

  return parts.join(" ");
}

function numberToIndianWords(value: number) {
  const rounded = Math.round(Math.max(value, 0) * 100) / 100;
  const rupees = Math.floor(rounded);
  const paise = Math.round((rounded - rupees) * 100);
  const scales = [
    { value: 10000000, label: "Crore" },
    { value: 100000, label: "Lakh" },
    { value: 1000, label: "Thousand" },
    { value: 1, label: "" },
  ];
  let remainder = rupees;
  const parts: string[] = [];

  scales.forEach((scale) => {
    const count = Math.floor(remainder / scale.value);
    if (!count) return;
    remainder %= scale.value;
    parts.push(`${numberBelowThousandToWords(count)}${scale.label ? ` ${scale.label}` : ""}`);
  });

  const rupeeWords = parts.length ? parts.join(" ") : "Zero";
  const paiseWords = paise ? ` and ${numberBelowThousandToWords(paise)} Paise` : "";
  return `${rupeeWords} Rupees${paiseWords} Only`;
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

function calculateLineTotal(item: Pick<PoLineItemDraft, "quantity" | "unitPrice">) {
  return Number(item.quantity || 0) * Number(item.unitPrice || 0);
}

function parseAmountInput(value: string) {
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function createLineItemDraft(item?: PurchaseRequisition["items"][number] | null): PoLineItemDraft {
  const quantity = item?.quantity ?? 1;
  const unitPrice = item?.estimatedUnitPrice ?? 0;
  return {
    id: item?.id ?? crypto.randomUUID(),
    productName: item?.productName ?? "",
    sku: item?.sku ?? "",
    category: item?.category ?? "",
    customValues: {},
    unit: item?.unit ?? "Nos",
    quantity,
    unitPrice,
    lineTotal: calculateLineTotal({ quantity, unitPrice }),
  };
}

function splitAddressLines(value: string, fallback: string[]) {
  const lines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.length ? lines : fallback;
}

function vendorAddressText(vendor?: Vendor | null) {
  if (!vendor) return "";
  return [
    vendor.addressLine1,
    vendor.addressLine2,
    [vendor.city, vendor.state].filter(Boolean).join(", "),
    [vendor.country, vendor.postalCode].filter(Boolean).join(" - "),
  ]
    .filter((value): value is string => !!value && !!value.trim())
    .join("\n");
}

function createDefaultPoDraftDetails(template: PoTemplate = "IOTIQ", vendor?: Vendor | null): PoDraftDetails {
  return {
    vendorName: vendor?.vendorName ?? "",
    vendorAddress: vendorAddressText(vendor),
    vendorGst: vendor?.taxIdentifier ?? "",
    vendorPan: "",
    vendorContactName: vendor?.vendorName ?? "",
    vendorContactNumber: vendor?.phone ?? "",
    contactName: "",
    contactNumber: "",
    mailId: "",
    referenceDate: new Date().toISOString().slice(0, 10),
    shippingAddress:
      template === "ACS"
        ? "M/s. SANNVERSE ALTIS JV.\nC/O Pati Kallu, 730, Ghoradongri,Sarni road,\nBetul Madhya Pradesh-460443\nContact Person - Mrityunjay Singh - 9835058603\nGST No: 23ACJAS5308K1Z9"
        : IOTIQ_COMPANY.addressLines.join("\n"),
    otherCharges: "0",
    igstAmount: "",
    igstAmountMode: "AUTO",
    preparedBy: "Logged-in User",
    status: "Draft",
    approvalInformation: "Pending approval",
  };
}

function createTemplateDraft(template: PoTemplate): PoTemplateDraft {
  return {
    purchaseRequisitionId: "",
    vendorId: "",
    orderDate: new Date().toISOString().slice(0, 10),
    project: "",
    vendorQuoteReference: "",
    poDraftDetails: createDefaultPoDraftDetails(template),
    poTerms: createTermsDraft(template),
    poItemColumns: [],
    poLineItems: [],
  };
}

function createInitialTemplateDrafts(): Record<PoTemplate, PoTemplateDraft> {
  return {
    ACS: createTemplateDraft("ACS"),
    IOTIQ: createTemplateDraft("IOTIQ"),
  };
}

function financialYearCode(date = new Date()) {
  const startYear = date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
  return `${String(startYear).slice(-2)}-${String(startYear + 1).slice(-2)}`;
}

function draftPoNumber(requisition?: PurchaseRequisition | null, template: PoTemplate = "IOTIQ") {
  if (template === "ACS") return `ACS/${financialYearCode()}/${requisition?.prNumber ?? "DRAFT"}`;
  return `DRAFT-${new Date().getFullYear()}-${requisition?.prNumber ?? "PO"}`;
}

function recalculateLineItem(item: PoLineItemDraft): PoLineItemDraft {
  return {
    ...item,
    lineTotal: calculateLineTotal(item),
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
  template: PoTemplate,
  requisition: PurchaseRequisition,
  vendor: Vendor | null | undefined,
  orderDate: string,
  project: string,
  vendorQuoteReference: string,
  details: PoDraftDetails,
  terms: PoTermDraft[],
  itemColumns: PoItemColumnDraft[] = [],
  lineItems?: PoLineItemDraft[]
): PurchaseOrderDocumentData {
  const documentItems = lineItems?.length ? lineItems : requisition.items.map(createLineItemDraft);
  const subtotal = documentItems.reduce((sum, item) => sum + calculateLineTotal(item), 0);
  const { igstAmount, cgstAmount, sgstAmount, otherCharges, grandTotal } = calculatePurchaseOrderTaxes(template, subtotal, details);
  const fallbackVendor = vendorParty(vendor);
  const buyer = template === "ACS" ? ACS_BUYER : IOTIQ_BUYER;
  const company = template === "ACS" ? ACS_COMPANY : IOTIQ_COMPANY;
  return {
    template,
    poNumber: draftPoNumber(requisition, template),
    poDate: orderDate,
    project,
    requisitionNumber: requisition.prNumber,
    vendorQuoteReference,
    referenceDate: details.referenceDate,
    preparedBy: details.preparedBy,
    status: details.status,
    approvalInformation: details.approvalInformation,
    contactName: details.contactName,
    contactNumber: details.contactNumber,
    mailId: details.mailId,
    vendorPan: details.vendorPan,
    stateCode: company.gst,
    companyCin: company.cin,
    buyer,
    vendor: {
      name: details.vendorName.trim() || fallbackVendor.name,
      addressLines: splitAddressLines(details.vendorAddress, fallbackVendor.addressLines),
      gst: details.vendorGst.trim() || fallbackVendor.gst,
      pan: details.vendorPan,
      contactName: template === "ACS" ? details.vendorContactName : details.contactName,
      contactNumber: template === "ACS" ? details.vendorContactNumber : details.contactNumber,
    },
    shipTo: {
      name: "Shipping Address Details",
      addressLines: splitAddressLines(details.shippingAddress, company.addressLines),
    },
    billTo: template === "ACS" ? ACS_BUYER : IOTIQ_BILLING,
    customItemColumns: itemColumns.map((column, index) => ({
      id: column.id,
      label: column.label.trim() || `Column ${index + 1}`,
    })),
    items: documentItems.map((item) => ({
      id: item.id,
      description: item.productName,
      make: item.category,
      hsnOrSku: item.sku,
      customValues: item.customValues,
      quantity: item.quantity,
      unit: item.unit,
      rate: item.unitPrice,
      amount: calculateLineTotal(item),
    })),
    subtotal,
    igstAmount,
    cgstAmount,
    sgstAmount,
    otherCharges,
    grandTotal,
    amountInWords: numberToIndianWords(grandTotal),
    terms: terms.map((term) => ({ title: term.title, body: term.body })),
    internalNotes: requisition.purpose || undefined,
  };
}

function orderDoc(order: PurchaseOrder): PurchaseOrderDocumentData {
  return {
    template: "IOTIQ",
    poNumber: order.poNumber,
    poDate: order.orderDate,
    project: "-",
    requisitionNumber: order.requisitionNumber,
    vendorQuoteReference: "-",
    referenceDate: order.createdAt,
    preparedBy: "Logged-in User",
    status: order.status,
    approvalInformation: order.status === "RECEIVED" ? "Received" : "Issued from approved requisition",
    stateCode: IOTIQ_COMPANY.gst,
    companyCin: IOTIQ_COMPANY.cin,
    buyer: IOTIQ_BUYER,
    vendor: vendorParty(order.vendor),
    shipTo: SHIP_TO,
    billTo: IOTIQ_BILLING,
    items: order.items.map((item) => ({
      id: item.id,
      description: item.productName,
      make: item.category,
      hsnOrSku: item.sku,
      quantity: item.quantity,
      unit: item.unit,
      rate: item.unitPrice,
      amount: item.lineTotal,
    })),
    subtotal: order.totalAmount,
    grandTotal: order.totalAmount,
    igstAmount: 0,
    cgstAmount: 0,
    sgstAmount: 0,
    amountInWords: numberToIndianWords(order.totalAmount),
    terms: IOTIQ_TERMS,
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

  return createPortal(
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
    </div>,
    document.body
  );
}

function CreatePurchaseOrderPanel({
  approvedRequisitions,
  vendors,
  selectedTemplate,
  purchaseRequisitionId,
  vendorId,
  orderDate,
  project,
  vendorQuoteReference,
  poDraftDetails,
  terms,
  itemColumns,
  lineItems,
  selectedRequisition,
  selectedVendor,
  onClose,
  onSelectedTemplateChange,
  onPurchaseRequisitionIdChange,
  onVendorIdChange,
  onOrderDateChange,
  onProjectChange,
  onVendorQuoteReferenceChange,
  onPoDraftDetailsChange,
  onTermsChange,
  onItemColumnsChange,
  onLineItemsChange,
  onGenerate,
}: {
  approvedRequisitions: PurchaseRequisition[];
  vendors: Vendor[];
  selectedTemplate: PoTemplate;
  purchaseRequisitionId: string;
  vendorId: string;
  orderDate: string;
  project: string;
  vendorQuoteReference: string;
  poDraftDetails: PoDraftDetails;
  terms: PoTermDraft[];
  itemColumns: PoItemColumnDraft[];
  lineItems: PoLineItemDraft[];
  selectedRequisition: PurchaseRequisition | null;
  selectedVendor: Vendor | null;
  onClose: () => void;
  onSelectedTemplateChange: (value: PoTemplate) => void;
  onPurchaseRequisitionIdChange: (value: string) => void;
  onVendorIdChange: (value: string) => void;
  onOrderDateChange: (value: string) => void;
  onProjectChange: (value: string) => void;
  onVendorQuoteReferenceChange: (value: string) => void;
  onPoDraftDetailsChange: (value: PoDraftDetails) => void;
  onTermsChange: (value: PoTermDraft[]) => void;
  onItemColumnsChange: (value: PoItemColumnDraft[]) => void;
  onLineItemsChange: (value: PoLineItemDraft[]) => void;
  onGenerate: () => void;
}) {
  const [showValidation, setShowValidation] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const company = selectedTemplate === "ACS" ? ACS_COMPANY : IOTIQ_COMPANY;
  const billing = selectedTemplate === "ACS" ? ACS_BUYER : IOTIQ_BILLING;
  const basicValue = lineItems.reduce((sum, item) => sum + calculateLineTotal(item), 0);
  const taxes = calculatePurchaseOrderTaxes(selectedTemplate, basicValue, poDraftDetails);
  const { igstAmount, cgstAmount, sgstAmount, grandTotal: totalPurchaseOrderValue } = taxes;
  const amountInWords = numberToIndianWords(totalPurchaseOrderValue);
  const poNumber = draftPoNumber(selectedRequisition, selectedTemplate);
  const requiresMake = selectedTemplate === "IOTIQ";
  const hasInvalidLineItems =
    lineItems.length === 0 ||
    lineItems.some(
      (item) =>
        !item.productName.trim() ||
        (requiresMake && !item.category.trim()) ||
        !item.sku.trim() ||
        !item.unit.trim() ||
        Number(item.quantity) <= 0 ||
        Number(item.unitPrice) <= 0
    );
  const missingFields = [
    !purchaseRequisitionId ? "Approved Requisition" : "",
    !vendorId ? "Vendor Record" : "",
    !poDraftDetails.vendorName.trim() ? "Vendor Name" : "",
    !poDraftDetails.vendorAddress.trim() ? "Vendor Address" : "",
    !poDraftDetails.vendorGst.trim() ? "Vendor GST Number" : "",
    selectedTemplate === "ACS" && !poDraftDetails.vendorPan.trim() ? "Vendor PAN" : "",
    selectedTemplate === "ACS" && !poDraftDetails.vendorContactName.trim() ? "Vendor Contact Name" : "",
    selectedTemplate === "ACS" && !poDraftDetails.vendorContactNumber.trim() ? "Vendor Contact Number" : "",
    !orderDate ? "PO Date" : "",
    !project.trim() ? "Project" : "",
    !poDraftDetails.contactName.trim() ? "Contact Name" : "",
    !poDraftDetails.contactNumber.trim() ? "Contact Number" : "",
    selectedTemplate === "IOTIQ" && !poDraftDetails.mailId.trim() ? "Mail ID" : "",
    !vendorQuoteReference.trim() ? (selectedTemplate === "ACS" ? "Reference" : "Vendor PI / Quote Number") : "",
    selectedTemplate === "IOTIQ" && !poDraftDetails.shippingAddress.trim() ? "Shipping Address Details" : "",
    hasInvalidLineItems ? "Complete Item Details" : "",
  ].filter(Boolean);
  const canGenerate = missingFields.length === 0;
  const sheetInputClass = "w-full border-0 bg-transparent px-2 py-1.5 text-[12px] text-slate-950 outline-none ring-0 placeholder:text-slate-400 focus:bg-amber-50";
  const sheetTextareaClass = `${sheetInputClass} min-h-[76px] resize-none leading-5`;
  const readonlyValueClass = "min-h-[30px] px-2 py-1.5 text-[12px] leading-5 text-slate-900";

  function updateDraftDetail(key: keyof PoDraftDetails, value: string) {
    onPoDraftDetailsChange({ ...poDraftDetails, [key]: value });
  }

  function updateDraftDetails(patch: Partial<PoDraftDetails>) {
    onPoDraftDetailsChange({ ...poDraftDetails, ...patch });
  }

  function updateLineItem(itemId: string, patch: Partial<PoLineItemDraft>) {
    onLineItemsChange(lineItems.map((item) => (item.id === itemId ? recalculateLineItem({ ...item, ...patch }) : item)));
  }

  function updateItemColumn(columnId: string, patch: Partial<PoItemColumnDraft>) {
    onItemColumnsChange(itemColumns.map((column) => (column.id === columnId ? { ...column, ...patch } : column)));
  }

  function addItemColumn() {
    onItemColumnsChange([
      ...itemColumns,
      {
        id: `item-column-${crypto.randomUUID()}`,
        label: `Column ${itemColumns.length + 1}`,
      },
    ]);
  }

  function deleteItemColumn(columnId: string) {
    onItemColumnsChange(itemColumns.filter((column) => column.id !== columnId));
    onLineItemsChange(
      lineItems.map((item) => {
        const customValues = { ...item.customValues };
        delete customValues[columnId];
        return { ...item, customValues };
      })
    );
  }

  function updateLineItemCustomValue(itemId: string, columnId: string, value: string) {
    onLineItemsChange(
      lineItems.map((item) =>
        item.id === itemId
          ? {
              ...item,
              customValues: {
                ...item.customValues,
                [columnId]: value,
              },
            }
          : item
      )
    );
  }

  function updateTerm(termId: string, patch: Partial<PoTermDraft>) {
    onTermsChange(terms.map((term) => (term.id === termId ? { ...term, ...patch } : term)));
  }

  function addTermRow() {
    onTermsChange([...terms, { id: `${selectedTemplate}-term-${crypto.randomUUID()}`, title: "", body: "" }]);
  }

  function deleteTermRow(termId: string) {
    onTermsChange(terms.filter((term) => term.id !== termId));
  }

  function handleSaveDraft() {
    setShowValidation(false);
    setDraftSavedAt(new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }));
  }

  function handleGeneratePo() {
    if (!canGenerate) {
      setShowValidation(true);
      return;
    }
    setShowValidation(false);
    onGenerate();
  }

  function renderVendorDetails() {
    return (
      <div className="border-r-2 border-slate-950">
        <div className="border-b border-slate-950 bg-slate-100 px-3 py-2 font-bold uppercase">Vendor Details:</div>
        <div className="grid grid-cols-[170px_1fr] divide-y divide-slate-300">
          <div className="border-r border-slate-300 px-3 py-2 font-semibold">Vendor Name</div>
          <input value={poDraftDetails.vendorName} onChange={(event) => updateDraftDetail("vendorName", event.target.value)} placeholder="Enter vendor name" className={sheetInputClass} />
          <div className="border-r border-slate-300 px-3 py-2 font-semibold">Vendor Address</div>
          <textarea value={poDraftDetails.vendorAddress} onChange={(event) => updateDraftDetail("vendorAddress", event.target.value)} placeholder="Enter vendor address" className={sheetTextareaClass} />
          <div className="border-r border-slate-300 px-3 py-2 font-semibold">Vendor GST Number</div>
          <input value={poDraftDetails.vendorGst} onChange={(event) => updateDraftDetail("vendorGst", event.target.value)} placeholder="Enter vendor GST number" className={sheetInputClass} />
          {selectedTemplate === "ACS" ? (
            <>
              <div className="border-r border-slate-300 px-3 py-2 font-semibold">PAN</div>
              <input value={poDraftDetails.vendorPan} onChange={(event) => updateDraftDetail("vendorPan", event.target.value)} placeholder="Enter vendor PAN" className={sheetInputClass} />
              <div className="border-r border-slate-300 px-3 py-2 font-semibold">Contact Name</div>
              <input value={poDraftDetails.vendorContactName} onChange={(event) => updateDraftDetail("vendorContactName", event.target.value)} placeholder="Enter vendor contact name" className={sheetInputClass} />
              <div className="border-r border-slate-300 px-3 py-2 font-semibold">Contact No.</div>
              <input value={poDraftDetails.vendorContactNumber} onChange={(event) => updateDraftDetail("vendorContactNumber", event.target.value)} placeholder="Enter vendor contact number" className={sheetInputClass} />
            </>
          ) : null}
        </div>
      </div>
    );
  }

  function renderPoDetails() {
    return (
      <div>
        <div className="border-b border-slate-950 bg-slate-100 px-3 py-2 font-bold uppercase">PO Details</div>
        <div className="grid grid-cols-[190px_1fr] divide-y divide-slate-300">
          <div className="border-r border-slate-300 px-3 py-2 font-semibold">{selectedTemplate === "ACS" ? "PO No." : "Purchase Order Number"}</div>
          <div className={readonlyValueClass}>{poNumber}</div>
          <div className="border-r border-slate-300 px-3 py-2 font-semibold">PO Date</div>
          <input type="date" value={orderDate} onChange={(event) => onOrderDateChange(event.target.value)} className={sheetInputClass} />
          <div className="border-r border-slate-300 px-3 py-2 font-semibold">Project</div>
          <input value={project} onChange={(event) => onProjectChange(event.target.value)} placeholder="Enter project" className={sheetInputClass} />
          <div className="border-r border-slate-300 px-3 py-2 font-semibold">{selectedTemplate === "ACS" ? "Reference" : "Vendor PI / Quote Number"}</div>
          <input value={vendorQuoteReference} onChange={(event) => onVendorQuoteReferenceChange(event.target.value)} placeholder={selectedTemplate === "ACS" ? "Enter reference" : "Enter PI / quote number"} className={sheetInputClass} />
          <div className="border-r border-slate-300 px-3 py-2 font-semibold">Contact Name</div>
          <input value={poDraftDetails.contactName} onChange={(event) => updateDraftDetail("contactName", event.target.value)} placeholder="Enter contact name" className={sheetInputClass} />
          <div className="border-r border-slate-300 px-3 py-2 font-semibold">Contact No.</div>
          <input value={poDraftDetails.contactNumber} onChange={(event) => updateDraftDetail("contactNumber", event.target.value)} placeholder="Enter contact number" className={sheetInputClass} />
          {selectedTemplate === "IOTIQ" ? (
            <>
              <div className="border-r border-slate-300 px-3 py-2 font-semibold">Mail ID</div>
              <input type="email" value={poDraftDetails.mailId} onChange={(event) => updateDraftDetail("mailId", event.target.value)} placeholder="Enter mail ID" className={sheetInputClass} />
            </>
          ) : null}
        </div>
      </div>
    );
  }

  function renderItemTable() {
    const leadingColumns = selectedTemplate === "ACS" ? ["S.No.", "Description", "HSN"] : ["S.No", "Description", "Make", "HSN Code"];
    const trailingColumns = selectedTemplate === "ACS" ? ["UoM", "Qty", "Rate/ Unit (Rs)", "Amount (Rs)"] : ["Qty", "UOM", "Rate", "Amount (INR)"];
    const totalColumnCount = leadingColumns.length + itemColumns.length + trailingColumns.length;
    return (
      <div className="border-b-2 border-slate-950">
        <div className="flex items-center justify-between border-b border-slate-950 bg-slate-100 px-3 py-2">
          <span className="font-bold uppercase">Item Details</span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={addItemColumn} className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50">
              <Plus className="h-3.5 w-3.5" />
              Add Column
            </button>
            <button type="button" onClick={() => onLineItemsChange([...lineItems, createLineItemDraft(null)])} className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50">
              <Plus className="h-3.5 w-3.5" />
              Add Item
            </button>
          </div>
        </div>
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr className="bg-[#f8ecd1]">
              {leadingColumns.map((heading) => (
                <th key={heading} className="border border-slate-950 px-2 py-2 text-left font-bold">
                  {heading}
                </th>
              ))}
              {itemColumns.map((column, index) => (
                <th key={column.id} className="min-w-[150px] border border-slate-950 px-2 py-1 text-left font-bold">
                  <div className="flex items-center gap-1">
                    <input
                      value={column.label}
                      onChange={(event) => updateItemColumn(column.id, { label: event.target.value })}
                      placeholder={`Column ${index + 1}`}
                      className="min-w-0 flex-1 border-0 bg-transparent px-1 py-1 font-bold outline-none focus:bg-amber-50"
                      aria-label={`Item column ${index + 1} name`}
                    />
                    <button type="button" onClick={() => deleteItemColumn(column.id)} className="rounded-full p-1 text-rose-600 hover:bg-rose-50" aria-label={`Remove ${column.label || `column ${index + 1}`}`}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </th>
              ))}
              {trailingColumns.map((heading) => (
                <th key={heading} className="border border-slate-950 px-2 py-2 text-left font-bold">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lineItems.length ? (
              lineItems.map((item, index) => (
                <tr key={item.id}>
                  <td className="w-[82px] border border-slate-950 px-2 py-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{index + 1}</span>
                      <button type="button" onClick={() => onLineItemsChange(lineItems.filter((entry) => entry.id !== item.id))} className="rounded-full p-1 text-rose-600 hover:bg-rose-50" aria-label={`Remove item ${index + 1}`}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                  <td className="min-w-[260px] border border-slate-950">
                    <textarea
                      rows={2}
                      value={item.productName}
                      onChange={(event) => updateLineItem(item.id, { productName: event.target.value })}
                      placeholder="Description"
                      className={`${sheetInputClass} min-h-[52px] resize-y whitespace-pre-wrap leading-5`}
                    />
                  </td>
                  {selectedTemplate === "IOTIQ" ? (
                    <td className="min-w-[140px] border border-slate-950">
                      <input value={item.category} onChange={(event) => updateLineItem(item.id, { category: event.target.value })} placeholder="Make" className={sheetInputClass} />
                    </td>
                  ) : null}
                  <td className="min-w-[130px] border border-slate-950">
                    <input value={item.sku} onChange={(event) => updateLineItem(item.id, { sku: event.target.value })} placeholder={selectedTemplate === "ACS" ? "HSN" : "HSN Code"} className={sheetInputClass} />
                  </td>
                  {itemColumns.map((column) => (
                    <td key={column.id} className="min-w-[150px] border border-slate-950">
                      <input
                        value={item.customValues[column.id] ?? ""}
                        onChange={(event) => updateLineItemCustomValue(item.id, column.id, event.target.value)}
                        placeholder={column.label || "Value"}
                        className={sheetInputClass}
                      />
                    </td>
                  ))}
                  {selectedTemplate === "ACS" ? (
                    <>
                      <td className="w-[110px] border border-slate-950">
                        <input value={item.unit} onChange={(event) => updateLineItem(item.id, { unit: event.target.value })} placeholder="UoM" className={sheetInputClass} />
                      </td>
                      <td className="w-[90px] border border-slate-950">
                        <input type="number" min={0} step="0.01" value={item.quantity} onChange={(event) => updateLineItem(item.id, { quantity: parseAmountInput(event.target.value) })} className={sheetInputClass} />
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="w-[90px] border border-slate-950">
                        <input type="number" min={0} step="0.01" value={item.quantity} onChange={(event) => updateLineItem(item.id, { quantity: parseAmountInput(event.target.value) })} className={sheetInputClass} />
                      </td>
                      <td className="w-[110px] border border-slate-950">
                        <input value={item.unit} onChange={(event) => updateLineItem(item.id, { unit: event.target.value })} placeholder="UOM" className={sheetInputClass} />
                      </td>
                    </>
                  )}
                  <td className="w-[130px] border border-slate-950">
                    <input type="number" min={0} step="0.01" value={item.unitPrice} onChange={(event) => updateLineItem(item.id, { unitPrice: parseAmountInput(event.target.value) })} className={sheetInputClass} />
                  </td>
                  <td className="w-[150px] border border-slate-950">
                    <input
                      readOnly
                      value={formatPlain(calculateLineTotal(item))}
                      className="w-full border-0 bg-slate-50 px-2 py-1.5 text-right font-semibold text-slate-950 outline-none"
                      aria-label={`Amount for item ${index + 1}`}
                    />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={totalColumnCount} className="border border-slate-950 px-4 py-10 text-center text-slate-500">
                  Select an approved requisition to load item rows, or add an item manually.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }

  function renderSummary() {
    return (
      <div className="grid grid-cols-[1fr_380px] border-b-2 border-slate-950">
        <div className="border-r-2 border-slate-950 p-3">
          <p className="font-bold uppercase">Amount in Words</p>
          <p className="mt-2 min-h-[46px] leading-5">{amountInWords}</p>
        </div>
        <div>
          {selectedTemplate === "ACS" ? (
            <>
              {[
                ["Total Amount Before Tax", basicValue],
                ["Add: CGST", cgstAmount],
                ["Add: SGST", sgstAmount],
                ["Add: IGST", igstAmount],

              ].map(([label, value]) => (
                <div key={label as string} className="grid grid-cols-[1fr_150px] border-b border-slate-950 last:border-b-0">
                  <div className="px-3 py-2 font-semibold">{label}</div>
                  <div className="border-l border-slate-950 px-3 py-2 text-right font-semibold">{formatPlain(value as number)}</div>
                </div>
              ))}
            </>
          ) : (
            <>
              <div className="grid grid-cols-[1fr_150px] border-b border-slate-950">
                <div className="px-3 py-2 font-semibold">Basic Value</div>
                <div className="border-l border-slate-950 px-3 py-2 text-right font-semibold">{formatPlain(basicValue)}</div>
              </div>
              <div className="grid grid-cols-[1fr_150px] border-b border-slate-950">
                <div className="px-3 py-2 font-semibold">Add: IGST Amount</div>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={poDraftDetails.igstAmountMode === "MANUAL" ? poDraftDetails.igstAmount || "" : formatEditableAmount(basicValue * IOTIQ_TAX_RATE)}
                  onChange={(event) =>
                    updateDraftDetails({
                      igstAmountMode: "MANUAL",
                      igstAmount: event.target.value,
                    })
                  }
                  className="border-0 border-l border-slate-950 bg-transparent px-3 py-2 text-right font-semibold outline-none focus:bg-amber-50"
                  aria-label="IGST amount"
                />
              </div>
              <div className="grid grid-cols-[1fr_150px] border-b border-slate-950">
                <div className="px-3 py-2 font-semibold">Add: CGST @ 9%</div>
                <div className="border-l border-slate-950 px-3 py-2 text-right font-semibold">{formatPlain(cgstAmount)}</div>
              </div>
              <div className="grid grid-cols-[1fr_150px] border-b border-slate-950">
                <div className="px-3 py-2 font-semibold">Add: SGST @ 9%</div>
                <div className="border-l border-slate-950 px-3 py-2 text-right font-semibold">{formatPlain(sgstAmount)}</div>
              </div>
            </>
          )}
          {selectedTemplate === "ACS" ? (
            <div className="grid grid-cols-[1fr_150px] border-b border-slate-950">
              <div className="px-3 py-2 font-semibold">Others</div>
              <input
                type="number"
                min={0}
                step="0.01"
                value={poDraftDetails.otherCharges}
                onChange={(event) => updateDraftDetail("otherCharges", event.target.value)}
                className="border-0 border-l border-slate-950 bg-transparent px-3 py-2 text-right font-semibold outline-none focus:bg-amber-50"
                aria-label="Other charges"
              />
            </div>
          ) : null}
          <div className="grid grid-cols-[1fr_150px] border-b border-slate-950 last:border-b-0">
            <div className="px-3 py-2 font-semibold">{selectedTemplate === "ACS" ? "Total  Amount after Tax in Rs." : "Total Purchase Order Value"}</div>
            <div className="border-l border-slate-950 px-3 py-2 text-right font-semibold">{formatPlain(totalPurchaseOrderValue)}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-slate-950/30 backdrop-blur-[1px]" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 flex h-full w-full flex-col border-l border-slate-200 bg-white shadow-2xl sm:w-[94vw] xl:w-[78vw] xl:max-w-[1320px]">
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Purchase Order Template</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Create PO</h2>
              <p className="mt-1 text-sm text-slate-500">Select ACS or IOTIQ, fill the editable Excel cells, then generate the matching PDF.</p>
            </div>
            <button type="button" onClick={onClose} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
              <X className="h-4 w-4" />
              Close
            </button>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {PO_TEMPLATE_OPTIONS.map((option) => {
              const active = selectedTemplate === option.code;
              return (
                <button key={option.code} type="button" onClick={() => onSelectedTemplateChange(option.code)} className={`rounded-2xl border px-4 py-3 text-left transition ${active ? option.accent : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"}`}>
                  <span className="block text-sm font-bold uppercase tracking-[0.16em]">{option.label}</span>
                  <span className="mt-1 block text-xs font-medium">{option.companyName}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
            <P2PFormField label="Approved Requisition" hint="Required to load item rows.">
              <div className="relative">
                <ShoppingCart className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select value={purchaseRequisitionId} onChange={(event) => onPurchaseRequisitionIdChange(event.target.value)} className={`${fieldShellClass()} appearance-none pl-11 pr-10`}>
                  <option value="">Select approved requisition</option>
                  {approvedRequisitions.map((requisition) => (
                    <option key={requisition.id} value={requisition.id}>
                      {requisition.prNumber} - {requisition.department}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </P2PFormField>

            <P2PFormField label="Vendor Record" hint="Auto-fills editable vendor cells.">
              <div className="relative">
                <Truck className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select value={vendorId} onChange={(event) => onVendorIdChange(event.target.value)} className={`${fieldShellClass()} appearance-none pl-11 pr-10`}>
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

            <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">Selected Vendor</p>
              <p className="mt-1 whitespace-nowrap text-sm font-semibold text-slate-900">{selectedVendor?.vendorName ?? "Not selected"}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-100 px-6 py-6">
          <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mx-auto min-w-[1060px] max-w-[1180px] border-2 border-slate-950 bg-white text-[12px] text-slate-950">
              <div className="grid grid-cols-[150px_1fr] border-b-2 border-slate-950">
                <div className="flex items-center justify-center border-r-2 border-slate-950 p-4">
                  <img
                    src={selectedTemplate === "ACS" ? acsLogo : iotiqLogo}
                    alt={`${selectedTemplate} logo`}
                    className="max-h-20 max-w-[120px] object-contain"
                  />
                </div>
                <div className="p-4 text-center">
                  <p className="text-lg font-bold uppercase tracking-wide">{company.name}</p>
                  {company.addressLines.map((line) => (
                    <p key={line} className="mt-1 leading-5">{line}</p>
                  ))}
                  <p className="mt-2 font-semibold">{company.cin}</p>
                  <p className="font-semibold">{company.gst}</p>
                </div>
              </div>

              <div className="border-b-2 border-slate-950 bg-[#f3dfb7] px-4 py-2 text-center text-base font-bold uppercase tracking-[0.18em]">PURCHASE ORDER</div>

              <div className="grid grid-cols-2 border-b-2 border-slate-950">
                {renderVendorDetails()}
                {renderPoDetails()}
              </div>

              {selectedTemplate === "IOTIQ" ? (
                <div className="grid grid-cols-2 border-b-2 border-slate-950">
                  <div className="border-r-2 border-slate-950">
                    <div className="border-b border-slate-950 bg-slate-100 px-3 py-2 font-bold uppercase">Billing To Details</div>
                    <div className="space-y-1 px-3 py-3 leading-5">
                      <p className="font-semibold">{billing.name}</p>
                      {billing.addressLines.map((line) => (
                        <p key={line}>{line}</p>
                      ))}
                      <p>{billing.gst}</p>
                      <p>Contact Person: {billing.contactName}</p>
                      <p>Contact Number: {billing.contactNumber}</p>
                    </div>
                  </div>
                  <div>
                    <div className="border-b border-slate-950 bg-slate-100 px-3 py-2 font-bold uppercase">Shipping Address Details</div>
                    <textarea value={poDraftDetails.shippingAddress} onChange={(event) => updateDraftDetail("shippingAddress", event.target.value)} placeholder="Enter shipping address details" className={`${sheetTextareaClass} min-h-[130px]`} />
                  </div>
                </div>
              ) : null}

              {renderItemTable()}
              {renderSummary()}

              <div className="border-b-2 border-slate-950 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-bold uppercase">Terms & Conditions:</p>
                  <button
                    type="button"
                    onClick={addTermRow}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Row
                  </button>
                </div>
                <div className="mt-2 grid gap-2">
                  {terms.map((term, index) => (
                    <div key={term.id} className="grid grid-cols-[34px_180px_1fr_72px] items-start gap-0 leading-5">
                      <span className="px-1 py-1.5">{index + 1}</span>
                      <input
                        value={term.title}
                        onChange={(event) => updateTerm(term.id, { title: event.target.value })}
                        className="border-0 bg-transparent px-2 py-1.5 font-semibold outline-none focus:bg-amber-50"
                        aria-label={`Term ${index + 1} title`}
                      />
                      <textarea
                        value={term.body}
                        onChange={(event) => updateTerm(term.id, { body: event.target.value })}
                        className="min-h-[46px] resize-y border-0 bg-transparent px-2 py-1.5 outline-none focus:bg-amber-50"
                        aria-label={`Term ${index + 1} matter`}
                      />
                      <button
                        type="button"
                        onClick={() => deleteTermRow(term.id)}
                        className="mx-1 mt-1 rounded-full border border-rose-200 px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-[1fr_320px]">
                <div className="p-3" />
                <div className="border-l-2 border-slate-950 p-3 text-center">
                  <p className="font-semibold">For {selectedTemplate === "ACS" ? "ACS Technologies Ltd" : "IOTIQ Innovations Pvt. Ltd."}</p>
                  {selectedTemplate === "ACS" ? (
                    <div className="flex h-20 items-center justify-center">
                      <img src={acsSeal} alt="ACS seal" className="h-20 w-20 object-contain" />
                    </div>
                  ) : (
                    <div className="flex h-20 items-center justify-center">
                      <img src={iotiqStamp} alt="IOTIQ stamp" className="h-20 w-20 object-contain" />
                    </div>
                  )}
                  <p className="font-semibold">{selectedTemplate === "ACS" ? "Authorised Signatory" : "Authorized Signatory"}</p>
                </div>
              </div>
            </div>
          </div>

          {showValidation ? <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">Complete mandatory fields before generating PO: {missingFields.join(", ")}.</div> : null}
        </div>

        <div className="border-t border-slate-200 bg-white px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total Purchase Order Value</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{formatCurrency(totalPurchaseOrderValue)}</p>
              {draftSavedAt ? <p className="mt-1 text-xs font-medium text-emerald-600">Draft saved at {draftSavedAt}</p> : null}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={handleSaveDraft} className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100">
                <FileText className="h-4 w-4" />
                Save Draft
              </button>
              <button type="button" onClick={handleGeneratePo} className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-slate-950/20 hover:bg-slate-800">
                <Printer className="h-4 w-4" />
                Generate PO
              </button>
            </div>
          </div>
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

  const [selectedTemplate, setSelectedTemplate] = useState<PoTemplate>("IOTIQ");
  const [templateDrafts, setTemplateDrafts] = useState<Record<PoTemplate, PoTemplateDraft>>(() => createInitialTemplateDrafts());
  const [preview, setPreview] = useState<{ title: string; data: PurchaseOrderDocumentData } | null>(null);
  const [isCreatePanelOpen, setIsCreatePanelOpen] = useState(false);
  const [selectedPurchaseOrderId, setSelectedPurchaseOrderId] = useState<string | null>(null);
  const [queueFilter, setQueueFilter] = useState<"ALL" | "CREATED" | "RECEIVED">("ALL");
  const [queueSearch, setQueueSearch] = useState("");

  const approvedRequisitions = useMemo(
    () => requisitions.filter((requisition) => requisition.status === "APPROVED"),
    [requisitions]
  );
  const activeDraft = templateDrafts[selectedTemplate];
  const selectedRequisition = approvedRequisitions.find((requisition) => requisition.id === activeDraft.purchaseRequisitionId) ?? null;
  const selectedVendor = vendors.find((vendor) => vendor.id === activeDraft.vendorId) ?? null;
  const selectedOrder = purchaseOrders.find((order) => order.id === selectedPurchaseOrderId) ?? null;

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

  function updateActiveDraft(patch: Partial<PoTemplateDraft> | ((draft: PoTemplateDraft) => PoTemplateDraft)) {
    setTemplateDrafts((current) => {
      const currentDraft = current[selectedTemplate];
      const nextDraft = typeof patch === "function" ? patch(currentDraft) : { ...currentDraft, ...patch };
      return { ...current, [selectedTemplate]: nextDraft };
    });
  }

  function handlePurchaseRequisitionChange(value: string) {
    const requisition = approvedRequisitions.find((entry) => entry.id === value) ?? null;
    updateActiveDraft((draft) => ({
      ...draft,
      purchaseRequisitionId: value,
      vendorId: requisition?.negotiationVendorId ?? draft.vendorId,
      poLineItems: requisition ? requisition.items.map(createLineItemDraft) : draft.poLineItems,
      poDraftDetails:
        selectedTemplate === "IOTIQ"
          ? {
              ...draft.poDraftDetails,
              igstAmount: "",
              igstAmountMode: "AUTO",
            }
          : draft.poDraftDetails,
    }));
  }

  function handleVendorChange(value: string) {
    const vendor = vendors.find((entry) => entry.id === value) ?? null;
    updateActiveDraft((draft) => ({
      ...draft,
      vendorId: value,
      poDraftDetails: vendor
        ? {
            ...draft.poDraftDetails,
            vendorName: vendor.vendorName,
            vendorAddress: vendorAddressText(vendor),
            vendorGst: vendor.taxIdentifier ?? "",
            vendorContactName: vendor.vendorName,
            vendorContactNumber: vendor.phone ?? "",
          }
        : draft.poDraftDetails,
    }));
  }

  function resetCreateForm() {
    setSelectedTemplate("IOTIQ");
    setTemplateDrafts(createInitialTemplateDrafts());
  }

  function handleTemplateChange(template: PoTemplate) {
    setSelectedTemplate(template);
  }

  function handlePreviewDraft() {
    if (!selectedRequisition) return;
    setPreview({
      title: `${draftPoNumber(selectedRequisition, selectedTemplate)} - ${selectedTemplate}`,
      data: draftDoc(
        selectedTemplate,
        selectedRequisition,
        selectedVendor,
        activeDraft.orderDate,
        activeDraft.project,
        activeDraft.vendorQuoteReference,
        activeDraft.poDraftDetails,
        activeDraft.poTerms,
        activeDraft.poItemColumns,
        activeDraft.poLineItems
      ),
    });
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
          selectedTemplate={selectedTemplate}
          purchaseRequisitionId={activeDraft.purchaseRequisitionId}
          vendorId={activeDraft.vendorId}
          orderDate={activeDraft.orderDate}
          project={activeDraft.project}
          vendorQuoteReference={activeDraft.vendorQuoteReference}
          poDraftDetails={activeDraft.poDraftDetails}
          terms={activeDraft.poTerms}
          itemColumns={activeDraft.poItemColumns}
          lineItems={activeDraft.poLineItems}
          selectedRequisition={selectedRequisition}
          selectedVendor={selectedVendor}
          onClose={() => {
            setIsCreatePanelOpen(false);
            resetCreateForm();
          }}
          onSelectedTemplateChange={handleTemplateChange}
          onPurchaseRequisitionIdChange={handlePurchaseRequisitionChange}
          onVendorIdChange={handleVendorChange}
          onOrderDateChange={(value) => updateActiveDraft({ orderDate: value })}
          onProjectChange={(value) => updateActiveDraft({ project: value })}
          onVendorQuoteReferenceChange={(value) => updateActiveDraft({ vendorQuoteReference: value })}
          onPoDraftDetailsChange={(value) => updateActiveDraft({ poDraftDetails: value })}
          onTermsChange={(value) => updateActiveDraft({ poTerms: value })}
          onItemColumnsChange={(value) => updateActiveDraft({ poItemColumns: value })}
          onLineItemsChange={(value) => updateActiveDraft({ poLineItems: value })}
          onGenerate={handlePreviewDraft}
        />
      ) : null}

      {preview ? <PreviewModal data={preview.data} title={preview.title} onClose={() => setPreview(null)} /> : null}
    </>
  );
}
