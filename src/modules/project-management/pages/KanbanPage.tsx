import { useMemo, useState } from 'react'
import { Layers, Plus, X } from 'lucide-react'
import { useProjectsContext } from '../context'
import { PRIORITY_DOT, TASK_COL_COLOR, TASK_COLUMNS } from '../shared'
import type { TaskStatus } from '../types'

export default function ProjectsKanbanPage() {
  const { projects, addTask, updateTaskStatus, deleteTask } = useProjectsContext()
  const [projectFilter, setProjectFilter] = useState('ALL')

  const filteredProjects = useMemo(() =>
    projectFilter === 'ALL' ? projects : projects.filter((p) => p.id === projectFilter),
  [projects, projectFilter])

  const allTasks = useMemo(
    () => filteredProjects.flatMap((p) =>
      (p.tasks ?? []).map((t) => ({ ...t, projectName: p.name, projectId: p.id }))
    ),
    [filteredProjects],
  )

  const tasksByColumn = useMemo(() => {
    const map: Record<TaskStatus, typeof allTasks> = {} as Record<TaskStatus, typeof allTasks>
    for (const col of TASK_COLUMNS) map[col] = []
    for (const task of allTasks) map[task.status].push(task)
    return map
  }, [allTasks])

  const addTaskToFirstProject = () => {
    const target = filteredProjects[0]
    if (target) addTask(target.id)
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-100 bg-white px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
              <Layers className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">Kanban Board</h1>
              <p className="text-sm text-slate-400">{allTasks.length} tasks across {filteredProjects.length} projects</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500"
              value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
              <option value="ALL">All projects</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {filteredProjects.length > 0 && (
              <button type="button" onClick={addTaskToFirstProject}
                className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700">
                <Plus className="h-4 w-4" /> Add Task
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Board */}
      <div className="flex gap-3 overflow-x-auto p-6">
        {TASK_COLUMNS.map((col) => {
          const colTasks = tasksByColumn[col] ?? []
          return (
            <div key={col} className="flex w-56 flex-shrink-0 flex-col rounded-xl border border-slate-200 bg-slate-50">
              {/* Column header */}
              <div className="border-b border-slate-200 px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${TASK_COL_COLOR[col]}`}>{col}</span>
                  <span className="text-xs font-semibold tabular-nums text-slate-400">{colTasks.length}</span>
                </div>
              </div>

              {/* Cards */}
              <div className="flex flex-1 flex-col gap-2 p-2 overflow-y-auto max-h-[calc(100vh-220px)]">
                {colTasks.length === 0 && (
                  <div className="flex h-16 items-center justify-center rounded-lg border-2 border-dashed border-slate-200">
                    <span className="text-[11px] text-slate-300">Empty</span>
                  </div>
                )}
                {colTasks.map((task) => (
                  <div key={task.id} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="mb-2 flex items-start justify-between gap-1">
                      <p className="text-xs font-medium leading-snug text-slate-800">{task.title}</p>
                      <button type="button" onClick={() => deleteTask(task.projectId, task.id)}
                        className="flex-shrink-0 text-slate-300 hover:text-rose-500">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    <p className="mb-2 text-[10px] text-slate-400">{task.projectName}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_DOT[task.priority]}`} />
                        <span className="text-[10px] text-slate-400">{task.priority}</span>
                      </div>
                      {task.assignee && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-100 text-[9px] font-bold text-sky-700">
                          {task.assignee.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    {/* Move to column selector */}
                    <select
                      className="mt-2 w-full rounded border border-slate-100 bg-slate-50 py-0.5 text-[10px] text-slate-500 outline-none"
                      value={task.status}
                      onChange={(e) => updateTaskStatus(task.projectId, task.id, e.target.value as TaskStatus)}
                    >
                      {TASK_COLUMNS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
