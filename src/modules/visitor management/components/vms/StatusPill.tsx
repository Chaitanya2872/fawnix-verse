import { CheckCircle2, Clock3, LogIn, ShieldAlert, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VisitorStatus } from "../../types";
import { getDisplayStatus, normalizeStatus } from "../../utils/visitorWorkflow";

const toneMap: Record<string, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  approved: "border-blue-200 bg-blue-50 text-blue-700",
  checkedin: "border-emerald-200 bg-emerald-50 text-emerald-700",
  arrived: "border-emerald-200 bg-emerald-50 text-emerald-700",
  checkedout: "border-slate-200 bg-slate-100 text-slate-700",
  completed: "border-slate-200 bg-slate-100 text-slate-700",
  rejected: "border-rose-200 bg-rose-50 text-rose-700",
  cancelled: "border-slate-200 bg-slate-50 text-slate-500",
};

function StatusIcon({ status }: { status?: VisitorStatus }) {
  const normalized = normalizeStatus(status);
  if (normalized === "approved") return <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />;
  if (normalized === "checkedin" || normalized === "arrived") return <LogIn className="h-3.5 w-3.5" aria-hidden="true" />;
  if (normalized === "rejected" || normalized === "cancelled") return <XCircle className="h-3.5 w-3.5" aria-hidden="true" />;
  if (normalized === "checkedout" || normalized === "completed") return <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />;
  if (normalized === "expired") return <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />;
  return <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />;
}

export function StatusPill({
  status,
  className,
}: {
  status?: VisitorStatus;
  className?: string;
}) {
  const normalized = normalizeStatus(status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
        toneMap[normalized] || toneMap.pending,
        className,
      )}
    >
      <StatusIcon status={status} />
      {getDisplayStatus(status)}
    </span>
  );
}
