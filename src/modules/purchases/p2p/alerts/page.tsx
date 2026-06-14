import { useMemo, useState } from "react";
import { AlertTriangle, Building2, FileWarning, Loader2, Search, TimerReset, Wallet } from "lucide-react";
import {
  useInvoices,
  usePayments,
  usePurchaseOrders,
  usePurchaseRequisitions,
  useVendors,
} from "@/modules/purchases/hooks";
import { P2PCard, P2PLayout, P2PStatusBadge } from "../components";

type AlertTone = "warning" | "danger" | "info";
type AlertCategory = "Approvals" | "Fulfillment" | "Finance" | "Supplier";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function daysSince(value?: string | null) {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return null;
  return Math.max(0, Math.floor((Date.now() - timestamp) / 86_400_000));
}

export default function P2PAlertsPage() {
  const { data: requisitions = [], isLoading: requisitionsLoading } = usePurchaseRequisitions();
  const { data: orders = [], isLoading: ordersLoading } = usePurchaseOrders();
  const { data: invoices = [], isLoading: invoicesLoading } = useInvoices();
  const { data: payments = [], isLoading: paymentsLoading } = usePayments();
  const { data: vendors = [], isLoading: vendorsLoading } = useVendors();

  const [categoryFilter, setCategoryFilter] = useState<"ALL" | AlertCategory>("ALL");
  const [search, setSearch] = useState("");

  const isLoading =
    requisitionsLoading ||
    ordersLoading ||
    invoicesLoading ||
    paymentsLoading ||
    vendorsLoading;

  const alerts = useMemo(
    () =>
      [
        ...requisitions
          .filter((item) => item.status === "SUBMITTED")
          .map((item) => {
            const age = daysSince(item.submittedAt ?? item.updatedAt) ?? 0;
            return {
              id: item.id,
              title: `${item.prNumber} awaiting approval`,
              detail: `${item.department} · ${item.items.length} item(s) · ${formatCurrency(item.totalAmount)}`,
              owner: "Department approver",
              nextStep: "Review budget and approve or reject.",
              age,
              category: "Approvals" as AlertCategory,
              tone: age >= 5 ? ("danger" as AlertTone) : ("warning" as AlertTone),
            };
          }),
        ...orders
          .filter((item) => item.status === "CREATED")
          .map((item) => {
            const age = daysSince(item.createdAt) ?? 0;
            return {
              id: `${item.id}-po`,
              title: `${item.poNumber} pending receipt`,
              detail: `${item.vendor.vendorName} · ${formatCurrency(item.totalAmount)} · Delivery ${item.expectedDeliveryDate || "not committed"}`,
              owner: "Stores / receiving",
              nextStep: "Post GRN or escalate delivery slippage with vendor.",
              age,
              category: "Fulfillment" as AlertCategory,
              tone: age >= 10 ? ("danger" as AlertTone) : ("info" as AlertTone),
            };
          }),
        ...invoices
          .filter((item) => item.matchingStatus === "MISMATCH")
          .map((item) => ({
            id: `${item.id}-mismatch`,
            title: `${item.invoiceNumber} blocked by 3-way mismatch`,
            detail: `${item.vendor.vendorName} · ${formatCurrency(item.amount)} · ${item.matchingNotes}`,
            owner: "Procurement + finance",
            nextStep: "Resolve quantity, rate, or GRN mismatch before release.",
            age: daysSince(item.createdAt) ?? 0,
            category: "Finance" as AlertCategory,
            tone: "danger" as AlertTone,
          })),
        ...payments
          .filter((item) => item.status === "PENDING_APPROVAL")
          .map((item) => ({
            id: `${item.id}-payment`,
            title: `${item.paymentNumber} awaiting release approval`,
            detail: `${item.vendor.vendorName} · ${formatCurrency(item.amount)} · Invoice ${item.invoiceNumber}`,
            owner: "Finance approver",
            nextStep: "Approve for payment release or reject with reason.",
            age: daysSince(item.createdAt) ?? 0,
            category: "Finance" as AlertCategory,
            tone: "warning" as AlertTone,
          })),
        ...vendors
          .filter((item) => !item.gstNumber || item.bankAccounts.length === 0 || item.contactPersons.length === 0)
          .map((item) => ({
            id: `${item.id}-vendor`,
            title: `${item.displayName ?? item.vendorName} has onboarding gaps`,
            detail: [
              !item.gstNumber ? "GST missing" : null,
              item.bankAccounts.length === 0 ? "Bank details missing" : null,
              item.contactPersons.length === 0 ? "Contact person missing" : null,
            ]
              .filter(Boolean)
              .join(" · "),
            owner: "Vendor master team",
            nextStep: "Complete supplier profile before sourcing or payment dependency arises.",
            age: 0,
            category: "Supplier" as AlertCategory,
            tone: "info" as AlertTone,
          })),
      ].sort((a, b) => b.age - a.age),
    [invoices, orders, payments, requisitions, vendors]
  );

  const filteredAlerts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return alerts.filter((alert) => {
      const matchesCategory = categoryFilter === "ALL" ? true : alert.category === categoryFilter;
      const matchesSearch =
        !term ||
        alert.title.toLowerCase().includes(term) ||
        alert.detail.toLowerCase().includes(term) ||
        alert.owner.toLowerCase().includes(term) ||
        alert.nextStep.toLowerCase().includes(term);
      return matchesCategory && matchesSearch;
    });
  }, [alerts, categoryFilter, search]);

  const alertStats = useMemo(
    () => ({
      total: alerts.length,
      critical: alerts.filter((item) => item.tone === "danger").length,
      approvals: alerts.filter((item) => item.category === "Approvals").length,
      suppliers: alerts.filter((item) => item.category === "Supplier").length,
    }),
    [alerts]
  );

  return (
    <P2PLayout
      title="Alerts and Queue"
      subtitle="Prioritized enterprise operations queue across approvals, receipts, finance exceptions, and supplier master risks."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Open Alerts",
            value: alertStats.total,
            sub: "all live exceptions and actions",
            icon: <TimerReset className="h-4.5 w-4.5 text-blue-700" />,
            accent: "bg-blue-100",
          },
          {
            label: "Critical Escalations",
            value: alertStats.critical,
            sub: "need leadership attention",
            icon: <AlertTriangle className="h-4.5 w-4.5 text-rose-700" />,
            accent: "bg-rose-100",
          },
          {
            label: "Approval Queue",
            value: alertStats.approvals,
            sub: "PR and payment bottlenecks",
            icon: <FileWarning className="h-4.5 w-4.5 text-amber-700" />,
            accent: "bg-amber-100",
          },
          {
            label: "Supplier Data Risks",
            value: alertStats.suppliers,
            sub: "master-data readiness gaps",
            icon: <Building2 className="h-4.5 w-4.5 text-violet-700" />,
            accent: "bg-violet-100",
          },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${card.accent}`}>{card.icon}</div>
              <div>
                <p className="text-xs font-medium text-slate-500">{card.label}</p>
                <p className="text-xl font-semibold text-slate-900">{card.value}</p>
                <p className="text-[11px] text-slate-500">{card.sub}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <P2PCard title="Action Queue" description="Every alert includes ownership and a clear next operational step.">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {(["ALL", "Approvals", "Fulfillment", "Finance", "Supplier"] as const).map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setCategoryFilter(category)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                  categoryFilter === category
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="relative w-full lg:w-[340px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search alert, owner, next step..."
              className="w-full rounded-full border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600" />
            <p className="mt-3 text-sm text-slate-500">Loading alerts...</p>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-6 text-sm text-slate-500">
            No live alerts match this view.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAlerts.map((alert) => (
              <div key={alert.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">{alert.title}</p>
                      <P2PStatusBadge label={alert.category} tone={alert.tone === "info" ? "info" : alert.tone} />
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{alert.detail}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {alert.category === "Finance" ? <Wallet className="h-4 w-4 text-slate-400" /> : null}
                    <P2PStatusBadge
                      label={alert.age > 0 ? `${alert.age}d open` : "new"}
                      tone={alert.age >= 5 ? "danger" : alert.age >= 3 ? "warning" : "neutral"}
                    />
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Owner</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{alert.owner}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Next Best Action</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{alert.nextStep}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </P2PCard>
    </P2PLayout>
  );
}
