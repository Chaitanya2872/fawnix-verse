import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { format, isAfter, parseISO } from 'date-fns'
import { useLocation } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Briefcase,
  Check,
  CheckCircle,
  Clock,
  Code2,
  DollarSign,
  Edit3,
  FileBadge2,
  FileText,
  Folder,
  FolderKanban,
  Goal,
  Globe,
  LayoutDashboard,
  Layers,
  Lock,
  Plus,
  Search,
  Sparkles,
  Tag,
  TimerReset,
  Users,
  X,
} from 'lucide-react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import {
  createProject as createBackendProject,
  fetchProjectSummary,
  fetchProjects as fetchBackendProjects,
  type ProjectSummary,
  updateProject as updateBackendProject,
} from './api'
import { ProjectForm } from './components/ProjectForm'
import { today } from './data'
import type { MilestoneStatus, Project, ProjectFormState, ProjectStatus, Task, TaskStatus } from './types'
import { createBlankForm, formatDate, newId, toFormState } from './utils'

/* ── Status config ────────────────────────────────────────────────── */
const STATUS_CFG: Record<ProjectStatus, { label: string; cls: string; dot: string }> = {
  Draft:              { label: 'Draft',             cls: 'bg-slate-50 text-slate-600 border-slate-200',        dot: 'bg-slate-400'   },
  Planning:           { label: 'Planning',          cls: 'bg-slate-100 text-slate-700 border-slate-200',       dot: 'bg-slate-500'   },
  'Approval Pending': { label: 'Pending Approval',  cls: 'bg-amber-50 text-amber-700 border-amber-200',        dot: 'bg-amber-500'   },
  Returned:           { label: 'Returned',           cls: 'bg-orange-50 text-orange-700 border-orange-200',     dot: 'bg-orange-500'  },
  Rejected:           { label: 'Rejected',           cls: 'bg-rose-50 text-rose-700 border-rose-200',           dot: 'bg-rose-500'    },
  Planned:            { label: 'Planned',            cls: 'bg-blue-50 text-blue-700 border-blue-200',           dot: 'bg-blue-500'    },
  Active:             { label: 'In Progress',        cls: 'bg-sky-50 text-sky-700 border-sky-200',              dot: 'bg-sky-500'     },
  'In Progress':      { label: 'In Progress',        cls: 'bg-sky-50 text-sky-700 border-sky-200',              dot: 'bg-sky-500'     },
  Delayed:            { label: 'Delayed',            cls: 'bg-rose-50 text-rose-700 border-rose-200',           dot: 'bg-rose-500'    },
  'On Hold':          { label: 'On Hold',            cls: 'bg-slate-100 text-slate-600 border-slate-200',       dot: 'bg-slate-400'   },
  'At Risk':          { label: 'At Risk',            cls: 'bg-rose-50 text-rose-700 border-rose-200',           dot: 'bg-rose-500'    },
  'Closure Pending':  { label: 'Closure Pending',    cls: 'bg-violet-50 text-violet-700 border-violet-200',     dot: 'bg-violet-500'  },
  Completed:          { label: 'Completed',          cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',  dot: 'bg-emerald-500' },
  Cancelled:          { label: 'Cancelled',          cls: 'bg-slate-100 text-slate-500 border-slate-200',       dot: 'bg-slate-400'   },
}

const MILESTONE_CFG: Record<MilestoneStatus, { label: string; cls: string; accent: string }> = {
  Pending:            { label: 'Not started',      cls: 'bg-slate-100 text-slate-600 border-slate-200',       accent: 'bg-slate-300'   },
  'In Progress':      { label: 'In progress',      cls: 'bg-sky-50 text-sky-700 border-sky-200',               accent: 'bg-sky-500'     },
  Delayed:            { label: 'Delayed',           cls: 'bg-rose-50 text-rose-700 border-rose-200',            accent: 'bg-rose-500'    },
  'Approval Pending': { label: 'Pending approval', cls: 'bg-amber-50 text-amber-700 border-amber-200',         accent: 'bg-amber-400'   },
  Rework:             { label: 'Rework',            cls: 'bg-orange-50 text-orange-700 border-orange-200',      accent: 'bg-orange-500'  },
  Done:               { label: 'Completed',         cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',  accent: 'bg-emerald-500' },
}

const STATUS_STEPS: ProjectStatus[] = ['Approval Pending', 'Planned', 'In Progress', 'Closure Pending', 'Completed']

// Statuses that have a stepper UI
const WORKFLOW_STATUSES = new Set<ProjectStatus>(['Approval Pending','Returned','Rejected','Planned','Planning','In Progress','Active','Delayed','On Hold','At Risk','Closure Pending','Completed'])

/* cycling colour dots for project rows */
const DOT_COLORS = [
  'bg-indigo-500', 'bg-sky-500', 'bg-violet-500',
  'bg-emerald-500', 'bg-amber-500', 'bg-rose-500',
]

type ProjectWorkspaceKey =
  | 'dashboard'
  | 'projects'
  | 'tasks'
  | 'kanban'
  | 'milestones'
  | 'documents'
  | 'meetings'

const PROJECT_WORKSPACE_META: Record<ProjectWorkspaceKey, { title: string; description: string; defaultTab: 'overview' | 'tasks' | 'team' | 'files'; icon: typeof LayoutDashboard }> = {
  dashboard: {
    title: 'Project Dashboard',
    description: 'Monitor project health, progress distribution, recent activity, and delivery signals.',
    defaultTab: 'overview',
    icon: LayoutDashboard,
  },
  projects: {
    title: 'Projects',
    description: 'Track projects, milestones, approvals, and team progress.',
    defaultTab: 'overview',
    icon: FolderKanban,
  },
  tasks: {
    title: 'Project Tasks',
    description: 'Review work items across projects and jump directly into delivery follow-up.',
    defaultTab: 'tasks',
    icon: CheckCircle,
  },
  kanban: {
    title: 'Kanban Board',
    description: 'Use the project workspace as a board view for backlog, execution, review, and release tracking.',
    defaultTab: 'tasks',
    icon: Layers,
  },
  milestones: {
    title: 'Milestones',
    description: 'Focus on delivery checkpoints, due dates, approvals, and overall project completion.',
    defaultTab: 'overview',
    icon: Goal,
  },
  documents: {
    title: 'Documents',
    description: 'Review requirement files and supporting attachments linked to each project.',
    defaultTab: 'files',
    icon: FileBadge2,
  },
  meetings: {
    title: 'Meetings',
    description: 'Use this workspace to prepare project reviews, align owners, and track follow-up actions.',
    defaultTab: 'overview',
    icon: Users,
  },
}

function getWorkspaceKey(pathname: string): ProjectWorkspaceKey {
  if (pathname === '/projects/dashboard') return 'dashboard'
  if (pathname === '/projects/tasks') return 'tasks'
  if (pathname === '/projects/kanban') return 'kanban'
  if (pathname === '/projects/milestones') return 'milestones'
  if (pathname === '/projects/documents') return 'documents'
  if (pathname === '/projects/meetings') return 'meetings'
  return 'projects'
}

/* ── Small reusable components ───────────────────────────────────── */
function StatusBadge({ status }: { status: ProjectStatus }) {
  const cfg = STATUS_CFG[status]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${cfg.cls}`}>
      <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

function MilestoneBadge({ status }: { status: MilestoneStatus }) {
  const { cls, label } = MILESTONE_CFG[status]
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${cls}`}>
      {label}
    </span>
  )
}

function DetailField({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="text-sm font-medium text-foreground">
        {value || <span className="font-normal text-muted-foreground">Not set</span>}
      </div>
    </div>
  )
}

function SectionHeader({ icon, iconCls, title, sub }: { icon: ReactNode; iconCls: string; title: string; sub: string }) {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${iconCls}`}>{icon}</div>
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
    </div>
  )
}

/* ── Helpers ─────────────────────────────────────────────────────── */

function calcProgress(project: Project) {
  const ms = project.milestones ?? []
  if (!ms.length) return project.progress
  return Math.round((ms.filter((m) => m.status === 'Done').length / ms.length) * 100)
}

/* ── Page ────────────────────────────────────────────────────────── */
export default function ProjectManagementPage() {
  const location = useLocation()
  const [projects, setProjects] = useState<Project[]>([])
  const [summary, setSummary] = useState<ProjectSummary>({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    pendingApprovalProjects: 0,
    overdueProjects: 0,
  })
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formState, setFormState] = useState<ProjectFormState>(createBlankForm)
  const [milestoneTitle, setMilestoneTitle] = useState('')
  const [milestoneDue, setMilestoneDue] = useState(format(today, 'yyyy-MM-dd'))
  const [milestoneApproval, setMilestoneApproval] = useState(false)
  const [backendStatus, setBackendStatus] = useState<'idle' | 'connected' | 'offline'>('idle')
  const [isSaving, setIsSaving] = useState(false)
  const [detailTab, setDetailTab] = useState<'overview' | 'tasks' | 'team' | 'files'>('overview')
  const workspaceKey = useMemo(() => getWorkspaceKey(location.pathname), [location.pathname])
  const workspaceMeta = PROJECT_WORKSPACE_META[workspaceKey]
  const WorkspaceIcon = workspaceMeta.icon

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchBackendProjects(), fetchProjectSummary()])
      .then(([bp, nextSummary]) => {
        if (cancelled) return
        setProjects(bp)
        setSummary(nextSummary)
        setBackendStatus('connected')
      })
      .catch(() => { if (!cancelled) setBackendStatus('offline') })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    setDetailTab(workspaceMeta.defaultTab)
  }, [workspaceMeta.defaultTab])

  useEffect(() => {
    if (!currentId && projects.length > 0 && workspaceKey !== 'dashboard') {
      setCurrentId(projects[0].id)
    }
  }, [currentId, projects, workspaceKey])

  const currentProject = useMemo(
    () => projects.find((p) => p.id === currentId) ?? null,
    [currentId, projects],
  )

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase()
    return projects.filter((p) => {
      const matchSearch =
        !query ||
        [p.name, p.description, p.projectCode, p.department, p.manager]
          .join(' ')
          .toLowerCase()
          .includes(query)
      const matchStatus = statusFilter === 'ALL' || p.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [projects, search, statusFilter])

  const pieData = useMemo(() => {
    const groups: { name: string; statuses: ProjectStatus[]; color: string }[] = [
      { name: 'Planning',    statuses: ['Planning'],                          color: '#94a3b8' },
      { name: 'Pending',     statuses: ['Approval Pending', 'Returned'],      color: '#f59e0b' },
      { name: 'Rejected',    statuses: ['Rejected'],                          color: '#f43f5e' },
      { name: 'Planned',     statuses: ['Planned'],                           color: '#3b82f6' },
      { name: 'In Progress', statuses: ['Active', 'In Progress'],             color: '#0ea5e9' },
      { name: 'At Risk',     statuses: ['Delayed', 'On Hold', 'At Risk'],     color: '#ef4444' },
      { name: 'Closure',     statuses: ['Closure Pending'],                   color: '#8b5cf6' },
      { name: 'Completed',   statuses: ['Completed'],                         color: '#10b981' },
    ]
    return groups
      .map((g) => ({ name: g.name, value: projects.filter((p) => g.statuses.includes(p.status)).length, color: g.color }))
      .filter((g) => g.value > 0)
  }, [projects])

  const recentActivity = useMemo(
    () =>
      projects
        .flatMap((p) => (p.activityHistory ?? []).map((a) => ({ ...a, projectName: p.name })))
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 10),
    [projects],
  )

  const workspaceStats = useMemo(() => {
    const totalMilestones = projects.reduce((count, project) => count + project.milestones.length, 0)
    const completedMilestones = projects.reduce((count, project) => count + project.milestones.filter((milestone) => milestone.status === 'Done').length, 0)
    const totalTasks = projects.reduce((count, project) => count + (project.tasks?.length ?? 0), 0)
    const openTasks = projects.reduce(
      (count, project) => count + (project.tasks?.filter((task) => task.status !== 'Completed').length ?? 0),
      0,
    )

    return [
      {
        label: 'Total Projects',
        value: summary.totalProjects,
        hint: `${summary.activeProjects} active now`,
        icon: FolderKanban,
        tone: 'from-sky-500/15 via-cyan-500/10 to-transparent text-sky-700',
      },
      {
        label: 'Pending Approval',
        value: summary.pendingApprovalProjects,
        hint: `${summary.overdueProjects} overdue timelines`,
        icon: TimerReset,
        tone: 'from-amber-500/15 via-orange-500/10 to-transparent text-amber-700',
      },
      {
        label: 'Milestones Closed',
        value: completedMilestones,
        hint: `${totalMilestones} tracked`,
        icon: Goal,
        tone: 'from-emerald-500/15 via-green-500/10 to-transparent text-emerald-700',
      },
      {
        label: 'Open Tasks',
        value: openTasks,
        hint: `${totalTasks} work items`,
        icon: CheckCircle,
        tone: 'from-violet-500/15 via-indigo-500/10 to-transparent text-violet-700',
      },
    ]
  }, [projects, summary])

  const spotlightProjects = useMemo(() => {
    return [...projects]
      .sort((left, right) => {
        if (right.progress !== left.progress) return right.progress - left.progress
        return left.endDate.localeCompare(right.endDate)
      })
      .slice(0, 3)
  }, [projects])

  /* ── Actions ───────────────────────────────────────────────────── */
  const openCreate = () => { setCurrentId(null); setFormState(createBlankForm()); setIsModalOpen(true) }
  const openEdit = (p: Project) => { setCurrentId(p.id); setFormState(toFormState(p)); setIsModalOpen(true) }
  const selectProject = (id: string) => { setCurrentId(id); setDetailTab('overview') }
  const closeModal = () => setIsModalOpen(false)

  const handleFormChange = (
    field: keyof ProjectFormState,
    value: ProjectFormState[keyof ProjectFormState],
  ) => {
    setFormState((cur) => {
      if (field === 'department') return { ...cur, department: String(value), teamMembers: [] }
      return { ...cur, [field]: value }
    })
  }

  const saveProject = async (overrides: Partial<ProjectFormState> = {}) => {
    const next = { ...formState, ...overrides }
    if (
      !next.name.trim() ||
      !next.projectCode.trim() ||
      isAfter(parseISO(next.startDate), parseISO(next.endDate))
    )
      return

    setIsSaving(true)
    if (currentProject) {
      try {
        const saved = await updateBackendProject(currentProject.id, next, currentProject)
        setProjects((cur) => cur.map((p) => (p.id === currentProject.id ? saved : p)))
        setBackendStatus('connected')
        closeModal()
      } catch {
        setBackendStatus('offline')
      } finally {
        setIsSaving(false)
      }
      return
    } else {
      try {
        const saved = await createBackendProject(next)
        setProjects((cur) => [saved, ...cur])
        setCurrentId(saved.id)
        setBackendStatus('connected')
        closeModal()
      } catch {
        setBackendStatus('offline')
      } finally {
        setIsSaving(false)
      }
      return
    }
  }

  const updateProject = (updater: (p: Project) => Project) => {
    if (!currentProject) return
    setProjects((cur) => cur.map((p) => (p.id === currentProject.id ? updater(p) : p)))
  }
  const withActivity = (p: Project, msg: string): Project => ({
    ...p,
    activityHistory: [
      { id: newId('act'), message: msg, actor: p.manager, date: format(today, 'yyyy-MM-dd') },
      ...p.activityHistory,
    ],
  })
  const setProjectStatus = (status: ProjectStatus, msg: string) =>
    updateProject((p) => withActivity({ ...p, status }, msg))

  const addMilestone = () => {
    if (!milestoneTitle.trim()) return
    updateProject((p) =>
      withActivity(
        {
          ...p,
          milestones: [
            ...p.milestones,
            {
              id: newId('ms'),
              title: milestoneTitle.trim(),
              dueDate: milestoneDue,
              status: 'Pending',
              approvalRequired: milestoneApproval,
              approvalStatus: 'Not Required',
            },
          ],
        },
        `Milestone created: ${milestoneTitle.trim()}`,
      ),
    )
    setMilestoneTitle('')
    setMilestoneDue(currentProject?.endDate ?? format(today, 'yyyy-MM-dd'))
    setMilestoneApproval(false)
  }

  const updateMilestone = (id: string, status: MilestoneStatus) => {
    updateProject((p) => {
      const milestones = p.milestones.map((m) =>
        m.id === id
          ? {
              ...m, status,
              approvalStatus:
                status === 'Approval Pending' ? 'Pending'
                : status === 'Done' ? 'Approved'
                : m.approvalStatus,
            }
          : m,
      )
      return withActivity(
        { ...p, milestones, progress: calcProgress({ ...p, milestones }) },
        `Milestone updated to ${status}`,
      )
    })
  }

  /* ── Stepper ────────────────────────────────────────────────────── */
  const renderStepper = (project: Project) => {
    const steps = project.approvalRequired
      ? STATUS_STEPS
      : STATUS_STEPS.filter((s) => s !== 'Approval Pending')
    const norm: ProjectStatus = project.status === 'Active' ? 'In Progress' : project.status
    const ci = Math.max(0, steps.indexOf(norm))

    return (
      <div className="mb-5 flex items-start">
        {steps.map((step, i) => {
          const done = project.status === 'Completed' || i < ci
          const active = i === ci && project.status !== 'Completed'
          const error = project.status === 'Rejected' && step === 'Approval Pending'
          return (
            <div key={step} className="flex flex-1 items-start">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={[
                    'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-semibold transition-all',
                    error  ? 'border-rose-500 bg-rose-500 text-white'
                    : done   ? 'border-emerald-500 bg-emerald-500 text-white'
                    : active ? 'border-sky-600 bg-sky-600 text-white ring-4 ring-sky-100'
                    :          'border-border bg-background text-muted-foreground',
                  ].join(' ')}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : error ? '!' : i + 1}
                </div>
                <span
                  className={[
                    'hidden whitespace-nowrap text-[10px] font-medium sm:block',
                    active ? 'text-sky-600' : done ? 'text-foreground' : 'text-muted-foreground',
                  ].join(' ')}
                >
                  {STATUS_CFG[step].label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={`mx-1 mt-3.5 h-0.5 flex-1 ${done ? 'bg-emerald-500' : 'bg-border'}`} />
              )}
            </div>
          )
        })}
      </div>
    )
  }

  /* ── Action panel ────────────────────────────────────────────────── */
  const renderActionPanel = (project: Project) => {
    const done = project.milestones.filter((m) => m.status === 'Done').length
    const allDone = project.milestones.length > 0 && done === project.milestones.length
    const canStart = project.milestones.length > 0 && Boolean(project.manager)

    const Panel = ({
      icon, iconCls, title, desc, children,
    }: {
      icon: ReactNode; iconCls: string; title: string; desc: string; children: ReactNode
    }) => (
      <div className="mb-5 flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card px-5 py-4 shadow-sm">
        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${iconCls}`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
        </div>
        <div className="flex flex-wrap gap-2">{children}</div>
      </div>
    )

    const BtnPrimary = ({ label, onClick, disabled = false }: { label: string; onClick: () => void; disabled?: boolean }) => (
      <button type="button" disabled={disabled} onClick={onClick}
        className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50">
        {label}
      </button>
    )
    const BtnSuccess = ({ label, onClick }: { label: string; onClick: () => void }) => (
      <button type="button" onClick={onClick}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700">
        {label}
      </button>
    )
    const BtnGhost = ({ label, onClick }: { label: string; onClick: () => void }) => (
      <button type="button" onClick={onClick}
        className="rounded-lg border border-border bg-background px-4 py-2 text-xs font-medium transition-colors hover:bg-accent">
        {label}
      </button>
    )
    const BtnDanger = ({ label, onClick }: { label: string; onClick: () => void }) => (
      <button type="button" onClick={onClick}
        className="rounded-lg border border-rose-200 bg-background px-4 py-2 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50">
        {label}
      </button>
    )

    if (project.status === 'Draft' || project.status === 'Cancelled') return null

    if (project.status === 'Approval Pending')
      return (
        <Panel icon={<Clock className="h-5 w-5" />} iconCls="bg-amber-50 text-amber-600"
          title="Awaiting creation approval" desc="Review the project details, then approve or reject.">
          <BtnSuccess label="Approve" onClick={() => setProjectStatus('Planned', 'Project approved')} />
          <BtnDanger  label="Reject"  onClick={() => setProjectStatus('Rejected', 'Project rejected')} />
        </Panel>
      )

    if (project.status === 'Rejected' || project.status === 'Returned')
      return (
        <Panel icon={<X className="h-5 w-5" />} iconCls="bg-rose-50 text-rose-600"
          title="Project was returned" desc="Revise the details and resubmit for approval.">
          <BtnGhost   label="Edit details" onClick={() => openEdit(project)} />
          <BtnPrimary label="Resubmit"     onClick={() => setProjectStatus('Approval Pending', 'Project resubmitted')} />
        </Panel>
      )

    if (project.status === 'Planned' || project.status === 'Planning')
      return (
        <Panel icon={<Check className="h-5 w-5" />} iconCls="bg-blue-50 text-blue-600"
          title="Ready to plan"
          desc={canStart ? 'Manager, team, and milestones are set. Ready to start.' : 'Assign a manager and add at least one milestone before starting.'}>
          <BtnGhost   label="Assign manager & team" onClick={() => openEdit(project)} />
          <BtnPrimary label="Start project"          onClick={() => setProjectStatus('In Progress', 'Project started')} disabled={!canStart} />
        </Panel>
      )

    if (project.status === 'Closure Pending')
      return (
        <Panel icon={<Clock className="h-5 w-5" />} iconCls="bg-violet-50 text-violet-600"
          title="Closure pending approval" desc="All milestones are done. Approve closure to complete, or reopen for more work.">
          <BtnSuccess label="Approve closure"     onClick={() => setProjectStatus('Completed', 'Closure approved')} />
          <BtnGhost   label="Reopen for updates"  onClick={() => setProjectStatus('In Progress', 'Project reopened')} />
        </Panel>
      )

    if (project.status === 'Completed')
      return (
        <Panel icon={<CheckCircle className="h-5 w-5" />} iconCls="bg-emerald-50 text-emerald-600"
          title="Project completed" desc="This project has been closed and marked complete.">
          <BtnGhost label="Reopen project" onClick={() => setProjectStatus('In Progress', 'Project reopened')} />
        </Panel>
      )

    return (
      <Panel icon={<Activity className="h-5 w-5" />} iconCls="bg-sky-50 text-sky-600"
        title="In progress"
        desc={`${done} of ${project.milestones.length} milestones completed. Finish them all to initiate closure.`}>
        <BtnGhost   label="Edit details"     onClick={() => openEdit(project)} />
        <BtnPrimary label="Initiate closure" onClick={() => setProjectStatus('Closure Pending', 'Project closure initiated')} disabled={!allDone} />
      </Panel>
    )
  }

  /* ── Task helpers ─────────────────────────────────────────────────── */
  const TASK_COLUMNS: TaskStatus[] = ['Backlog','To Do','In Progress','Code Review','QA Testing','Ready For Release','Production','Completed']

  const addTask = (projectId: string) => {
    const task: Task = {
      id: newId('task'),
      projectId,
      title: 'New Task',
      description: '',
      status: 'To Do',
      assignee: '',
      priority: 'Medium',
      dueDate: format(today, 'yyyy-MM-dd'),
      createdAt: format(today, 'yyyy-MM-dd'),
      tags: [],
    }
    setProjects((cur) => cur.map((p) => p.id === projectId ? { ...p, tasks: [...(p.tasks ?? []), task] } : p))
  }

  const updateTaskStatus = (projectId: string, taskId: string, status: TaskStatus) => {
    setProjects((cur) => cur.map((p) => p.id === projectId ? { ...p, tasks: (p.tasks ?? []).map((t) => t.id === taskId ? { ...t, status } : t) } : p))
  }

  const deleteTask = (projectId: string, taskId: string) => {
    setProjects((cur) => cur.map((p) => p.id === projectId ? { ...p, tasks: (p.tasks ?? []).filter((t) => t.id !== taskId) } : p))
  }

  /* ── Detail drawer content ────────────────────────────────────────── */
  const renderDetailContent = (project: Project) => {
    const idx = projects.findIndex((p) => p.id === project.id)
    const dotCls = DOT_COLORS[idx % DOT_COLORS.length]
    const done = project.milestones.filter((m) => m.status === 'Done').length
    const canAdd = ['Planned', 'Planning', 'In Progress', 'Active'].includes(project.status)
    const approvalText = project.approvalRequired
      ? `Required — ${project.approvalStatus}`
      : 'Not required'
    const closureText = project.closureApprovalRequired
      ? `Required — ${project.closureStatus}`
      : 'Not required'

    return (
      <div className="flex flex-col">
        {/* Drawer header */}
        <div className="sticky top-0 z-10 border-b border-border bg-background">
          <div className="flex items-center gap-3 px-5 py-3">
            <button type="button" onClick={() => setCurrentId(null)} className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent">
              <X className="h-4 w-4" />
            </button>
            <div className={`h-2.5 w-2.5 flex-shrink-0 rounded-sm ${dotCls}`} />
            <h2 className="min-w-0 flex-1 truncate text-base font-semibold">{project.name}</h2>
            <StatusBadge status={project.status} />
            <button type="button" onClick={() => openEdit(project)} className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent">
              <Edit3 className="h-3.5 w-3.5" /> Edit
            </button>
          </div>
          {/* Tabs */}
          <div className="flex items-center gap-0 px-5">
            {(['overview','tasks','team','files'] as const).map((tab) => (
              <button key={tab} type="button" onClick={() => setDetailTab(tab)}
                className={`border-b-2 px-3 py-2 text-xs font-medium capitalize transition-colors ${detailTab === tab ? 'border-sky-600 text-sky-700' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        {detailTab === 'tasks' ? (
          <div className="px-5 pb-5 pt-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">Task Board</p>
              <button type="button" onClick={() => addTask(project.id)} className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700">
                <Plus className="h-3.5 w-3.5" /> Add Task
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {TASK_COLUMNS.map((col) => {
                const colTasks = (project.tasks ?? []).filter((t) => t.status === col)
                const colColor: Record<TaskStatus, string> = {
                  'Backlog': 'bg-slate-100 text-slate-600',
                  'To Do': 'bg-blue-50 text-blue-700',
                  'In Progress': 'bg-sky-50 text-sky-700',
                  'Code Review': 'bg-violet-50 text-violet-700',
                  'QA Testing': 'bg-amber-50 text-amber-700',
                  'Ready For Release': 'bg-emerald-50 text-emerald-700',
                  'Production': 'bg-green-50 text-green-700',
                  'Completed': 'bg-emerald-100 text-emerald-800',
                }
                return (
                  <div key={col} className="flex w-48 flex-shrink-0 flex-col rounded-xl border border-border bg-muted/30 p-3">
                    <div className={`mb-2 inline-flex items-center justify-between rounded-full px-2 py-0.5 text-[10px] font-semibold ${colColor[col]}`}>
                      <span>{col}</span>
                      <span className="ml-1 rounded-full bg-white/60 px-1.5">{colTasks.length}</span>
                    </div>
                    <div className="flex flex-1 flex-col gap-2">
                      {colTasks.map((task) => (
                        <div key={task.id} className="rounded-lg border border-border bg-background p-2.5 shadow-sm">
                          <p className="text-xs font-medium leading-tight">{task.title}</p>
                          {task.assignee && <p className="mt-1 text-[10px] text-muted-foreground">{task.assignee}</p>}
                          <div className="mt-2 flex items-center justify-between">
                            <select value={task.status} onChange={(e) => updateTaskStatus(project.id, task.id, e.target.value as TaskStatus)}
                              className="max-w-[100px] rounded border border-border bg-background py-0.5 text-[10px] outline-none">
                              {TASK_COLUMNS.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <button type="button" onClick={() => deleteTask(project.id, task.id)} className="text-muted-foreground hover:text-rose-500">
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : detailTab === 'team' ? (
          <div className="px-5 pb-5 pt-4 space-y-3">
            <p className="text-sm font-semibold">Team Members</p>
            {(project.team ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No team members assigned.</p>
            ) : (
              <div className="space-y-2">
                {(project.team ?? []).map((member) => (
                  <div key={member.name} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-700">
                      {member.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.role}</p>
                    </div>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {member.permissions.slice(0, 3).map((p) => (
                        <span key={p} className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">{p.replace('_', ' ')}</span>
                      ))}
                      {member.permissions.length > 3 && <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">+{member.permissions.length - 3}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : detailTab === 'files' ? (
          <div className="px-5 pb-5 pt-4 space-y-3">
            <p className="text-sm font-semibold">Attachments</p>
            {project.requirementDocument && (
              <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                <FileText className="h-5 w-5 flex-shrink-0 text-sky-600" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{project.requirementDocument.name}</p>
                  <p className="text-xs text-muted-foreground">{project.requirementDocument.size} · {project.requirementDocument.uploadedBy}</p>
                </div>
              </div>
            )}
            {(project.attachments ?? []).map((att) => (
              <div key={att.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                <FileText className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{att.name}</p>
                  <p className="text-xs text-muted-foreground">{att.size} · {att.uploadedBy}</p>
                </div>
              </div>
            ))}
            {!project.requirementDocument && (project.attachments ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">No files attached.</p>
            )}
          </div>
        ) : (
        <div className="px-5 pb-5 pt-0 space-y-4">

          {/* Description */}
          {project.description && (
            <p className="pt-2 text-sm leading-relaxed text-muted-foreground">{project.description}</p>
          )}

          {/* Stepper */}
          {WORKFLOW_STATUSES.has(project.status) && renderStepper(project)}

          {/* Action panel */}
          {renderActionPanel(project)}

          {/* ── Step 1: Project Info ───────────────────────────────── */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <SectionHeader icon={<Briefcase className="h-4 w-4" />} iconCls="bg-sky-50 text-sky-600" title="Project Info" sub="Basic details and classification" />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="col-span-2 sm:col-span-4"><DetailField label="Project Name" value={project.name} /></div>
              <DetailField label="Project Code" value={project.projectCode} />
              <DetailField label="Type"         value={project.projectType} />
              <DetailField label="Category"     value={project.projectCategory} />
              <DetailField label="Priority"     value={project.priority} />
              <DetailField label="Template"     value={project.projectTemplate} />
              <DetailField label="Group"        value={project.department} />
              <DetailField label="Status"       value={STATUS_CFG[project.status].label} />
              <DetailField label="Progress"     value={`${calcProgress(project)}% (${done}/${project.milestones.length} milestones)`} />
            </div>
            {(project.tags ?? []).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(project.tags ?? []).map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[11px] font-semibold text-sky-700">
                    <Tag className="h-2.5 w-2.5" />{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* ── Step 2: Client & Stakeholder ─────────────────────── */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <SectionHeader icon={<Globe className="h-4 w-4" />} iconCls="bg-emerald-50 text-emerald-600" title="Client & Stakeholder" sub="External contact and commercial info" />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <DetailField label="Client Name"    value={project.clientName} />
              <DetailField label="Company"        value={project.clientCompany} />
              <DetailField label="Email"          value={project.clientEmail} />
              <DetailField label="Phone"          value={project.clientPhone} />
              <DetailField label="Location"       value={project.clientLocation} />
              <DetailField label="Project Owner"  value={project.projectOwner} />
            </div>
            {(project.stakeholders ?? []).length > 0 && (
              <div className="mt-2">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Stakeholders</p>
                <div className="flex flex-wrap gap-1.5">
                  {(project.stakeholders ?? []).map((s) => (
                    <span key={s} className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[9px] font-bold text-slate-600" title={s}>
                      {s.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </span>
                  ))}
                  {(project.stakeholders ?? []).map((s) => (
                    <span key={`label-${s}`} className="text-xs text-muted-foreground">{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Step 3: Timeline ──────────────────────────────────── */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <SectionHeader icon={<Activity className="h-4 w-4" />} iconCls="bg-violet-50 text-violet-600" title="Timeline" sub="Schedule and deadline configuration" />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <DetailField label="Start Date"    value={formatDate(project.startDate)} />
              <DetailField label="Expected End"  value={formatDate(project.endDate)} />
              <DetailField label="Actual End"    value={project.actualEndDate ? formatDate(project.actualEndDate) : undefined} />
              <DetailField label="Deadline Type" value={project.deadlineType} />
            </div>
            <div className="mt-2 rounded-lg border border-border bg-muted/20 p-2 text-xs text-muted-foreground">
              Duration: <span className="font-semibold text-foreground">
                {Math.ceil((new Date(project.endDate).getTime() - new Date(project.startDate).getTime()) / 86400000)} days
              </span>
            </div>
          </div>

          {/* ── Step 4: Team ─────────────────────────────────────── */}
          {((project.team ?? []).length > 0 || project.manager) && (
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <SectionHeader icon={<Users className="h-4 w-4" />} iconCls="bg-sky-50 text-sky-600" title="Team Assignment" sub="Roles, members, and permissions" />
              <div className="grid grid-cols-2 gap-2 mb-3">
                <DetailField label="Project Manager" value={project.manager} />
                <DetailField label="Team Lead" value={(project.team ?? []).find(m => m.role === 'Team Lead')?.name} />
              </div>
              {(project.team ?? []).length > 0 && (
                <div className="space-y-2">
                  {(project.team ?? []).map((member) => (
                    <div key={member.name} className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 p-2.5">
                      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-sky-100 text-[10px] font-bold text-sky-700">
                        {member.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold">{member.name}</p>
                        <p className="text-[10px] text-muted-foreground">{member.role}</p>
                      </div>
                      <div className="flex flex-wrap gap-1 justify-end">
                        {member.permissions.slice(0, 3).map((p) => (
                          <span key={p} className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">{p.replace(/_/g, ' ')}</span>
                        ))}
                        {member.permissions.length > 3 && <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">+{member.permissions.length - 3}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Step 5: Technology Stack & Repository ────────────── */}
          {project.techStack && (project.techStack.frontend.length > 0 || project.techStack.backend.length > 0 || project.techStack.database.length > 0 || project.techStack.other.length > 0 || project.repository?.gitUrl) && (
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <SectionHeader icon={<Code2 className="h-4 w-4" />} iconCls="bg-slate-50 text-slate-600" title="Technology & Repository" sub="Tech stack and environment URLs" />
              {[['Frontend', project.techStack.frontend],['Backend', project.techStack.backend],['Database', project.techStack.database],['DevOps', project.techStack.other]].map(([label, items]) =>
                (items as string[]).length > 0 ? (
                  <div key={label as string} className="mb-2 flex flex-wrap items-center gap-1.5">
                    <span className="w-16 flex-shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
                    {(items as string[]).map((t) => <span key={t} className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[11px] font-medium">{t}</span>)}
                  </div>
                ) : null
              )}
              {project.repository?.gitUrl && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <DetailField label="Git Repository" value={project.repository.gitUrl} />
                  <DetailField label="Branch Strategy" value={project.repository.branchStrategy} />
                  {project.repository.devUrl && <DetailField label="Dev URL" value={project.repository.devUrl} />}
                  {project.repository.testingUrl && <DetailField label="Testing URL" value={project.repository.testingUrl} />}
                  {project.repository.productionUrl && <DetailField label="Production URL" value={project.repository.productionUrl} />}
                </div>
              )}
            </div>
          )}

          {/* ── Step 6: Modules & Sprints ────────────────────────── */}
          {((project.modules ?? []).length > 0 || (project.sprints ?? []).length > 0) && (
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <SectionHeader icon={<Layers className="h-4 w-4" />} iconCls="bg-amber-50 text-amber-600" title="Modules & Sprints" sub="Work breakdown and sprint plan" />
              {(project.modules ?? []).length > 0 && (
                <div className="mb-3">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Modules</p>
                  <div className="space-y-2">
                    {(project.modules ?? []).map((mod) => (
                      <div key={mod.id} className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 p-2.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold">{mod.name || 'Unnamed module'}</p>
                          {mod.description && <p className="text-[10px] text-muted-foreground">{mod.description}</p>}
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-[10px] text-muted-foreground">{mod.owner}</p>
                          <p className="text-[10px] text-muted-foreground">{formatDate(mod.startDate)} → {formatDate(mod.endDate)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {(project.sprints ?? []).length > 0 && (
                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Sprints</p>
                  <div className="space-y-2">
                    {(project.sprints ?? []).map((spr, i) => (
                      <div key={spr.id} className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 p-2.5">
                        <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-sky-100 text-[9px] font-bold text-sky-700">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold">{spr.goal || `Sprint ${i + 1}`}</p>
                          <p className="text-[10px] text-muted-foreground">{spr.duration} · {formatDate(spr.startDate)} → {formatDate(spr.endDate)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Step 7: Budget & Communication ───────────────────── */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <SectionHeader icon={<DollarSign className="h-4 w-4" />} iconCls="bg-emerald-50 text-emerald-600" title="Budget & Communication" sub="Cost breakdown and team communication channels" />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <DetailField label="Estimated Budget" value={project.budget ? `$${project.budget.toLocaleString()}` : undefined} />
              <DetailField label="Development Cost" value={project.developmentCost ? `$${project.developmentCost.toLocaleString()}` : undefined} />
              <DetailField label="Resource Cost"    value={project.resourceCost ? `$${project.resourceCost.toLocaleString()}` : undefined} />
              <DetailField label="Remaining Budget" value={project.budget ? `$${Math.max(0, project.budget - (project.developmentCost ?? 0) - (project.resourceCost ?? 0)).toLocaleString()}` : undefined} />
            </div>
            {(project.communication?.slackChannel || project.communication?.teamsChannel || project.communication?.meetingLink) && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {project.communication.slackChannel && <DetailField label="Slack Channel" value={project.communication.slackChannel} />}
                {project.communication.teamsChannel && <DetailField label="Teams Channel" value={project.communication.teamsChannel} />}
                {project.communication.meetingLink && <DetailField label="Meeting Link" value={project.communication.meetingLink} />}
                <DetailField label="Reporting" value={project.communication.reportingFrequency} />
              </div>
            )}
            {project.notes && (
              <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Notes</p>
                <p className="text-sm leading-relaxed text-foreground">{project.notes}</p>
              </div>
            )}
          </div>

          {/* ── Step 8: Risks ────────────────────────────────────── */}
          {(project.risks ?? []).length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <SectionHeader icon={<AlertTriangle className="h-4 w-4" />} iconCls="bg-rose-50 text-rose-600" title="Risk Management" sub="Identified risks and mitigation plans" />
              <div className="space-y-2">
                {(project.risks ?? []).map((risk) => {
                  const levelCls = { Low: 'text-emerald-600 bg-emerald-50 border-emerald-200', Medium: 'text-amber-600 bg-amber-50 border-amber-200', High: 'text-orange-600 bg-orange-50 border-orange-200', Critical: 'text-rose-600 bg-rose-50 border-rose-200' }[risk.level]
                  return (
                    <div key={risk.id} className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 p-3">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold flex-shrink-0 ${levelCls}`}>{risk.level}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold">{risk.name}</p>
                        {risk.impact && <p className="mt-0.5 text-[11px] text-muted-foreground">Impact: {risk.impact}</p>}
                        {risk.solution && <p className="mt-0.5 text-[11px] text-sky-600">Solution: {risk.solution}</p>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Access & Approvals ───────────────────────────────── */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <SectionHeader icon={<Lock className="h-4 w-4" />} iconCls="bg-amber-50 text-amber-600" title="Access & Approvals" sub="Review state and closure approval" />
            <div className="grid grid-cols-2 gap-2">
              <DetailField label="Creation Approval" value={approvalText} />
              <DetailField label="Closure Approval"  value={closureText} />
            </div>
          </div>

          {/* ── Milestones ───────────────────────────────────────── */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Milestones</h3>
              <span className="text-xs text-muted-foreground">{done}/{project.milestones.length} completed</span>
            </div>

            {canAdd && (
              <div className="mb-3 flex flex-wrap items-end gap-3 rounded-xl border border-sky-200 bg-sky-50/50 p-3">
                <div className="min-w-[160px] flex-1">
                  <p className="mb-1 text-[10px] font-medium text-muted-foreground">Title</p>
                  <input className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-colors"
                    value={milestoneTitle} onChange={(e) => setMilestoneTitle(e.target.value)} placeholder="Milestone title" onKeyDown={(e) => e.key === 'Enter' && addMilestone()} />
                </div>
                <div>
                  <p className="mb-1 text-[10px] font-medium text-muted-foreground">Due date</p>
                  <input type="date" className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-colors"
                    value={milestoneDue} onChange={(e) => setMilestoneDue(e.target.value)} />
                </div>
                <label className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <input type="checkbox" className="h-3.5 w-3.5 rounded accent-sky-600" checked={milestoneApproval} onChange={(e) => setMilestoneApproval(e.target.checked)} />
                  Requires approval
                </label>
                <button type="button" onClick={addMilestone} disabled={!milestoneTitle.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50">
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
              </div>
            )}

            {project.milestones.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-border p-6 text-center">
                <p className="text-sm text-muted-foreground">No milestones yet.{canAdd ? ' Add the first one above.' : ''}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {project.milestones.map((ms) => {
                  const cfg = MILESTONE_CFG[ms.status]
                  return (
                    <div key={ms.id} className="flex items-center gap-0 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                      <div className={`w-1 self-stretch flex-shrink-0 ${cfg.accent}`} />
                      <div className="min-w-0 flex-1 py-3 pl-4 pr-2">
                        <div className="mb-1 flex flex-wrap items-center gap-1.5">
                          <MilestoneBadge status={ms.status} />
                          {ms.approvalRequired && <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground"><Lock className="h-2.5 w-2.5" />Approval</span>}
                        </div>
                        <p className="truncate text-sm font-medium">{ms.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">Due {formatDate(ms.dueDate)}</p>
                      </div>
                      <div className="flex flex-shrink-0 flex-wrap gap-1.5 py-3 pr-4">
                        {ms.status === 'Pending' && <button type="button" onClick={() => updateMilestone(ms.id, 'In Progress')} className="rounded-md border border-border bg-background px-2.5 py-1 text-[11px] font-medium transition-colors hover:bg-accent">Start</button>}
                        {ms.status === 'In Progress' && (<><button type="button" onClick={() => updateMilestone(ms.id, ms.approvalRequired ? 'Approval Pending' : 'Done')} className="rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-emerald-700">Complete</button><button type="button" onClick={() => updateMilestone(ms.id, 'Delayed')} className="rounded-md border border-rose-200 bg-background px-2.5 py-1 text-[11px] font-semibold text-rose-600 transition-colors hover:bg-rose-50">Delayed</button></>)}
                        {ms.status === 'Delayed' && <button type="button" onClick={() => updateMilestone(ms.id, 'In Progress')} className="rounded-md border border-border bg-background px-2.5 py-1 text-[11px] font-medium transition-colors hover:bg-accent">Resume</button>}
                        {ms.status === 'Approval Pending' && (<><button type="button" onClick={() => updateMilestone(ms.id, 'Done')} className="rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-emerald-700">Approve</button><button type="button" onClick={() => updateMilestone(ms.id, 'Rework')} className="rounded-md border border-orange-200 bg-background px-2.5 py-1 text-[11px] font-semibold text-orange-600 transition-colors hover:bg-orange-50">Rework</button></>)}
                        {ms.status === 'Rework' && <button type="button" onClick={() => updateMilestone(ms.id, 'In Progress')} className="rounded-md border border-border bg-background px-2.5 py-1 text-[11px] font-medium transition-colors hover:bg-accent">Resume</button>}
                        {ms.status === 'Done' && <button type="button" onClick={() => updateMilestone(ms.id, 'In Progress')} className="rounded-md border border-border bg-background px-2.5 py-1 text-[11px] font-medium transition-colors hover:bg-accent">Reopen</button>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── Activity Log ─────────────────────────────────────── */}
          {(project.activityHistory ?? []).length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-semibold">Activity</h3>
              <div className="divide-y divide-border rounded-xl border border-border bg-card">
                {(project.activityHistory ?? []).slice(0, 8).map((act) => (
                  <div key={act.id} className="flex items-baseline gap-3 px-4 py-3">
                    <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-muted-foreground/30" />
                    <p className="flex-1 text-xs text-muted-foreground"><span className="font-medium text-foreground">{act.actor}</span> {act.message}</p>
                    <span className="flex-shrink-0 text-[10px] text-muted-foreground">{formatDate(act.date)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
        )}{/* end overview tab */}
      </div>
    )
  }

  /* ── Render ───────────────────────────────────────────────────────── */
  return (
    <div className="space-y-5">

      {/* Page header */}
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.22),_transparent_28%),linear-gradient(135deg,_#f8fbff_0%,_#ffffff_48%,_#f5f7fb_100%)] shadow-[0_24px_80px_-36px_rgba(15,23,42,0.35)]">
        <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1.6fr_1fr] lg:px-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700">
              <Sparkles className="h-3.5 w-3.5" />
              Project Workspace
            </div>
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-900/20">
                <WorkspaceIcon className="h-7 w-7" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{workspaceMeta.title}</h1>
                <p className="max-w-2xl text-sm leading-6 text-slate-600">
                  {workspaceMeta.description}
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {workspaceStats.map((stat) => {
                const Icon = stat.icon
                return (
                  <div key={stat.label} className={`rounded-2xl border border-white/70 bg-gradient-to-br ${stat.tone} p-4 shadow-sm backdrop-blur`}>
                    <div className="mb-3 flex items-center justify-between">
                      <div className="rounded-xl bg-white/80 p-2 shadow-sm">
                        <Icon className="h-4 w-4" />
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-slate-400" />
                    </div>
                    <p className="text-2xl font-semibold text-slate-950">{stat.value}</p>
                    <p className="mt-1 text-xs font-medium text-slate-700">{stat.label}</p>
                    <p className="mt-1 text-[11px] text-slate-500">{stat.hint}</p>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-slate-950 p-5 text-white shadow-[0_20px_60px_-34px_rgba(15,23,42,0.7)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-200">Spotlight</p>
                <h2 className="mt-2 text-lg font-semibold">Top moving projects</h2>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-2">
                <Activity className="h-5 w-5 text-sky-300" />
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {spotlightProjects.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-5 text-sm text-slate-300">
                  Create the first project to start populating dashboard insights.
                </div>
              ) : (
                spotlightProjects.map((project) => (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => selectProject(project.id)}
                    className="flex w-full items-start justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-sky-300/40 hover:bg-white/10"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{project.name}</p>
                      <p className="mt-1 text-xs text-slate-400">{project.manager} · {project.department}</p>
                    </div>
                    <div className="ml-3 text-right">
                      <p className="text-sm font-semibold text-sky-300">{project.progress}%</p>
                      <p className="mt-1 text-[11px] text-slate-500">{formatDate(project.endDate)}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {backendStatus === 'offline' && (
          <div className="border-t border-rose-100 bg-rose-50/80 px-6 py-3 text-xs text-rose-700 lg:px-8">
            Project service is currently unavailable, so live project data could not be loaded.
          </div>
        )}
      </div>

      {/* Main content */}
      <div className={`grid grid-cols-1 gap-5 ${currentProject && !isModalOpen ? 'lg:grid-cols-[1.1fr_1.9fr]' : 'lg:grid-cols-[3fr_2fr]'}`}>

        {/* LEFT: search + filter + table — blurred while detail is open */}
        <div className={`min-w-0 space-y-4 transition-[filter] duration-200 ${currentProject && !isModalOpen ? 'blur-[1px] pointer-events-none select-none' : ''}`}>

      {/* Search + filter bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-[22px] border border-slate-200 bg-white/90 p-3 shadow-sm backdrop-blur">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-4 text-sm outline-none transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects, managers..."
          />
        </div>
        <select
          className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-sky-500"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="ALL">All statuses</option>
          {Object.entries(STATUS_CFG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-700"
        >
          <Plus className="h-4 w-4" />
          New Project
        </button>
      </div>

      {/* Projects table */}
      <div className="overflow-x-auto rounded-[24px] border border-slate-200 bg-white shadow-[0_20px_60px_-36px_rgba(15,23,42,0.18)]">
        {/* Table header — hidden on mobile */}
        <div className="hidden border-b border-border bg-muted/40 px-5 py-3 lg:grid lg:grid-cols-[minmax(160px,2fr)_130px_130px_150px_90px_32px] lg:gap-4">
          {['Project', 'Status', 'Manager', 'Milestones', 'Due Date', ''].map((h) => (
            <span key={h} className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {h}
            </span>
          ))}
        </div>

        {/* Rows */}
        <div className="divide-y divide-border">
          {filteredProjects.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="rounded-2xl bg-slate-100 p-4">
                <Folder className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                No projects match your search or filters.
              </p>
            </div>
          ) : (
            filteredProjects.map((project, idx) => {
              const dotCls = DOT_COLORS[idx % DOT_COLORS.length]
              const total = project.milestones.length
              const done = project.milestones.filter((m) => m.status === 'Done').length
              const progress = calcProgress(project)

              return (
                <div
                  key={project.id}
                  className="flex cursor-pointer flex-col gap-3 px-5 py-4 transition-colors hover:bg-muted/40 lg:grid lg:grid-cols-[minmax(160px,2fr)_130px_130px_150px_90px_32px] lg:items-center lg:gap-4"
                  onClick={() => selectProject(project.id)}
                >
                  {/* Project */}
                  <div className="flex items-center gap-3">
                    <div className={`h-2.5 w-2.5 flex-shrink-0 rounded-sm ${dotCls}`} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{project.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {project.projectCode} · {project.department}
                      </p>
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    <StatusBadge status={project.status} />
                  </div>

                  {/* Manager */}
                  <p className="text-sm text-foreground">
                    {project.manager || (
                      <span className="text-muted-foreground">Not assigned</span>
                    )}
                  </p>

                  {/* Progress */}
                  <div className="w-full lg:w-36">
                    <div className="mb-1.5 flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">{done}/{total}</span>
                      <span className="font-semibold text-foreground">{progress}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-sky-500 transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Due date */}
                  <p className="text-sm text-muted-foreground">{formatDate(project.endDate)}</p>

                  {/* Edit action */}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent"
                      onClick={(e) => { e.stopPropagation(); openEdit(project) }}
                      aria-label={`Edit ${project.name}`}
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Row count */}
        {filteredProjects.length > 0 && (
          <div className="border-t border-border px-5 py-3">
            <p className="text-xs text-muted-foreground">
              {filteredProjects.length} of {projects.length} projects
            </p>
          </div>
        )}
      </div>

        </div>{/* end left column */}

        {/* RIGHT: project detail or charts */}
        {currentProject && !isModalOpen ? (
          <div className="overflow-y-auto rounded-[24px] border border-slate-200 bg-white shadow-[0_30px_80px_-42px_rgba(15,23,42,0.28)] max-h-[calc(100vh-120px)]">
            {renderDetailContent(currentProject)}
          </div>
        ) : (
        <div className="space-y-4">

          {/* Status distribution pie */}
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_-36px_rgba(15,23,42,0.18)]">
            <h3 className="text-sm font-semibold">Project Status</h3>
            <p className="mb-4 mt-0.5 text-xs text-muted-foreground">Distribution across all projects</p>
            {pieData.length === 0 ? (
              <div className="flex h-48 items-center justify-center">
                <p className="text-sm text-muted-foreground">No projects yet</p>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={`cell-${i}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 space-y-2">
                  {pieData.map((entry) => (
                    <div key={entry.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2 w-2 flex-shrink-0 rounded-full"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-xs text-muted-foreground">{entry.name}</span>
                      </div>
                      <span className="text-xs font-semibold tabular-nums text-foreground">
                        {entry.value}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Recent activity */}
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_-36px_rgba(15,23,42,0.18)]">
            <h3 className="text-sm font-semibold">Recent Activity</h3>
            <p className="mb-4 mt-0.5 text-xs text-muted-foreground">Latest updates across all projects</p>
            {recentActivity.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No activity yet</p>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((act) => (
                  <div key={act.id} className="flex items-start gap-2.5">
                    <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-sky-400" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        <span className="font-medium text-foreground">{act.actor}</span>{' '}
                        {act.message}
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {act.projectName} · {formatDate(act.date)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
        )}{/* end right column */}
      </div>{/* end two-column grid */}

      {/* Create / Edit modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-6">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeModal}
          />
          <div className="relative z-10 w-full max-w-2xl">
            <ProjectForm
              formState={formState}
              onChange={handleFormChange}
              onCancel={closeModal}
              onSave={saveProject}
              isSaving={isSaving}
              isEdit={!!currentId}
            />
          </div>
        </div>
      )}
    </div>
  )
}
