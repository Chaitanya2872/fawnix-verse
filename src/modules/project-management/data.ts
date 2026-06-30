import type { Priority, ProjectStatus, ProjectType, DeadlineType, SprintDuration, MemberRole, RolePermission } from './types'

export const priorities: Priority[] = ['Low', 'Medium', 'High', 'Critical']

export const statuses: ProjectStatus[] = [
  'Draft',
  'Planning',
  'Approval Pending',
  'Returned',
  'Rejected',
  'Planned',
  'In Progress',
  'Delayed',
  'Active',
  'On Hold',
  'At Risk',
  'Closure Pending',
  'Completed',
  'Cancelled',
]

export const projectTypes: ProjectType[] = [
  'Web Application',
  'Mobile Application',
  'Desktop Application',
  'IoT Project',
  'AI/ML Project',
  'API Development',
  'Internal Tool',
  'Client Project',
  'Maintenance Project',
  'Research Project',
]

export const deadlineTypes: DeadlineType[] = ['Flexible', 'Fixed Deadline', 'Urgent Delivery']

export const sprintDurations: SprintDuration[] = ['1 Week', '2 Weeks', '3 Weeks', 'Monthly']

export const memberRoles: MemberRole[] = [
  'Project Manager',
  'Team Lead',
  'Developer',
  'QA Engineer',
  'UI/UX Designer',
  'DevOps Engineer',
  'Business Analyst',
  'Stakeholder',
]

export const allRolePermissions: { key: RolePermission; label: string }[] = [
  { key: 'view_project',   label: 'View Project'   },
  { key: 'create_task',    label: 'Create Task'    },
  { key: 'assign_task',    label: 'Assign Task'    },
  { key: 'edit_task',      label: 'Edit Task'      },
  { key: 'delete_task',    label: 'Delete Task'    },
  { key: 'upload_files',   label: 'Upload Files'   },
  { key: 'approve_release',label: 'Approve Release'},
]

export const defaultPermissionsForRole: Record<MemberRole, RolePermission[]> = {
  'Project Manager':   ['view_project','create_task','assign_task','edit_task','delete_task','upload_files','approve_release'],
  'Team Lead':         ['view_project','create_task','assign_task','edit_task','upload_files','approve_release'],
  'Developer':         ['view_project','create_task','edit_task','upload_files'],
  'QA Engineer':       ['view_project','create_task','edit_task','upload_files'],
  'UI/UX Designer':    ['view_project','create_task','edit_task','upload_files'],
  'DevOps Engineer':   ['view_project','edit_task','upload_files','approve_release'],
  'Business Analyst':  ['view_project','create_task','upload_files'],
  'Stakeholder':       ['view_project'],
}

export const techFrontend = ['React','Angular','Vue','Flutter','Android','iOS','Next.js','Svelte']
export const techBackend  = ['Spring Boot','Node JS','FastAPI','.NET','Django','Laravel','Go','Ruby on Rails']
export const techDatabase = ['PostgreSQL','MySQL','MongoDB','Oracle','Redis','SQLite','Cassandra']
export const techOther    = ['Docker','Kubernetes','AWS','Azure','GCP','Firebase','Terraform','Jenkins']

export const branchStrategies = ['main / develop / feature/*','Git Flow','Trunk Based','GitHub Flow']

export const departments = ['Sales', 'Operations', 'Finance', 'HR', 'IT', 'Support']

export const owners = ['Ananya Rao', 'David Kim', 'Meera Iyer', 'Omar Khan', 'Priya Shah']

export const projectTemplates = [
  'Blank Project',
  'Implementation',
  'Marketing Campaign',
  'Product Launch',
  'Internal Operations',
]

export const projectCategories = [
  'Client Delivery',
  'Internal',
  'Product',
  'Operations',
  'Compliance',
]

export const departmentTeamMembers: Record<string, string[]> = {
  Sales: ['Ananya Rao', 'David Kim', 'Riya Menon', 'James Lee', 'Neha Kapoor'],
  Operations: ['Meera Iyer', 'Omar Khan', 'Kabir Das', 'Luis Martin', 'Fatima Noor'],
  Finance: ['Priya Shah', 'Meera Iyer', 'Nikhil Jain', 'Sara Thomas', 'Arjun Nair'],
  HR: ['Priya Shah', 'Omar Khan', 'Riya Menon', 'Elena Morris', 'Naveen Kumar'],
  IT: ['David Kim', 'Ananya Rao', 'Fatima Noor', 'Luis Martin', 'Nikhil Jain'],
  Support: ['Omar Khan', 'James Lee', 'Sara Thomas', 'Neha Kapoor', 'Kabir Das'],
}

export const today = new Date()
