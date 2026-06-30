export type Priority = 'Low' | 'Medium' | 'High' | 'Critical'

export type ProjectStatus =
  | 'Draft'
  | 'Planning'
  | 'Approval Pending'
  | 'Returned'
  | 'Rejected'
  | 'Planned'
  | 'Active'
  | 'In Progress'
  | 'Delayed'
  | 'On Hold'
  | 'At Risk'
  | 'Closure Pending'
  | 'Completed'
  | 'Cancelled'

export type ProjectType =
  | 'Web Application'
  | 'Mobile Application'
  | 'Desktop Application'
  | 'IoT Project'
  | 'AI/ML Project'
  | 'API Development'
  | 'Internal Tool'
  | 'Client Project'
  | 'Maintenance Project'
  | 'Research Project'

export type DeadlineType = 'Flexible' | 'Fixed Deadline' | 'Urgent Delivery'

export type SprintDuration = '1 Week' | '2 Weeks' | '3 Weeks' | 'Monthly'

export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical'

export type ViewMode = 'dashboard' | 'projects' | 'tasks' | 'calendar' | 'reports'

export type MilestoneStatus =
  | 'Pending'
  | 'In Progress'
  | 'Delayed'
  | 'Approval Pending'
  | 'Rework'
  | 'Done'

export type ApprovalStatus =
  | 'Not Required'
  | 'Pending'
  | 'Approved'
  | 'Returned'
  | 'Rejected'

export type TaskStatus =
  | 'Backlog'
  | 'To Do'
  | 'In Progress'
  | 'Code Review'
  | 'QA Testing'
  | 'Ready For Release'
  | 'Production'
  | 'Completed'

export type MemberRole =
  | 'Project Manager'
  | 'Team Lead'
  | 'Developer'
  | 'QA Engineer'
  | 'UI/UX Designer'
  | 'DevOps Engineer'
  | 'Business Analyst'
  | 'Stakeholder'

export type RolePermission =
  | 'view_project'
  | 'create_task'
  | 'assign_task'
  | 'edit_task'
  | 'delete_task'
  | 'upload_files'
  | 'approve_release'

export type Attachment = {
  id: string
  name: string
  type: string
  size: string
  uploadedBy: string
  uploadedAt: string
}

export type Milestone = {
  id: string
  title: string
  description?: string
  dueDate: string
  deliverables?: string
  status: MilestoneStatus
  approvalRequired: boolean
  approvalStatus: ApprovalStatus
}

export type Activity = {
  id: string
  message: string
  actor: string
  date: string
}

export type ProjectComment = {
  id: string
  author: string
  message: string
  date: string
}

export type TeamMember = {
  name: string
  role: MemberRole
  permissions: RolePermission[]
}

export type TechStack = {
  frontend: string[]
  backend: string[]
  database: string[]
  other: string[]
}

export type RepositoryConfig = {
  gitUrl: string
  branchStrategy: string
  devUrl: string
  testingUrl: string
  productionUrl: string
}

export type ProjectModule = {
  id: string
  name: string
  description: string
  owner: string
  priority: Priority
  startDate: string
  endDate: string
}

export type Sprint = {
  id: string
  duration: SprintDuration
  startDate: string
  endDate: string
  goal: string
}

export type Risk = {
  id: string
  name: string
  level: RiskLevel
  impact: string
  solution: string
}

export type CommunicationSettings = {
  slackChannel: string
  teamsChannel: string
  meetingLink: string
  reportingFrequency: 'Daily' | 'Weekly' | 'Monthly'
}

export type Task = {
  id: string
  projectId: string
  title: string
  description: string
  status: TaskStatus
  assignee: string
  priority: Priority
  dueDate: string
  createdAt: string
  tags: string[]
  milestoneId?: string
  sprintId?: string
}

export type Project = {
  id: string
  projectCode: string
  name: string
  description: string
  projectType: ProjectType
  projectTemplate: string
  projectCategory: string
  tags: string[]
  // Client
  clientName: string
  clientCompany: string
  clientEmail: string
  clientPhone: string
  clientLocation: string
  projectOwner: string
  stakeholders: string[]
  // Timeline
  startDate: string
  endDate: string
  actualEndDate?: string
  deadlineType: DeadlineType
  // Team
  owner: string
  manager: string
  teamMembers: string[]
  team: TeamMember[]
  // Tech
  techStack: TechStack
  repository: RepositoryConfig
  // Modules & Sprints
  modules: ProjectModule[]
  sprints: Sprint[]
  // Budget
  budget: number
  developmentCost: number
  resourceCost: number
  // Config
  department: string
  priority: Priority
  status: ProjectStatus
  approvalRequired: boolean
  approvalStatus: ApprovalStatus
  closureApprovalRequired: boolean
  closureStatus: ApprovalStatus
  progress: number
  // Risk & Communication
  risks: Risk[]
  communication: CommunicationSettings
  // Files & notes
  requirementDocument: Attachment | null
  attachments: Attachment[]
  notes: string
  // Activity
  comments: ProjectComment[]
  milestones: Milestone[]
  tasks: Task[]
  activityHistory: Activity[]
}

export type ProjectFormState = {
  // Step 1 – Basic
  projectCode: string
  name: string
  description: string
  projectType: ProjectType
  projectTemplate: string
  projectCategory: string
  priority: Priority
  status: ProjectStatus
  tags: string[]
  tagsText: string
  // Step 2 – Client
  clientName: string
  clientCompany: string
  clientEmail: string
  clientPhone: string
  clientLocation: string
  projectOwner: string
  stakeholders: string[]
  // Step 3 – Timeline
  startDate: string
  endDate: string
  actualEndDate: string
  deadlineType: DeadlineType
  // Step 4 – Team
  owner: string
  manager: string
  teamLead: string
  developers: string[]
  qaEngineers: string[]
  designers: string[]
  devopsEngineers: string[]
  teamMembers: string[]
  team: TeamMember[]
  // Step 5 – Tech
  techStack: TechStack
  repository: RepositoryConfig
  // Step 6 – Modules / Sprints / Milestones
  modules: ProjectModule[]
  sprints: Sprint[]
  // Step 7 – Budget / Files / Communication
  budget: number
  developmentCost: number
  resourceCost: number
  requirementDocument: Attachment | null
  attachments: Attachment[]
  communication: CommunicationSettings
  notes: string
  // Step 8 – Risk / Approval
  risks: Risk[]
  approvalRequired: boolean
  approvalStatus: ApprovalStatus
  closureApprovalRequired: boolean
  closureStatus: ApprovalStatus
  // Misc
  department: string
  progress: number
}
