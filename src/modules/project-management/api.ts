import { format } from 'date-fns'
import { api, ensureApiSession } from '@/services/api-client'
import { today } from './data'
import type { Project, ProjectFormState, ProjectStatus } from './types'
import { loadProjectCache, saveProjectCache } from './utils'

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
  teamLeadName: string | null
  priority: ProjectStatus | 'Low' | 'Medium' | 'High' | 'Critical' | null
  progress: number | null
  teamSize: number | null
  teamMembers: string[] | null
  team: BackendTeamMember[] | null
  details: BackendProjectDetails | null
  startDate: string | null
  targetEndDate: string | null
  createdAt: string
  updatedAt: string
}

type BackendTeamMember = {
  name: string
  role: string
  joinedDate: string
  responsibilities: string
  permissions: string[]
}

type BackendProjectSummary = {
  totalProjects: number
  activeProjects: number
  completedProjects: number
  pendingApprovalProjects: number
  overdueProjects: number
}

type BackendProjectDetails = {
  projectType?: Project['projectType']
  projectTemplate?: string
  projectCategory?: string
  tags?: string[]
  clientName?: string
  clientCompany?: string
  clientEmail?: string
  clientPhone?: string
  clientLocation?: string
  projectOwner?: string
  stakeholders?: string[]
  owner?: string
  actualEndDate?: string
  deadlineType?: Project['deadlineType']
  budget?: number
  developmentCost?: number
  resourceCost?: number
  techStack?: Project['techStack']
  repository?: Project['repository']
  modules?: Project['modules']
  sprints?: Project['sprints']
  requirementDocument?: Project['requirementDocument']
  attachments?: Project['attachments']
  communication?: Project['communication']
  notes?: string
  risks?: Project['risks']
  approvalRequired?: boolean
  approvalStatus?: Project['approvalStatus']
  closureApprovalRequired?: boolean
  closureStatus?: Project['closureStatus']
  milestones?: Project['milestones']
  tasks?: Project['tasks']
  activityHistory?: Project['activityHistory']
}

type ProjectPayload = {
  projectCode: string
  name: string
  description: string
  department: string
  managerName: string
  teamLeadName: string
  priority: string
  progress: number
  teamSize: number
  teamMembers: string[]
  team: BackendTeamMember[]
  details: BackendProjectDetails
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

function detailsFromProjectLike(project: {
  projectType: Project['projectType']
  projectTemplate: string
  projectCategory: string
  tags: string[]
  clientName: string
  clientCompany: string
  clientEmail: string
  clientPhone: string
  clientLocation: string
  projectOwner: string
  stakeholders: string[]
  owner: string
  actualEndDate?: string
  deadlineType: Project['deadlineType']
  budget: number
  developmentCost: number
  resourceCost: number
  techStack: Project['techStack']
  repository: Project['repository']
  modules: Project['modules']
  sprints: Project['sprints']
  requirementDocument: Project['requirementDocument']
  attachments: Project['attachments']
  communication: Project['communication']
  notes: string
  risks: Project['risks']
  approvalRequired: boolean
  approvalStatus: Project['approvalStatus']
  closureApprovalRequired: boolean
  closureStatus: Project['closureStatus']
  milestones?: Project['milestones']
  tasks?: Project['tasks']
  activityHistory?: Project['activityHistory']
}): BackendProjectDetails {
  return {
    projectType: project.projectType,
    projectTemplate: project.projectTemplate,
    projectCategory: project.projectCategory,
    tags: project.tags,
    clientName: project.clientName,
    clientCompany: project.clientCompany,
    clientEmail: project.clientEmail,
    clientPhone: project.clientPhone,
    clientLocation: project.clientLocation,
    projectOwner: project.projectOwner,
    stakeholders: project.stakeholders,
    owner: project.owner,
    actualEndDate: project.actualEndDate ?? '',
    deadlineType: project.deadlineType,
    budget: project.budget,
    developmentCost: project.developmentCost,
    resourceCost: project.resourceCost,
    techStack: project.techStack,
    repository: project.repository,
    modules: project.modules,
    sprints: project.sprints,
    requirementDocument: project.requirementDocument,
    attachments: project.attachments,
    communication: project.communication,
    notes: project.notes,
    risks: project.risks,
    approvalRequired: project.approvalRequired,
    approvalStatus: project.approvalStatus,
    closureApprovalRequired: project.closureApprovalRequired,
    closureStatus: project.closureStatus,
    milestones: project.milestones ?? [],
    tasks: project.tasks ?? [],
    activityHistory: project.activityHistory ?? [],
  }
}

function payloadFromForm(form: ProjectFormState): ProjectPayload {
  return {
    projectCode: form.projectCode.trim(),
    name: form.name.trim(),
    description: form.description.trim(),
    department: form.department,
    managerName: form.manager,
    teamLeadName: form.teamLead,
    priority: form.priority,
    progress: form.progress,
    teamSize: form.team.length || form.teamMembers.length,
    teamMembers: form.teamMembers,
    team: form.team.map((member) => ({
      name: member.name,
      role: member.role,
      joinedDate: member.joinedDate,
      responsibilities: member.responsibilities,
      permissions: member.permissions,
    })),
    details: detailsFromProjectLike({
      projectType: form.projectType,
      projectTemplate: form.projectTemplate,
      projectCategory: form.projectCategory,
      tags: form.tags,
      clientName: form.clientName,
      clientCompany: form.clientCompany,
      clientEmail: form.clientEmail,
      clientPhone: form.clientPhone,
      clientLocation: form.clientLocation,
      projectOwner: form.projectOwner,
      stakeholders: form.stakeholders,
      owner: form.owner,
      actualEndDate: form.actualEndDate,
      deadlineType: form.deadlineType,
      budget: form.budget,
      developmentCost: form.developmentCost,
      resourceCost: form.resourceCost,
      techStack: form.techStack,
      repository: form.repository,
      modules: form.modules,
      sprints: form.sprints,
      requirementDocument: form.requirementDocument,
      attachments: form.attachments,
      communication: form.communication,
      notes: form.notes,
      risks: form.risks,
      approvalRequired: form.approvalRequired,
      approvalStatus: form.approvalStatus,
      closureApprovalRequired: form.closureApprovalRequired,
      closureStatus: form.closureStatus,
    }),
    startDate: form.startDate,
    targetEndDate: form.endDate,
  }
}

function mapProject(project: BackendProject, fallback: Partial<Project> = {}): Project {
  const status = mapStatus(project.status)
  const startDate = project.startDate ?? format(today, 'yyyy-MM-dd')
  const endDate = project.targetEndDate ?? startDate
  const details = project.details ?? {}

  return {
    id: project.id,
    projectCode: project.projectCode ?? fallback.projectCode ?? `PM-${project.id.slice(0, 8).toUpperCase()}`,
    name: project.name,
    description: project.description ?? '',
    projectType: details.projectType ?? fallback.projectType ?? 'Internal Tool',
    projectTemplate: details.projectTemplate ?? fallback.projectTemplate ?? 'Blank Project',
    projectCategory: details.projectCategory ?? fallback.projectCategory ?? 'Internal',
    tags: details.tags ?? fallback.tags ?? [],
    clientName: details.clientName ?? fallback.clientName ?? '',
    clientCompany: details.clientCompany ?? fallback.clientCompany ?? '',
    clientEmail: details.clientEmail ?? fallback.clientEmail ?? '',
    clientPhone: details.clientPhone ?? fallback.clientPhone ?? '',
    clientLocation: details.clientLocation ?? fallback.clientLocation ?? '',
    projectOwner: details.projectOwner ?? fallback.projectOwner ?? fallback.owner ?? 'Backend User',
    stakeholders: details.stakeholders ?? fallback.stakeholders ?? [],
    budget: details.budget ?? fallback.budget ?? 0,
    developmentCost: details.developmentCost ?? fallback.developmentCost ?? 0,
    resourceCost: details.resourceCost ?? fallback.resourceCost ?? 0,
    department: project.department ?? fallback.department ?? 'IT',
    owner: details.owner ?? fallback.owner ?? 'Backend User',
    manager: project.managerName ?? fallback.manager ?? 'Project Manager',
    teamLead: project.teamLeadName ?? fallback.teamLead ?? '',
    startDate,
    endDate,
    actualEndDate: details.actualEndDate ?? fallback.actualEndDate ?? '',
    deadlineType: details.deadlineType ?? fallback.deadlineType ?? 'Flexible',
    priority: (project.priority as Project['priority'] | null) ?? fallback.priority ?? 'Medium',
    status,
    approvalRequired: details.approvalRequired ?? fallback.approvalRequired ?? status === 'Approval Pending',
    approvalStatus: details.approvalStatus ?? fallback.approvalStatus ?? (status === 'Approval Pending' ? 'Pending' : 'Not Required'),
    closureApprovalRequired: details.closureApprovalRequired ?? fallback.closureApprovalRequired ?? true,
    closureStatus: details.closureStatus ?? fallback.closureStatus ?? (status === 'Completed' ? 'Approved' : 'Not Required'),
    progress: project.progress ?? fallback.progress ?? (status === 'Completed' ? 100 : 0),
    teamMembers:
      project.teamMembers && project.teamMembers.length > 0
        ? project.teamMembers
        : project.team && project.team.length > 0
          ? project.team.map((member) => member.name)
          :
      fallback.teamMembers && fallback.teamMembers.length > 0
        ? fallback.teamMembers
        : Array.from({ length: project.teamSize ?? 0 }, (_, index) => `Team Member ${index + 1}`),
    team: project.team?.length ? project.team.map((member) => ({
      name: member.name,
      role: member.role as Project['team'][number]['role'],
      joinedDate: member.joinedDate,
      responsibilities: member.responsibilities,
      permissions: member.permissions as Project['team'][number]['permissions'],
    })) : (fallback.team ?? []),
    techStack: details.techStack ?? fallback.techStack ?? { frontend: [], backend: [], database: [], other: [] },
    repository: details.repository ?? fallback.repository ?? { gitUrl: '', branchStrategy: '', devUrl: '', testingUrl: '', productionUrl: '' },
    modules: details.modules ?? fallback.modules ?? [],
    sprints: details.sprints ?? fallback.sprints ?? [],
    risks: details.risks ?? fallback.risks ?? [],
    communication: details.communication ?? fallback.communication ?? { slackChannel: '', teamsChannel: '', meetingLink: '', reportingFrequency: 'Weekly' },
    requirementDocument: details.requirementDocument ?? fallback.requirementDocument ?? null,
    attachments: details.attachments ?? fallback.attachments ?? [],
    notes: details.notes ?? fallback.notes ?? '',
    comments: fallback.comments ?? [],
    milestones: details.milestones ?? fallback.milestones ?? [],
    tasks: details.tasks ?? fallback.tasks ?? [],
    activityHistory: details.activityHistory ?? fallback.activityHistory ?? [
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
  const cache = loadProjectCache()
  return projects.map((project) => mapProject(project, cache[project.id]))
}

export async function fetchProjectSummary(): Promise<ProjectSummary> {
  await ensureApiSession()
  const { data } = await api.get<BackendProjectSummary>('/v1/projects/summary')
  return data
}

export async function createProject(form: ProjectFormState): Promise<Project> {
  await ensureApiSession()
  const { data: project } = await api.post<BackendProject>('/v1/projects', payloadFromForm(form))
  const saved = mapProject(project, form)
  saveProjectCache([saved, ...Object.values(loadProjectCache()).filter((cached) => cached.id !== saved.id)])
  return saved
}

export async function updateProject(projectId: string, form: ProjectFormState, fallback: Project): Promise<Project> {
  await ensureApiSession()
  const { data: project } = await api.put<BackendProject>(`/v1/projects/${projectId}`, payloadFromForm(form))
  const saved = mapProject(project, { ...fallback, ...form })
  saveProjectCache([saved, ...Object.values(loadProjectCache()).filter((cached) => cached.id !== saved.id)])
  return saved
}

function payloadFromProject(project: Project): ProjectPayload {
  return {
    projectCode: project.projectCode.trim(),
    name: project.name.trim(),
    description: project.description.trim(),
    department: project.department,
    managerName: project.manager,
    teamLeadName: project.teamLead ?? '',
    priority: project.priority,
    progress: project.progress,
    teamSize: project.team.length || project.teamMembers.length,
    teamMembers: project.teamMembers,
    team: project.team.map((member) => ({
      name: member.name,
      role: member.role,
      joinedDate: member.joinedDate,
      responsibilities: member.responsibilities,
      permissions: member.permissions,
    })),
    details: detailsFromProjectLike(project),
    startDate: project.startDate,
    targetEndDate: project.endDate,
  }
}

export async function syncProject(projectId: string, project: Project): Promise<Project> {
  await ensureApiSession()
  const { data } = await api.put<BackendProject>(`/v1/projects/${projectId}`, payloadFromProject(project))
  const saved = mapProject(data, project)
  saveProjectCache([saved, ...Object.values(loadProjectCache()).filter((cached) => cached.id !== saved.id)])
  return saved
}
