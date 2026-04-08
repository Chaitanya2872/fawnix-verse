/* eslint-disable react-refresh/only-export-components */
import React from "react";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Phone,
  Send,
  Sparkles,
  Target,
  Users,
  XCircle,
} from "lucide-react";
import {
  LeadPriority,
  LeadStatus,
  getLeadStatusTransitions,
  LEAD_STATUS_LABELS,
  LEAD_STATUS_ORDER,
} from "./types";

export const fmt = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(v);

export const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export const fmtDateTime = (s: string) =>
  new Date(s).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export function getActivityTone(activity: { type: string }) {
  switch (activity.type) {
    case "call":
      return "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-800 dark:bg-cyan-950 dark:text-cyan-300";
    case "assignment_change":
      return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300";
    case "remark_added":
    case "remark_edited":
      return "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-300";
    case "follow_up_reminder":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300";
    case "scheduled":
    case "schedule_updated":
      return "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-300";
    case "converted":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300";
    case "status_change":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300";
    default:
      return "border-border bg-muted/30 text-muted-foreground";
  }
}

export const STATUS_CFG: Record<
  LeadStatus,
  { label: string; cls: string; dot: string; icon: React.ReactNode; step: number }
> = {
  NEW:                      { label: "New",                      cls: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700", dot: "bg-slate-400", icon: <Sparkles className="h-3 w-3" />, step: 0 },
  CONTACTED:                { label: "Contacted",                cls: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800", dot: "bg-sky-500", icon: <Phone className="h-3 w-3" />, step: 1 },
  FOLLOW_UP:                { label: "Follow Up",                cls: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-800", dot: "bg-cyan-500", icon: <AlertCircle className="h-3 w-3" />, step: 2 },
  QUALIFIED:                { label: "Qualified",                cls: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-800", dot: "bg-violet-500", icon: <Target className="h-3 w-3" />, step: 3 },
  UNQUALIFIED:              { label: "Unqualified",              cls: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800", dot: "bg-rose-500", icon: <XCircle className="h-3 w-3" />, step: 4 },
  ASSIGNED_TO_SALESPERSON:  { label: "Assigned to Salesperson",  cls: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800", dot: "bg-blue-500", icon: <Users className="h-3 w-3" />, step: 5 },
  PROPOSAL_SENT:            { label: "Proposal Sent",            cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800", dot: "bg-amber-500", icon: <Send className="h-3 w-3" />, step: 6 },
  CONVERTED:                { label: "Converted",                cls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800", dot: "bg-emerald-500", icon: <CheckCircle2 className="h-3 w-3" />, step: 7 },
  LOST:                     { label: "Lost",                     cls: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800", dot: "bg-red-500", icon: <XCircle className="h-3 w-3" />, step: 8 },
};

export const PRIORITY_CFG: Record<LeadPriority, { label: string; cls: string; dot: string; icon: React.ReactNode }> = {
  LOW:    { label: "Low",    cls: "text-slate-500",  dot: "bg-slate-400", icon: <ArrowDownRight className="h-3.5 w-3.5" /> },
  MEDIUM: { label: "Medium", cls: "text-amber-600",  dot: "bg-amber-500", icon: <span className="inline-block h-2 w-2 rounded-full bg-amber-500" /> },
  HIGH:   { label: "High",   cls: "text-red-600",    dot: "bg-red-500",   icon: <ArrowUpRight className="h-3.5 w-3.5" /> },
};

export const REP_COLORS: Record<string, string> = {
  "Sarah Kim":       "bg-pink-100 text-pink-700",
  "Mike Rodriguez":  "bg-blue-100 text-blue-700",
  "James Lee":       "bg-violet-100 text-violet-700",
  "Priya Singh":     "bg-amber-100 text-amber-700",
  "Alex Johnson":    "bg-teal-100 text-teal-700",
  "Emma Davis":      "bg-rose-100 text-rose-700",
};

export function StatusBadge({ status }: { status: LeadStatus }) {
  const { cls, icon, label } = STATUS_CFG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${cls}`}>
      {icon}{label}
    </span>
  );
}

export function PriorityDot({ priority }: { priority: LeadPriority }) {
  const { cls, dot, icon, label } = PRIORITY_CFG[priority];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${cls}`}>
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      <span className="inline-flex items-center">{icon}</span>
      {label}
    </span>
  );
}

export function RepAvatar({ name }: { name: string }) {
  const color = REP_COLORS[name] ?? "bg-slate-100 text-slate-700";
  return (
    <div className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold ${color}`}>
      {getInitials(name)}
    </div>
  );
}

export function PipelineProgress({ status }: { status: LeadStatus }) {
  const { step } = STATUS_CFG[status];
  const isLost = status === LeadStatus.LOST;
  const stages = LEAD_STATUS_ORDER.filter((s) => s !== LeadStatus.LOST);
  return (
    <div className="flex items-center gap-1">
      {stages.map((s, i) => {
        const active = !isLost && STATUS_CFG[s].step <= step;
        return (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full transition-colors ${active ? "bg-sky-500" : "bg-border"} ${isLost && i === stages.length - 1 ? "bg-red-400" : ""}`}
          />
        );
      })}
    </div>
  );
}

export function getDrawerStageTargets(status: LeadStatus) {
  const nextStatuses = getLeadStatusTransitions(status).filter((nextStatus) => nextStatus !== LeadStatus.CONVERTED);
  if (status === LeadStatus.FOLLOW_UP) {
    return [LeadStatus.FOLLOW_UP, ...nextStatuses];
  }
  return nextStatuses;
}

export function getMenuStageTargets(status: LeadStatus) {
  const nextStatuses = getLeadStatusTransitions(status);
  if (status === LeadStatus.FOLLOW_UP) {
    return [LeadStatus.FOLLOW_UP, ...nextStatuses];
  }
  return nextStatuses;
}

export function getStageActionLabel(status: LeadStatus) {
  if (status === LeadStatus.CONVERTED) {
    return "Convert to Opportunity";
  }
  if (status === LeadStatus.FOLLOW_UP) {
    return "Schedule Follow Up";
  }
  if (status === LeadStatus.LOST) {
    return "Mark as Lost";
  }
  return `Move to ${LEAD_STATUS_LABELS[status]}`;
}
