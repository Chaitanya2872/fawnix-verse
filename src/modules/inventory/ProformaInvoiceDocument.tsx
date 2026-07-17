import acsLogo from "@/assets/purchase-order/ACS_logo.png";
import acsSeal from "@/assets/purchase-order/ACS_seal.png";

type PartyDetails = {
  name: string;
  addressLines: string[];
  gstin?: string | null;
  state?: string | null;
};

export type ProformaInvoiceDocumentItem = {
  id: string;
  description: string;
  hsnSac?: string | null;
  uom: string;
  quantity: number;
  rate: number;
  taxPercent: number;
};

export type ProformaInvoiceDocumentData = {
  proformaNumber: string;
  invoiceDate?: string | null;
  poNumber?: string | null;
  poDate?: string | null;
  projectRef?: string | null;
  ewayBillNo?: string | null;
  ewayBillDate?: string | null;
  dispatchFrom: PartyDetails;
  billTo: PartyDetails;
  shipTo: PartyDetails;
  items: ProformaInvoiceDocumentItem[];
  bankDetails?: Array<[string, string]>;
  terms?: string[];
};

const ACS_COMPANY = {
  name: "ACS TECHNOLOGIES LIMITED",
  addressLines: [
    "7th Floor, Level-7, Pardia Picassa Building",
    "Durgam Cheruvu, Hyderabad, Telangana-500081.",
  ],
  cin: "L62099TG1993PLC015268",
  gst: "36AAACL4102B3Z9",
  pan: "AAACL4102B",
};

const DEFAULT_BANK_DETAILS: Array<[string, string]> = [
  ["A/C No.", "5020 0009 1346 10"],
  ["Bank", "HDFC BANK LTD"],
  ["Branch", "PUNJAGUTTA, HYDERABAD"],
  ["IFSC", "HDFC 000 1228"],
  ["A/c Type", "Current Account"],
];

const DEFAULT_TERMS = [
  "Goods once sold will not be taken back without prior written approval.",
  "Payment and delivery terms are subject to final commercial confirmation.",
  "This proforma invoice is valid only up to the mentioned validity date.",
];

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function lineBasic(item: ProformaInvoiceDocumentItem) {
  return item.quantity * item.rate;
}

function lineTax(item: ProformaInvoiceDocumentItem) {
  return (lineBasic(item) * item.taxPercent) / 100;
}

function lineTotal(item: ProformaInvoiceDocumentItem) {
  return lineBasic(item) + lineTax(item);
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="grid grid-cols-[82px_1fr] border-b border-black last:border-b-0">
      <div className="border-r border-black px-1.5 py-1 font-semibold">{label}</div>
      <div className="px-1.5 py-1">{value || "-"}</div>
    </div>
  );
}

function PartyBlock({ title, party }: { title: string; party: PartyDetails }) {
  return (
    <div>
      <div className="border-b-2 border-black bg-[#cfe2f3] py-1 text-center font-bold">{title}</div>
      <div className="grid grid-cols-[70px_1fr]">
        <div className="border-r border-black px-1.5 py-1 font-semibold">Name</div>
        <div className="px-1.5 py-1">{party.name || "-"}</div>
        <div className="border-r border-t border-black px-1.5 py-1 font-semibold">Address</div>
        <div className="min-h-[54px] border-t border-black px-1.5 py-1">
          {party.addressLines.length ? party.addressLines.map((line) => <p key={line}>{line}</p>) : "-"}
        </div>
        <div className="border-r border-t border-black px-1.5 py-1 font-semibold">GSTIN/UIN</div>
        <div className="border-t border-black px-1.5 py-1">{party.gstin || "-"}</div>
        <div className="border-r border-t border-black px-1.5 py-1 font-semibold">State</div>
        <div className="border-t border-black px-1.5 py-1">{party.state || "-"}</div>
      </div>
    </div>
  );
}

export function ProformaInvoiceDocument({ document }: { document: ProformaInvoiceDocumentData }) {
  const items = document.items.length ? document.items : [];
  const subtotal = items.reduce((sum, item) => sum + lineBasic(item), 0);
  const taxTotal = items.reduce((sum, item) => sum + lineTax(item), 0);
  const grandTotal = subtotal + taxTotal;
  const cgst = taxTotal / 2;
  const sgst = taxTotal / 2;
  const terms = document.terms?.length ? document.terms : DEFAULT_TERMS;
  const bankDetails = document.bankDetails?.length ? document.bankDetails : DEFAULT_BANK_DETAILS;

  return (
    <div className="quotation-sheet mx-auto bg-white text-[8.5px] leading-tight text-black">
      <div className="border-2 border-black">
        <div className="grid grid-cols-[155px_1fr] border-b-2 border-black">
          <div className="flex items-center justify-center border-r-2 border-black p-1">
            <img src={acsLogo} alt="ACS Technologies" className="h-[82px] w-auto object-contain" />
          </div>
          <div className="px-3 py-2 text-center">
            <p className="text-[11px] font-bold">{ACS_COMPANY.name}</p>
            {ACS_COMPANY.addressLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
            <p className="mt-1 font-semibold">CIN : {ACS_COMPANY.cin}</p>
            <p className="font-semibold">
              GST NO. : {ACS_COMPANY.gst}, PAN NO. : {ACS_COMPANY.pan}
            </p>
          </div>
        </div>

        <div className="border-b-2 border-black bg-[#cfe2f3] py-2 text-center text-base font-bold uppercase">
          Proforma Invoice
        </div>

        <div className="grid grid-cols-[1fr_1fr] border-b-2 border-black">
          <div className="border-r-2 border-black">
            <InfoRow label="Invoice No." value={document.proformaNumber} />
            <InfoRow label="Invoice Date" value={formatDate(document.invoiceDate)} />
            <InfoRow label="PO/SO No." value={document.poNumber} />
            <InfoRow label="PO/SO Date" value={formatDate(document.poDate)} />
            <InfoRow label="Project Ref." value={document.projectRef} />
            <InfoRow label="Ewaybill No." value={document.ewayBillNo} />
            <InfoRow label="Ewaybill Date" value={formatDate(document.ewayBillDate)} />
          </div>
          <div>
            <div className="border-b border-black px-1.5 py-1 font-bold">Dispatch From</div>
            <div className="grid grid-cols-[70px_1fr]">
              <div className="border-r border-black px-1.5 py-1 font-semibold">Name</div>
              <div className="px-1.5 py-1">{document.dispatchFrom.name || "-"}</div>
              <div className="border-r border-t border-black px-1.5 py-1 font-semibold">Address</div>
              <div className="min-h-[54px] border-t border-black px-1.5 py-1">
                {document.dispatchFrom.addressLines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
              <div className="border-r border-t border-black px-1.5 py-1 font-semibold">GSTIN</div>
              <div className="border-t border-black px-1.5 py-1">{document.dispatchFrom.gstin || "-"}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 border-b-2 border-black">
          <div className="border-r-2 border-black">
            <PartyBlock title="Bill to Party / Buyer" party={document.billTo} />
          </div>
          <PartyBlock title="Ship to / Consignee" party={document.shipTo} />
        </div>

        <table className="w-full table-fixed border-collapse">
          <colgroup>
            <col className="w-[6%]" />
            <col className="w-[25%]" />
            <col className="w-[9%]" />
            <col className="w-[7%]" />
            <col className="w-[7%]" />
            <col className="w-[12%]" />
            <col className="w-[12%]" />
            <col className="w-[7%]" />
            <col className="w-[15%]" />
          </colgroup>
          <thead>
            <tr className="bg-[#cfe2f3]">
              {["Sl", "Product Description", "HSN/SAC", "UOM", "QTY", "Rate", "Basic Value", "Tax %", "Total Value"].map((heading) => (
                <th key={heading} className="border border-black px-1 py-1 text-center font-bold">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id} className="align-top">
                <td className="h-16 border border-black px-1 py-1 text-center">{index + 1}</td>
                <td className="whitespace-pre-line break-words border border-black px-1 py-1">{item.description}</td>
                <td className="border border-black px-1 py-1 text-center">{item.hsnSac || "-"}</td>
                <td className="border border-black px-1 py-1 text-center">{item.uom}</td>
                <td className="border border-black px-1 py-1 text-right">{formatMoney(item.quantity)}</td>
                <td className="border border-black px-1 py-1 text-right">{formatMoney(item.rate)}</td>
                <td className="border border-black px-1 py-1 text-right">{formatMoney(lineBasic(item))}</td>
                <td className="border border-black px-1 py-1 text-right">{formatMoney(item.taxPercent)}%</td>
                <td className="border border-black px-1 py-1 text-right">{formatMoney(lineTotal(item))}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={6} className="border border-black px-1 py-1 text-right font-bold">
                Total
              </td>
              <td className="border border-black px-1 py-1 text-right font-bold">{formatMoney(subtotal)}</td>
              <td className="border border-black px-1 py-1" />
              <td className="border border-black px-1 py-1 text-right font-bold">{formatMoney(grandTotal)}</td>
            </tr>
          </tbody>
        </table>

        <div className="grid grid-cols-[1fr_250px] border-b-2 border-black">
          <div className="border-r-2 border-black">
            <div className="border-b border-black bg-[#cfe2f3] py-1 text-center font-bold">Bank Details</div>
            {bankDetails.map(([label, value]) => (
              <div key={label} className="grid grid-cols-[105px_1fr] border-b border-black last:border-b-0">
                <div className="border-r border-black px-1.5 py-1 font-semibold">{label}</div>
                <div className="px-1.5 py-1">{value}</div>
              </div>
            ))}
          </div>
          <div>
            {[
              ["Total Amount before Tax", subtotal],
              ["Add: CGST", cgst],
              ["Add: SGST", sgst],
              ["Add: IGST", 0],
              ["Total Tax Amount", taxTotal],
              ["Total Amount after Tax", grandTotal],
            ].map(([label, value]) => (
              <div key={label as string} className="grid grid-cols-[1fr_95px] border-b border-black last:border-b-0">
                <div className="px-1.5 py-1 font-bold">{label}</div>
                <div className="border-l border-black px-1.5 py-1 text-right font-bold">{formatMoney(value as number)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-[1fr_250px]">
          <div className="border-r-2 border-black">
            <div className="border-b-2 border-black bg-[#cfe2f3] py-1 text-center font-bold">Terms & Conditions</div>
            <div className="min-h-[86px] p-2">
              {terms.map((term, index) => (
                <p key={term} className="mb-1">
                  {index + 1}. {term}
                </p>
              ))}
              <p className="mt-2 font-semibold">Due Date</p>
            </div>
          </div>
          <div className="p-2 text-center">
            <p className="font-bold">For ACS TECHNOLOGIES LIMITED</p>
            <div className="flex h-16 items-center justify-center">
              <img src={acsSeal} alt="ACS seal" className="h-14 w-14 object-contain" />
            </div>
            <p className="font-semibold">Authorised Signatory</p>
          </div>
        </div>
      </div>
    </div>
  );
}
