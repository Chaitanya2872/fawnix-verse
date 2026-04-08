import { cn } from "@/lib/utils";

type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

const STATUS_STYLES: Record<StatusTone, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  danger: "border-rose-200 bg-rose-50 text-rose-700",
  info: "border-blue-200 bg-blue-50 text-blue-700",
  neutral: "border-slate-200 bg-slate-50 text-slate-600",
};

type P2PStatusBadgeProps = {
  label: string;
  tone?: StatusTone;
  className?: string;
};

export function P2PStatusBadge({ label, tone = "neutral", className }: P2PStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        STATUS_STYLES[tone],
        className
      )}
    >
      {label}
    </span>
  );
}
