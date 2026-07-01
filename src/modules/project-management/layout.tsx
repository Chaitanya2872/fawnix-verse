import { useEffect, useMemo, useState } from 'react'
import { format, isAfter, parseISO } from 'date-fns'
import { Outlet } from 'react-router-dom'
import { CheckCircle, FolderKanban, Goal, TimerReset } from 'lucide-react'
import {
  createProject as createBackendProject,
  fetchProjectSummary,
  fetchProjects as fetchBackendProjects,
  updateProject as updateBackendProject,
  type ProjectSummary,
} from './api'
import { ProjectForm } from './components/ProjectForm'
import { ProjectsContext } from './context'
import { today } from './data'
import { calcProgress } from './shared'
import type { MilestoneStatus, Project, ProjectFormState, ProjectStatus, Task, TaskStatus } from './types'
import { createBlankForm, newId, toFormState } from './utils'

export default function ProjectsLayout() {
  const [projects, setProjects] = useState<Project[]>([])
  const [summary, setSummary] = useState<ProjectSummary>({
    totalProjects: 0, activeProjects: 0, completedProjects: 0,
    pendingApprovalProjects: 0, overdueProjects: 0,
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

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchBackendProjects(), fetchProjectSummary()])
      .then(([bp, s]) => { if (!cancelled) { setProjects(bp); setSummary(s); setBackendStatus('connected') } })
      .catch(() => { if (!cancelled) setBackendStatus('offline') })
    return () => { cancelled = true }
  }, [])

  const currentProject = useMemo(() => projects.find((p) => p.id === currentId) ?? null, [currentId, projects])

  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase()
    return projects.filter((p) => {
      const matchSearch = !q || [p.name, p.description, p.projectCode, p.department, p.manager].join(' ').toLowerCase().includes(q)
      return matchSearch && (statusFilter === 'ALL' || p.status === statusFilter)
    })
  }, [projects, search, statusFilter])

  const pieData = useMemo(() => {
    const groups: { name: string; statuses: ProjectStatus[]; color: string }[] = [
      { name: 'Planning',    statuses: ['Planning'],                         color: '#94a3b8' },
      { name: 'Pending',     statuses: ['Approval Pending', 'Returned'],     color: '#f59e0b' },
      { name: 'Rejected',    statuses: ['Rejected'],                         color: '#f43f5e' },
      { name: 'Planned',     statuses: ['Planned'],                          color: '#3b82f6' },
      { name: 'In Progress', statuses: ['Active', 'In Progress'],            color: '#0ea5e9' },
      { name: 'At Risk',     statuses: ['Delayed', 'On Hold', 'At Risk'],    color: '#ef4444' },
      { name: 'Closure',     statuses: ['Closure Pending'],                  color: '#8b5cf6' },
      { name: 'Completed',   statuses: ['Completed'],                        color: '#10b981' },
    ]
    return groups
      .map((g) => ({ name: g.name, value: projects.filter((p) => g.statuses.includes(p.status)).length, color: g.color }))
      .filter((g) => g.value > 0)
  }, [projects])

  const recentActivity = useMemo(() =>
    projects
      .flatMap((p) => (p.activityHistory ?? []).map((a) => ({ ...a, projectName: p.name })))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 10),
  [projects])

  const spotlightProjects = useMemo(() =>
    [...projects]
      .sort((l, r) => r.progress !== l.progress ? r.progress - l.progress : l.endDate.localeCompare(r.endDate))
      .slice(0, 3),
  [projects])

  const workspaceStats = useMemo(() => {
    const totalMs = projects.reduce((n, p) => n + p.milestones.length, 0)
    const doneMs = projects.reduce((n, p) => n + p.milestones.filter((m) => m.status === 'Done').length, 0)
    const totalTasks = projects.reduce((n, p) => n + (p.tasks?.length ?? 0), 0)
    const openTasks = projects.reduce((n, p) => n + (p.tasks?.filter((t) => t.status !== 'Completed').length ?? 0), 0)
    return [
      { label: 'Total Projects',    value: summary.totalProjects,           hint: `${summary.activeProjects} active now`,   icon: FolderKanban, color: 'sky'     },
      { label: 'Pending Approval',  value: summary.pendingApprovalProjects, hint: `${summary.overdueProjects} overdue`,     icon: TimerReset,   color: 'amber'   },
      { label: 'Milestones Closed', value: doneMs,                          hint: `${totalMs} tracked`,                    icon: Goal,         color: 'emerald' },
      { label: 'Open Tasks',        value: openTasks,                       hint: `${totalTasks} work items total`,        icon: CheckCircle,  color: 'violet'  },
    ]
  }, [projects, summary])

  // ── Actions ──────────────────────────────────────────────────────────────
  const openCreate = () => { setCurrentId(null); setFormState(createBlankForm()); setIsModalOpen(true) }
  const openEdit = (p: Project) => { setCurrentId(p.id); setFormState(toFormState(p)); setIsModalOpen(true) }
  const selectProject = (id: string) => { setCurrentId(id); setDetailTab('overview') }
  const closeProject = () => setCurrentId(null)
  const closeModal = () => setIsModalOpen(false)

  const handleFormChange = (field: keyof ProjectFormState, value: ProjectFormState[keyof ProjectFormState]) => {
    setFormState((cur) => {
      if (field === 'department') return { ...cur, department: String(value), teamMembers: [] }
      return { ...cur, [field]: value }
    })
  }

  const saveProject = async (overrides: Partial<ProjectFormState> = {}) => {
    const next = { ...formState, ...overrides }
    if (!next.name.trim() || !next.projectCode.trim() || isAfter(parseISO(next.startDate), parseISO(next.endDate))) return
    setIsSaving(true)
    if (currentProject) {
      try {
        const saved = await updateBackendProject(currentProject.id, next, currentProject)
        setProjects((cur) => cur.map((p) => (p.id === currentProject.id ? saved : p)))
        setBackendStatus('connected'); closeModal()
      } catch { setBackendStatus('offline') }
      finally { setIsSaving(false) }
      return
    }
    try {
      const saved = await createBackendProject(next)
      setProjects((cur) => [saved, ...cur]); setCurrentId(saved.id)
      setBackendStatus('connected'); closeModal()
    } catch { setBackendStatus('offline') }
    finally { setIsSaving(false) }
  }

  const updateProjectFn = (updater: (p: Project) => Project) => {
    if (!currentProject) return
    setProjects((cur) => cur.map((p) => (p.id === currentProject.id ? updater(p) : p)))
  }

  const withActivity = (p: Project, msg: string): Project => ({
    ...p,
    activityHistory: [{ id: newId('act'), message: msg, actor: p.manager, date: format(today, 'yyyy-MM-dd') }, ...p.activityHistory],
  })

  const setProjectStatus = (status: ProjectStatus, msg: string) =>
    updateProjectFn((p) => withActivity({ ...p, status }, msg))

  const addMilestone = () => {
    if (!milestoneTitle.trim()) return
    updateProjectFn((p) => withActivity({
      ...p,
      milestones: [...p.milestones, {
        id: newId('ms'), title: milestoneTitle.trim(), dueDate: milestoneDue,
        status: 'Pending', approvalRequired: milestoneApproval, approvalStatus: 'Not Required',
      }],
    }, `Milestone created: ${milestoneTitle.trim()}`))
    setMilestoneTitle('')
    setMilestoneDue(currentProject?.endDate ?? format(today, 'yyyy-MM-dd'))
    setMilestoneApproval(false)
  }

  const updateMilestone = (id: string, status: MilestoneStatus) => {
    updateProjectFn((p) => {
      const ms = p.milestones.map((m) =>
        m.id === id
          ? { ...m, status, approvalStatus: status === 'Approval Pending' ? 'Pending' as const : status === 'Done' ? 'Approved' as const : m.approvalStatus }
          : m,
      )
      return withActivity({ ...p, milestones: ms, progress: calcProgress({ ...p, milestones: ms }) }, `Milestone updated to ${status}`)
    })
  }

  const addTask = (projectId: string) => {
    const task: Task = {
      id: newId('task'), projectId, title: 'New Task', description: '',
      status: 'To Do', assignee: '', priority: 'Medium',
      dueDate: format(today, 'yyyy-MM-dd'), createdAt: format(today, 'yyyy-MM-dd'), tags: [],
    }
    setProjects((cur) => cur.map((p) => p.id === projectId ? { ...p, tasks: [...(p.tasks ?? []), task] } : p))
  }

  const updateTaskStatus = (projectId: string, taskId: string, status: TaskStatus) =>
    setProjects((cur) => cur.map((p) => p.id === projectId ? { ...p, tasks: (p.tasks ?? []).map((t) => t.id === taskId ? { ...t, status } : t) } : p))

  const deleteTask = (projectId: string, taskId: string) =>
    setProjects((cur) => cur.map((p) => p.id === projectId ? { ...p, tasks: (p.tasks ?? []).filter((t) => t.id !== taskId) } : p))

  const ctx = {
    projects, summary, currentId, search, statusFilter, isModalOpen, formState,
    milestoneTitle, milestoneDue, milestoneApproval, backendStatus, isSaving, detailTab,
    currentProject, filteredProjects, pieData, recentActivity, spotlightProjects, workspaceStats,
    setSearch, setStatusFilter, setDetailTab, setMilestoneTitle, setMilestoneDue, setMilestoneApproval,
    openCreate, openEdit, selectProject, closeProject, closeModal, saveProject, handleFormChange,
    addMilestone, updateMilestone, setProjectStatus, addTask, updateTaskStatus, deleteTask,
  }

  return (
    <ProjectsContext.Provider value={ctx}>
      {isModalOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px] transition-opacity"
            onClick={closeModal}
          />
          {/* Centered modal panel */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
            <div className="flex h-[min(92vh,980px)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            {/* Panel header */}
            <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  {currentId ? 'Edit Project' : 'New Project'}
                </h2>
                <p className="text-xs text-slate-400">
                  {currentId ? 'Update project details, team, and milestones.' : 'Fill in the details to create a new project.'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            {/* Form body — ProjectForm manages its own scroll internally */}
            <div className="min-h-0 flex-1">
              <ProjectForm
                formState={formState} onChange={handleFormChange}
                onCancel={closeModal} onSave={saveProject}
                isSaving={isSaving} isEdit={!!currentId}
              />
            </div>
          </div>
          </div>
        </>
      )}
      <Outlet />
    </ProjectsContext.Provider>
  )
}
