import { useMemo, useState } from 'react'
import { Goal, Lock } from 'lucide-react'
import { useProjectsContext } from '../context'
import { MILESTONE_CFG, MilestoneBadge } from '../shared'
import type { MilestoneStatus } from '../types'
import { formatDate } from '../utils'

export default function ProjectsMilestonesPage() {
  const { projects, updateMilestone } = useProjectsContext()
  const [projectFilter, setProjectFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState<MilestoneStatus | 'ALL'>('ALL')

  const allMilestones = useMemo(
    () => projects.flatMap((p) =>
      (p.milestones ?? []).map((ms) => ({ ...ms, projectName: p.name, projectId: p.id, projectCode: p.projectCode }))
    ),
    [projects],
  )

  const filtered = useMemo(() =>
    allMilestones.filter((ms) => {
      const matchProject = projectFilter === 'ALL' || ms.projectId === projectFilter
      const matchStatus  = statusFilter === 'ALL' || ms.status === statusFilter
      return matchProject && matchStatus
    }),
  [allMilestones, projectFilter, statusFilter])

  const summary = useMemo(() => ({
    total: allMilestones.length,
    done: allMilestones.filter((m) => m.status === 'Done').length,
    pending: allMilestones.filter((m) => m.status === 'Pending').length,
    inProgress: allMilestones.filter((m) => m.status === 'In Progress').length,
    delayed: allMilestones.filter((m) => m.status === 'Delayed').length,
  }), [allMilestones])

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-100 bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
            <Goal className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Milestones</h1>
            <p className="text-sm text-slate-400">{summary.done} completed · {summary.total} total delivery checkpoints</p>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-6">
        {/* Stats row */}
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          {[
            { label: 'Total',       value: summary.total,      cls: 'bg-slate-100 text-slate-700'   },
            { label: 'Done',        value: summary.done,       cls: 'bg-emerald-100 text-emerald-700' },
            { label: 'In Progress', value: summary.inProgress, cls: 'bg-sky-100 text-sky-700'       },
            { label: 'Delayed',     value: summary.delayed,    cls: 'bg-rose-100 text-rose-700'     },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-2xl font-semibold tabular-nums text-slate-900">{s.value}</p>
              <p className="mt-0.5 text-xs text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500"
            value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
            <option value="ALL">All projects</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500"
            value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as MilestoneStatus | 'ALL')}>
            <option value="ALL">All statuses</option>
            {(Object.keys(MILESTONE_CFG) as MilestoneStatus[]).map((s) => (
              <option key={s} value={s}>{MILESTONE_CFG[s].label}</option>
            ))}
          </select>
          <span className="ml-auto text-xs text-slate-400">{filtered.length} milestones</span>
        </div>

        {/* List */}
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-slate-200 py-16 text-center">
              <Goal className="mx-auto mb-3 h-8 w-8 text-slate-300" />
              <p className="text-sm text-slate-400">No milestones match the selected filters.</p>
            </div>
          ) : (
            filtered.map((ms) => {
              const cfg = MILESTONE_CFG[ms.status]
              return (
                <div key={ms.id} className="flex items-center gap-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <div className={`w-1 self-stretch flex-shrink-0 ${cfg.accent}`} />
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-6 gap-y-1 py-3 pl-4 pr-4">
                    <div className="min-w-[160px] flex-1">
                      <p className="text-sm font-medium text-slate-900">{ms.title}</p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <p className="text-xs text-slate-400">{ms.projectName}</p>
                        {ms.approvalRequired && <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-400"><Lock className="h-2.5 w-2.5" />Approval</span>}
                      </div>
                    </div>
                    <MilestoneBadge status={ms.status} />
                    <p className="text-xs text-slate-400 whitespace-nowrap">Due {formatDate(ms.dueDate)}</p>
                  </div>
                  <div className="flex flex-shrink-0 flex-wrap gap-1.5 py-3 pr-4">
                    {ms.status === 'Pending' && (
                      <button type="button" onClick={() => updateMilestone(ms.id, 'In Progress')}
                        className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium hover:bg-slate-50">Start</button>
                    )}
                    {ms.status === 'In Progress' && (<>
                      <button type="button" onClick={() => updateMilestone(ms.id, ms.approvalRequired ? 'Approval Pending' : 'Done')}
                        className="rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700">Complete</button>
                      <button type="button" onClick={() => updateMilestone(ms.id, 'Delayed')}
                        className="rounded-md border border-rose-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50">Delayed</button>
                    </>)}
                    {ms.status === 'Delayed' && (
                      <button type="button" onClick={() => updateMilestone(ms.id, 'In Progress')}
                        className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium hover:bg-slate-50">Resume</button>
                    )}
                    {ms.status === 'Approval Pending' && (<>
                      <button type="button" onClick={() => updateMilestone(ms.id, 'Done')}
                        className="rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700">Approve</button>
                      <button type="button" onClick={() => updateMilestone(ms.id, 'Rework')}
                        className="rounded-md border border-orange-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-orange-600 hover:bg-orange-50">Rework</button>
                    </>)}
                    {ms.status === 'Rework' && (
                      <button type="button" onClick={() => updateMilestone(ms.id, 'In Progress')}
                        className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium hover:bg-slate-50">Resume</button>
                    )}
                    {ms.status === 'Done' && (
                      <button type="button" onClick={() => updateMilestone(ms.id, 'In Progress')}
                        className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium hover:bg-slate-50">Reopen</button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
