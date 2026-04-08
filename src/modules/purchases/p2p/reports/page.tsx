import { TrendingDown, TrendingUp } from "lucide-react";
import { P2PCard, P2PLayout, P2PStatusBadge } from "../components";
import { PAYMENT_DELAYS, REPORT_SERIES } from "../data";

export default function P2PReportsPage() {
  return (
    <P2PLayout
      title="Reports"
      subtitle="Operational insights across PR to payment performance."
    >
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <P2PCard
          title="PR to PO Conversion"
          description="Conversion rate by procurement stage."
          action={<P2PStatusBadge label="78% conversion" tone="success" />}
        >
          <div className="space-y-3">
            {REPORT_SERIES.map((metric) => (
              <div key={metric.label} className="flex items-center gap-3 text-sm text-slate-600">
                <span className="w-32 font-semibold text-slate-700">{metric.label}</span>
                <div className="h-2 flex-1 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-blue-500"
                    style={{ width: `${metric.value}%` }}
                  />
                </div>
                <span className="w-10 text-right text-xs">{metric.value}%</span>
              </div>
            ))}
          </div>
        </P2PCard>

        <P2PCard
          title="Negotiation Time"
          description="Average days spent in negotiation."
          action={
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
              <TrendingDown className="h-3.5 w-3.5" />
              12% improvement
            </span>
          }
        >
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-sm text-emerald-700">
            Average negotiation duration reduced from 4.2 to 3.4 days.
          </div>
          <div className="mt-4 space-y-2 text-xs text-slate-600">
            {[
              { label: "Hardware", value: "3.6 days" },
              { label: "Services", value: "2.8 days" },
              { label: "Logistics", value: "3.9 days" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span>{item.label}</span>
                <span className="font-semibold text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </P2PCard>
      </div>

      <P2PCard
        title="Payment Delays"
        description="Distribution of delayed payments by days."
        action={
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600">
            <TrendingUp className="h-3.5 w-3.5" />
            Watch list
          </span>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            {PAYMENT_DELAYS.map((bucket) => (
              <div key={bucket.label} className="flex items-center gap-3 text-sm text-slate-600">
                <span className="w-24 font-semibold text-slate-700">{bucket.label}</span>
                <div className="h-2 flex-1 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-rose-500"
                    style={{ width: `${bucket.value}%` }}
                  />
                </div>
                <span className="w-8 text-right text-xs">{bucket.value}%</span>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-4 text-sm text-rose-700">
            Payments delayed more than 8 days require vendor escalation and cash-flow review.
          </div>
        </div>
      </P2PCard>
    </P2PLayout>
  );
}
