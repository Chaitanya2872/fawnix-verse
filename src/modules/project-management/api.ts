import { format } from 'date-fns'
import { api, ensureApiSession } from '@/services/api-client'
import { today } from './data'
import type { Project, ProjectFormState, ProjectStatus } from './types'

type BackendProjectStatus =
  | 'DRAFT'
  | 'PENDING_CREATION_APPROVAL'
  | 'PLANNED'
  | 'IN_PROGRESS'
  | 'PENDING_CLOSURE_APPROVAL'
  | 'COMPLETED'
  | 'REOPENED'
  | 'REJECTED'

type BackendProject = {
  id: string
  projectCode: string | null
  name: string
  description: string | null
  status: BackendProjectStatus
  department: string | null
  managerName: string | null
  priority: ProjectStatus | 'Low' | 'Medium' | 'High' | 'Critical' | null
  progress: number | null
  teamSize: number | null
  startDate: string | null
  targetEndDate: string | null
  createdAt: string
  updatedAt: string
}

type BackendProjectSummary = {
  totalProjects: number
  activeProjects: number
  completedProjects: number
  pendingApprovalProjects: number
  overdueProjects: number
}

type ProjectPayload = {
  projectCode: string
  name: string
  description: string
  department: string
  managerName: string
  priority: string
  progress: number
  teamSize: number
  startDate: string
  targetEndDate: string
}

export type ProjectSummary = BackendProjectSummary

export const isBackendConfigured = true

function mapStatus(status: BackendProjectStatus): ProjectStatus {
  const statuses: Record<BackendProjectStatus, ProjectStatus> = {
    DRAFT: 'Planning',
    PENDING_CREATION_APPROVAL: 'Approval Pending',
    PLANNED: 'Planned',
    IN_PROGRESS: 'In Progress',
    PENDING_CLOSURE_APPROVAL: 'Closure Pending',
    COMPLETED: 'Completed',
    REOPENED: 'In Progress',
    REJECTED: 'Rejected',
  }

  return statuses[status]
}

function payloadFromForm(form: ProjectFormState): ProjectPayload {
  return {
    projectCode: form.projectCode.trim(),
    name: form.name.trim(),
    description: form.description.trim(),
    department: form.department,
    managerName: form.manager,
    priority: form.priority,
    progress: form.progress,
    teamSize: form.team.length || form.teamMembers.length,
    startDate: form.startDate,
    targetEndDate: form.endDate,
  }
}

function mapProject(project: BackendProject, fallback: Partial<Project> = {}): Project {
  const status = mapStatus(project.status)
  const startDate = project.startDate ?? format(today, 'yyyy-MM-dd')
  const endDate = project.targetEndDate ?? startDate

  return {
    id: project.id,
    projectCode: project.projectCode ?? fallback.projectCode ?? `PM-${project.id.slice(0, 8).toUpperCase()}`,
    name: project.name,
    description: project.description ?? '',
    projectType: fallback.projectType ?? 'Internal Tool',
    projectTemplate: fallback.projectTemplate ?? 'Blank Project',
    projectCategory: fallback.projectCategory ?? 'Internal',
    tags: fallback.tags ?? [],
    clientName: fallback.clientName ?? '',
    clientCompany: fallback.clientCompany ?? '',
    clientEmail: fallback.clientEmail ?? '',
    clientPhone: fallback.clientPhone ?? '',
    clientLocation: fallback.clientLocation ?? '',
    projectOwner: fallback.projectOwner ?? fallback.owner ?? 'Backend User',
    stakeholders: fallback.stakeholders ?? [],
    budget: fallback.budget ?? 0,
    developmentCost: fallback.developmentCost ?? 0,
    resourceCost: fallback.resourceCost ?? 0,
    department: project.department ?? fallback.department ?? 'IT',
    owner: fallback.owner ?? 'Backend User',
    manager: project.managerName ?? fallback.manager ?? 'Project Manager',
    startDate,
    endDate,
    deadlineType: fallback.deadlineType ?? 'Flexible',
    priority: (project.priority as Project['priority'] | null) ?? fallback.priority ?? 'Medium',
    status,
    approvalRequired: fallback.approvalRequired ?? status === 'Approval Pending',
    approvalStatus: fallback.approvalStatus ?? (status === 'Approval Pending' ? 'Pending' : 'Not Required'),
    closureApprovalRequired: fallback.closureApprovalRequired ?? true,
    closureStatus: fallback.closureStatus ?? (status === 'Completed' ? 'Approved' : 'Not Required'),
    progress: project.progress ?? fallback.progress ?? (status === 'Completed' ? 100 : 0),
    teamMembers:
      fallback.teamMembers && fallback.teamMembers.length > 0
        ? fallback.teamMembers
        : Array.from({ length: project.teamSize ?? 0 }, (_, index) => `Team Member ${index + 1}`),
    team: fallback.team ?? [],
    techStack: fallback.techStack ?? { frontend: [], backend: [], database: [], other: [] },
    repository: fallback.repository ?? { gitUrl: '', branchStrategy: '', devUrl: '', testingUrl: '', productionUrl: '' },
    modules: fallback.modules ?? [],
    sprints: fallback.sprints ?? [],
    risks: fallback.risks ?? [],
    communication: fallback.communication ?? { slackChannel: '', teamsChannel: '', meetingLink: '', reportingFrequency: 'Weekly' },
    requirementDocument: fallback.requirementDocument ?? null,
    attachments: fallback.attachments ?? [],
    notes: fallback.notes ?? '',
    comments: fallback.comments ?? [],
    milestones: fallback.milestones ?? [],
    tasks: fallback.tasks ?? [],
    activityHistory: fallback.activityHistory ?? [
      {
        id: `act-${project.id}`,
        message: 'Loaded from backend',
        actor: 'Backend',
        date: project.updatedAt.slice(0, 10),
      },
    ],
  }
}

export async function fetchProjects(): Promise<Project[]> {
  await ensureApiSession()
  const { data: projects } = await api.get<BackendProject[]>('/v1/projects')
  return projects.map((project) => mapProject(project))
}

export async function fetchProjectSummary(): Promise<ProjectSummary> {
  await ensureApiSession()
  const { data } = await api.get<BackendProjectSummary>('/v1/projects/summary')
  return data
}

export async function createProject(form: ProjectFormState): Promise<Project> {
  await ensureApiSession()
  const { data: project } = await api.post<BackendProject>('/v1/projects', payloadFromForm(form))

  return mapProject(project, form)
}

export async function updateProject(projectId: string, form: ProjectFormState, fallback: Project): Promise<Project> {
  await ensureApiSession()
  const { data: project } = await api.put<BackendProject>(`/v1/projects/${projectId}`, payloadFromForm(form))

  return mapProject(project, { ...fallback, ...form })
}
