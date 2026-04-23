type PartyDetails = {
  name: string;
  addressLines: string[];
  gst?: string | null;
  contactName?: string | null;
  contactNumber?: string | null;
};

export type PurchaseOrderDocumentItem = {
  id: string;
  description: string;
  hsnOrSku?: string | null;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
};

export type PurchaseOrderDocumentData = {
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
  buyer: PartyDetails;
  vendor: PartyDetails;
  shipTo: PartyDetails;
  billTo: PartyDetails;
  items: PurchaseOrderDocumentItem[];
  subtotal: number;
  grandTotal: number;
  paymentTerms?: string | null;
  deliveryTerms?: string | null;
  vendorQuoteNotes?: string | null;
  internalNotes?: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", {
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

export function PurchaseOrderDocument({ document }: { document: PurchaseOrderDocumentData }) {
  return (
    <div className="quotation-sheet mx-auto bg-white text-[10px] leading-tight text-black">
      <div className="border border-black">
        <div className="grid grid-cols-[100px_1fr] border-b border-black">
          <div className="flex items-center justify-center border-r border-black p-3">
            <img src="/vite.svg" alt="Company logo" className="h-16 w-16 object-contain" />
          </div>
          <div className="px-4 py-3">
            <p className="text-lg font-bold uppercase tracking-wide text-slate-900">{document.buyer.name}</p>
            {document.buyer.addressLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
            {document.buyer.gst ? <p className="mt-1">GST: {document.buyer.gst}</p> : null}
          </div>
        </div>

        <div className="border-b border-black bg-[#f1e2b9] px-3 py-1 text-center text-[11px] font-bold uppercase">
          Purchase Order
        </div>

        <div className="grid grid-cols-[1fr_260px] border-b border-black">
          <div className="border-r border-black p-3">
            <p className="font-semibold uppercase">Vendor Details</p>
            <p className="mt-2 font-semibold">{document.vendor.name}</p>
            {document.vendor.addressLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
            {document.vendor.gst ? <p className="mt-1">GST: {document.vendor.gst}</p> : null}
            {document.vendor.contactName ? <p className="mt-2">Contact: {document.vendor.contactName}</p> : null}
            {document.vendor.contactNumber ? <p>Contact No: {document.vendor.contactNumber}</p> : null}
          </div>
          <div className="p-3">
            <div className="grid grid-cols-[110px_1fr] gap-x-2 gap-y-1">
              <span className="font-semibold">Purchase Order</span>
              <span>: {document.poNumber}</span>
              <span className="font-semibold">Date</span>
              <span>: {formatDate(document.poDate)}</span>
              <span className="font-semibold">Project</span>
              <span>: {document.project || "-"}</span>
              <span className="font-semibold">Delivery Place</span>
              <span>: {document.deliveryPlace || "-"}</span>
              <span className="font-semibold">Vendor PI/Quote No</span>
              <span>: {document.vendorQuoteReference || "-"}</span>
              <span className="font-semibold">Delivery Date</span>
              <span>: {formatDate(document.deliveryDate)}</span>
              <span className="font-semibold">Reference Date</span>
              <span>: {formatDate(document.referenceDate)}</span>
              <span className="font-semibold">PR Number</span>
              <span>: {document.requisitionNumber || "-"}</span>
              <span className="font-semibold">Payment Mode</span>
              <span>: {document.paymentMode || "-"}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 border-b border-black">
          <div className="border-r border-black p-3">
            <p className="font-semibold uppercase">Shipping Address Details</p>
            <p className="mt-2 font-semibold">{document.shipTo.name}</p>
            {document.shipTo.addressLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
            {document.shipTo.contactName ? <p className="mt-2">Contact Person: {document.shipTo.contactName}</p> : null}
            {document.shipTo.contactNumber ? <p>Contact: {document.shipTo.contactNumber}</p> : null}
          </div>
          <div className="p-3">
            <p className="font-semibold uppercase">Billing To Details</p>
            <p className="mt-2 font-semibold">{document.billTo.name}</p>
            {document.billTo.addressLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
            <p className="mt-1">State Code / GST: {document.stateCode || document.billTo.gst || "-"}</p>
            {document.billTo.contactName ? <p className="mt-2">Contact Person: {document.billTo.contactName}</p> : null}
            {document.billTo.contactNumber ? <p>Contact Number: {document.billTo.contactNumber}</p> : null}
          </div>
        </div>

        <table className="w-full border-collapse text-[9px]">
          <thead>
            <tr className="bg-[#f8f1da]">
              {["S.No", "Description", "HSN Code", "Qty", "UOM", "Rate", "Amount(INR)"].map((heading) => (
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
                <td className="border border-black px-1.5 py-1">{item.description}</td>
                <td className="border border-black px-1.5 py-1">{item.hsnOrSku || "-"}</td>
                <td className="border border-black px-1.5 py-1">{item.quantity}</td>
                <td className="border border-black px-1.5 py-1">{item.unit}</td>
                <td className="border border-black px-1.5 py-1">{formatCurrency(item.rate)}</td>
                <td className="border border-black px-1.5 py-1">{formatCurrency(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="grid grid-cols-[1fr_220px] border-b border-black">
          <div className="min-h-[90px] border-r border-black p-3">
            <p className="font-semibold">In words:</p>
            <p className="mt-1">INR {formatCurrency(document.grandTotal)} only</p>
          </div>
          <div className="p-3">
            <div className="grid grid-cols-[1fr_auto] gap-y-1">
              <span className="border-b border-black py-1 font-semibold">Basic Value</span>
              <span className="border-b border-black py-1 text-right">{formatCurrency(document.subtotal)}</span>
              <span className="border-b border-black py-1 font-semibold">Total Purchase Order Value</span>
              <span className="border-b border-black py-1 text-right font-bold">{formatCurrency(document.grandTotal)}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_1fr] border-b border-black">
          <div className="border-r border-black p-3">
            <p className="font-semibold">Terms & Conditions</p>
            <div className="mt-2 space-y-1">
              <p>
                <span className="font-semibold">Payment:</span> {document.paymentTerms || "As mutually agreed during vendor finalisation."}
              </p>
              <p>
                <span className="font-semibold">Delivery:</span> {document.deliveryTerms || "As per confirmed delivery commitment."}
              </p>
              <p>
                <span className="font-semibold">Warranty:</span> {document.warranty || "As per vendor commitment."}
              </p>
              {document.vendorQuoteNotes ? (
                <p>
                  <span className="font-semibold">Vendor Quote:</span> {document.vendorQuoteNotes}
                </p>
              ) : null}
            </div>
          </div>
          <div className="p-3">
            <p className="font-semibold">Billing / Internal Notes</p>
            <p className="mt-2 min-h-[54px]">{document.internalNotes || "Invoice should be submitted with applicable tax documents and supporting references."}</p>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_180px]">
          <div className="p-3">
            <p>For {document.buyer.name}</p>
          </div>
          <div className="p-3 text-right">
            <p className="mt-10 font-semibold">Authorized Signature</p>
          </div>
        </div>
      </div>
    </div>
  );
}
