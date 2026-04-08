import { BellRing, CheckCircle2 } from "lucide-react";
import { P2PCard, P2PLayout, P2PStatusBadge } from "../components";
import { ALERT_GROUPS } from "../data";

const TONE_MAP: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  success: "success",
  warning: "warning",
  danger: "danger",
  neutral: "neutral",
};

export default function P2PAlertsPage() {
  return (
    <P2PLayout
      title="Alerts and Queue"
      subtitle="Stay ahead of bottlenecks with quick action buttons."
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {ALERT_GROUPS.map((group) => (
          <P2PCard
            key={group.id}
            title={group.title}
            description="Prioritized alerts for this category."
            action={
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600"
              >
                <BellRing className="h-3.5 w-3.5" />
                Snooze all
              </button>
            }
          >
            <div className="space-y-3">
              {group.items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-blue-200 hover:shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                    <P2PStatusBadge label={item.tone} tone={TONE_MAP[item.tone]} className="capitalize" />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{item.detail}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-blue-600/20"
                    >
                      Resolve
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      Mark done
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </P2PCard>
        ))}
      </div>
    </P2PLayout>
  );
}
