import { Loader2 } from "lucide-react";
import {
  useGoodsReceipts,
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

export default function P2PDashboardPage() {
  const requisitionsQuery = usePurchaseRequisitions();
  const ordersQuery = usePurchaseOrders();
  const receiptsQuery = useGoodsReceipts();
  const vendorsQuery = useVendors();

  const isLoading =
    requisitionsQuery.isLoading ||
    ordersQuery.isLoading ||
    receiptsQuery.isLoading ||
    vendorsQuery.isLoading;

  const requisitions = requisitionsQuery.data ?? [];
  const orders = ordersQuery.data ?? [];
  const receipts = receiptsQuery.data ?? [];
  const vendors = vendorsQuery.data ?? [];

  const totalRequisitionAmount = requisitions.reduce((sum, item) => sum + item.totalAmount, 0);
  const totalOrderAmount = orders.reduce((sum, item) => sum + item.totalAmount, 0);
  const submittedCount = requisitions.filter((item) => item.status === "SUBMITTED").length;
  const approvedCount = requisitions.filter((item) => item.status === "APPROVED" || item.status === "PO_CREATED").length;
  const draftCount = requisitions.filter((item) => item.status === "DRAFT").length;
  const openPoCount = orders.filter((item) => item.status === "CREATED").length;

  const recentRequisitions = [...requisitions]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  return (
    <P2PLayout
      title="P2P Command Center"
      subtitle="Live procurement overview across requisitions, orders, receipts, and supplier master data."
      meta={
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
            Approved PRs: {approvedCount}
          </span>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
            Open POs: {openPoCount}
          </span>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">
            Receipts booked: {receipts.length}
          </span>
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Requisitions", value: requisitions.length, note: `${submittedCount} waiting approval` },
          { label: "PO Value", value: formatCurrency(totalOrderAmount), note: `${orders.length} purchase order(s)` },
          { label: "Vendor Master", value: vendors.length, note: "active suppliers" },
          { label: "PR Value", value: formatCurrency(totalRequisitionAmount), note: `${draftCount} still in draft` },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{card.value}</p>
            <p className="mt-1 text-xs text-slate-500">{card.note}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <P2PCard title="Recent Requisitions" description="Latest procurement requests flowing through the live service.">
          {isLoading ? (
            <div className="py-16 text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600" />
              <p className="mt-3 text-sm text-slate-500">Loading dashboard data...</p>
            </div>
          ) : recentRequisitions.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-6 text-sm text-slate-500">
              No requisitions created yet.
            </div>
          ) : (
            <div className="space-y-3">
              {recentRequisitions.map((requisition) => (
                <div key={requisition.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{requisition.prNumber}</p>
                      <p className="text-xs text-slate-500">
                        {requisition.department} · {requisition.items.length} item(s)
                      </p>
                    </div>
                    <P2PStatusBadge
                      label={requisition.status.replace("_", " ")}
                      tone={
                        requisition.status === "REJECTED"
                          ? "danger"
                          : requisition.status === "DRAFT"
                            ? "neutral"
                            : requisition.status === "SUBMITTED"
                              ? "warning"
                              : "success"
                      }
                    />
                  </div>
                  <p className="mt-2 text-sm text-slate-700">{formatCurrency(requisition.totalAmount)}</p>
                </div>
              ))}
            </div>
          )}
        </P2PCard>

        <P2PCard title="Operational Queue" description="Current counts by live procurement stage.">
          <div className="space-y-3">
            {[
              { label: "Draft PRs", value: draftCount, tone: "neutral" as const },
              { label: "Submitted PRs", value: submittedCount, tone: "warning" as const },
              { label: "Approved / Converted PRs", value: approvedCount, tone: "success" as const },
              { label: "Open Purchase Orders", value: openPoCount, tone: "info" as const },
              { label: "Goods Receipts", value: receipts.length, tone: "success" as const },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
                <span className="text-sm font-medium text-slate-700">{item.label}</span>
                <P2PStatusBadge label={String(item.value)} tone={item.tone} />
              </div>
            ))}
          </div>
        </P2PCard>
      </div>
    </P2PLayout>
  );
}
