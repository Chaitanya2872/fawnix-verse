import { FileText, Send } from "lucide-react";
import { P2PCard, P2PLayout, P2PStatusBadge } from "../components";
import { PO_INFO } from "../data";

export default function P2PPurchaseOrderPage() {
  return (
    <P2PLayout
      title="Purchase Order"
      subtitle="Generate and issue the purchase order to the selected vendor."
    >
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <P2PCard
          title="Generate PO"
          description="Auto-populated from PR and negotiation details."
          action={
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-blue-600/20"
            >
              <FileText className="h-3.5 w-3.5" />
              Generate PO
            </button>
          }
        >
          <div className="space-y-3 text-sm text-slate-700">
            {PO_INFO.map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-slate-500">{item.label}</span>
                <span className="font-semibold text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">PO Status</p>
            <div className="mt-2 flex items-center gap-2">
              <P2PStatusBadge label="Created" tone="info" />
              <P2PStatusBadge label="Awaiting Issue" tone="warning" />
            </div>
          </div>
        </P2PCard>

        <P2PCard
          title="Vendor Details"
          description="Confirm vendor and dispatch the PO."
        >
          <div className="space-y-2 text-sm text-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Vendor</span>
              <span className="font-semibold text-slate-900">Trackon Systems</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Contact</span>
              <span className="font-semibold text-slate-900">Rhea Kapoor</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Delivery SLA</span>
              <span className="font-semibold text-slate-900">7 days</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Payment Terms</span>
              <span className="font-semibold text-slate-900">Net 30</span>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-emerald-600/20"
            >
              <Send className="h-4 w-4" />
              Issue PO
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
            >
              Share with finance
            </button>
          </div>
        </P2PCard>
      </div>
    </P2PLayout>
  );
}
