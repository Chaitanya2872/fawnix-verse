import { useMemo } from "react";
import {
  AlertTriangle,
  ArrowRightLeft,
  BadgeIndianRupee,
  Building2,
  CircleDollarSign,
  FileCheck2,
  FileClock,
  Loader2,
  PackageCheck,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import {
  useGoodsReceipts,
  useInvoices,
  usePayments,
  usePurchaseOrders,
  usePurchaseRequisitions,
  useVendors,
} from "@/modules/purchases/hooks";
import { P2PCard, P2PLayout, P2PStatusBadge } from "../components";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function percentage(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function daysSince(value?: string | null) {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return null;
  return Math.max(0, Math.floor((Date.now() - timestamp) / 86_400_000));
}

function DashboardStat({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent}`}>{icon}</div>
        <div>
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="text-xl font-semibold text-slate-900">{value}</p>
          <p className="text-[11px] text-slate-500">{sub}</p>
        </div>
      </div>
    </div>
  );
}

export default function P2PDashboardPage() {
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

  const metrics = useMemo(() => {
    const prSubmitted = requisitions.filter((item) => item.status === "SUBMITTED");
    const prApproved = requisitions.filter((item) => item.status === "APPROVED" || item.status === "PO_CREATED");
    const prDraft = requisitions.filter((item) => item.status === "DRAFT");
    const openOrders = orders.filter((item) => item.status === "CREATED");
    const receivedOrders = orders.filter((item) => item.status === "RECEIVED");
    const pendingInvoices = invoices.filter((item) => item.status === "PENDING_APPROVAL");
    const matchedInvoices = invoices.filter((item) => item.matchingStatus === "MATCHED");
    const paymentQueue = payments.filter((item) => item.status === "PENDING_APPROVAL");
    const paidPayments = payments.filter((item) => item.status === "PAID");
    const compliantVendors = vendors.filter((item) => item.gstNumber && item.bankAccounts.length > 0 && item.contactPersons.length > 0);
    const inactiveVendors = vendors.filter((item) => item.status === "INACTIVE");
    const blockedInvoices = invoices.filter((item) => item.matchingStatus === "MISMATCH");
    const overdueApprovals = prSubmitted.filter((item) => (daysSince(item.submittedAt ?? item.updatedAt) ?? 0) >= 3);
    const receiptBacklogValue = openOrders.reduce((sum, item) => sum + item.totalAmount, 0);
    const approvedInvoiceValue = invoices
      .filter((item) => item.status === "APPROVED")
      .reduce((sum, item) => sum + item.amount, 0);
    const paidValue = paidPayments.reduce((sum, item) => sum + item.amount, 0);

    return {
      prSubmitted,
      prApproved,
      prDraft,
      openOrders,
      receivedOrders,
      pendingInvoices,
      matchedInvoices,
      paymentQueue,
      compliantVendors,
      inactiveVendors,
      blockedInvoices,
      overdueApprovals,
      receiptBacklogValue,
      approvedInvoiceValue,
      paidValue,
      spendUnderProcess:
        prSubmitted.reduce((sum, item) => sum + item.totalAmount, 0) +
        openOrders.reduce((sum, item) => sum + item.totalAmount, 0) +
        pendingInvoices.reduce((sum, item) => sum + item.amount, 0) +
        paymentQueue.reduce((sum, item) => sum + item.amount, 0),
    };
  }, [invoices, orders, payments, requisitions, vendors]);

  const recentExecution = useMemo(
    () =>
      [
        ...metrics.prSubmitted.map((item) => ({
          id: item.id,
          title: `${item.prNumber} awaiting approval`,
          caption: `${item.department} · ${formatCurrency(item.totalAmount)}`,
          tone: "warning" as const,
          age: daysSince(item.submittedAt ?? item.updatedAt) ?? 0,
        })),
        ...metrics.openOrders.map((item) => ({
          id: item.id,
          title: `${item.poNumber} pending receipt`,
          caption: `${item.vendor.vendorName} · ${formatCurrency(item.totalAmount)}`,
          tone: "info" as const,
          age: daysSince(item.createdAt) ?? 0,
        })),
        ...metrics.pendingInvoices.map((item) => ({
          id: item.id,
          title: `${item.invoiceNumber} pending finance approval`,
          caption: `${item.vendor.vendorName} · ${formatCurrency(item.amount)}`,
          tone: "warning" as const,
          age: daysSince(item.createdAt) ?? 0,
        })),
        ...metrics.paymentQueue.map((item) => ({
          id: item.id,
          title: `${item.paymentNumber} awaiting release`,
          caption: `${item.vendor.vendorName} · ${formatCurrency(item.amount)}`,
          tone: "danger" as const,
          age: daysSince(item.createdAt) ?? 0,
        })),
      ]
        .sort((a, b) => b.age - a.age)
        .slice(0, 8),
    [metrics.openOrders, metrics.paymentQueue, metrics.pendingInvoices, metrics.prSubmitted]
  );

  const vendorRiskSnapshot = useMemo(
    () =>
      vendors
        .map((vendor) => {
          const riskFlags = [
            !vendor.gstNumber ? "GST missing" : null,
            vendor.bankAccounts.length === 0 ? "Bank account missing" : null,
            vendor.contactPersons.length === 0 ? "Primary contact missing" : null,
            vendor.status === "INACTIVE" ? "Inactive vendor" : null,
          ].filter(Boolean) as string[];
          return {
            id: vendor.id,
            name: vendor.displayName ?? vendor.vendorName,
            riskFlags,
          };
        })
        .filter((vendor) => vendor.riskFlags.length > 0)
        .sort((a, b) => b.riskFlags.length - a.riskFlags.length)
        .slice(0, 5),
    [vendors]
  );

  const stageFlow = [
    { label: "PR Draft", value: metrics.prDraft.length, tone: "neutral" as const },
    { label: "PR Submitted", value: metrics.prSubmitted.length, tone: "warning" as const },
    { label: "PO Open", value: metrics.openOrders.length, tone: "info" as const },
    { label: "GRN Posted", value: receipts.length, tone: "success" as const },
    { label: "Invoice Pending", value: metrics.pendingInvoices.length, tone: "warning" as const },
    { label: "Payment Pending", value: metrics.paymentQueue.length, tone: "danger" as const },
  ];

  return (
    <P2PLayout
      title="P2P Command Center"
      subtitle="Enterprise procurement visibility across sourcing, fulfillment, payables, supplier readiness, and working-capital exposure."
      meta={
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-700">
            Approval backlog: {metrics.overdueApprovals.length}
          </span>
          <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-blue-700">
            Receipt backlog: {formatCurrency(metrics.receiptBacklogValue)}
          </span>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">
            Paid: {formatCurrency(metrics.paidValue)}
          </span>
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardStat
          label="Spend Under Process"
          value={formatCurrency(metrics.spendUnderProcess)}
          sub={`${metrics.prSubmitted.length + metrics.openOrders.length + metrics.pendingInvoices.length} active workflow items`}
          icon={<BadgeIndianRupee className="h-5 w-5 text-blue-700" />}
          accent="bg-blue-100"
        />
        <DashboardStat
          label="Orders Awaiting Receipt"
          value={metrics.openOrders.length}
          sub={`${formatCurrency(metrics.receiptBacklogValue)} committed value`}
          icon={<PackageCheck className="h-5 w-5 text-amber-700" />}
          accent="bg-amber-100"
        />
        <DashboardStat
          label="Approved Invoice Exposure"
          value={formatCurrency(metrics.approvedInvoiceValue)}
          sub={`${metrics.matchedInvoices.length} matched invoices`}
          icon={<FileCheck2 className="h-5 w-5 text-emerald-700" />}
          accent="bg-emerald-100"
        />
        <DashboardStat
          label="Vendor Readiness"
          value={`${percentage(metrics.compliantVendors.length, vendors.length)}%`}
          sub={`${metrics.compliantVendors.length}/${vendors.length || 0} suppliers finance-ready`}
          icon={<Building2 className="h-5 w-5 text-violet-700" />}
          accent="bg-violet-100"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <P2PCard title="Lifecycle Flow" description="Where demand and spend are currently sitting in the procure-to-pay pipeline.">
          <div className="grid gap-3 md:grid-cols-2">
            {stageFlow.map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                    <p className="mt-1 text-xs text-slate-500">Current operational count</p>
                  </div>
                  <P2PStatusBadge label={String(item.value)} tone={item.tone} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">PR to PO Conversion</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{percentage(orders.length, requisitions.length)}%</p>
              <p className="mt-1 text-xs text-slate-500">{metrics.prApproved.length} approved PRs in the pipeline</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">PO to GRN Coverage</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{percentage(receipts.length, orders.length)}%</p>
              <p className="mt-1 text-xs text-slate-500">{metrics.receivedOrders.length} orders fully received</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Invoice to Payment Closure</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{percentage(metrics.paidValue, invoices.reduce((sum, item) => sum + item.amount, 0))}%</p>
              <p className="mt-1 text-xs text-slate-500">{payments.length} payment records processed</p>
            </div>
          </div>
        </P2PCard>

        <P2PCard title="Control Risks" description="Signals that should trigger a procurement, finance, or supplier governance response.">
          {isLoading ? (
            <div className="py-16 text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600" />
              <p className="mt-3 text-sm text-slate-500">Loading control risks...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {[
                {
                  label: "Approvals beyond SLA",
                  value: metrics.overdueApprovals.length,
                  note: "Submitted PRs older than 3 days",
                  tone: metrics.overdueApprovals.length ? "warning" : "success",
                },
                {
                  label: "Invoice mismatches",
                  value: metrics.blockedInvoices.length,
                  note: "3-way match exceptions blocking payment",
                  tone: metrics.blockedInvoices.length ? "danger" : "success",
                },
                {
                  label: "Inactive vendors on master",
                  value: metrics.inactiveVendors.length,
                  note: "Suppliers needing governance cleanup",
                  tone: metrics.inactiveVendors.length ? "warning" : "success",
                },
                {
                  label: "Payments waiting release",
                  value: metrics.paymentQueue.length,
                  note: "Approved spend not yet settled",
                  tone: metrics.paymentQueue.length ? "danger" : "success",
                },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.note}</p>
                  </div>
                  <P2PStatusBadge label={String(item.value)} tone={item.tone as "success" | "warning" | "danger"} />
                </div>
              ))}
            </div>
          )}
        </P2PCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <P2PCard title="Execution Queue" description="Aging live items that need procurement leadership attention.">
          {isLoading ? (
            <div className="py-16 text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600" />
              <p className="mt-3 text-sm text-slate-500">Loading execution queue...</p>
            </div>
          ) : recentExecution.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-6 text-sm text-slate-500">
              No action-heavy items right now.
            </div>
          ) : (
            <div className="space-y-3">
              {recentExecution.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.caption}</p>
                    </div>
                    <P2PStatusBadge
                      label={`${item.age}d`}
                      tone={item.age >= 5 ? "danger" : item.age >= 3 ? "warning" : item.tone}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </P2PCard>

        <P2PCard title="Supplier Readiness Risks" description="Vendors that may slow sourcing or payment because of master-data gaps.">
          {vendorRiskSnapshot.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-6 text-sm text-slate-500">
              Vendor master is clean enough for current operations.
            </div>
          ) : (
            <div className="space-y-3">
              {vendorRiskSnapshot.map((vendor) => (
                <div key={vendor.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{vendor.name}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {vendor.riskFlags.map((flag) => (
                          <span key={flag} className="rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
                            {flag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </P2PCard>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardStat
          label="Draft Demand"
          value={metrics.prDraft.length}
          sub="requests not yet submitted"
          icon={<FileClock className="h-5 w-5 text-slate-700" />}
          accent="bg-slate-100"
        />
        <DashboardStat
          label="Approved PRs"
          value={metrics.prApproved.length}
          sub="ready for sourcing execution"
          icon={<ArrowRightLeft className="h-5 w-5 text-sky-700" />}
          accent="bg-sky-100"
        />
        <DashboardStat
          label="Receipts Posted"
          value={receipts.length}
          sub="goods confirmed into inventory"
          icon={<ShieldCheck className="h-5 w-5 text-emerald-700" />}
          accent="bg-emerald-100"
        />
        <DashboardStat
          label="Payments Released"
          value={formatCurrency(metrics.paidValue)}
          sub={`${payments.filter((item) => item.status === "PAID").length} finance settlements`}
          icon={<WalletCards className="h-5 w-5 text-violet-700" />}
          accent="bg-violet-100"
        />
      </div>
    </P2PLayout>
  );
}
