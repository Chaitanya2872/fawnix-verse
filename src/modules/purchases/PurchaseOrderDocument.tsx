import type { ReactNode } from "react";
import acsLogo from "@/assets/purchase-order/ACS_logo.png";
import acsSeal from "@/assets/purchase-order/ACS_seal.png";
import iotiqLogo from "@/assets/purchase-order/IOTIQ_logo.png";

type PartyDetails = {
  name: string;
  addressLines: string[];
  gst?: string | null;
  pan?: string | null;
  contactName?: string | null;
  contactNumber?: string | null;
};

export type PurchaseOrderDocumentItem = {
  id: string;
  description: string;
  make?: string | null;
  hsnOrSku?: string | null;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
};

export type PurchaseOrderDocumentData = {
  template?: "ACS" | "IOTIQ";
  poNumber: string;
  poDate?: string | null;
  project?: string | null;
  deliveryPlace?: string | null;
  requisitionNumber?: string | null;
  vendorQuoteReference?: string | null;
  deliveryDate?: string | null;
  referenceDate?: string | null;
  paymentMode?: string | null;
  warranty?: string | null;
  stateCode?: string | null;
  preparedBy?: string | null;
  status?: string | null;
  approvalInformation?: string | null;
  contactName?: string | null;
  contactNumber?: string | null;
  mailId?: string | null;
  vendorPan?: string | null;
  companyCin?: string | null;
  buyer: PartyDetails;
  vendor: PartyDetails;
  shipTo: PartyDetails;
  billTo: PartyDetails;
  items: PurchaseOrderDocumentItem[];
  subtotal: number;
  igstAmount?: number;
  cgstAmount?: number;
  sgstAmount?: number;
  otherCharges?: number;
  grandTotal: number;
  amountInWords?: string | null;
  terms?: Array<{ title: string; body: string }>;
  importantNote?: string | null;
  paymentTerms?: string | null;
  deliveryTerms?: string | null;
  vendorQuoteNotes?: string | null;
  internalNotes?: string | null;
};

const DEFAULT_COMPANY_CIN = "CIN NO. U72200TG2018PTC126920";

const DEFAULT_IOTIQ_TERMS = [
  { title: "Taxes & Duties", body: "The quoted Price is inclusive of GST. At present GST will be 18%." },
  { title: "Freight", body: "Freight charges are EXTRA." },
  { title: "Payment Terms", body: "100% advance against PI." },
  { title: "Transport & Insurance", body: "Vendor Scope." },
  { title: "Validity", body: "Our Offer is valid up to 1 Day." },
  { title: "Delivery", body: "Immediate." },
  { title: "Warranty", body: "As per OEM." },
];

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function displayGst(value?: string | null) {
  if (!value) return "-";
  return value.toLowerCase().startsWith("gst") ? value : `GST No. ${value}`;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <div className="border-r border-black px-2 py-1.5 font-semibold">{label}</div>
      <div className="px-2 py-1.5">{children}</div>
    </>
  );
}

export function PurchaseOrderDocument({ document }: { document: PurchaseOrderDocumentData }) {
  const isAcs = document.template === "ACS";
  const logoSrc = isAcs ? acsLogo : iotiqLogo;
  const logoAlt = isAcs ? "ACS Technologies logo" : "IOTIQ logo";
  const terms = document.terms?.length ? document.terms : DEFAULT_IOTIQ_TERMS;
  const igstAmount = document.igstAmount ?? 0;
  const cgstAmount = document.cgstAmount ?? 0;
  const sgstAmount = document.sgstAmount ?? 0;
  const otherCharges = document.otherCharges ?? 0;
  const amountInWords = document.amountInWords || `INR ${formatCurrency(document.grandTotal)} only`;

  return (
    <div className="quotation-sheet mx-auto bg-white text-[10px] leading-tight text-black">
      <div className="border-2 border-black">
        <div className="grid grid-cols-[180px_1fr] border-b-2 border-black">
          <div className="flex items-center justify-center border-r-2 border-black p-1.5">
            <img src={logoSrc} alt={logoAlt} className="h-[84px] w-auto max-w-full object-contain" />
          </div>
          <div className="px-4 py-3 text-center">
            <p className="text-base font-bold uppercase tracking-wide">{document.buyer.name}</p>
            {document.buyer.addressLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
            <p className="mt-1 font-semibold">{document.companyCin || DEFAULT_COMPANY_CIN}</p>
            <p className="font-semibold">{displayGst(document.buyer.gst)}</p>
          </div>
        </div>

        <div className="border-b-2 border-black bg-[#f3dfb7] px-3 py-1.5 text-center text-[12px] font-bold uppercase tracking-[0.18em]">
          PURCHASE ORDER
        </div>

        <div className="grid grid-cols-2 border-b-2 border-black">
          <div className="border-r-2 border-black">
            <div className="border-b border-black bg-slate-100 px-2 py-1.5 font-bold uppercase">Vendor Details</div>
            <div className="p-2 leading-5">
              <p className="font-semibold">{document.vendor.name || "-"}</p>
              {document.vendor.addressLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
              <p className="mt-1">{displayGst(document.vendor.gst)}</p>
              {isAcs ? (
                <>
                  <p>PAN: {document.vendor.pan || document.vendorPan || "-"}</p>
                  <p>Contact Name: {document.vendor.contactName || "-"}</p>
                  <p>Contact No.: {document.vendor.contactNumber || "-"}</p>
                </>
              ) : null}
            </div>
          </div>
          <div>
            <div className="border-b border-black bg-slate-100 px-2 py-1.5 font-bold uppercase">PO Details</div>
            <div className="grid grid-cols-[150px_1fr] divide-y divide-black">
              <Row label={isAcs ? "PO No." : "Purchase Order Number"}>{document.poNumber}</Row>
              <Row label="PO Date">{formatDate(document.poDate)}</Row>
              <Row label="Project">{document.project || "-"}</Row>
              <Row label={isAcs ? "Reference" : "Vendor PI / Quote Number"}>{document.vendorQuoteReference || "-"}</Row>
              <Row label="Contact Name">{document.contactName || "-"}</Row>
              <Row label={isAcs ? "Contact No." : "Contact Number"}>{document.contactNumber || "-"}</Row>
              {!isAcs ? (
                <>
                  <Row label="Mail ID">{document.mailId || "-"}</Row>
                  <Row label="Reference Date">{formatDate(document.referenceDate)}</Row>
                  <Row label="Prepared By">{document.preparedBy || "Logged-in User"}</Row>
                  <Row label="Status">{document.status || "-"}</Row>
                  <Row label="Approval Information">{document.approvalInformation || "-"}</Row>
                </>
              ) : null}
            </div>
          </div>
        </div>

        {!isAcs ? (
          <div className="grid grid-cols-2 border-b-2 border-black">
            <div className="border-r-2 border-black">
              <div className="border-b border-black bg-slate-100 px-2 py-1.5 font-bold uppercase">Shipping Address Details</div>
              <div className="min-h-[78px] p-2 leading-5">
                {document.shipTo.addressLines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </div>
            <div>
              <div className="border-b border-black bg-slate-100 px-2 py-1.5 font-bold uppercase">Billing To Details</div>
              <div className="p-2 leading-5">
                <p className="font-semibold">{document.billTo.name}</p>
                {document.billTo.addressLines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
                <p>{displayGst(document.billTo.gst)}</p>
                <p>Contact Person: {document.billTo.contactName || "-"}</p>
                <p>Contact Number: {document.billTo.contactNumber || "-"}</p>
              </div>
            </div>
          </div>
        ) : null}

        <table className="w-full border-collapse text-[9px]">
          <thead>
            <tr className="bg-[#f8ecd1]">
              {(isAcs
                ? ["S.No.", "Description", "HSN", "UoM", "Qty", "Rate/ Unit (Rs)", "Amount (Rs)"]
                : ["S.No", "Description", "Make", "HSN Code", "Qty", "UOM", "Rate", "Amount (INR)"]
              ).map((heading) => (
                <th key={heading} className="border border-black px-1.5 py-1 text-left font-semibold">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {document.items.map((item, index) => (
              <tr key={item.id}>
                <td className="border border-black px-1.5 py-1">{index + 1}</td>
                <td className="whitespace-pre-line border border-black px-1.5 py-1">{item.description}</td>
                {!isAcs ? <td className="border border-black px-1.5 py-1">{item.make || "-"}</td> : null}
                <td className="border border-black px-1.5 py-1">{item.hsnOrSku || "-"}</td>
                {isAcs ? (
                  <>
                    <td className="border border-black px-1.5 py-1">{item.unit}</td>
                    <td className="border border-black px-1.5 py-1">{item.quantity}</td>
                  </>
                ) : (
                  <>
                    <td className="border border-black px-1.5 py-1">{item.quantity}</td>
                    <td className="border border-black px-1.5 py-1">{item.unit}</td>
                  </>
                )}
                <td className="border border-black px-1.5 py-1 text-right">{formatCurrency(item.rate)}</td>
                <td className="border border-black px-1.5 py-1 text-right">{formatCurrency(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="grid grid-cols-[1fr_260px] border-b-2 border-black">
          <div className="border-r-2 border-black p-2">
            <p className="font-bold uppercase">Amount in Words</p>
            <p className="mt-1 min-h-[42px] leading-5">{amountInWords}</p>
          </div>
          <div>
            {[
              ...(isAcs
                ? [
                    ["Total Amount Before Tax", document.subtotal],
                    ["CGST ", cgstAmount],
                    ["SGST ", sgstAmount],
                    ["Add: IGST", igstAmount],

                    ["Others", otherCharges],
                    ["Total  Amount after Tax in Rs.", document.grandTotal],
                  ]
                : [
                    ["Basic Value", document.subtotal],
                    ["Add: CGST @ 9%", cgstAmount],
                    ["Add: SGST @ 9%", sgstAmount],
                    ["Add: IGST", igstAmount],

                    ["Total Purchase Order Value", document.grandTotal],
                  ]),
            ].map(([label, value]) => (
              <div key={label as string} className="grid grid-cols-[1fr_105px] border-b border-black last:border-b-0">
                <div className="px-2 py-1.5 font-semibold">{label}</div>
                <div className="border-l border-black px-2 py-1.5 text-right font-semibold">{formatCurrency(value as number)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-b-2 border-black p-2">
          <p className="font-bold uppercase">Terms & Conditions:</p>
          <div className="mt-1 space-y-0.5">
            {terms.map((term, index) => (
              <div key={term.title} className="grid grid-cols-[24px_130px_1fr]">
                <span>{index + 1}.</span>
                <span className="font-semibold">{term.title}:</span>
                <span className="whitespace-pre-line">{term.body}</span>
              </div>
            ))}
          </div>
        </div>

        {isAcs && document.importantNote ? (
          <div className="border-b-2 border-black bg-amber-50 px-2 py-1.5 font-semibold">{document.importantNote}</div>
        ) : null}

        <div className="grid grid-cols-[1fr_220px]">
          <div className="p-2" />
          <div className="border-l-2 border-black p-2 text-center">
            <p className="font-semibold">For {isAcs ? "ACS Technologies Ltd" : "IOTIQ Innovations Pvt. Ltd."}</p>
            {isAcs ? (
              <div className="flex h-16 items-center justify-center">
                <img src={acsSeal} alt="ACS seal" className="h-16 w-16 object-contain" />
              </div>
            ) : (
              <div className="h-14" />
            )}
            <p className="font-semibold">{isAcs ? "Authorised Signatory" : "Authorized Signatory"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
