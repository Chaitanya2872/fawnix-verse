import { useMemo, useState } from "react";
import { Filter, LineChart, Sparkles } from "lucide-react";
import { P2PCard, P2PLayout, P2PStatusBadge } from "../components";
import { KPI_CARDS, NEXT_ACTIONS, QUEUE_ALERTS, WORKFLOW_STAGES } from "../data";
import { cn } from "@/lib/utils";

const STAGE_TONE: Record<string, "success" | "warning" | "danger" | "info" | "neutral"> = {
  complete: "success",
  current: "info",
  pending: "neutral",
};

export default function P2PDashboardPage() {
  const [activeStage, setActiveStage] = useState(WORKFLOW_STAGES[2].id);

  const filteredAlerts = useMemo(
    () => QUEUE_ALERTS.filter((alert) => alert.stage === activeStage),
    [activeStage]
  );

  const filteredActions = useMemo(
    () => NEXT_ACTIONS.filter((action) => action.stage === activeStage),
    [activeStage]
  );

  return (
    <P2PLayout
      title="P2P Command Center"
      subtitle="Monitor procurement performance, approvals, and payment health in one view."
      meta={
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
            Cycle time: 12.4 days
          </span>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
            SLA adherence: 94%
          </span>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">
            Stable pipeline
          </span>
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {KPI_CARDS.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              {card.label}
            </p>
            <div className="mt-2 flex items-end justify-between">
              <p className="text-2xl font-semibold text-slate-900">{card.value}</p>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                {card.delta}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">{card.note}</p>
          </div>
        ))}
      </div>

      <P2PCard
        title="Workflow Stepper"
        description="Tap a stage to filter queues and next actions."
        action={
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
          >
            <Filter className="h-3.5 w-3.5" />
            Stage filter
          </button>
        }
      >
        <div className="flex flex-wrap gap-2">
          {WORKFLOW_STAGES.map((stage) => (
            <button
              key={stage.id}
              type="button"
              onClick={() => setActiveStage(stage.id)}
              className={cn(
                "rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-wide transition",
                activeStage === stage.id
                  ? "border-blue-200 bg-blue-50 text-blue-700 shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700"
              )}
            >
              {stage.label}
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-[1.2fr_1fr]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">Stage health</p>
              <P2PStatusBadge label="On track" tone="success" />
            </div>
            <div className="mt-3 space-y-2 text-xs text-slate-600">
              {WORKFLOW_STAGES.map((stage) => (
                <div key={stage.id} className="flex items-center justify-between">
                  <span>{stage.label}</span>
                  <P2PStatusBadge
                    label={stage.status}
                    tone={STAGE_TONE[stage.status]}
                    className="capitalize"
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <LineChart className="h-4 w-4 text-blue-600" />
              Cycle performance
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Average processing time by stage (days).
            </p>
            <div className="mt-4 space-y-2">
              {[
                { label: "PR", value: 2.1 },
                { label: "Budget", value: 1.6 },
                { label: "Vendors", value: 2.8 },
                { label: "Negotiation", value: 3.4 },
              ].map((metric) => (
                <div key={metric.label} className="flex items-center gap-3 text-xs text-slate-600">
                  <span className="w-20 font-semibold text-slate-700">{metric.label}</span>
                  <div className="h-2 flex-1 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-blue-500"
                      style={{ width: `${Math.min(metric.value * 18, 100)}%` }}
                    />
                  </div>
                  <span className="w-10 text-right">{metric.value}d</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </P2PCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <P2PCard
          title="Queue Watch"
          description="Alerts tied to the selected workflow stage."
        >
          <div className="space-y-3">
            {filteredAlerts.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-500">
                No alerts for this stage.
              </div>
            ) : (
              filteredAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-blue-200 hover:shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{alert.title}</p>
                    <P2PStatusBadge
                      label={alert.tone === "success" ? "Completed" : alert.tone === "danger" ? "Issue" : "Pending"}
                      tone={alert.tone as "success" | "warning" | "danger"}
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{alert.detail}</p>
                </div>
              ))
            )}
          </div>
        </P2PCard>

        <P2PCard
          title="Next Actions"
          description="Focus tasks for the selected stage."
          action={
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-blue-600/20"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Auto-assign
            </button>
          }
        >
          <div className="space-y-3">
            {filteredActions.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-500">
                No actions queued for this stage.
              </div>
            ) : (
              filteredActions.map((action) => (
                <div
                  key={action.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-blue-200 hover:shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{action.action}</p>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      {action.owner}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Due {action.due}</p>
                </div>
              ))
            )}
          </div>
        </P2PCard>
      </div>
    </P2PLayout>
  );
}
