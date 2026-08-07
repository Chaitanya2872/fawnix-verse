import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type VmsPageProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

type VmsAlertTone = "info" | "success" | "warning" | "error";
type VmsIconTone = "default" | "strong" | "success" | "warning" | "error";

const alertToneClasses: Record<VmsAlertTone, string> = {
  info: "border-border bg-muted text-foreground",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  error: "border-rose-200 bg-rose-50 text-rose-700",
};

const iconToneClasses: Record<VmsIconTone, string> = {
  default: "border-border bg-accent text-primary",
  strong: "border-primary bg-primary text-primary-foreground",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  error: "border-rose-200 bg-rose-50 text-rose-700",
};

export const vmsTextareaClassName =
  "min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none transition placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export const vmsSelectClassName =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm outline-none transition focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

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
      <div className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">{eyebrow}</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
          {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p> : null}
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
    <Card className={cn("rounded-lg border-border shadow-sm", className)}>
      {children}
    </Card>
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
    <CardHeader className={cn("flex flex-col gap-3 space-y-0 border-b border-border px-5 py-4 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0">
        <CardTitle className="text-sm text-foreground">{title}</CardTitle>
        {description ? <CardDescription className="mt-1">{description}</CardDescription> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </CardHeader>
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
    <div className="flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 px-6 py-10 text-center">
      {icon ? <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-card text-primary shadow-sm">{icon}</div> : null}
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {description ? <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">{description}</p> : null}
      {actions ? <div className="mt-4 flex flex-wrap items-center justify-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function VmsAlert({
  tone = "info",
  children,
  className,
}: {
  tone?: VmsAlertTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("rounded-lg border px-4 py-3 text-sm", alertToneClasses[tone], className)}
      role={tone === "error" ? "alert" : "status"}
    >
      {children}
    </div>
  );
}

export function VmsIconBadge({
  children,
  tone = "default",
  className,
}: {
  children: ReactNode;
  tone?: VmsIconTone;
  className?: string;
}) {
  return (
    <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border", iconToneClasses[tone], className)}>
      {children}
    </span>
  );
}

export function VmsMetricCard({
  label,
  value,
  helper,
  icon,
  to,
  highlight = false,
  footer,
  className,
}: {
  label: string;
  value: string | number;
  helper?: string;
  icon: ReactNode;
  to?: string;
  highlight?: boolean;
  footer?: ReactNode;
  className?: string;
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{value}</p>
        </div>
        <VmsIconBadge tone={highlight ? "strong" : "default"}>{icon}</VmsIconBadge>
      </div>
      {helper ? <p className="mt-3 text-sm text-muted-foreground">{helper}</p> : null}
      {footer ? <div className="mt-3">{footer}</div> : null}
    </>
  );

  const cardClassName = cn(
    "rounded-lg border bg-card p-4 text-card-foreground shadow-sm transition hover:border-primary/40 hover:bg-accent/60 hover:shadow-md",
    highlight ? "border-primary/30 bg-accent" : "border-border",
    className,
  );

  if (to) {
    return (
      <Link to={to} className={cn("block hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", cardClassName)}>
        {content}
      </Link>
    );
  }

  return <div className={cardClassName}>{content}</div>;
}

export function VmsInfoTile({
  icon,
  label,
  value,
  className,
}: {
  icon?: ReactNode;
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-border bg-muted/40 px-4 py-3", className)}>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-2 break-words text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
