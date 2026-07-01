import { ArrowUpRight, Plus } from 'lucide-react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { useProjectsContext } from '../context'
import { calcProgress, StatusBadge } from '../shared'
import { formatDate } from '../utils'

export default function ProjectsDashboardPage() {
  const { workspaceStats, pieData, recentActivity, spotlightProjects, openCreate, selectProject } = useProjectsContext()

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-100 bg-white px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Project Dashboard</h1>
            <p className="text-sm text-slate-400">Monitor project health, progress distribution, and delivery signals.</p>
          </div>
          <button type="button" onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700">
            <Plus className="h-4 w-4" /> New Project
          </button>
        </div>
      </div>

      <div className="space-y-6 p-6">
        {/* KPI cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {workspaceStats.map((stat) => {
            const Icon = stat.icon
            const iconBg: Record<string, string> = {
              sky: 'bg-sky-50 text-sky-600', amber: 'bg-amber-50 text-amber-600',
              emerald: 'bg-emerald-50 text-emerald-600', violet: 'bg-violet-50 text-violet-600',
            }
            return (
              <div key={stat.label} className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="mb-3 flex items-center justify-between">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconBg[stat.color] ?? 'bg-slate-100 text-slate-600'}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-slate-300" />
                </div>
                <p className="text-2xl font-semibold tabular-nums text-slate-900">{stat.value}</p>
                <p className="mt-1 text-sm font-medium text-slate-600">{stat.label}</p>
                <p className="mt-0.5 text-xs text-slate-400">{stat.hint}</p>
              </div>
            )
          })}
        </div>

        {/* Middle row: chart + activity */}
        <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
          {/* Status pie */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-slate-800">Status Distribution</h2>
            <p className="mb-4 mt-0.5 text-xs text-slate-400">Breakdown across all projects</p>
            {pieData.length === 0 ? (
              <div className="flex h-48 items-center justify-center">
                <p className="text-sm text-slate-400">No projects yet</p>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={52} outerRadius={80} paddingAngle={2} dataKey="value">
                      {pieData.map((entry, i) => <Cell key={`cell-${i}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2">
                  {pieData.map((entry) => (
                    <div key={entry.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-xs text-slate-500">{entry.name}</span>
                      </div>
                      <span className="text-xs font-semibold tabular-nums text-slate-800">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Recent activity */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-slate-800">Recent Activity</h2>
            <p className="mb-4 mt-0.5 text-xs text-slate-400">Latest updates across all projects</p>
            {recentActivity.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">No activity recorded yet</p>
            ) : (
              <div className="space-y-3 overflow-y-auto max-h-64">
                {recentActivity.map((act) => (
                  <div key={act.id} className="flex items-start gap-2.5">
                    <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-sky-400" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs leading-relaxed text-slate-500">
                        <span className="font-medium text-slate-800">{act.actor}</span>{' '}{act.message}
                      </p>
                      <p className="mt-0.5 text-[10px] text-slate-400">{act.projectName} · {formatDate(act.date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Spotlight projects */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Top Moving Projects</h2>
              <p className="mt-0.5 text-xs text-slate-400">Projects with highest progress sorted by timeline</p>
            </div>
          </div>
          {spotlightProjects.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-slate-200 p-8 text-center">
              <p className="text-sm text-slate-400">Create the first project to start populating insights.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              {spotlightProjects.map((project) => {
                const progress = calcProgress(project)
                return (
                  <button key={project.id} type="button" onClick={() => selectProject(project.id)}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-sky-300 hover:bg-sky-50">
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900 leading-snug">{project.name}</p>
                      <StatusBadge status={project.status} />
                    </div>
                    <p className="text-xs text-slate-400 mb-3">{project.manager} · {project.department}</p>
                    <div>
                      <div className="mb-1 flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Progress</span>
                        <span className="font-semibold text-sky-600">{progress}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                        <div className="h-full rounded-full bg-sky-500" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                    <p className="mt-2 text-[11px] text-slate-400">Due {formatDate(project.endDate)}</p>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
