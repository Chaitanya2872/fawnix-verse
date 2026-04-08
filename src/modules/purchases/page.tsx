import { P2PHeader, P2PNavigation } from "./shared";
import {
  REQUEST_FIELDS,
  STATUS_STYLES,
  WORKFLOW_STEPS,
} from "./data";

export default function PurchasesPage() {
  return (
    <div className="space-y-6">
      <P2PHeader />
      <P2PNavigation />

      <section className="space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Workflow Status</h2>
              <p className="text-xs text-slate-500">Compact stage tracker.</p>
            </div>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[0.65rem] font-semibold text-emerald-700">
              2/6 completed
            </span>
          </div>

          <div className="mt-3 flex flex-nowrap gap-2 overflow-x-auto pb-1">
            {WORKFLOW_STEPS.map((step) => {
              const styles = STATUS_STYLES[step.status];
              return (
                <span
                  key={step.id}
                  className={`inline-flex whitespace-nowrap items-center gap-2 rounded-full border px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-wide ${styles.badge}`}
                >
                  {step.title}
                </span>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Request Details</h2>
              <p className="text-sm text-slate-500">
                Edit core requirement data shared with procurement.
              </p>
            </div>
            <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              In progress
            </span>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {REQUEST_FIELDS.map((field) => (
              <label key={field.label} className="space-y-1 text-xs font-semibold text-slate-500">
                {field.label}
                <input
                  type="text"
                  defaultValue={field.value}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 focus:border-blue-500 focus:outline-none"
                />
              </label>
            ))}
            <label className="md:col-span-2 space-y-1 text-xs font-semibold text-slate-500">
              Requirement Summary
              <textarea
                rows={3}
                defaultValue="Procure 120 GPS devices with installation and one-year support for client fleet upgrade."
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
              />
            </label>
          </div>
        </div>
      </section>
    </div>
  );
}
