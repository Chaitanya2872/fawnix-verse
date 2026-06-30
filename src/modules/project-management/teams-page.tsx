import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  ArrowLeft,
  Briefcase,
  CheckCircle,
  ChevronRight,
  Crown,
  Users,
  X,
} from 'lucide-react'
import { fetchProjects as fetchBackendProjects } from './api'
import type { Project, ProjectStatus } from './types'
import { formatDate } from './utils'

/* ── constants ──────────────────────────────────────────────────────── */
const CARD_ACCENT = [
  'bg-indigo-500', 'bg-sky-500', 'bg-violet-500',
  'bg-emerald-500', 'bg-amber-500', 'bg-rose-500',
]

const STATUS_CLS: Record<ProjectStatus, string> = {
  Draft:              'bg-slate-50 text-slate-600',
  Planning:           'bg-slate-100 text-slate-700',
  'Approval Pending': 'bg-amber-50 text-amber-700',
  Returned:           'bg-orange-50 text-orange-700',
  Rejected:           'bg-rose-50 text-rose-700',
  Planned:            'bg-blue-50 text-blue-700',
  Active:             'bg-sky-50 text-sky-700',
  'In Progress':      'bg-sky-50 text-sky-700',
  Delayed:            'bg-rose-50 text-rose-700',
  'On Hold':          'bg-slate-100 text-slate-600',
  'At Risk':          'bg-rose-50 text-rose-700',
  'Closure Pending':  'bg-violet-50 text-violet-700',
  Completed:          'bg-emerald-50 text-emerald-700',
  Cancelled:          'bg-slate-100 text-slate-500',
}

/* ── types ──────────────────────────────────────────────────────────── */
type Role = 'Project Manager' | 'Team Member'

type Member = {
  name: string
  role: Role
  initials: string
}

type PanelState =
  | { kind: 'closed' }
  | { kind: 'team'; project: Project; accentIdx: number }
  | { kind: 'member'; project: Project; accentIdx: number; member: Member }

/* ── helpers ────────────────────────────────────────────────────────── */
function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
}

function buildTeamMembers(project: Project): Member[] {
  const members: Member[] = []
  if (project.manager) {
    members.push({ name: project.manager, role: 'Project Manager', initials: initials(project.manager) })
  }
  ;(project.teamMembers ?? []).forEach((name) => {
    if (name && name !== project.manager) {
      members.push({ name, role: 'Team Member', initials: initials(name) })
    }
  })
  return members
}

/* ── sub-components ─────────────────────────────────────────────────── */
function RoleBadge({ role }: { role: Role }) {
  const cls =
    role === 'Project Manager'
      ? 'bg-sky-50 text-sky-700 border-sky-200'
      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
  const dot = role === 'Project Manager' ? 'bg-sky-500' : 'bg-emerald-500'
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {role}
    </span>
  )
}

function Avatar({ name, size = 'md', colorIdx = 0 }: { name: string; size?: 'sm' | 'md' | 'lg'; colorIdx?: number }) {
  const COLORS = [
    'bg-indigo-100 text-indigo-700',
    'bg-sky-100 text-sky-700',
    'bg-violet-100 text-violet-700',
    'bg-emerald-100 text-emerald-700',
    'bg-amber-100 text-amber-700',
    'bg-rose-100 text-rose-700',
  ]
  const sizeMap = { sm: 'h-6 w-6 text-[9px]', md: 'h-8 w-8 text-xs', lg: 'h-12 w-12 text-sm' }
  return (
    <div className={`flex flex-shrink-0 items-center justify-center rounded-full font-bold ${sizeMap[size]} ${COLORS[colorIdx % COLORS.length]}`}>
      {initials(name)}
    </div>
  )
}

/* ── Team panel ─────────────────────────────────────────────────────── */
function TeamPanel({
  project, accentIdx, members, onClose, onMemberClick,
}: {
  project: Project
  accentIdx: number
  members: Member[]
  onClose: () => void
  onMemberClick: (m: Member) => void
}) {
  const doneMilestones = (project.milestones ?? []).filter((m) => m.status === 'Done').length
  const totalMilestones = (project.milestones ?? []).length

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className={`h-1.5 w-full flex-shrink-0 ${CARD_ACCENT[accentIdx % CARD_ACCENT.length]}`} />
      <div className="flex flex-shrink-0 items-start gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_CLS[project.status]}`}>
              {project.status}
            </span>
          </div>
          <h2 className="text-base font-semibold leading-snug text-foreground">{project.name}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {project.projectCode} · {project.department}
            {totalMilestones > 0 && ` · ${doneMilestones}/${totalMilestones} milestones done`}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Members list */}
      <div className="flex-1 overflow-y-auto">
        <p className="px-5 pb-2 pt-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {members.length} member{members.length !== 1 ? 's' : ''}
        </p>
        <div className="divide-y divide-border">
          {members.map((member, i) => (
            <button
              key={member.name}
              type="button"
              onClick={() => onMemberClick(member)}
              className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-muted/50"
            >
              <Avatar name={member.name} size="md" colorIdx={i} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{member.name}</p>
                <div className="mt-0.5">
                  <RoleBadge role={member.role} />
                </div>
              </div>
              <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Member panel ───────────────────────────────────────────────────── */
function MemberPanel({
  member, projects, onBack, onClose,
}: {
  member: Member
  projects: Project[]
  onBack: () => void
  onClose: () => void
}) {
  // Gather all projects this person is on
  const contributions = useMemo(() =>
    projects
      .map((p, idx) => {
        const role: Role | null =
          p.manager === member.name ? 'Project Manager'
          : (p.teamMembers ?? []).includes(member.name) ? 'Team Member'
          : null
        if (!role) return null
        const done = (p.milestones ?? []).filter((m) => m.status === 'Done').length
        const total = (p.milestones ?? []).length
        return { project: p, accentIdx: idx, role, done, total }
      })
      .filter(Boolean) as { project: Project; accentIdx: number; role: Role; done: number; total: number }[],
    [member.name, projects],
  )

  // Activity log entries where this person is the actor
  const activityLog = useMemo(() =>
    projects
      .flatMap((p) =>
        (p.activityHistory ?? [])
          .filter((a) => a.actor === member.name)
          .map((a) => ({ ...a, projectName: p.name })),
      )
      .sort((a, b) => b.date.localeCompare(a.date)),
    [member.name, projects],
  )

  // Done milestones across all their projects
  const doneMilestones = useMemo(() =>
    contributions.flatMap(({ project }) =>
      (project.milestones ?? [])
        .filter((m) => m.status === 'Done')
        .map((m) => ({ ...m, projectName: project.name })),
    ),
    [contributions],
  )

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex flex-shrink-0 items-center gap-2 border-b border-border px-5 py-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="text-xs text-muted-foreground">Back to team</span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">

        {/* Member identity */}
        <div className="flex items-center gap-4 rounded-xl border border-border bg-muted/30 p-4">
          <Avatar name={member.name} size="lg" colorIdx={0} />
          <div>
            <p className="text-base font-semibold text-foreground">{member.name}</p>
            <div className="mt-1">
              <RoleBadge role={member.role} />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-card p-3 text-center shadow-sm">
            <p className="text-xl font-bold tabular-nums text-foreground">{contributions.length}</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">Projects</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 text-center shadow-sm">
            <p className="text-xl font-bold tabular-nums text-foreground">{doneMilestones.length}</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">Milestones done</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 text-center shadow-sm">
            <p className="text-xl font-bold tabular-nums text-foreground">{activityLog.length}</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">Activities</p>
          </div>
        </div>

        {/* Project contributions */}
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Project Contributions
            </p>
          </div>
          {contributions.length === 0 ? (
            <p className="rounded-xl border-2 border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              Not assigned to any project.
            </p>
          ) : (
            <div className="space-y-2">
              {contributions.map(({ project, accentIdx, role, done, total }) => (
                <div
                  key={project.id}
                  className="flex items-center gap-0 overflow-hidden rounded-xl border border-border bg-card shadow-sm"
                >
                  <div className={`w-1 self-stretch flex-shrink-0 ${CARD_ACCENT[accentIdx % CARD_ACCENT.length]}`} />
                  <div className="min-w-0 flex-1 px-4 py-3">
                    <div className="mb-0.5 flex flex-wrap items-center gap-1.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_CLS[project.status]}`}>
                        {project.status}
                      </span>
                      <RoleBadge role={role} />
                    </div>
                    <p className="truncate text-sm font-medium text-foreground">{project.name}</p>
                    {total > 0 && (
                      <div className="mt-2">
                        <div className="mb-1 flex items-center justify-between text-[10px]">
                          <span className="text-muted-foreground">{done}/{total} milestones</span>
                          <span className="font-semibold">{Math.round((done / total) * 100)}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-sky-500"
                            style={{ width: `${Math.round((done / total) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Completed milestones */}
        {doneMilestones.length > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-2">
              <CheckCircle className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Milestones Completed
              </p>
            </div>
            <div className="space-y-1.5">
              {doneMilestones.map((ms) => (
                <div
                  key={ms.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-2.5 shadow-sm"
                >
                  <CheckCircle className="h-4 w-4 flex-shrink-0 text-emerald-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{ms.title}</p>
                    <p className="text-[10px] text-muted-foreground">{ms.projectName}</p>
                  </div>
                  <span className="flex-shrink-0 text-[10px] text-muted-foreground">
                    {formatDate(ms.dueDate)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Activity log */}
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Activity Log
            </p>
          </div>
          {activityLog.length === 0 ? (
            <p className="rounded-xl border-2 border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              No recorded activity yet.
            </p>
          ) : (
            <div className="divide-y divide-border rounded-xl border border-border bg-card">
              {activityLog.map((act) => (
                <div key={act.id} className="flex items-baseline gap-3 px-4 py-3">
                  <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-sky-400" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">{act.message}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{act.projectName}</p>
                  </div>
                  <span className="flex-shrink-0 text-[10px] text-muted-foreground">
                    {formatDate(act.date)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

/* ── Page ───────────────────────────────────────────────────────────── */
export default function ProjectTeamsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [panel, setPanel] = useState<PanelState>({ kind: 'closed' })

  useEffect(() => {
    let cancelled = false

    fetchBackendProjects()
      .then((nextProjects) => {
        if (!cancelled) {
          setProjects(nextProjects)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProjects([])
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-foreground">Team Directory</h1>
        <p className="text-xs text-muted-foreground">
          Click a team card to view members — then click any member to see their work.
        </p>
      </div>

      {/* Kanban board */}
      {projects.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border p-8 text-center">
          <p className="text-sm font-medium text-muted-foreground">No project teams available.</p>
        </div>
      ) : (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {projects.map((project, idx) => {
          const accent = CARD_ACCENT[idx % CARD_ACCENT.length]
          const members = buildTeamMembers(project)
          const isSelected =
            panel.kind !== 'closed' && panel.project.id === project.id

          return (
            <button
              key={project.id}
              type="button"
              onClick={() => setPanel({ kind: 'team', project, accentIdx: idx })}
              className={[
                'flex flex-col overflow-hidden rounded-xl border text-left transition-all',
                isSelected
                  ? 'border-sky-400 shadow-md ring-2 ring-sky-200'
                  : 'border-border bg-card shadow-sm hover:border-muted-foreground/40 hover:shadow-md',
              ].join(' ')}
            >
              {/* Color accent */}
              <div className={`h-1.5 w-full ${accent}`} />

              <div className="flex flex-1 flex-col gap-3 p-4">

                {/* Name + status */}
                <div>
                  <p className="mb-1.5 line-clamp-2 text-sm font-semibold leading-snug text-foreground">
                    {project.name}
                  </p>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_CLS[project.status]}`}>
                    {project.status}
                  </span>
                </div>

                {/* Manager */}
                {project.manager && (
                  <div className="flex items-center gap-2">
                    <Avatar name={project.manager} size="sm" colorIdx={0} />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-foreground">{project.manager}</p>
                      <p className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                        <Crown className="h-2.5 w-2.5" /> Manager
                      </p>
                    </div>
                  </div>
                )}

                {/* Footer: member count */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    <span>
                      {members.length} member{members.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </div>
            </button>
          )
        })}
      </div>
      )}

      {/* Slide-over panel */}
      {panel.kind !== 'closed' && (
        <div className="fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/25 backdrop-blur-[1px]"
            onClick={() => setPanel({ kind: 'closed' })}
          />
          <div className="absolute inset-y-0 right-0 flex h-full w-full flex-col border-l border-border bg-background shadow-2xl sm:w-[420px]">
            {panel.kind === 'team' && (
              <TeamPanel
                project={panel.project}
                accentIdx={panel.accentIdx}
                members={buildTeamMembers(panel.project)}
                onClose={() => setPanel({ kind: 'closed' })}
                onMemberClick={(member) =>
                  setPanel({ kind: 'member', project: panel.project, accentIdx: panel.accentIdx, member })
                }
              />
            )}
            {panel.kind === 'member' && (
              <MemberPanel
                member={panel.member}
                projects={projects}
                onBack={() =>
                  setPanel({ kind: 'team', project: panel.project, accentIdx: panel.accentIdx })
                }
                onClose={() => setPanel({ kind: 'closed' })}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
