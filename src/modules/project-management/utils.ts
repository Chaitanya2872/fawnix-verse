import { addDays, differenceInCalendarDays, format, isBefore, parseISO } from 'date-fns'
import { owners, today } from './data'
import type { Priority, Project, ProjectFormState } from './types'

export const priorityRank: Record<Priority, number> = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1,
}

export const statusColorMap = {
  Draft: '#94a3b8',
  Planning: '#748296',
  'Approval Pending': '#a66b1f',
  Returned: '#a66b1f',
  Rejected: '#b84a4a',
  Planned: '#465a69',
  Active: '#2f6f73',
  'In Progress': '#2f6f73',
  Delayed: '#b84a4a',
  'On Hold': '#a66b1f',
  'At Risk': '#b84a4a',
  'Closure Pending': '#a66b1f',
  Completed: '#2f7d68',
  Cancelled: '#64748b',
} as const

export const newId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`

const emptyTechStack = { frontend: [], backend: [], database: [], other: [] }
const emptyRepo = { gitUrl: '', branchStrategy: 'Git Flow', devUrl: '', testingUrl: '', productionUrl: '' }
const emptyCommunication = { slackChannel: '', teamsChannel: '', meetingLink: '', reportingFrequency: 'Weekly' as const }

export const createBlankForm = (): ProjectFormState => ({
  // Step 1
  projectCode: '',
  name: '',
  description: '',
  projectType: 'Web Application',
  projectTypes: ['Web Application'],
  projectTemplate: 'Blank Project',
  projectCategory: 'Client Delivery',
  priority: 'Medium',
  status: 'Draft',
  tags: [],
  tagsText: '',
  // Step 2
  clientName: '',
  clientCompany: '',
  clientEmail: '',
  clientPhone: '',
  clientLocation: '',
  projectOwner: owners[0],
  stakeholders: [],
  // Step 3
  startDate: format(today, 'yyyy-MM-dd'),
  endDate: format(addDays(today, 30), 'yyyy-MM-dd'),
  actualEndDate: '',
  deadlineType: 'Flexible',
  // Step 4
  owner: owners[0],
  manager: owners[1],
  teamLead: '',
  developers: [],
  qaEngineers: [],
  designers: [],
  devopsEngineers: [],
  teamMembers: [],
  team: [],
  // Step 5
  techStack: { ...emptyTechStack, frontend: [], backend: [], database: [], other: [] },
  repository: { ...emptyRepo },
  // Step 6
  modules: [],
  sprints: [],
  // Step 7
  budget: 0,
  developmentCost: 0,
  resourceCost: 0,
  requirementDocument: null,
  attachments: [],
  communication: { ...emptyCommunication },
  notes: '',
  // Step 8
  risks: [],
  approvalRequired: false,
  approvalStatus: 'Not Required',
  closureApprovalRequired: true,
  closureStatus: 'Not Required',
  // Misc
  department: 'Sales',
  progress: 0,
})

export const toFormState = (project: Project): ProjectFormState => ({
  projectCode: project.projectCode,
  name: project.name,
  description: project.description,
  projectType: project.projectType ?? 'Web Application',
  projectTypes: [project.projectType ?? 'Web Application'],
  projectTemplate: project.projectTemplate ?? 'Blank Project',
  projectCategory: project.projectCategory ?? 'Client Delivery',
  priority: project.priority,
  status: project.status,
  tags: project.tags ?? [],
  tagsText: (project.tags ?? []).join(', '),
  clientName: project.clientName ?? '',
  clientCompany: project.clientCompany ?? '',
  clientEmail: project.clientEmail ?? '',
  clientPhone: project.clientPhone ?? '',
  clientLocation: project.clientLocation ?? '',
  projectOwner: project.projectOwner ?? project.owner,
  stakeholders: project.stakeholders ?? [],
  startDate: project.startDate,
  endDate: project.endDate,
  actualEndDate: project.actualEndDate ?? '',
  deadlineType: project.deadlineType ?? 'Flexible',
  owner: project.owner,
  manager: project.manager,
  teamLead: project.team?.find(m => m.role === 'Team Lead')?.name ?? '',
  developers: project.team?.filter(m => m.role === 'Developer').map(m => m.name) ?? [],
  qaEngineers: project.team?.filter(m => m.role === 'QA Engineer').map(m => m.name) ?? [],
  designers: project.team?.filter(m => m.role === 'UI/UX Designer').map(m => m.name) ?? [],
  devopsEngineers: project.team?.filter(m => m.role === 'DevOps Engineer').map(m => m.name) ?? [],
  teamMembers: project.teamMembers ?? [],
  team: project.team ?? [],
  techStack: project.techStack ?? { ...emptyTechStack },
  repository: project.repository ?? { ...emptyRepo },
  modules: project.modules ?? [],
  sprints: project.sprints ?? [],
  budget: project.budget ?? 0,
  developmentCost: project.developmentCost ?? 0,
  resourceCost: project.resourceCost ?? 0,
  requirementDocument: project.requirementDocument ?? null,
  attachments: project.attachments ?? [],
  communication: project.communication ?? { ...emptyCommunication },
  notes: project.notes ?? '',
  risks: project.risks ?? [],
  approvalRequired: project.approvalRequired ?? false,
  approvalStatus: project.approvalStatus ?? 'Not Required',
  closureApprovalRequired: project.closureApprovalRequired ?? true,
  closureStatus: project.closureStatus ?? 'Not Required',
  department: project.department,
  progress: project.progress,
})

export const formatDate = (date: string) => {
  try { return format(parseISO(date), 'dd MMM yyyy') } catch { return date }
}

export const isProjectOverdue = (project: Project) =>
  project.status !== 'Completed' && isBefore(parseISO(project.endDate), today)

export function deadlineLabel(project: Project) {
  const days = differenceInCalendarDays(parseISO(project.endDate), today)
  if (project.status === 'Completed') return 'Completed'
  if (days < 0) return `${Math.abs(days)} days overdue`
  if (days === 0) return 'Due today'
  return `${days} days left`
}
