import { Loader2 } from "lucide-react";
import { usePurchaseOrders, usePurchaseRequisitions } from "@/modules/purchases/hooks";
import { P2PCard, P2PLayout, P2PStatusBadge } from "../components";

export default function P2PAlertsPage() {
  const { data: requisitions = [], isLoading: requisitionsLoading } = usePurchaseRequisitions();
  const { data: orders = [], isLoading: ordersLoading } = usePurchaseOrders();

  const alerts = [
    ...requisitions
      .filter((item) => item.status === "SUBMITTED")
      .map((item) => ({
        id: item.id,
        title: `${item.prNumber} awaiting approval`,
        detail: `${item.department} · ${item.items.length} item(s) · ${item.totalAmount.toFixed(2)}`,
        tone: "warning" as const,
      })),
    ...requisitions
      .filter((item) => item.status === "REJECTED")
      .map((item) => ({
        id: `${item.id}-rejected`,
        title: `${item.prNumber} was rejected`,
        detail: item.rejectionReason || "No rejection remarks captured.",
        tone: "danger" as const,
      })),
    ...orders
      .filter((item) => item.status === "CREATED")
      .map((item) => ({
        id: `${item.id}-po`,
        title: `${item.poNumber} pending receipt`,
        detail: `${item.vendor.vendorName} · Expected ${item.expectedDeliveryDate || "date not set"}`,
        tone: "info" as const,
      })),
  ];

  return (
    <P2PLayout
      title="Alerts and Queue"
      subtitle="Live operational alerts generated from requisition and purchase order status."
    >
      <P2PCard title="Active Alerts" description="Items requiring procurement follow-up.">
        {requisitionsLoading || ordersLoading ? (
          <div className="py-16 text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600" />
            <p className="mt-3 text-sm text-slate-500">Loading alerts...</p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-6 text-sm text-slate-500">
            No live alerts right now.
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div key={alert.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">{alert.title}</p>
                  <P2PStatusBadge label={alert.tone} tone={alert.tone === "info" ? "info" : alert.tone} className="capitalize" />
                </div>
                <p className="mt-2 text-xs text-slate-500">{alert.detail}</p>
              </div>
            ))}
          </div>
        )}
      </P2PCard>
    </P2PLayout>
  );
}
