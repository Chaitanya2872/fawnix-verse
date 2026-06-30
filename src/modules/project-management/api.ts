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
  name: string
  description: string | null
  status: BackendProjectStatus
  startDate: string | null
  targetEndDate: string | null
  createdAt: string
  updatedAt: string
}

type ProjectPayload = {
  name: string
  description: string
  startDate: string
  targetEndDate: string
}

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
    name: form.name.trim(),
    description: form.description.trim(),
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
    projectCode: fallback.projectCode ?? `PM-${project.id.slice(0, 8).toUpperCase()}`,
    name: project.name,
    description: project.description ?? '',
    projectTemplate: fallback.projectTemplate ?? 'Blank Project',
    projectCategory: fallback.projectCategory ?? 'Internal',
    tags: fallback.tags ?? [],
    clientName: fallback.clientName ?? '',
    clientCompany: fallback.clientCompany ?? '',
    clientEmail: fallback.clientEmail ?? '',
    clientPhone: fallback.clientPhone ?? '',
    budget: fallback.budget ?? 0,
    department: fallback.department ?? 'IT',
    owner: fallback.owner ?? 'Backend User',
    manager: fallback.manager ?? 'Project Manager',
    startDate,
    endDate,
    priority: fallback.priority ?? 'Medium',
    status,
    approvalRequired: fallback.approvalRequired ?? status === 'Approval Pending',
    approvalStatus: fallback.approvalStatus ?? (status === 'Approval Pending' ? 'Pending' : 'Not Required'),
    closureApprovalRequired: fallback.closureApprovalRequired ?? true,
    closureStatus: fallback.closureStatus ?? (status === 'Completed' ? 'Approved' : 'Not Required'),
    progress: fallback.progress ?? (status === 'Completed' ? 100 : 0),
    teamMembers: fallback.teamMembers ?? [],
    requirementDocument: fallback.requirementDocument ?? null,
    attachments: fallback.attachments ?? [],
    notes: fallback.notes ?? '',
    comments: fallback.comments ?? [],
    milestones: fallback.milestones ?? [],
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
