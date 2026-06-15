import { Loader2 } from "lucide-react";
import {
  useGoodsReceipts,
  useInvoices,
  usePayments,
  usePurchaseOrders,
  usePurchaseRequisitions,
  useVendors,
} from "@/modules/purchases/hooks";
import { P2PCard, P2PLayout, P2PStatusBadge } from "../components";

function percentage(part: number, total: number) {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

export default function P2PReportsPage() {
  const requisitionsQuery = usePurchaseRequisitions();
  const ordersQuery = usePurchaseOrders();
  const receiptsQuery = useGoodsReceipts();
  const invoicesQuery = useInvoices();
  const paymentsQuery = usePayments();
  const vendorsQuery = useVendors();

  const isLoading =
    requisitionsQuery.isLoading ||
    ordersQuery.isLoading ||
    receiptsQuery.isLoading ||
    invoicesQuery.isLoading ||
    paymentsQuery.isLoading ||
    vendorsQuery.isLoading;

  const requisitions = requisitionsQuery.data ?? [];
  const orders = ordersQuery.data ?? [];
  const receipts = receiptsQuery.data ?? [];
  const invoices = invoicesQuery.data ?? [];
  const payments = paymentsQuery.data ?? [];
  const vendors = vendorsQuery.data ?? [];

  const submitted = requisitions.filter((item) => item.status === "SUBMITTED").length;
  const approved = requisitions.filter((item) => item.status === "APPROVED" || item.status === "PO_CREATED").length;
  const rejected = requisitions.filter((item) => item.status === "REJECTED").length;
  const openOrders = orders.filter((item) => item.status === "CREATED").length;
  const receivedOrders = orders.filter((item) => item.status === "RECEIVED").length;
  const matchedInvoices = invoices.filter((item) => item.matchingStatus === "MATCHED").length;
  const mismatchedInvoices = invoices.filter((item) => item.matchingStatus === "MISMATCH").length;
  const paidPayments = payments.filter((item) => item.status === "PAID").length;
  const compliantVendors = vendors.filter((item) => item.gstNumber && item.bankAccounts.length > 0 && item.contactPersons.length > 0).length;

  const cards = [
    {
      title: "Demand to Source Funnel",
      description: "Conversion across PR, PO, GRN, invoice, and payment stages.",
      rows: [
        { label: "Submitted PRs", value: submitted, tone: "warning" as const },
        { label: "Approved / Converted PRs", value: approved, tone: "success" as const },
        { label: "Open Purchase Orders", value: openOrders, tone: "info" as const },
        { label: "Goods Receipts Posted", value: receipts.length, tone: "success" as const },
        { label: "Invoices Logged", value: invoices.length, tone: "info" as const },
        { label: "Payments Settled", value: paidPayments, tone: "success" as const },
      ],
    },
    {
      title: "Control Ratios",
      description: "Health indicators that a product or finance head would watch weekly.",
      metrics: [
        { label: "PR to PO Conversion", value: percentage(orders.length, requisitions.length) },
        { label: "PO to GRN Coverage", value: percentage(receipts.length, orders.length) },
        { label: "Invoice Match Rate", value: percentage(matchedInvoices, invoices.length) },
        { label: "Payment Clearance Rate", value: percentage(paidPayments, payments.length) },
        { label: "Vendor Readiness", value: percentage(compliantVendors, vendors.length) },
      ],
    },
    {
      title: "Commercial Exposure",
      description: "Current money position locked across the pipeline.",
      rows: [
        {
          label: "Total PR Value",
          value: formatCurrency(requisitions.reduce((sum, item) => sum + item.totalAmount, 0)),
          tone: "neutral" as const,
        },
        {
          label: "Open PO Value",
          value: formatCurrency(orders.filter((item) => item.status === "CREATED").reduce((sum, item) => sum + item.totalAmount, 0)),
          tone: "warning" as const,
        },
        {
          label: "Invoice Value",
          value: formatCurrency(invoices.reduce((sum, item) => sum + item.amount, 0)),
          tone: "info" as const,
        },
        {
          label: "Paid Value",
          value: formatCurrency(payments.filter((item) => item.status === "PAID").reduce((sum, item) => sum + item.amount, 0)),
          tone: "success" as const,
        },
      ],
    },
    {
      title: "Governance Exceptions",
      description: "Counts that indicate process discipline or compliance risk.",
      rows: [
        { label: "Rejected PRs", value: rejected, tone: rejected ? ("danger" as const) : ("success" as const) },
        {
          label: "Invoice Mismatches",
          value: mismatchedInvoices,
          tone: mismatchedInvoices ? ("danger" as const) : ("success" as const),
        },
        {
          label: "Received Orders",
          value: receivedOrders,
          tone: "success" as const,
        },
        {
          label: "Compliant Vendors",
          value: `${compliantVendors}/${vendors.length || 0}`,
          tone: compliantVendors === vendors.length ? ("success" as const) : ("warning" as const),
        },
      ],
    },
  ];

  return (
    <P2PLayout
      title="Reports"
      subtitle="Executive procurement reporting for flow conversion, monetary exposure, control quality, and supplier readiness."
    >
      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white py-20 text-center shadow-sm">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600" />
          <p className="mt-3 text-sm text-slate-500">Loading enterprise report metrics...</p>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          {cards.map((card) => (
            <P2PCard key={card.title} title={card.title} description={card.description}>
              {"rows" in card ? (
                <div className="space-y-3">
                  {card.rows.map((row) => (
                    <div key={row.label} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
                      <span className="text-sm font-medium text-slate-700">{row.label}</span>
                      <P2PStatusBadge label={String(row.value)} tone={row.tone} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {card.metrics.map((metric) => (
                    <div key={metric.label} className="flex items-center gap-3 text-sm text-slate-600">
                      <span className="w-44 font-semibold text-slate-700">{metric.label}</span>
                      <div className="h-2 flex-1 rounded-full bg-slate-100">
                        <div className="h-2 rounded-full bg-blue-500" style={{ width: `${metric.value}%` }} />
                      </div>
                      <span className="w-12 text-right text-xs">{metric.value}%</span>
                    </div>
                  ))}
                </div>
              )}
            </P2PCard>
          ))}
        </div>
      )}
    </P2PLayout>
  );
}
