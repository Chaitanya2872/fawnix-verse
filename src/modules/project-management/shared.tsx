import type { MilestoneStatus, Project, ProjectStatus, TaskStatus } from './types'

export const STATUS_CFG: Record<ProjectStatus, { label: string; cls: string; dot: string }> = {
  Draft:              { label: 'Draft',            cls: 'bg-slate-50 text-slate-600 border-slate-200',       dot: 'bg-slate-400'   },
  Planning:           { label: 'Planning',         cls: 'bg-slate-100 text-slate-700 border-slate-200',      dot: 'bg-slate-500'   },
  'Approval Pending': { label: 'Pending Approval', cls: 'bg-amber-50 text-amber-700 border-amber-200',       dot: 'bg-amber-500'   },
  Returned:           { label: 'Returned',         cls: 'bg-orange-50 text-orange-700 border-orange-200',    dot: 'bg-orange-500'  },
  Rejected:           { label: 'Rejected',         cls: 'bg-rose-50 text-rose-700 border-rose-200',          dot: 'bg-rose-500'    },
  Planned:            { label: 'Planned',          cls: 'bg-blue-50 text-blue-700 border-blue-200',          dot: 'bg-blue-500'    },
  Active:             { label: 'In Progress',      cls: 'bg-sky-50 text-sky-700 border-sky-200',             dot: 'bg-sky-500'     },
  'In Progress':      { label: 'In Progress',      cls: 'bg-sky-50 text-sky-700 border-sky-200',             dot: 'bg-sky-500'     },
  Delayed:            { label: 'Delayed',          cls: 'bg-rose-50 text-rose-700 border-rose-200',          dot: 'bg-rose-500'    },
  'On Hold':          { label: 'On Hold',          cls: 'bg-slate-100 text-slate-600 border-slate-200',      dot: 'bg-slate-400'   },
  'At Risk':          { label: 'At Risk',          cls: 'bg-rose-50 text-rose-700 border-rose-200',          dot: 'bg-rose-500'    },
  'Closure Pending':  { label: 'Closure Pending',  cls: 'bg-violet-50 text-violet-700 border-violet-200',    dot: 'bg-violet-500'  },
  Completed:          { label: 'Completed',        cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  Cancelled:          { label: 'Cancelled',        cls: 'bg-slate-100 text-slate-500 border-slate-200',      dot: 'bg-slate-400'   },
}

export const MILESTONE_CFG: Record<MilestoneStatus, { label: string; cls: string; accent: string }> = {
  Pending:            { label: 'Not started',      cls: 'bg-slate-100 text-slate-600 border-slate-200',      accent: 'bg-slate-300'   },
  'In Progress':      { label: 'In progress',      cls: 'bg-sky-50 text-sky-700 border-sky-200',             accent: 'bg-sky-500'     },
  Delayed:            { label: 'Delayed',          cls: 'bg-rose-50 text-rose-700 border-rose-200',          accent: 'bg-rose-500'    },
  'Approval Pending': { label: 'Pending approval', cls: 'bg-amber-50 text-amber-700 border-amber-200',       accent: 'bg-amber-400'   },
  Rework:             { label: 'Rework',           cls: 'bg-orange-50 text-orange-700 border-orange-200',    accent: 'bg-orange-500'  },
  Done:               { label: 'Completed',        cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', accent: 'bg-emerald-500' },
}

export const STATUS_STEPS: ProjectStatus[] = [
  'Approval Pending', 'Planned', 'In Progress', 'Closure Pending', 'Completed',
]

export const WORKFLOW_STATUSES = new Set<ProjectStatus>([
  'Approval Pending', 'Returned', 'Rejected', 'Planned', 'Planning',
  'In Progress', 'Active', 'Delayed', 'On Hold', 'At Risk', 'Closure Pending', 'Completed',
])

export const DOT_COLORS = [
  'bg-indigo-500', 'bg-sky-500', 'bg-violet-500',
  'bg-emerald-500', 'bg-amber-500', 'bg-rose-500',
]

export const TASK_COLUMNS: TaskStatus[] = [
  'Backlog', 'To Do', 'In Progress', 'Code Review', 'QA Testing',
  'Ready For Release', 'Production', 'Completed',
]

export const TASK_COL_COLOR: Record<TaskStatus, string> = {
  Backlog:             'bg-slate-100 text-slate-600',
  'To Do':             'bg-blue-50 text-blue-700',
  'In Progress':       'bg-sky-50 text-sky-700',
  'Code Review':       'bg-violet-50 text-violet-700',
  'QA Testing':        'bg-amber-50 text-amber-700',
  'Ready For Release': 'bg-emerald-50 text-emerald-700',
  Production:          'bg-green-50 text-green-700',
  Completed:           'bg-emerald-100 text-emerald-800',
}

export const PRIORITY_DOT: Record<string, string> = {
  Low: 'bg-slate-400', Medium: 'bg-amber-400', High: 'bg-orange-500', Critical: 'bg-rose-500',
}

export const PRIORITY_CLS: Record<string, string> = {
  Low: 'text-slate-500', Medium: 'text-amber-600', High: 'text-orange-600', Critical: 'text-rose-600',
}

export function calcProgress(project: Project): number {
  const ms = project.milestones ?? []
  if (!ms.length) return project.progress
  return Math.round((ms.filter((m) => m.status === 'Done').length / ms.length) * 100)
}

export function StatusBadge({ status }: { status: ProjectStatus }) {
  const cfg = STATUS_CFG[status]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${cfg.cls}`}>
      <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

export function MilestoneBadge({ status }: { status: MilestoneStatus }) {
  const { cls, label } = MILESTONE_CFG[status]
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${cls}`}>
      {label}
    </span>
  )
}
