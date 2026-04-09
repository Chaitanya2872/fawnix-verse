import type { Quote } from "./types";

type SalesRepDetails = {
  name: string;
  email?: string | null;
};

const COMPANY = {
  issuingLabel: "IOTIQ INNOVATIONS PVT LTD",
  subtitle: "EXPERIENCE THE FUTURE OF LIVING",
  addressLines: [
    "1st Floor, Dwaraka Central",
    "Plot No. 57, Hitech City Road",
    "VIP Hills, Jaihind Enclave, Madhapur",
    "Hyderabad - 500081, India",
  ],
  phone: "Ph. No.: 9706139943",
  email: "Email: chandra.shekhar@iotiq.co.in",
  accountName: "IOTIQ INNOVATIONS PVT LTD BANK DETAILS",
  bankDetails: [
    ["Account Number", "43884151275"],
    ["Bank", "SBI"],
    ["Branch", "HDFC HILLS / TECHNO ROAD"],
    ["IFSC", "SBIN0020828"],
    ["Type of Account", "CC"],
  ],
  paymentTerms: [
    "Bank transfer (IMPS / NEFT / RTGS) whichever is suitable.",
    "UPI / Cash / Card / POS is now available for local invoicing.",
    "Quotation validity subject to product availability at the time of confirmation.",
    "Cash only is applicable above options and is not possible against an official cash receipt.",
  ],
  inclusions: [
    ["Taxes", "Inclusive"],
    ["Warranty", "1 year"],
    ["Delivery Charges", "Included and as mentioned above"],
    ["Delivery", "10 days"],
  ],
  terms: [
    "50% advance along with PO, 50% against delivery / completion.",
    "The warranty period starts after successful installation.",
    "Any changes after order confirmation may revise pricing and execution time.",
    "All payments should be completed before product handover or software activation.",
    "Once an order is confirmed, advance payment made against the order will not be refunded.",
  ],
};

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(value);
}

function buildSubject(quote: Quote) {
  const firstUsefulItem =
    quote.items.find((item) => item.utility?.trim())?.utility ??
    quote.items.find((item) => item.name?.trim())?.name ??
    "Smart Home System";
  return `Proposal for the implementation of ${firstUsefulItem}`;
}

export function QuotationDocument({
  quote,
  salesRep,
}: {
  quote: Quote;
  salesRep?: SalesRepDetails | null;
}) {
  return (
    <div className="quotation-sheet mx-auto bg-white text-[10px] leading-tight text-black">
      <div className="border border-black">
        <img
          src="/quotation-assets/IOTIQ_header.png"
          alt="IOTIQ Header"
          className="h-[168px] w-full object-contain"
        />

        <div className="grid grid-cols-[1fr_220px] border-t border-black bg-[#111111] text-white">
          <div className="border-r border-black px-3 py-1.5 font-bold uppercase tracking-wide">
            Quotation
          </div>
          <div className="px-3 py-1.5 text-right text-[10px]">
            {quote.quoteNumber}
          </div>
        </div>

        <div className="grid grid-cols-[1fr_250px] border-t border-black">
          <div className="border-r border-black px-3 py-2">
            <p className="font-semibold">{quote.customerName}</p>
            <p>{quote.company ?? "-"}</p>
            <p>{quote.email ?? "-"}</p>
            <p>{quote.phone ?? "-"}</p>
          </div>
          <div className="px-3 py-2 text-right text-[10px]">
            {COMPANY.addressLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
            <p className="mt-1">{COMPANY.phone}</p>
          </div>
        </div>

        <div className="border-t border-black px-3 py-2">
          <div className="flex items-center justify-center gap-4">
            <div className="h-10 w-px bg-black" />
            <img
              src="/quotation-assets/IOTIQ_text.png"
              alt="IOTIQ"
              className="h-10 object-contain"
            />
          </div>
        </div>

        <div className="grid grid-cols-[1fr_240px] border-y border-black bg-[#ead6a3]">
          <div className="border-r border-black px-3 py-1 text-center font-semibold">
            Sub: {buildSubject(quote)}
          </div>
          <div className="px-3 py-1 text-right text-[10px]">
            Date: {formatDate(quote.createdAt)}
          </div>
        </div>

        <div className="px-3 py-3">
          <p>Dear Sir,</p>
          <p className="mt-2">
            We are pleased to submit our proposal for the implementation as per site
            requirement and discussion below.
          </p>
        </div>

        <table className="w-full border-collapse text-[9px]">
          <thead>
            <tr className="bg-[#e2c988] font-semibold">
              {["S.No", "Product Description", "Make", "Qty", "Unit Price", "Line Total", "Product Utility"].map((heading) => (
                <th key={heading} className="border border-black px-1.5 py-1 text-left">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {quote.items.map((item, index) => (
              <tr key={item.id} className="align-top">
                <td className="border border-black px-1.5 py-1">{index + 1}</td>
                <td className="border border-black px-1.5 py-1">
                  <p className="font-semibold">{item.name}</p>
                  <p>{item.description ?? "-"}</p>
                </td>
                <td className="border border-black px-1.5 py-1">{item.make ?? "-"}</td>
                <td className="border border-black px-1.5 py-1">{item.quantity}</td>
                <td className="border border-black px-1.5 py-1">
                  {formatCurrency(item.unitPrice)}
                </td>
                <td className="border border-black px-1.5 py-1">
                  {formatCurrency(item.lineTotal)}
                </td>
                <td className="border border-black px-1.5 py-1">{item.utility ?? "-"}</td>
              </tr>
            ))}
            <tr>
              <td className="border border-black px-1.5 py-1 text-right font-semibold" colSpan={5}>
                Sub Total
              </td>
              <td className="border border-black px-1.5 py-1 font-semibold">
                {formatCurrency(quote.subtotal)}
              </td>
              <td className="border border-black px-1.5 py-1" />
            </tr>
            <tr>
              <td className="border border-black px-1.5 py-1 text-right font-semibold" colSpan={5}>
                Discount
              </td>
              <td className="border border-black px-1.5 py-1 font-semibold">
                {formatCurrency(quote.discountTotal)}
              </td>
              <td className="border border-black px-1.5 py-1" />
            </tr>
            <tr className="bg-[#f3e2b7]">
              <td className="border border-black px-1.5 py-1 text-right font-bold" colSpan={5}>
                Total
              </td>
              <td className="border border-black px-1.5 py-1 font-bold">
                {formatCurrency(quote.total)}
              </td>
              <td className="border border-black px-1.5 py-1" />
            </tr>
          </tbody>
        </table>

        <div className="grid grid-cols-[240px_1fr] border-t border-black">
          <div className="border-r border-black p-3">
            <p className="mb-2 font-semibold">Payment</p>
            <img
              src="/quotation-assets/payment_QR.png"
              alt="Payment QR"
              className="h-24 w-24 border border-black object-contain"
            />
            <div className="mt-2 flex items-center gap-2">
              <img
                src="/quotation-assets/UPI_mark.jpg"
                alt="UPI"
                className="h-7 object-contain"
              />
              <p className="text-[10px] text-slate-700">Scan to pay securely</p>
            </div>

            <div className="mt-3 space-y-1 text-[9px]">
              {COMPANY.inclusions.map(([label, value]) => (
                  <div key={label} className="grid grid-cols-[110px_1fr] gap-2">
                  <span className="font-semibold">{label}</span>
                  <span>{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3">
            <p className="mb-2 font-semibold">Payment mode</p>
            <div className="space-y-1 text-[9px]">
              {COMPANY.paymentTerms.map((term) => (
                <p key={term}>{term}</p>
              ))}
            </div>
            <div className="mt-4">
              <p className="font-semibold">Terms & Conditions</p>
              <ol className="mt-2 list-decimal space-y-1 pl-4 text-[9px]">
                {COMPANY.terms.map((term) => (
                  <li key={term}>{term}</li>
                ))}
              </ol>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_180px_1fr] border-t border-black">
          <div className="p-3">
            <p className="font-semibold">Customer Signature</p>
            <div className="mt-7 border-t border-dashed border-slate-500" />
          </div>
          <div className="flex items-center justify-center border-x border-black p-3">
            <img
              src="/quotation-assets/IOTIQ_stamp.png"
              alt="IOTIQ Stamp"
              className="h-20 object-contain opacity-90"
            />
          </div>
          <div className="p-3">
            <p className="mb-2 font-semibold">{COMPANY.accountName}</p>
            <div className="space-y-1 text-[9px]">
              {COMPANY.bankDetails.map(([label, value]) => (
                <div key={label} className="grid grid-cols-[120px_1fr] gap-2">
                  <span className="font-semibold">{label}</span>
                  <span>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_1fr] border-t border-black">
          <div className="border-r border-black p-3 text-[9px]">
            <p>Prepared By</p>
            <p className="mt-1 font-semibold">{salesRep?.name ?? "IOTIQ Sales Team"}</p>
            <p>{salesRep?.email ?? COMPANY.email}</p>
          </div>
          <div className="p-3 text-right text-[9px]">
            <p>{COMPANY.issuingLabel}</p>
            <p>{COMPANY.subtitle}</p>
            <p className="mt-1">Valid Until: {formatDate(quote.validUntil)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
