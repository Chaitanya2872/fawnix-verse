import { ReactNode } from "react";
type P2PLayoutProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  meta?: ReactNode;
};

export function P2PLayout({ title, subtitle, children, meta }: P2PLayoutProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-600">
              Procure-to-Pay
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900">{title}</h1>
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-xs text-slate-600">
            <p className="text-[0.65rem] font-semibold uppercase text-blue-700">
              Workspace
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">Apollo Procurement</p>
            <p className="text-[0.65rem] text-slate-500">Updated 4 mins ago</p>
          </div>
        </div>
        {meta ? <div className="mt-4">{meta}</div> : null}
      </section>

      <section className="space-y-6">{children}</section>
    </div>
  );
}
