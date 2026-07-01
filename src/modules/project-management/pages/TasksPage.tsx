import { useMemo, useState } from 'react'
import { CheckCircle, X } from 'lucide-react'
import { useProjectsContext } from '../context'
import { PRIORITY_CLS, PRIORITY_DOT, STATUS_CFG, TASK_COL_COLOR, TASK_COLUMNS } from '../shared'
import type { TaskStatus } from '../types'
import { formatDate } from '../utils'

export default function ProjectsTasksPage() {
  const { projects, updateTaskStatus, deleteTask } = useProjectsContext()
  const [projectFilter, setProjectFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'ALL'>('ALL')

  const allTasks = useMemo(
    () => projects.flatMap((p) =>
      (p.tasks ?? []).map((t) => ({
        ...t,
        projectName: p.name,
        projectCode: p.projectCode,
        projectStatus: p.status,
      }))
    ),
    [projects],
  )

  const filtered = useMemo(() =>
    allTasks.filter((t) => {
      const matchProject = projectFilter === 'ALL' || t.projectId === projectFilter
      const matchStatus  = statusFilter === 'ALL' || t.status === statusFilter
      return matchProject && matchStatus
    }),
  [allTasks, projectFilter, statusFilter])

  const totalOpen = allTasks.filter((t) => t.status !== 'Completed').length

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-100 bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
            <CheckCircle className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">All Tasks</h1>
            <p className="text-sm text-slate-400">{totalOpen} open · {allTasks.length} total across {projects.length} projects</p>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-6">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500"
            value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}
          >
            <option value="ALL">All projects</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500"
            value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as TaskStatus | 'ALL')}
          >
            <option value="ALL">All statuses</option>
            {TASK_COLUMNS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <span className="ml-auto text-xs text-slate-400">{filtered.length} tasks</span>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="hidden border-b border-slate-100 bg-slate-50 px-5 py-3 lg:grid lg:grid-cols-[2fr_1.2fr_1fr_100px_100px_100px_32px] lg:gap-4">
            {['Task', 'Project', 'Assignee', 'Priority', 'Status', 'Due Date', ''].map((h) => (
              <span key={h} className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{h}</span>
            ))}
          </div>

          <div className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-sm text-slate-400">No tasks match the selected filters.</p>
              </div>
            ) : (
              filtered.map((task) => (
                <div key={task.id}
                  className="flex flex-col gap-2 px-5 py-3 text-sm transition-colors hover:bg-slate-50 lg:grid lg:grid-cols-[2fr_1.2fr_1fr_100px_100px_100px_32px] lg:items-center lg:gap-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">{task.title}</p>
                    {task.description && <p className="truncate text-xs text-slate-400">{task.description}</p>}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs text-slate-600">{task.projectName}</p>
                    <p className="text-[10px] text-slate-400">{task.projectCode}</p>
                  </div>
                  <p className="text-xs text-slate-600">{task.assignee || <span className="text-slate-300">Unassigned</span>}</p>
                  <div className="flex items-center gap-1.5">
                    <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${PRIORITY_DOT[task.priority]}`} />
                    <span className={`text-xs font-medium ${PRIORITY_CLS[task.priority]}`}>{task.priority}</span>
                  </div>
                  <select
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold outline-none ${TASK_COL_COLOR[task.status]}`}
                    value={task.status}
                    onChange={(e) => updateTaskStatus(task.projectId, task.id, e.target.value as TaskStatus)}
                  >
                    {TASK_COLUMNS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <p className="text-xs text-slate-400">{formatDate(task.dueDate)}</p>
                  <div className="flex justify-end">
                    <button type="button" onClick={() => deleteTask(task.projectId, task.id)}
                      className="flex h-6 w-6 items-center justify-center rounded text-slate-300 hover:bg-rose-50 hover:text-rose-500">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {filtered.length > 0 && (
            <div className="border-t border-slate-100 px-5 py-3">
              <p className="text-xs text-slate-400">{filtered.length} of {allTasks.length} tasks</p>
            </div>
          )}
        </div>

        {/* Status summary chips */}
        {allTasks.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {TASK_COLUMNS.map((col) => {
              const count = allTasks.filter((t) => t.status === col).length
              if (!count) return null
              return (
                <button key={col} type="button"
                  onClick={() => setStatusFilter(statusFilter === col ? 'ALL' : col)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors
                    ${statusFilter === col ? 'border-sky-300 bg-sky-100 text-sky-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
                  {col}
                  <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">{count}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
