import { createContext, useContext, type ComponentType } from 'react'
import type { Project, ProjectFormState, ProjectStatus, MilestoneStatus, TaskStatus } from './types'
import type { ProjectSummary } from './api'

export type WorkspaceStat = {
  label: string
  value: number
  hint: string
  icon: ComponentType<{ className?: string }>
  color: string
}

export type RecentActivityEntry = {
  id: string
  message: string
  actor: string
  date: string
  projectName: string
}

export type PieEntry = { name: string; value: number; color: string }

export type ProjectsContextValue = {
  projects: Project[]
  summary: ProjectSummary
  currentId: string | null
  search: string
  statusFilter: string
  isModalOpen: boolean
  formState: ProjectFormState
  milestoneTitle: string
  milestoneDue: string
  milestoneApproval: boolean
  backendStatus: 'idle' | 'connected' | 'offline'
  isSaving: boolean
  detailTab: 'overview' | 'tasks' | 'team' | 'files'
  currentProject: Project | null
  filteredProjects: Project[]
  pieData: PieEntry[]
  recentActivity: RecentActivityEntry[]
  spotlightProjects: Project[]
  workspaceStats: WorkspaceStat[]
  setSearch: (s: string) => void
  setStatusFilter: (s: string) => void
  setDetailTab: (t: 'overview' | 'tasks' | 'team' | 'files') => void
  setMilestoneTitle: (s: string) => void
  setMilestoneDue: (s: string) => void
  setMilestoneApproval: (b: boolean) => void
  openCreate: () => void
  openEdit: (p: Project) => void
  selectProject: (id: string) => void
  closeProject: () => void
  closeModal: () => void
  saveProject: (overrides?: Partial<ProjectFormState>) => Promise<void>
  handleFormChange: (field: keyof ProjectFormState, value: ProjectFormState[keyof ProjectFormState]) => void
  addMilestone: () => void
  updateMilestone: (id: string, status: MilestoneStatus) => void
  setProjectStatus: (status: ProjectStatus, msg: string) => void
  addTask: (projectId: string) => void
  updateTaskStatus: (projectId: string, taskId: string, status: TaskStatus) => void
  deleteTask: (projectId: string, taskId: string) => void
}

export const ProjectsContext = createContext<ProjectsContextValue | null>(null)

export function useProjectsContext(): ProjectsContextValue {
  const ctx = useContext(ProjectsContext)
  if (!ctx) throw new Error('useProjectsContext must be used within ProjectsLayout')
  return ctx
}
