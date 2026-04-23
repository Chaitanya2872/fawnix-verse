import { ReactNode } from "react";

type P2PLayoutProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  meta?: ReactNode;
};

export function P2PLayout({ title, subtitle, children, meta }: P2PLayoutProps) {
  return (
    <div className="space-y-5">
      <section className="px-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-600">
              Procure-to-Pay
            </p>
            <h1 className="mt-1.5 text-xl font-semibold text-slate-900">{title}</h1>
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          </div>
        </div>
        {meta ? <div className="mt-3">{meta}</div> : null}
      </section>

      <section className="space-y-5">{children}</section>
    </div>
  );
}
