import type { ReactNode } from "react";

interface ProjectManagementLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  actionButton?: ReactNode;
}

export function ProjectManagementLayout({
  children,
  title = "Project Management",
  description = "Plan delivery, align owners, and track budgets without losing the people view.",
  actionButton,
}: ProjectManagementLayoutProps) {
  return (
    <div className="flex h-full w-full flex-col gap-6">
      <section className="overflow-hidden rounded-[28px] border border-sky-100 bg-[linear-gradient(135deg,rgba(14,165,233,0.08),rgba(255,255,255,1)_38%,rgba(16,185,129,0.08))] p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-sky-700">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
              Operations
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">{description}</p>
          </div>
          {actionButton ? <div className="flex-shrink-0">{actionButton}</div> : null}
        </div>
      </section>

      <div className="flex flex-col gap-6">{children}</div>
    </div>
  );
}

export default ProjectManagementLayout;
