import { CreditCard, ShieldCheck } from "lucide-react";
import { P2PCard, P2PLayout, P2PStatusBadge } from "../components";
import { PAYMENT_DETAILS } from "../data";

export default function P2PPaymentPage() {
  return (
    <P2PLayout
      title="Payment"
      subtitle="Manage due dates, payment status, and confirmations."
    >
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <P2PCard
          title="Payment Details"
          description="Scheduled run and beneficiary details."
          action={<P2PStatusBadge label="Due in 6 days" tone="warning" />}
        >
          <div className="space-y-3 text-sm text-slate-700">
            {PAYMENT_DETAILS.map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-slate-500">{item.label}</span>
                <span className="font-semibold text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-emerald-600/20"
            >
              <CreditCard className="h-4 w-4" />
              Mark as paid
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
            >
              Reschedule
            </button>
          </div>
        </P2PCard>

        <P2PCard title="Compliance Checks" description="Ensure approvals are complete.">
          <div className="space-y-3">
            {[
              { label: "Invoice verified", status: "Completed" },
              { label: "GRN matched", status: "Completed" },
              { label: "Budget approval", status: "Completed" },
              { label: "Payment authorization", status: "Pending" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between text-sm text-slate-700">
                <span>{item.label}</span>
                <P2PStatusBadge
                  label={item.status}
                  tone={item.status === "Completed" ? "success" : "warning"}
                />
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50/70 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-700">
              <ShieldCheck className="h-4 w-4" />
              Approval pending
            </div>
            <p className="mt-1 text-xs text-amber-700">
              Finance approval required before payment can be released.
            </p>
          </div>
        </P2PCard>
      </div>
    </P2PLayout>
  );
}
