import { cn } from "@/lib/utils";
import type { ProjectHealth, ProjectStage, ProjectStatus } from "./types";

const STATUS_STYLES: Record<ProjectStatus, string> = {
  Planning: "border-amber-200 bg-amber-50 text-amber-700",
  Active: "border-sky-200 bg-sky-50 text-sky-700",
  "On Hold": "border-rose-200 bg-rose-50 text-rose-700",
  Completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

const HEALTH_STYLES: Record<ProjectHealth, string> = {
  "On Track": "border-emerald-200 bg-emerald-50 text-emerald-700",
  "Needs Attention": "border-amber-200 bg-amber-50 text-amber-700",
  "At Risk": "border-rose-200 bg-rose-50 text-rose-700",
  Completed: "border-slate-200 bg-slate-100 text-slate-700",
};

const STAGE_STYLES: Record<ProjectStage, string> = {
  Discovery: "bg-violet-50 text-violet-700",
  Planning: "bg-cyan-50 text-cyan-700",
  Design: "bg-fuchsia-50 text-fuchsia-700",
  Execution: "bg-blue-50 text-blue-700",
  Handover: "bg-emerald-50 text-emerald-700",
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold", STATUS_STYLES[status])}>
      {status}
    </span>
  );
}

export function ProjectHealthBadge({ health }: { health: ProjectHealth }) {
  return (
    <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold", HEALTH_STYLES[health])}>
      {health}
    </span>
  );
}

export function ProjectStageBadge({ stage }: { stage: ProjectStage }) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold", STAGE_STYLES[stage])}>
      {stage}
    </span>
  );
}
