import { CheckCircle2, MessageSquare, XCircle } from "lucide-react";
import { P2PCard, P2PLayout, P2PStatusBadge } from "../components";
import { BUDGET_CHECK, PR_DETAILS } from "../data";

export default function P2PBudgetValidationPage() {
  return (
    <P2PLayout
      title="Budget Validation"
      subtitle="Confirm availability, capture remarks, and approve the spend."
    >
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <P2PCard title="PR Details" description="Key data from the purchase request.">
          <div className="grid gap-4 sm:grid-cols-2">
            {PR_DETAILS.map((detail) => (
              <div key={detail.label} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {detail.label}
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{detail.value}</p>
              </div>
            ))}
          </div>
        </P2PCard>

        <P2PCard
          title="Budget Availability"
          description="Finance validation against current allocations."
          action={<P2PStatusBadge label="Pending Review" tone="warning" />}
        >
          <div className="space-y-3">
            {BUDGET_CHECK.map((item) => (
              <div key={item.label} className="flex items-center justify-between text-sm text-slate-700">
                <span className="font-semibold text-slate-600">{item.label}</span>
                <span className="font-semibold text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Budget coverage
            </p>
            <p className="mt-1 text-sm text-emerald-700">
              86% of requested value available for immediate allocation.
            </p>
            <div className="mt-3 h-2 rounded-full bg-emerald-100">
              <div className="h-2 w-[86%] rounded-full bg-emerald-500" />
            </div>
          </div>

          <div className="mt-4">
            <label className="space-y-1 text-xs font-semibold text-slate-500">
              Reviewer Comments
              <textarea
                rows={3}
                placeholder="Add finance observations or constraints."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-emerald-600/20"
            >
              <CheckCircle2 className="h-4 w-4" />
              Approve Budget
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-rose-600/20"
            >
              <XCircle className="h-4 w-4" />
              Reject
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
            >
              <MessageSquare className="h-4 w-4 text-blue-600" />
              Ask for info
            </button>
          </div>
        </P2PCard>
      </div>
    </P2PLayout>
  );
}
