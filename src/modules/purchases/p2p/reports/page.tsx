import { Loader2 } from "lucide-react";
import { useGoodsReceipts, usePurchaseOrders, usePurchaseRequisitions } from "@/modules/purchases/hooks";
import { P2PCard, P2PLayout, P2PStatusBadge } from "../components";

function percentage(part: number, total: number) {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
}

export default function P2PReportsPage() {
  const requisitionsQuery = usePurchaseRequisitions();
  const ordersQuery = usePurchaseOrders();
  const receiptsQuery = useGoodsReceipts();

  const requisitions = requisitionsQuery.data ?? [];
  const orders = ordersQuery.data ?? [];
  const receipts = receiptsQuery.data ?? [];

  const submitted = requisitions.filter((item) => item.status === "SUBMITTED").length;
  const approvedOrConverted = requisitions.filter(
    (item) => item.status === "APPROVED" || item.status === "PO_CREATED"
  ).length;
  const poConversion = percentage(orders.length, requisitions.length);
  const receiptCoverage = percentage(receipts.length, orders.length);

  return (
    <P2PLayout
      title="Reports"
      subtitle="Live operational reporting derived from current requisition, PO, and receipt records."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <P2PCard title="Pipeline Ratios" description="Simple live conversion indicators.">
          {requisitionsQuery.isLoading || ordersQuery.isLoading || receiptsQuery.isLoading ? (
            <div className="py-16 text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600" />
              <p className="mt-3 text-sm text-slate-500">Loading report metrics...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {[
                { label: "Approved / Converted PRs", value: percentage(approvedOrConverted, requisitions.length) },
                { label: "PR to PO Conversion", value: poConversion },
                { label: "PO to GRN Coverage", value: receiptCoverage },
              ].map((metric) => (
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

        <P2PCard title="Current Volume" description="Live record counts for active procurement entities.">
          <div className="space-y-3">
            {[
              { label: "Total PRs", value: requisitions.length, tone: "info" as const },
              { label: "Submitted PRs", value: submitted, tone: "warning" as const },
              { label: "Purchase Orders", value: orders.length, tone: "info" as const },
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
