import { useMemo, useState } from 'react'
import { ExternalLink, MessageSquare, Users } from 'lucide-react'
import { useProjectsContext } from '../context'
import { StatusBadge } from '../shared'

export default function ProjectsMeetingsPage() {
  const { projects } = useProjectsContext()
  const [projectFilter, setProjectFilter] = useState('ALL')

  const displayed = useMemo(() =>
    projectFilter === 'ALL'
      ? projects
      : projects.filter((p) => p.id === projectFilter),
  [projects, projectFilter])

  const withComms = displayed.filter((p) =>
    p.communication?.slackChannel || p.communication?.teamsChannel || p.communication?.meetingLink,
  )

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-100 bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
            <Users className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Meetings</h1>
            <p className="text-sm text-slate-400">Project communication channels and meeting links</p>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-6">
        {/* Filter */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500"
            value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
            <option value="ALL">All projects</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        {/* Communication channels per project */}
        {withComms.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 py-16 text-center">
            <MessageSquare className="mx-auto mb-3 h-8 w-8 text-slate-300" />
            <p className="text-sm font-medium text-slate-500 mb-1">No communication channels configured</p>
            <p className="text-xs text-slate-400">Add Slack, Teams, or meeting links to your projects to see them here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {withComms.map((project) => (
              <div key={project.id} className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">{project.name}</h3>
                    <div className="mt-0.5 flex items-center gap-2">
                      <p className="text-xs text-slate-400">{project.projectCode} · {project.department}</p>
                      <StatusBadge status={project.status} />
                    </div>
                  </div>
                  {project.communication?.reportingFrequency && (
                    <span className="flex-shrink-0 text-xs text-slate-400">
                      Reports: <span className="font-medium text-slate-600">{project.communication.reportingFrequency}</span>
                    </span>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {project.communication?.slackChannel && (
                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Slack</p>
                      <p className="text-sm font-medium text-slate-700">{project.communication.slackChannel}</p>
                    </div>
                  )}
                  {project.communication?.teamsChannel && (
                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Teams</p>
                      <p className="text-sm font-medium text-slate-700">{project.communication.teamsChannel}</p>
                    </div>
                  )}
                  {project.communication?.meetingLink && (
                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Meeting Link</p>
                      <a href={project.communication.meetingLink} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1 text-sm font-medium text-sky-600 hover:text-sky-700">
                        Join meeting <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </div>
                {project.manager && (
                  <p className="mt-3 text-xs text-slate-400">
                    Project Manager: <span className="font-medium text-slate-600">{project.manager}</span>
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Projects without channels */}
        {displayed.filter((p) => !p.communication?.slackChannel && !p.communication?.teamsChannel && !p.communication?.meetingLink).length > 0 && withComms.length > 0 && (
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-medium text-slate-500 mb-2">No channels configured:</p>
            <div className="flex flex-wrap gap-2">
              {displayed
                .filter((p) => !p.communication?.slackChannel && !p.communication?.teamsChannel && !p.communication?.meetingLink)
                .map((p) => (
                  <span key={p.id} className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs text-slate-500">
                    {p.name}
                  </span>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
