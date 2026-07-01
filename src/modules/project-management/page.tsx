import type { ReactNode } from 'react'
import {
  Activity, AlertTriangle, Briefcase, Check, CheckCircle,
  Clock, Code2, DollarSign, Edit3, FileText, Folder,
  FolderKanban, Globe, Layers, Lock, Plus, Search, Tag, Users, X,
} from 'lucide-react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { useProjectsContext } from './context'
import {
  MILESTONE_CFG, MilestoneBadge, STATUS_CFG, STATUS_STEPS, StatusBadge,
  TASK_COL_COLOR, TASK_COLUMNS, WORKFLOW_STATUSES, calcProgress, DOT_COLORS,
} from './shared'
import type { MilestoneStatus, Project, ProjectStatus, TaskStatus } from './types'
import { formatDate } from './utils'

function DetailField({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <div className="text-sm font-medium text-slate-800">
        {value ?? <span className="font-normal text-slate-400">Not set</span>}
      </div>
    </div>
  )
}

function SectionHeader({ icon, iconCls, title, sub }: { icon: ReactNode; iconCls: string; title: string; sub: string }) {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${iconCls}`}>{icon}</div>
      <div>
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        <p className="text-xs text-slate-400">{sub}</p>
      </div>
    </div>
  )
}

export default function ProjectsListPage() {
  const ctx = useProjectsContext()
  const {
    projects, filteredProjects, currentProject, detailTab, search, statusFilter,
    isModalOpen, milestoneTitle, milestoneDue, milestoneApproval, backendStatus,
    pieData, recentActivity,
    setSearch, setStatusFilter, setDetailTab, setMilestoneTitle, setMilestoneDue, setMilestoneApproval,
    openCreate, openEdit, selectProject, addMilestone, updateMilestone, setProjectStatus,
    addTask, updateTaskStatus, deleteTask,
  } = ctx

  // ── Stepper ──────────────────────────────────────────────────────────────
  function renderStepper(project: Project) {
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
                <div className={[
                  'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-semibold transition-all',
                  error  ? 'border-rose-500 bg-rose-500 text-white'
                  : done   ? 'border-emerald-500 bg-emerald-500 text-white'
                  : active ? 'border-sky-600 bg-sky-600 text-white ring-4 ring-sky-100'
                  :          'border-slate-200 bg-white text-slate-400',
                ].join(' ')}>
                  {done ? <Check className="h-3.5 w-3.5" /> : error ? '!' : i + 1}
                </div>
                <span className={['hidden whitespace-nowrap text-[10px] font-medium sm:block', active ? 'text-sky-600' : done ? 'text-slate-700' : 'text-slate-400'].join(' ')}>
                  {STATUS_CFG[step].label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={`mx-1 mt-3.5 h-0.5 flex-1 ${done ? 'bg-emerald-500' : 'bg-slate-200'}`} />
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // ── Action panel ──────────────────────────────────────────────────────────
  function renderActionPanel(project: Project) {
    const done = project.milestones.filter((m) => m.status === 'Done').length
    const allDone = project.milestones.length > 0 && done === project.milestones.length
    const canStart = project.milestones.length > 0 && Boolean(project.manager)

    const Panel = ({ icon, iconCls, title, desc, children }: { icon: ReactNode; iconCls: string; title: string; desc: string; children: ReactNode }) => (
      <div className="mb-5 flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4">
        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${iconCls}`}>{icon}</div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800">{title}</p>
          <p className="mt-0.5 text-xs text-slate-400">{desc}</p>
        </div>
        <div className="flex flex-wrap gap-2">{children}</div>
      </div>
    )
    const BtnPrimary = ({ label, onClick, disabled = false }: { label: string; onClick: () => void; disabled?: boolean }) => (
      <button type="button" disabled={disabled} onClick={onClick} className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50">{label}</button>
    )
    const BtnSuccess = ({ label, onClick }: { label: string; onClick: () => void }) => (
      <button type="button" onClick={onClick} className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700">{label}</button>
    )
    const BtnGhost = ({ label, onClick }: { label: string; onClick: () => void }) => (
      <button type="button" onClick={onClick} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">{label}</button>
    )
    const BtnDanger = ({ label, onClick }: { label: string; onClick: () => void }) => (
      <button type="button" onClick={onClick} className="rounded-lg border border-rose-200 bg-white px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50">{label}</button>
    )

    if (project.status === 'Draft' || project.status === 'Cancelled') return null
    if (project.status === 'Approval Pending') return (
      <Panel icon={<Clock className="h-5 w-5" />} iconCls="bg-amber-50 text-amber-600" title="Awaiting creation approval" desc="Review the project details, then approve or reject.">
        <BtnSuccess label="Approve" onClick={() => setProjectStatus('Planned', 'Project approved')} />
        <BtnDanger  label="Reject"  onClick={() => setProjectStatus('Rejected', 'Project rejected')} />
      </Panel>
    )
    if (project.status === 'Rejected' || project.status === 'Returned') return (
      <Panel icon={<X className="h-5 w-5" />} iconCls="bg-rose-50 text-rose-600" title="Project was returned" desc="Revise the details and resubmit for approval.">
        <BtnGhost   label="Edit details" onClick={() => openEdit(project)} />
        <BtnPrimary label="Resubmit"     onClick={() => setProjectStatus('Approval Pending', 'Project resubmitted')} />
      </Panel>
    )
    if (project.status === 'Planned' || project.status === 'Planning') return (
      <Panel icon={<Check className="h-5 w-5" />} iconCls="bg-blue-50 text-blue-600" title="Ready to plan"
        desc={canStart ? 'Manager, team, and milestones are set. Ready to start.' : 'Assign a manager and add at least one milestone before starting.'}>
        <BtnGhost   label="Assign manager & team" onClick={() => openEdit(project)} />
        <BtnPrimary label="Start project"         onClick={() => setProjectStatus('In Progress', 'Project started')} disabled={!canStart} />
      </Panel>
    )
    if (project.status === 'Closure Pending') return (
      <Panel icon={<Clock className="h-5 w-5" />} iconCls="bg-violet-50 text-violet-600" title="Closure pending approval" desc="All milestones are done. Approve closure to complete, or reopen for more work.">
        <BtnSuccess label="Approve closure"    onClick={() => setProjectStatus('Completed', 'Closure approved')} />
        <BtnGhost   label="Reopen for updates" onClick={() => setProjectStatus('In Progress', 'Project reopened')} />
      </Panel>
    )
    if (project.status === 'Completed') return (
      <Panel icon={<CheckCircle className="h-5 w-5" />} iconCls="bg-emerald-50 text-emerald-600" title="Project completed" desc="This project has been closed and marked complete.">
        <BtnGhost label="Reopen project" onClick={() => setProjectStatus('In Progress', 'Project reopened')} />
      </Panel>
    )
    return (
      <Panel icon={<Activity className="h-5 w-5" />} iconCls="bg-sky-50 text-sky-600" title="In progress"
        desc={`${done} of ${project.milestones.length} milestones completed. Finish them all to initiate closure.`}>
        <BtnGhost   label="Edit details"     onClick={() => openEdit(project)} />
        <BtnPrimary label="Initiate closure" onClick={() => setProjectStatus('Closure Pending', 'Project closure initiated')} disabled={!allDone} />
      </Panel>
    )
  }

  // ── Detail drawer ─────────────────────────────────────────────────────────
  function renderDetailContent(project: Project) {
    const idx = projects.findIndex((p) => p.id === project.id)
    const dotCls = DOT_COLORS[idx % DOT_COLORS.length]
    const done = project.milestones.filter((m) => m.status === 'Done').length
    const canAdd = ['Planned', 'Planning', 'In Progress', 'Active'].includes(project.status)
    const approvalText = project.approvalRequired ? `Required — ${project.approvalStatus}` : 'Not required'
    const closureText  = project.closureApprovalRequired ? `Required — ${project.closureStatus}` : 'Not required'

    return (
      <div className="flex flex-col">
        {/* Drawer header */}
        <div className="sticky top-0 z-10 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-3 px-5 py-3">
            <button type="button" onClick={() => ctx.closeProject()} className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100">
              <X className="h-4 w-4" />
            </button>
            <div className={`h-2.5 w-2.5 flex-shrink-0 rounded-sm ${dotCls}`} />
            <h2 className="min-w-0 flex-1 truncate text-base font-semibold text-slate-900">{project.name}</h2>
            <StatusBadge status={project.status} />
            <button type="button" onClick={() => openEdit(project)} className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
              <Edit3 className="h-3.5 w-3.5" /> Edit
            </button>
          </div>
          <div className="flex items-center gap-0 px-5">
            {(['overview', 'tasks', 'team', 'files'] as const).map((tab) => (
              <button key={tab} type="button" onClick={() => setDetailTab(tab)}
                className={`border-b-2 px-3 py-2 text-xs font-medium capitalize transition-colors ${detailTab === tab ? 'border-sky-600 text-sky-700' : 'border-transparent text-slate-400 hover:text-slate-700'}`}>
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Tab body */}
        {detailTab === 'tasks' ? (
          <div className="px-5 pb-5 pt-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">Task Board</p>
              <button type="button" onClick={() => addTask(project.id)} className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700">
                <Plus className="h-3.5 w-3.5" /> Add Task
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {TASK_COLUMNS.map((col) => {
                const colTasks = (project.tasks ?? []).filter((t) => t.status === col)
                return (
                  <div key={col} className="flex w-48 flex-shrink-0 flex-col rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className={`mb-2 inline-flex items-center justify-between rounded-full px-2 py-0.5 text-[10px] font-semibold ${TASK_COL_COLOR[col]}`}>
                      <span>{col}</span>
                      <span className="ml-1 rounded-full bg-white/70 px-1.5">{colTasks.length}</span>
                    </div>
                    <div className="flex flex-1 flex-col gap-2">
                      {colTasks.map((task) => (
                        <div key={task.id} className="rounded-lg border border-slate-200 bg-white p-2.5">
                          <p className="text-xs font-medium leading-tight text-slate-800">{task.title}</p>
                          {task.assignee && <p className="mt-1 text-[10px] text-slate-400">{task.assignee}</p>}
                          <div className="mt-2 flex items-center justify-between">
                            <select value={task.status} onChange={(e) => updateTaskStatus(project.id, task.id, e.target.value as TaskStatus)}
                              className="max-w-[100px] rounded border border-slate-200 bg-white py-0.5 text-[10px] outline-none">
                              {TASK_COLUMNS.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <button type="button" onClick={() => deleteTask(project.id, task.id)} className="text-slate-300 hover:text-rose-500">
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
          <div className="space-y-3 px-5 pb-5 pt-4">
            <p className="text-sm font-semibold text-slate-800">Team Members</p>
            {(project.team ?? []).length === 0 ? (
              <p className="text-sm text-slate-400">No team members assigned.</p>
            ) : (
              <div className="space-y-2">
                {(project.team ?? []).map((member) => (
                  <div key={member.name} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-700">
                      {member.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800">{member.name}</p>
                      <p className="text-xs text-slate-400">{member.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : detailTab === 'files' ? (
          <div className="space-y-3 px-5 pb-5 pt-4">
            <p className="text-sm font-semibold text-slate-800">Attachments</p>
            {project.requirementDocument && (
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
                <FileText className="h-5 w-5 flex-shrink-0 text-sky-600" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{project.requirementDocument.name}</p>
                  <p className="text-xs text-slate-400">{project.requirementDocument.size} · {project.requirementDocument.uploadedBy}</p>
                </div>
              </div>
            )}
            {(project.attachments ?? []).map((att) => (
              <div key={att.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
                <FileText className="h-5 w-5 flex-shrink-0 text-slate-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{att.name}</p>
                  <p className="text-xs text-slate-400">{att.size} · {att.uploadedBy}</p>
                </div>
              </div>
            ))}
            {!project.requirementDocument && (project.attachments ?? []).length === 0 && (
              <p className="text-sm text-slate-400">No files attached.</p>
            )}
          </div>
        ) : (
          <div className="space-y-4 px-5 pb-5 pt-0">
            {project.description && <p className="pt-2 text-sm leading-relaxed text-slate-500">{project.description}</p>}
            {WORKFLOW_STATUSES.has(project.status) && renderStepper(project)}
            {renderActionPanel(project)}

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <SectionHeader icon={<Briefcase className="h-4 w-4" />} iconCls="bg-sky-50 text-sky-600" title="Project Info" sub="Basic details and classification" />
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="col-span-2 sm:col-span-4"><DetailField label="Project Name" value={project.name} /></div>
                <DetailField label="Project Code" value={project.projectCode} />
                <DetailField label="Type"         value={project.projectType} />
                <DetailField label="Category"     value={project.projectCategory} />
                <DetailField label="Priority"     value={project.priority} />
                <DetailField label="Group"        value={project.department} />
                <DetailField label="Status"       value={STATUS_CFG[project.status].label} />
                <DetailField label="Progress"     value={`${calcProgress(project)}% (${done}/${project.milestones.length} milestones)`} />
              </div>
              {(project.tags ?? []).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {project.tags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[11px] font-semibold text-sky-700">
                      <Tag className="h-2.5 w-2.5" />{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <SectionHeader icon={<Globe className="h-4 w-4" />} iconCls="bg-emerald-50 text-emerald-600" title="Client & Stakeholder" sub="External contact and commercial info" />
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <DetailField label="Client Name"   value={project.clientName} />
                <DetailField label="Company"       value={project.clientCompany} />
                <DetailField label="Email"         value={project.clientEmail} />
                <DetailField label="Phone"         value={project.clientPhone} />
                <DetailField label="Location"      value={project.clientLocation} />
                <DetailField label="Project Owner" value={project.projectOwner} />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <SectionHeader icon={<Activity className="h-4 w-4" />} iconCls="bg-violet-50 text-violet-600" title="Timeline" sub="Schedule and deadline configuration" />
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <DetailField label="Start Date"    value={formatDate(project.startDate)} />
                <DetailField label="Expected End"  value={formatDate(project.endDate)} />
                <DetailField label="Actual End"    value={project.actualEndDate ? formatDate(project.actualEndDate) : undefined} />
                <DetailField label="Deadline Type" value={project.deadlineType} />
              </div>
              <div className="mt-2 rounded-lg border border-slate-100 bg-slate-50 p-2 text-xs text-slate-500">
                Duration: <span className="font-semibold text-slate-800">
                  {Math.ceil((new Date(project.endDate).getTime() - new Date(project.startDate).getTime()) / 86400000)} days
                </span>
              </div>
            </div>

            {((project.team ?? []).length > 0 || project.manager) && (
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <SectionHeader icon={<Users className="h-4 w-4" />} iconCls="bg-sky-50 text-sky-600" title="Team Assignment" sub="Roles, members, and permissions" />
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <DetailField label="Project Manager" value={project.manager} />
                  <DetailField label="Team Lead" value={(project.team ?? []).find((m) => m.role === 'Team Lead')?.name} />
                </div>
                {(project.team ?? []).length > 0 && (
                  <div className="space-y-2">
                    {project.team.map((member) => (
                      <div key={member.name} className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-sky-100 text-[10px] font-bold text-sky-700">
                          {member.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-slate-800">{member.name}</p>
                          <p className="text-[10px] text-slate-400">{member.role}</p>
                        </div>
                        <div className="flex flex-wrap justify-end gap-1">
                          {member.permissions.slice(0, 3).map((p) => (
                            <span key={p} className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[9px] font-medium text-slate-600">{p.replace(/_/g, ' ')}</span>
                          ))}
                          {member.permissions.length > 3 && <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[9px] text-slate-500">+{member.permissions.length - 3}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {project.techStack && (project.techStack.frontend.length > 0 || project.techStack.backend.length > 0 || project.techStack.database.length > 0 || project.techStack.other.length > 0 || project.repository?.gitUrl) && (
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <SectionHeader icon={<Code2 className="h-4 w-4" />} iconCls="bg-slate-100 text-slate-600" title="Technology & Repository" sub="Tech stack and environment URLs" />
                {[['Frontend', project.techStack.frontend], ['Backend', project.techStack.backend], ['Database', project.techStack.database], ['DevOps', project.techStack.other]].map(([label, items]) =>
                  (items as string[]).length > 0 ? (
                    <div key={label as string} className="mb-2 flex flex-wrap items-center gap-1.5">
                      <span className="w-16 flex-shrink-0 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
                      {(items as string[]).map((t) => <span key={t} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700">{t}</span>)}
                    </div>
                  ) : null
                )}
              </div>
            )}

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <SectionHeader icon={<DollarSign className="h-4 w-4" />} iconCls="bg-emerald-50 text-emerald-600" title="Budget" sub="Cost breakdown" />
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <DetailField label="Estimated Budget" value={project.budget ? `$${project.budget.toLocaleString()}` : undefined} />
                <DetailField label="Development Cost" value={project.developmentCost ? `$${project.developmentCost.toLocaleString()}` : undefined} />
                <DetailField label="Resource Cost"    value={project.resourceCost ? `$${project.resourceCost.toLocaleString()}` : undefined} />
                <DetailField label="Remaining Budget" value={project.budget ? `$${Math.max(0, project.budget - (project.developmentCost ?? 0) - (project.resourceCost ?? 0)).toLocaleString()}` : undefined} />
              </div>
            </div>

            {(project.risks ?? []).length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <SectionHeader icon={<AlertTriangle className="h-4 w-4" />} iconCls="bg-rose-50 text-rose-600" title="Risk Management" sub="Identified risks and mitigation plans" />
                <div className="space-y-2">
                  {project.risks.map((risk) => {
                    const levelCls = { Low: 'text-emerald-600 bg-emerald-50 border-emerald-200', Medium: 'text-amber-600 bg-amber-50 border-amber-200', High: 'text-orange-600 bg-orange-50 border-orange-200', Critical: 'text-rose-600 bg-rose-50 border-rose-200' }[risk.level]
                    return (
                      <div key={risk.id} className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                        <span className={`inline-flex flex-shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${levelCls}`}>{risk.level}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-slate-800">{risk.name}</p>
                          {risk.impact && <p className="mt-0.5 text-[11px] text-slate-400">Impact: {risk.impact}</p>}
                          {risk.solution && <p className="mt-0.5 text-[11px] text-sky-600">Solution: {risk.solution}</p>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <SectionHeader icon={<Lock className="h-4 w-4" />} iconCls="bg-amber-50 text-amber-600" title="Access & Approvals" sub="Review state and closure approval" />
              <div className="grid grid-cols-2 gap-2">
                <DetailField label="Creation Approval" value={approvalText} />
                <DetailField label="Closure Approval"  value={closureText} />
              </div>
            </div>

            {/* Milestones */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">Milestones</h3>
                <span className="text-xs text-slate-400">{done}/{project.milestones.length} completed</span>
              </div>
              {canAdd && (
                <div className="mb-3 flex flex-wrap items-end gap-3 rounded-xl border border-sky-100 bg-sky-50 p-3">
                  <div className="min-w-[160px] flex-1">
                    <p className="mb-1 text-[10px] font-medium text-slate-500">Title</p>
                    <input className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                      value={milestoneTitle} onChange={(e) => setMilestoneTitle(e.target.value)} placeholder="Milestone title" onKeyDown={(e) => e.key === 'Enter' && addMilestone()} />
                  </div>
                  <div>
                    <p className="mb-1 text-[10px] font-medium text-slate-500">Due date</p>
                    <input type="date" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                      value={milestoneDue} onChange={(e) => setMilestoneDue(e.target.value)} />
                  </div>
                  <label className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-slate-500">
                    <input type="checkbox" className="h-3.5 w-3.5 rounded accent-sky-600" checked={milestoneApproval} onChange={(e) => setMilestoneApproval(e.target.checked)} />
                    Requires approval
                  </label>
                  <button type="button" onClick={addMilestone} disabled={!milestoneTitle.trim()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50">
                    <Plus className="h-3.5 w-3.5" /> Add
                  </button>
                </div>
              )}
              {project.milestones.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-slate-200 p-6 text-center">
                  <p className="text-sm text-slate-400">No milestones yet.{canAdd ? ' Add the first one above.' : ''}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {project.milestones.map((ms) => {
                    const cfg = MILESTONE_CFG[ms.status]
                    return (
                      <div key={ms.id} className="flex items-center gap-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
                        <div className={`w-1 self-stretch flex-shrink-0 ${cfg.accent}`} />
                        <div className="min-w-0 flex-1 py-3 pl-4 pr-2">
                          <div className="mb-1 flex flex-wrap items-center gap-1.5">
                            <MilestoneBadge status={ms.status} />
                            {ms.approvalRequired && <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-400"><Lock className="h-2.5 w-2.5" />Approval</span>}
                          </div>
                          <p className="truncate text-sm font-medium text-slate-800">{ms.title}</p>
                          <p className="mt-0.5 text-xs text-slate-400">Due {formatDate(ms.dueDate)}</p>
                        </div>
                        <div className="flex flex-shrink-0 flex-wrap gap-1.5 py-3 pr-4">
                          {ms.status === 'Pending' && <button type="button" onClick={() => updateMilestone(ms.id, 'In Progress')} className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium hover:bg-slate-50">Start</button>}
                          {ms.status === 'In Progress' && (<><button type="button" onClick={() => updateMilestone(ms.id, ms.approvalRequired ? 'Approval Pending' : 'Done')} className="rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700">Complete</button><button type="button" onClick={() => updateMilestone(ms.id, 'Delayed')} className="rounded-md border border-rose-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50">Delayed</button></>)}
                          {ms.status === 'Delayed' && <button type="button" onClick={() => updateMilestone(ms.id, 'In Progress')} className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium hover:bg-slate-50">Resume</button>}
                          {ms.status === 'Approval Pending' && (<><button type="button" onClick={() => updateMilestone(ms.id, 'Done')} className="rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700">Approve</button><button type="button" onClick={() => updateMilestone(ms.id, 'Rework')} className="rounded-md border border-orange-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-orange-600 hover:bg-orange-50">Rework</button></>)}
                          {ms.status === 'Rework' && <button type="button" onClick={() => updateMilestone(ms.id, 'In Progress')} className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium hover:bg-slate-50">Resume</button>}
                          {ms.status === 'Done' && <button type="button" onClick={() => updateMilestone(ms.id, 'In Progress')} className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium hover:bg-slate-50">Reopen</button>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {(project.activityHistory ?? []).length > 0 && (
              <div>
                <h3 className="mb-3 text-sm font-semibold text-slate-800">Activity</h3>
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
                  {project.activityHistory.slice(0, 8).map((act) => (
                    <div key={act.id} className="flex items-baseline gap-3 px-4 py-3">
                      <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-slate-300" />
                      <p className="flex-1 text-xs text-slate-500"><span className="font-medium text-slate-800">{act.actor}</span> {act.message}</p>
                      <span className="flex-shrink-0 text-[10px] text-slate-400">{formatDate(act.date)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col">
      {/* Page header */}
      <div className="border-b border-slate-100 bg-white px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
              <FolderKanban className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">Projects</h1>
              <p className="text-sm text-slate-400">Track projects, milestones, approvals, and team progress.</p>
            </div>
          </div>
          <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700">
            <Plus className="h-4 w-4" /> New Project
          </button>
        </div>
        {backendStatus === 'offline' && (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-600">
            Project service is currently unavailable — live data could not be loaded.
          </div>
        )}
      </div>

      <div className="p-6 space-y-4">
        {/* Search + filter bar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm outline-none transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search projects, managers…"
            />
          </div>
          <select
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-500"
            value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All statuses</option>
            {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>

        {/* Two-column layout */}
        <div className={`grid grid-cols-1 gap-5 ${currentProject && !isModalOpen ? 'lg:grid-cols-[1.1fr_1.9fr]' : 'lg:grid-cols-[3fr_2fr]'}`}>

          {/* LEFT: project list */}
          <div className={`min-w-0 transition-[filter] duration-200 ${currentProject && !isModalOpen ? 'blur-[1px] pointer-events-none select-none' : ''}`}>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="hidden border-b border-slate-100 bg-slate-50 px-5 py-3 lg:grid lg:grid-cols-[minmax(160px,2fr)_130px_130px_150px_90px_32px] lg:gap-4">
                {['Project', 'Status', 'Manager', 'Milestones', 'Due Date', ''].map((h) => (
                  <span key={h} className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{h}</span>
                ))}
              </div>
              <div className="divide-y divide-slate-100">
                {filteredProjects.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-16 text-center">
                    <div className="rounded-2xl bg-slate-100 p-4">
                      <Folder className="h-8 w-8 text-slate-300" />
                    </div>
                    <p className="text-sm text-slate-400">No projects match your search or filters.</p>
                  </div>
                ) : (
                  filteredProjects.map((project, idx) => {
                    const dotCls = DOT_COLORS[idx % DOT_COLORS.length]
                    const total = project.milestones.length
                    const done = project.milestones.filter((m) => m.status === 'Done').length
                    const progress = calcProgress(project)
                    return (
                      <div key={project.id}
                        className="flex cursor-pointer flex-col gap-3 px-5 py-4 transition-colors hover:bg-slate-50 lg:grid lg:grid-cols-[minmax(160px,2fr)_130px_130px_150px_90px_32px] lg:items-center lg:gap-4"
                        onClick={() => selectProject(project.id)}>
                        <div className="flex items-center gap-3">
                          <div className={`h-2.5 w-2.5 flex-shrink-0 rounded-sm ${dotCls}`} />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">{project.name}</p>
                            <p className="text-xs text-slate-400">{project.projectCode} · {project.department}</p>
                          </div>
                        </div>
                        <div><StatusBadge status={project.status} /></div>
                        <p className="text-sm text-slate-700">{project.manager || <span className="text-slate-400">Not assigned</span>}</p>
                        <div className="w-full lg:w-36">
                          <div className="mb-1.5 flex items-center justify-between text-[11px]">
                            <span className="text-slate-400">{done}/{total}</span>
                            <span className="font-semibold text-slate-700">{progress}%</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${progress}%` }} />
                          </div>
                        </div>
                        <p className="text-sm text-slate-400">{formatDate(project.endDate)}</p>
                        <div className="flex justify-end">
                          <button type="button"
                            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100"
                            onClick={(e) => { e.stopPropagation(); openEdit(project) }}>
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
              {filteredProjects.length > 0 && (
                <div className="border-t border-slate-100 px-5 py-3">
                  <p className="text-xs text-slate-400">{filteredProjects.length} of {projects.length} projects</p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: detail drawer or charts */}
          {currentProject && !isModalOpen ? (
            <div className="overflow-y-auto rounded-xl border border-slate-200 bg-white max-h-[calc(100vh-160px)]">
              {renderDetailContent(currentProject)}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="text-sm font-semibold text-slate-800">Project Status</h3>
                <p className="mb-4 mt-0.5 text-xs text-slate-400">Distribution across all projects</p>
                {pieData.length === 0 ? (
                  <div className="flex h-48 items-center justify-center">
                    <p className="text-sm text-slate-400">No projects yet</p>
                  </div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={48} outerRadius={76} paddingAngle={2} dataKey="value">
                          {pieData.map((entry, i) => <Cell key={`cell-${i}`} fill={entry.color} />)}
                        </Pie>
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-2 space-y-2">
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

              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="text-sm font-semibold text-slate-800">Recent Activity</h3>
                <p className="mb-4 mt-0.5 text-xs text-slate-400">Latest updates across all projects</p>
                {recentActivity.length === 0 ? (
                  <p className="py-4 text-center text-sm text-slate-400">No activity yet</p>
                ) : (
                  <div className="space-y-3">
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
          )}
        </div>
      </div>
    </div>
  )
}
