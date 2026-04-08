import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type P2PCardProps = {
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
};

export function P2PCard({ title, description, action, className, children }: P2PCardProps) {
  return (
    <section className={cn("rounded-2xl border border-slate-200 bg-white p-6 shadow-sm", className)}>
      {(title || description || action) && (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            {title ? <h2 className="text-lg font-semibold text-slate-900">{title}</h2> : null}
            {description ? <p className="text-sm text-slate-500">{description}</p> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      )}
      <div className={title || description || action ? "mt-4" : ""}>{children}</div>
    </section>
  );
}
