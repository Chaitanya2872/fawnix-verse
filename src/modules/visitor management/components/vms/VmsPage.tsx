import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type VmsPageProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function VmsPage({
  eyebrow = "Visitor Management",
  title,
  description,
  actions,
  children,
  className,
}: VmsPageProps) {
  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">{eyebrow}</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{title}</h2>
          {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}

export function VmsCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-lg border border-slate-200 bg-white shadow-sm", className)}>
      {children}
    </section>
  );
}

export function VmsCardHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div>
        <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  actions,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/70 px-6 py-10 text-center">
      {icon ? <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm">{icon}</div> : null}
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {description ? <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">{description}</p> : null}
      {actions ? <div className="mt-4 flex flex-wrap items-center justify-center gap-2">{actions}</div> : null}
    </div>
  );
}
